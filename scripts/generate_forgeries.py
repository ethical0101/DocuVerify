"""Applies controlled manipulations to the synthetic genuine documents
produced by generate_synthetic_documents.py, and records ground-truth
regions/forgery-types for each forged output.

Usage:
    python scripts/generate_forgeries.py
"""
import io
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SYN_DIR = ROOT / "data" / "synthetic"


def _jpeg_artifact_pass(img: Image.Image, region: list, quality: int = 55) -> Image.Image:
    """Re-encodes just the edited region at low JPEG quality and blends it back,
    mimicking the compression/noise mismatch real paste/edit tooling leaves behind."""
    x0, y0, x1, y1 = [int(v) for v in region]
    x0, y0 = max(0, x0 - 4), max(0, y0 - 4)
    x1, y1 = min(img.width, x1 + 4), min(img.height, y1 + 4)
    if x1 <= x0 or y1 <= y0:
        return img
    patch = img.crop((x0, y0, x1, y1))
    buf = io.BytesIO()
    patch.save(buf, "JPEG", quality=quality)
    buf.seek(0)
    degraded = Image.open(buf).convert("RGB")
    img.paste(degraded, (x0, y0))
    return img


def _font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def text_replacement(img: Image.Image, field_regions: dict, field: str, new_text: str) -> tuple[Image.Image, dict]:
    img = img.copy()
    draw = ImageDraw.Draw(img)
    x0, y0, x1, y1 = [int(v) for v in field_regions[field]]
    # sample background color near the region to patch over the old text
    bg = img.getpixel((max(0, x0 - 5), y0))
    draw.rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], fill=bg)
    size = max(12, int((y1 - y0) * 0.9))
    draw.text((x0, y0), new_text, font=_font(size), fill=(20, 20, 20))
    new_bbox = draw.textbbox((x0, y0), new_text, font=_font(size))
    img = _jpeg_artifact_pass(img, list(new_bbox))
    region = {"bbox": [new_bbox[0], new_bbox[1], new_bbox[2] - new_bbox[0], new_bbox[3] - new_bbox[1]],
              "type": "text_replacement", "severity": "high"}
    return img, region


def copy_paste(img: Image.Image, src_bbox: list, dst_xy: tuple) -> tuple[Image.Image, dict]:
    img = img.copy()
    x0, y0, x1, y1 = [int(v) for v in src_bbox]
    dst_xy = (int(dst_xy[0]), int(dst_xy[1]))
    patch = img.crop((x0, y0, x1, y1))
    img.paste(patch, dst_xy)
    w, h = x1 - x0, y1 - y0
    img = _jpeg_artifact_pass(img, [dst_xy[0], dst_xy[1], dst_xy[0] + w, dst_xy[1] + h])
    region = {"bbox": [dst_xy[0], dst_xy[1], w, h], "type": "copy_paste", "severity": "medium"}
    return img, region


def typography_manipulation(img: Image.Image, field_regions: dict, field: str, text: str) -> tuple[Image.Image, dict]:
    img = img.copy()
    draw = ImageDraw.Draw(img)
    x0, y0, x1, y1 = [int(v) for v in field_regions[field]]
    bg = img.getpixel((max(0, x0 - 5), y0))
    draw.rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], fill=bg)
    size = max(12, int((y1 - y0) * 1.3))  # mismatched size = typography inconsistency
    draw.text((x0, y0 - 4), text, font=_font(size), fill=(10, 10, 10))
    region_bbox = [x0, y0 - 4, x0 + x1 - x0 + 20, y0 - 4 + int((y1 - y0) * 1.3)]
    img = _jpeg_artifact_pass(img, region_bbox)
    region = {"bbox": [x0, y0 - 4, x1 - x0 + 20, int((y1 - y0) * 1.3)],
              "type": "typography_manipulation", "severity": "medium"}
    return img, region


