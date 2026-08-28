"""Generates fictional, clearly non-official identity cards and educational
certificates, plus controlled forged variants with ground-truth region
annotations. This is DocuVerify's primary demo/training dataset -- entirely
synthetic, no real people or real institutions.

Usage:
    python scripts/generate_synthetic_documents.py --count 40
"""
import argparse
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "synthetic"

FIRST_NAMES = ["JOHN", "MARIA", "AHMED", "PRIYA", "CHEN", "OLUWASEUN", "ELENA", "CARLOS", "AISHA", "LARS"]
LAST_NAMES = ["DOE", "GARCIA", "KHAN", "SHARMA", "WEI", "ADEYEMI", "IVANOVA", "SANTOS", "BELLO", "NIELSEN"]
UNIVERSITIES = ["Rivermont Institute of Technology", "Northfield State University",
                "Alderbridge College of Engineering", "Summit Valley University",
                "Eastgate Polytechnic Institute"]
DEGREES = ["Bachelor of Science in Computer Engineering", "Bachelor of Arts in Economics",
           "Master of Science in Data Analytics", "Bachelor of Technology in Mechanical Engineering"]
COUNTRIES = ["REPUBLIC OF NORTHLAND", "FEDERATION OF EASTMOOR", "UNION OF SOUTHVALE"]


def _font(size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def _rand_date(start_year=1990, end_year=2005):
    y = random.randint(start_year, end_year)
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    return f"{d:02d}/{m:02d}/{y}"


def make_identity_card(doc_id: str) -> tuple[Image.Image, dict]:
    w, h = 900, 570
    img = Image.new("RGB", (w, h), (235, 240, 245))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, w - 1, h - 1], outline=(30, 60, 120), width=6)
    draw.rectangle([0, 0, w, 90], fill=(30, 60, 120))
    country = random.choice(COUNTRIES)
    draw.text((30, 25), country, font=_font(30), fill=(255, 255, 255))
    draw.text((30, 60), "NATIONAL IDENTITY CARD (FICTIONAL SPECIMEN)", font=_font(16), fill=(220, 230, 255))

    portrait_box = [40, 130, 240, 380]
    draw.rectangle(portrait_box, fill=(200, 205, 210), outline=(100, 100, 100), width=2)
    draw.text((portrait_box[0] + 40, portrait_box[1] + 110), "PHOTO", font=_font(20), fill=(120, 120, 120))

    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    dob = _rand_date()
    id_no = f"ID{random.randint(10000000, 99999999)}"
    issue = _rand_date(2018, 2023)
    expiry = f"{int(issue[-4:]) + 10}{issue[2:6] if False else issue[2:]}"
    expiry = issue[:6] + str(int(issue[-4:]) + 10)

    fields = [
        ("Full Name", name), ("Date of Birth", dob), ("ID Number", id_no),
        ("Issued", issue), ("Expiry", expiry), ("Nationality", country.title()),
    ]
    field_regions = {}
    y = 140
    for label, value in fields:
        draw.text((280, y), f"{label}:", font=_font(18), fill=(70, 70, 70))
        vx, vy = 460, y
        draw.text((vx, vy), value, font=_font(20), fill=(20, 20, 20))
        bbox = draw.textbbox((vx, vy), value, font=_font(20))
        field_regions[label.lower().replace(" ", "_")] = list(bbox)
        y += 42

    draw.line([40, 490, 860, 490], fill=(150, 150, 150), width=1)
    draw.text((40, 500), "This is a fictional specimen document generated for research/demo purposes only.",
               font=_font(13), fill=(120, 120, 120))

    meta = {"document_id": doc_id, "category": "identity", "label": "genuine", "forgery_types": [], "regions": [],
            "field_values": dict(fields), "field_regions": field_regions}
    return img, meta


