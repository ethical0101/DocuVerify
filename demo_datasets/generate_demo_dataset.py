"""Generates a small, safe, fictional organization training dataset for the
enterprise adaptive-model demo, and packages it as a ZIP the enterprise training
API can ingest directly.

Reuses DocuVerify's existing synthetic certificate generator and forgery
generator (scripts/generate_synthetic_documents.py, scripts/generate_forgeries.py)
rather than duplicating the document-rendering code -- this script's job is
organization-specific parameterization (a custom fictional org name) and
packaging into the flat genuine/forged/metadata.csv layout the enterprise
dataset-upload endpoint expects, which differs from the split-by-category layout
scripts/generate_synthetic_documents.py normally produces.

Usage:
    python demo_datasets/generate_demo_dataset.py --count 40 --seed 42 \\
        --organization "Northstar Institute of Technology"
"""
import argparse
import csv
import json
import random
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import generate_synthetic_documents as gendocs  # noqa: E402
import generate_forgeries as genforge  # noqa: E402

OUT_DIR = ROOT / "demo_datasets" / "organization_demo_dataset"
ZIP_PATH = ROOT / "demo_datasets" / "organization_demo_dataset.zip"


def generate(count: int, seed: int, organization: str) -> dict:
    random.seed(seed)
    gendocs.UNIVERSITIES[:] = [organization]  # every generated certificate uses the org's own name

    genuine_dir = OUT_DIR / "genuine"
    forged_dir = OUT_DIR / "forged"
    genuine_dir.mkdir(parents=True, exist_ok=True)
    forged_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    forgery_type_totals: dict[str, int] = {}

    for i in range(count):
        doc_id = f"certificate_{i:04d}"
        img, meta = gendocs.make_certificate(doc_id)
        genuine_path = genuine_dir / f"{doc_id}.png"
        img.save(genuine_path)
        rows.append({"filename": f"genuine/{doc_id}.png", "label": "genuine", "forgery_type": ""})

        # process_document() reads field_regions/field_values from a JSON sidecar next
        # to the genuine image, and (per its own path logic: json_path.parents[1] /
        # "forged") writes its forged outputs directly into OUT_DIR/forged/ -- exactly
        # where we want them, no relocation needed.
        sidecar = genuine_dir / f"{doc_id}.json"
        sidecar.write_text(json.dumps(meta))
        forged_meta_items = genforge.process_document(sidecar)
        sidecar.unlink()

        for item in forged_meta_items:
            (forged_dir / f"{item['document_id']}.json").unlink(missing_ok=True)
            ftype = item["forgery_types"][0] if item["forgery_types"] else "unspecified"
            forgery_type_totals[ftype] = forgery_type_totals.get(ftype, 0) + 1
            rows.append({"filename": f"forged/{item['document_id']}.png", "label": "forged",
                         "forgery_type": ftype})

    with open(OUT_DIR / "metadata.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["filename", "label", "forgery_type"])
        writer.writeheader()
        writer.writerows(rows)

    if ZIP_PATH.exists():
        ZIP_PATH.unlink()
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in OUT_DIR.rglob("*"):
            if p.is_file():
                zf.write(p, p.relative_to(OUT_DIR.parent))

    genuine_n = sum(1 for r in rows if r["label"] == "genuine")
    forged_n = sum(1 for r in rows if r["label"] == "forged")
    return {"genuine": genuine_n, "forged": forged_n, "total": len(rows),
            "forgery_types": forgery_type_totals, "zip_path": str(ZIP_PATH)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=25, help="genuine certificates to generate")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--organization", type=str, default="Northstar Institute of Technology")
    args = parser.parse_args()

    stats = generate(args.count, args.seed, args.organization)

    print("Dataset generated successfully.\n")
    print(f"Genuine: {stats['genuine']}")
    print(f"Forged: {stats['forged']}")
    print(f"Total: {stats['total']}\n")
    print("Forgery types:")
    for ftype, n in stats["forgery_types"].items():
        print(f"  {ftype}: {n}")
    print(f"\nOutput: {stats['zip_path']}")


if __name__ == "__main__":
    main()