def inpaint_blur(img: Image.Image, bbox: list) -> tuple[Image.Image, dict]:
    img = img.copy()
    x0, y0, x1, y1 = [int(v) for v in bbox]
    region_img = img.crop((x0, y0, x1, y1)).filter(ImageFilter.GaussianBlur(3))
    img.paste(region_img, (x0, y0))
    reg = {"bbox": [x0, y0, x1 - x0, y1 - y0], "type": "inpaint_rewrite", "severity": "medium"}
    return img, reg


FIRST_NAMES = ["JAMES", "SARAH", "MOHAMMED", "KAVYA", "WEI", "TEMI", "NATASHA", "DIEGO", "FATIMA", "ERIK"]


def process_document(json_path: Path):
    meta = json.loads(json_path.read_text())
    img_path = json_path.with_suffix(".png")
    img = Image.open(img_path).convert("RGB")
    field_regions = meta.get("field_regions", {})
    field_values = meta.get("field_values", {})
    category = meta["category"]

    forged_dir = json_path.parents[1] / "forged"
    forged_dir.mkdir(parents=True, exist_ok=True)
    outputs = []

    name_field = "full_name" if category == "identity" else "name"
    if name_field in field_regions:
        new_name = random.choice(FIRST_NAMES) + " " + field_values.get(name_field, "").split(" ")[-1]
        out_img, region = text_replacement(img, field_regions, name_field, new_name)
        doc_id = meta["document_id"] + "_forged_name"
        out_img.save(forged_dir / f"{doc_id}.png")
        out_meta = {"document_id": doc_id, "category": category, "label": "forged",
                    "forgery_types": ["text_replacement"], "regions": [region], "source_document": meta["document_id"]}
        (forged_dir / f"{doc_id}.json").write_text(json.dumps(out_meta, indent=2))
        outputs.append(out_meta)

    date_field = "issued" if category == "identity" else "date_of_graduation"
    if date_field in field_regions:
        old_val = field_values.get(date_field, "01/01/2020")
        parts = old_val.split("/")
        if len(parts) == 3:
            parts[-1] = str(int(parts[-1]) + 2)
        new_date = "/".join(parts)
        out_img, region = typography_manipulation(img, field_regions, date_field, new_date)
        doc_id = meta["document_id"] + "_forged_date"
        out_img.save(forged_dir / f"{doc_id}.png")
        out_meta = {"document_id": doc_id, "category": category, "label": "forged",
                    "forgery_types": ["typography_manipulation", "text_replacement"], "regions": [region],
                    "source_document": meta["document_id"]}
        (forged_dir / f"{doc_id}.json").write_text(json.dumps(out_meta, indent=2))
        outputs.append(out_meta)

    # copy-paste demo: duplicate a text field elsewhere on the page
    if field_regions:
        any_bbox = list(field_regions.values())[0]
        w, h = img.size
        dst = (min(w - 150, any_bbox[0] + 40), min(h - 40, any_bbox[3] + 60))
        out_img, region = copy_paste(img, any_bbox, dst)
        doc_id = meta["document_id"] + "_forged_copypaste"
        out_img.save(forged_dir / f"{doc_id}.png")
        out_meta = {"document_id": doc_id, "category": category, "label": "forged",
                    "forgery_types": ["copy_paste"], "regions": [region], "source_document": meta["document_id"]}
        (forged_dir / f"{doc_id}.json").write_text(json.dumps(out_meta, indent=2))
        outputs.append(out_meta)

    return outputs


def main():
    all_outputs = []
    for category in ("identity", "education"):
        genuine_dir = SYN_DIR / category / "genuine"
        if not genuine_dir.exists():
            continue
        for json_path in sorted(genuine_dir.glob("*.json")):
            all_outputs.extend(process_document(json_path))

    manifest_path = SYN_DIR / "forged_manifest.json"
    manifest_path.write_text(json.dumps(all_outputs, indent=2))
    print(f"Generated {len(all_outputs)} forged documents with ground truth -> {manifest_path}")


if __name__ == "__main__":
    main()
