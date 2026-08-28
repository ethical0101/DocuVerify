"""Trains a lightweight Logistic Regression evidence-fusion model on the
5 forensic-engine signals (visual/typography/layout/metadata/semantic
anomaly scores), as an alternative to the fixed heuristic weights in
fusion.py. Trained ONLY on the train split; evaluated on val. If this
doesn't outperform the heuristic baseline on val, the heuristic stays the
default (see app/services/fusion/fusion.py) -- this script never touches
the test split, so scripts/evaluate.py's numbers stay leakage-free.

Usage:
    python scripts/train_fusion_model.py
"""
import json
import pickle
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.pipeline import analyze_document  # noqa: E402

SYN_DIR = ROOT / "data" / "synthetic"
MODEL_DIR = ROOT / "ml" / "models"
SIGNAL_KEYS = ["visual_anomaly", "typography_anomaly", "layout_anomaly", "metadata_anomaly", "semantic_anomaly"]


def find_image(doc_id: str, category: str, label: str) -> Path | None:
    sub = "genuine" if label == "genuine" else "forged"
    p = SYN_DIR / category / sub / f"{doc_id}.png"
    return p if p.exists() else None


def collect(split_items):
    X, y = [], []
    for item in split_items:
        p = find_image(item["document_id"], item["category"], item["label"])
        if p is None:
            continue
        try:
            result = analyze_document(p)
        except Exception:
            continue
        signals = result["evidence"]
        X.append([signals.get(k, 0.0) for k in SIGNAL_KEYS])
        y.append(1 if item["label"] == "forged" else 0)
    return X, y


def main():
    splits = json.loads((SYN_DIR / "splits.json").read_text())
    print(f"Collecting train signals ({len(splits['train'])} items)...")
    X_train, y_train = collect(splits["train"])
    print(f"Collecting val signals ({len(splits['val'])} items)...")
    X_val, y_val = collect(splits["val"])

    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import roc_auc_score, accuracy_score

    model = LogisticRegression(class_weight="balanced", max_iter=1000)
    model.fit(X_train, y_train)

    val_probs = model.predict_proba(X_val)[:, 1]
    val_preds = model.predict(X_val)
    val_auc = roc_auc_score(y_val, val_probs) if len(set(y_val)) > 1 else None
    val_acc = accuracy_score(y_val, val_preds)

    # Heuristic baseline for comparison, on the same val set
    from app.services.fusion.fusion import fuse_evidence
    heuristic_preds = []
    for x in X_val:
        signals = dict(zip(SIGNAL_KEYS, x))
        heuristic_preds.append(1 if fuse_evidence(signals)["risk_level"] != "LOW" else 0)
    heuristic_acc = accuracy_score(y_val, heuristic_preds)

    print(f"Logistic Regression -- val AUC: {val_auc}, val accuracy: {val_acc:.3f}")
    print(f"Heuristic baseline  -- val accuracy: {heuristic_acc:.3f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    with open(MODEL_DIR / "fusion_lr.pkl", "wb") as f:
        pickle.dump({"model": model, "feature_order": SIGNAL_KEYS}, f)

    report = {
        "model": "LogisticRegression(class_weight=balanced)",
        "features": SIGNAL_KEYS,
        "train_size": len(X_train), "val_size": len(X_val),
        "val_auc": round(val_auc, 4) if val_auc is not None else None,
        "val_accuracy": round(val_acc, 4),
        "heuristic_val_accuracy": round(heuristic_acc, 4),
        "coefficients": dict(zip(SIGNAL_KEYS, [round(c, 3) for c in model.coef_[0]])),
        "chosen_for_production": bool(val_auc is not None and val_acc > heuristic_acc),
    }
    (MODEL_DIR / "fusion_lr_report.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