def make_certificate(doc_id: str) -> tuple[Image.Image, dict]:
    w, h = 1000, 700
    img = Image.new("RGB", (w, h), (250, 248, 240))
    draw = ImageDraw.Draw(img)
    draw.rectangle([15, 15, w - 15, h - 15], outline=(120, 90, 30), width=5)
    draw.rectangle([25, 25, w - 25, h - 25], outline=(120, 90, 30), width=1)

    university = random.choice(UNIVERSITIES)
    draw.text((w / 2, 70), university, font=_font(30), fill=(60, 40, 10), anchor="mm")
    draw.text((w / 2, 115), "CERTIFICATE OF ACHIEVEMENT (FICTIONAL SPECIMEN)", font=_font(16), fill=(90, 70, 30),
              anchor="mm")

    name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
    degree = random.choice(DEGREES)
    reg_no = f"REG{random.randint(100000, 999999)}"
    grad_date = _rand_date(2020, 2025)
    grade = random.choice(["First Class", "Second Class Upper", "Distinction"])

    draw.text((w / 2, 220), "This is to certify that", font=_font(18), fill=(60, 60, 60), anchor="mm")
    name_bbox_anchor = (w / 2, 270)
    draw.text(name_bbox_anchor, name, font=_font(38), fill=(20, 20, 20), anchor="mm")
    name_bbox = draw.textbbox(name_bbox_anchor, name, font=_font(38), anchor="mm")
    draw.text((w / 2, 320), "has successfully completed the requirements for", font=_font(18), fill=(60, 60, 60),
               anchor="mm")
    draw.text((w / 2, 360), degree, font=_font(24), fill=(20, 20, 20), anchor="mm")
    draw.text((w / 2, 400), f"with {grade}", font=_font(18), fill=(60, 60, 60), anchor="mm")

    field_regions = {"name": list(name_bbox)}
    y = 460
    for label, value in [("Registration No.", reg_no), ("Date of Graduation", grad_date)]:
        draw.text((300, y), f"{label}: {value}", font=_font(16), fill=(50, 50, 50))
        bbox = draw.textbbox((300, y), f"{label}: {value}", font=_font(16))
        field_regions[label.lower().replace(" ", "_").replace(".", "")] = list(bbox)
        y += 30

    draw.line([300, 600, 500, 600], fill=(50, 50, 50), width=1)
    draw.text((300, 605), "Registrar (signature placeholder)", font=_font(12), fill=(90, 90, 90))
    draw.ellipse([760, 540, 900, 660], outline=(120, 90, 30), width=3)
    draw.text((830, 600), "SEAL", font=_font(16), fill=(120, 90, 30), anchor="mm")

    field_values = {"name": name, "degree": degree, "registration_no": reg_no, "date_of_graduation": grad_date,
                     "grade": grade, "university": university}
    meta = {"document_id": doc_id, "category": "education", "label": "genuine", "forgery_types": [], "regions": [],
            "field_values": field_values, "field_regions": field_regions}
    return img, meta


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=40, help="genuine documents per category")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    random.seed(args.seed)

    for category in ("identity", "education"):
        (OUT_DIR / category / "genuine").mkdir(parents=True, exist_ok=True)

    manifest = []
    for i in range(args.count):
        doc_id = f"identity_{i:04d}"
        img, meta = make_identity_card(doc_id)
        img.save(OUT_DIR / "identity" / "genuine" / f"{doc_id}.png")
        (OUT_DIR / "identity" / "genuine" / f"{doc_id}.json").write_text(json.dumps(meta, indent=2))
        manifest.append({"path": f"identity/genuine/{doc_id}.png", **{k: meta[k] for k in ("document_id", "category", "label")}})

        doc_id = f"certificate_{i:04d}"
        img, meta = make_certificate(doc_id)
        img.save(OUT_DIR / "education" / "genuine" / f"{doc_id}.png")
        (OUT_DIR / "education" / "genuine" / f"{doc_id}.json").write_text(json.dumps(meta, indent=2))
        manifest.append({"path": f"education/genuine/{doc_id}.png", **{k: meta[k] for k in ("document_id", "category", "label")}})

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Generated {len(manifest)} genuine synthetic documents in {OUT_DIR}")


if __name__ == "__main__":
    main()
