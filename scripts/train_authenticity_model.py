"""Trains the DocuVerify authenticity classifier on whole-image forensic features.

Extracts a fixed feature vector (see backend/app/services/visual_forensics/image_features.py)
for every document in the source-grouped train split, trains a RandomForest, and reports
honest metrics on the held-out val AND test splits. The splits are grouped by source
document (splits.json), so a genuine document and its forgeries never straddle train/test
-- no leakage.

Usage:
    python scripts/train_authenticity_model.py
"""
import json
import pickle
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.pipeline import load_primary_page  # noqa: E402  (same preprocessing as inference)
from app.services.visual_forensics.image_features import feature_vector, FEATURE_ORDER  # noqa: E402

SYN = ROOT / "data" / "synthetic"
MODELS = ROOT / "ml" / "models"


def load_split(split_items):
    X, y, ids = [], [], []
    for it in split_items:
        if "path" in it:
            img_path = SYN / it["path"]
        else:
            sub = "genuine" if it["label"] == "genuine" else "forged"
            img_path = SYN / it["category"] / sub / f"{it['document_id']}.png"
        if not img_path.exists():
            continue
        try:
            page, _ = load_primary_page(img_path)
            X.append(feature_vector(page))
            y.append(1 if it["label"] == "forged" else 0)
            ids.append(it["document_id"])
        except Exception:
            continue
    return np.array(X, dtype=np.float32), np.array(y), ids


def metrics(y_true, y_prob, threshold=0.5):
    from sklearn.metrics import roc_auc_score
    y_pred = (y_prob >= threshold).astype(int)
    tp = int(((y_pred == 1) & (y_true == 1)).sum())
    fp = int(((y_pred == 1) & (y_true == 0)).sum())
    tn = int(((y_pred == 0) & (y_true == 0)).sum())
    fn = int(((y_pred == 0) & (y_true == 1)).sum())
    total = tp + fp + tn + fn
    acc = (tp + tn) / total if total else 0.0
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    try:
        auc = float(roc_auc_score(y_true, y_prob)) if len(set(y_true)) > 1 else None
    except Exception:
        auc = None
    return {"accuracy": round(acc, 4), "precision": round(prec, 4), "recall": round(rec, 4),
            "f1": round(f1, 4), "roc_auc": round(auc, 4) if auc is not None else None,
            "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn}}


def main():
    from sklearn.ensemble import RandomForestClassifier

    splits = json.loads((SYN / "splits.json").read_text())
    print("Extracting features (train)...")
    Xtr, ytr, _ = load_split(splits["train"])
    print(f"  train: {len(ytr)} docs ({int(ytr.sum())} forged / {int((ytr == 0).sum())} genuine)")
    print("Extracting features (val)...")
    Xval, yval, _ = load_split(splits["val"])
    print("Extracting features (test)...")
    Xte, yte, _ = load_split(splits["test"])

    clf = RandomForestClassifier(
        n_estimators=300, max_depth=6, min_samples_leaf=3,
        class_weight="balanced", random_state=42,
    )
    clf.fit(Xtr, ytr)

    val_prob = clf.predict_proba(Xval)[:, 1]
    test_prob = clf.predict_proba(Xte)[:, 1]
    val_m = metrics(yval, val_prob)
    test_m = metrics(yte, test_prob)

    importances = dict(sorted(zip(FEATURE_ORDER, [round(float(v), 4) for v in clf.feature_importances_]),
                               key=lambda kv: -kv[1]))

    # Mean predicted forged-probability by true class (the "genuine vs forged separation").
    def mean_by(y_true, prob, label):
        sel = prob[y_true == label]
        return round(float(sel.mean()), 3) if len(sel) else None

    report = {
        "model": "RandomForest(n=300,depth=6)",
        "features": FEATURE_ORDER,
        "train_size": int(len(ytr)), "val_size": int(len(yval)), "test_size": int(len(yte)),
        "val_metrics": val_m, "test_metrics": test_m,
        "test_mean_forged_prob": {"genuine": mean_by(yte, test_prob, 0), "forged": mean_by(yte, test_prob, 1)},
        "feature_importances": importances,
        "note": ("Trained on DocuVerify's synthetic train split, evaluated on held-out val/test splits "
                 "grouped by source document (no leakage). Characterizes performance on synthetic renders, "
                 "not real-world documents."),
    }

    MODELS.mkdir(parents=True, exist_ok=True)
    with open(MODELS / "authenticity_rf.pkl", "wb") as fh:
        pickle.dump({"model": clf, "feature_order": FEATURE_ORDER}, fh)
    (MODELS / "authenticity_rf_report.json").write_text(json.dumps(report, indent=2))

    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
