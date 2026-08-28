"""Generates ONE demo identity card where every forensic stage finds something --
useful for a live demo/faculty walkthrough where you want to show the full
pipeline lighting up (visual, typography, structure, metadata, consistency),
not just a single isolated finding.

Every signal here is genuinely triggered by the pipeline, not hand-set:
- Visual + typography anomaly: the name field is text-replaced and re-compressed,
  same technique as scripts/generate_forgeries.py.
- Semantic/consistency anomaly: the issue date is corrupted to an implausible
  year, creating a >100-year gap against the expiry date.
- Structural anomaly: identity_card layouts already commonly trigger a mild
  line-spacing irregularity (see MODEL_CARD.md) -- kept as-is, not forced.
- Metadata anomaly: a "Photoshop" EXIF Software tag is embedded in the PNG.

Usage:
    python scripts/generate_showcase_demo.py
"""
import io
import random
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "backend"))

import generate_synthetic_documents as gendocs  # noqa: E402
import generate_forgeries as genforge  # noqa: E402

OUT_PATH = ROOT / "demo" / "identity" / "showcase_all_signals.png"
SAMPLE_PATH = ROOT / "frontend" / "public" / "samples" / "showcase_all_signals.png"


def inject_photoshop_exif(img: Image.Image) -> bytes:
    """Embeds a Software=Adobe Photoshop EXIF tag into a PNG (Pillow writes PNG
    EXIF via the eXIf chunk since 8.3+) -- exactly what app/services/metadata/
    extractor.py's _extract_image_metadata() flags as an editor signature."""
    exif = img.getexif()
    exif[0x0131] = "Adobe Photoshop 25.0 (Windows)"  # 0x0131 = Software tag
    buf = io.BytesIO()
    img.save(buf, "PNG", exif=exif)
    return buf.getvalue()


def main():
    random.seed(7)
    doc_id = "showcase_all_signals"
    img, meta = gendocs.make_identity_card(doc_id)

    # 1. Visual + typography anomaly: replace the name field with a mismatched font
    # size (typography_manipulation, not text_replacement -- the size mismatch is
    # what reliably trips the typography engine's height-cluster z-score check).
    field_regions = meta["field_regions"]
    img, _region = genforge.typography_manipulation(img, field_regions, "full_name", "JORDAN MERCER")

    # 2. Semantic/consistency anomaly: corrupt the issue date to an implausible year.
    field_regions_issued = field_regions.get("issued")
    if field_regions_issued:
        img, _region = genforge.typography_manipulation(img, field_regions, "issued", "12/03/1878")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    SAMPLE_PATH.parent.mkdir(parents=True, exist_ok=True)

    # 3. Metadata anomaly: embed a Photoshop EXIF signature.
    png_bytes = inject_photoshop_exif(img)
    OUT_PATH.write_bytes(png_bytes)
    SAMPLE_PATH.write_bytes(png_bytes)

    print(f"Showcase document written to:\n  {OUT_PATH}\n  {SAMPLE_PATH}")

    # Verify against the live pipeline (never claim a signal fired without checking).
    from app.services.pipeline import analyze_document
    result = analyze_document(OUT_PATH)
    print("\nVerification against the live pipeline:")
    for key, val in result["evidence"].items():
        if key in ("layout_findings", "semantic_findings", "metadata"):
            continue
        print(f"  {key}: {val}")
    print(f"  metadata.anomaly: {result['evidence']['metadata'].get('anomaly')}")
    print(f"  authenticity_score: {result['authenticity_score']}  risk_level: {result['risk_level']}")
    triggered = sum(1 for k, v in result["evidence"].items()
                     if k in ("visual_anomaly", "typography_anomaly", "layout_anomaly", "semantic_anomaly")
                     and (v or 0) > 0) + (1 if result["evidence"]["metadata"].get("anomaly") else 0)
    print(f"\n{triggered}/5 non-OCR signals triggered (OCR itself is always exercised via word extraction).")


if __name__ == "__main__":
    main()
