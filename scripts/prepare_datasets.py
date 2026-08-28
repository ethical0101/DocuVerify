"""Builds train/val/test splits from the synthetic genuine + forged
documents, split by SOURCE document ID so a genuine document and any of its
forged derivatives always land in the same split (prevents leakage).

Usage:
    python scripts/prepare_datasets.py
"""
import json
import random
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYN_DIR = ROOT / "data" / "synthetic"

SPLIT_RATIOS = {"train": 0.70, "val": 0.15, "test": 0.15}


def main():
    genuine_manifest = json.loads((SYN_DIR / "manifest.json").read_text())
    forged_manifest_path = SYN_DIR / "forged_manifest.json"
    forged_manifest = json.loads(forged_manifest_path.read_text()) if forged_manifest_path.exists() else []

    by_source = defaultdict(list)
    for item in genuine_manifest:
        by_source[item["document_id"]].append({**item, "label": "genuine"})
    for item in forged_manifest:
        by_source[item["source_document"]].append({
            "document_id": item["document_id"], "category": item["category"], "label": "forged",
        })

    source_ids = list(by_source.keys())
    random.seed(7)
    random.shuffle(source_ids)

    n = len(source_ids)
    n_train = int(n * SPLIT_RATIOS["train"])
    n_val = int(n * SPLIT_RATIOS["val"])
    split_map = {}
    for i, sid in enumerate(source_ids):
        if i < n_train:
            split_map[sid] = "train"
        elif i < n_train + n_val:
            split_map[sid] = "val"
        else:
            split_map[sid] = "test"

    splits = {"train": [], "val": [], "test": []}
    for sid, items in by_source.items():
        split = split_map[sid]
        splits[split].extend(items)

    stats = {}
    for split, items in splits.items():
        genuine = sum(1 for i in items if i["label"] == "genuine")
        forged = sum(1 for i in items if i["label"] == "forged")
        stats[split] = {"total": len(items), "genuine": genuine, "forged": forged}

    (SYN_DIR / "splits.json").write_text(json.dumps(splits, indent=2))
    (SYN_DIR / "split_stats.json").write_text(json.dumps(stats, indent=2))
    print("Split methodology: partitioned by SOURCE document ID (70/15/15) so genuine documents and their")
    print("forged derivatives never cross split boundaries.")
    print(json.dumps(stats, indent=2))


if __name__ == "__main__":
    main()
