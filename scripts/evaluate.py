"""Runs the DocuVerify forensic pipeline over the held-out test split and
reports real classification metrics (never fabricated). Also reports
region-localization IoU where ground-truth regions exist.

Usage:
    python scripts/evaluate.py
"""
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.pipeline import analyze_document  # noqa: E402

SYN_DIR = ROOT / "data" / "synthetic"
EVAL_DIR = ROOT / "evaluation"
RISK_THRESHOLD = 55  # authenticity_score below this => predicted "forged". Matches the
                      # trained-model MEDIUM/HIGH-ish boundary (authenticity 55 == risk_score 0.45,
                      # the LOW/MEDIUM tier edge); fixed a priori, not fit to this test set (see
                      # roc_auc / best_threshold_accuracy below for the threshold-independent views).


def find_image(doc_id: str, category: str, label: str) -> Path | None:
    sub = "genuine" if label == "genuine" else "forged"
    p = SYN_DIR / category / sub / f"{doc_id}.png"
    return p if p.exists() else None


def iou(a: list, b: list) -> float:
    ax0, ay0, aw, ah = a
    ax1, ay1 = ax0 + aw, ay0 + ah
    bx0, by0, bw, bh = b
    bx1, by1 = bx0 + bw, by0 + bh
    ix0, iy0 = max(ax0, bx0), max(ay0, by0)
    ix1, iy1 = min(ax1, bx1), min(ay1, by1)
    if ix1 <= ix0 or iy1 <= iy0:
        return 0.0
    inter = (ix1 - ix0) * (iy1 - iy0)
    union = aw * ah + bw * bh - inter
    return inter / union if union > 0 else 0.0


def main():
    splits = json.loads((SYN_DIR / "splits.json").read_text())
    test_items = splits["test"]

    forged_gt = {}
    for item in json.loads((SYN_DIR / "forged_manifest.json").read_text()):
        forged_gt[item["document_id"]] = item

    tp = fp = tn = fn = 0
    latencies = []
    iou_scores = []
    per_item = []
    scores_by_label = []  # (authenticity_score, is_forged)

    for item in test_items:
        img_path = find_image(item["document_id"], item["category"], item["label"])
        if img_path is None:
            continue
        t0 = time.time()
        try:
            result = analyze_document(img_path)
        except Exception as exc:
            per_item.append({"document_id": item["document_id"], "error": str(exc)})
            continue
        latencies.append(time.time() - t0)

        predicted_forged = result["authenticity_score"] < RISK_THRESHOLD
        actual_forged = item["label"] == "forged"
        scores_by_label.append((result["authenticity_score"], actual_forged))

        if predicted_forged and actual_forged:
            tp += 1
        elif predicted_forged and not actual_forged:
            fp += 1
        elif not predicted_forged and not actual_forged:
            tn += 1
        else:
            fn += 1

        if actual_forged and item["document_id"] in forged_gt:
            gt_regions = forged_gt[item["document_id"]].get("regions", [])
            pred_regions = result.get("regions", [])
            if gt_regions and pred_regions:
                best = max((iou(g["bbox"], p["bbox"]) for g in gt_regions for p in pred_regions), default=0.0)
                iou_scores.append(best)

        per_item.append({
            "document_id": item["document_id"], "label": item["label"],
            "authenticity_score": result["authenticity_score"], "risk_level": result["risk_level"],
            "predicted_forged": predicted_forged,
        })

    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

    genuine_scores = [s for s, forged in scores_by_label if not forged]
    forged_scores = [s for s, forged in scores_by_label if forged]
    mean_genuine = sum(genuine_scores) / len(genuine_scores) if genuine_scores else None
    mean_forged = sum(forged_scores) / len(forged_scores) if forged_scores else None

    roc_auc = None
    best_threshold_accuracy = None
    if genuine_scores and forged_scores:
        try:
            from sklearn.metrics import roc_auc_score
            y_true = [1 if forged else 0 for _, forged in scores_by_label]
            y_risk = [100 - s for s, _ in scores_by_label]  # higher risk score = more likely forged
            roc_auc = round(float(roc_auc_score(y_true, y_risk)), 4)
        except Exception:
            roc_auc = None

        best_acc, best_thresh = 0.0, RISK_THRESHOLD
        for thresh in range(0, 101, 1):
            correct = sum(1 for s, forged in scores_by_label if (s < thresh) == forged)
            acc = correct / len(scores_by_label)
            if acc > best_acc:
                best_acc, best_thresh = acc, thresh
        best_threshold_accuracy = {"threshold": best_thresh, "accuracy": round(best_acc, 4)}

    report = {
        "test_set_size": total,
        "mean_authenticity_score": {"genuine": round(mean_genuine, 1) if mean_genuine else None,
                                     "forged": round(mean_forged, 1) if mean_forged else None},
        "roc_auc": roc_auc,
        "best_threshold_accuracy": best_threshold_accuracy,
        "confusion_matrix_at_fixed_threshold": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "localization_mean_iou": round(sum(iou_scores) / len(iou_scores), 4) if iou_scores else None,
        "localization_sample_count": len(iou_scores),
        "avg_latency_sec": round(sum(latencies) / len(latencies), 3) if latencies else None,
        "risk_threshold_used": RISK_THRESHOLD,
        "note": ("Metrics are computed on DocuVerify's own synthetic test split (held out by source "
                 "document, no leakage). They characterize this prototype's classical-CV + OCR pipeline "
                 "on synthetic renders, not performance on real-world scanned/photographed documents."),
    }

    EVAL_DIR.mkdir(exist_ok=True)
    (EVAL_DIR / "results.json").write_text(json.dumps({"summary": report, "per_item": per_item}, indent=2))

    lines = ["# Evaluation Report\n", f"Test set size: {total}\n",
              f"Mean authenticity score -- genuine: {report['mean_authenticity_score']['genuine']}, "
              f"forged: {report['mean_authenticity_score']['forged']}\n",
              f"ROC-AUC (risk score vs. forged label): {report['roc_auc']}\n",
              f"Best achievable threshold accuracy: {report['best_threshold_accuracy']}\n",
              f"Accuracy at fixed threshold={RISK_THRESHOLD}: {report['accuracy']:.2%}\n",
              f"Precision: {report['precision']:.2%}\n",
              f"Recall: {report['recall']:.2%}\n", f"F1: {report['f1']:.2%}\n"]
    if report["localization_mean_iou"] is not None:
        lines.append(f"Localization mean IoU (n={report['localization_sample_count']}): "
                      f"{report['localization_mean_iou']:.3f}\n")
    lines.append(f"Average analysis latency: {report['avg_latency_sec']}s\n")
    lines.append(f"\n{report['note']}\n")
    (EVAL_DIR / "report.md").write_text("".join(lines))

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
