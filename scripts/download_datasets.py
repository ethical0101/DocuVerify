"""Attempts to fetch small subsets of public identity-forensics datasets
(SIDTD, MIDV-500) for optional supplementary use. This hackathon build's
PRIMARY dataset is the synthetic generator (generate_synthetic_documents.py +
generate_forgeries.py) -- it needs no network access and has no licensing
constraints. This script is best-effort and skips gracefully on any failure
(no network, no auth, dataset too large) per the resource-aware dataset rule.

Usage:
    python scripts/download_datasets.py --small
"""
import argparse
import shutil
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"

# Small, direct-download-friendly samples only. Full dataset downloads
# (IDNet is 100+GB, SIDTD/MIDV-500 are multi-GB) are intentionally NOT
# attempted here -- see DATASETS.md for manual acquisition instructions.
MIDV500_SAMPLE_URL = "ftp://smartengines.com/midv-500/dataset/01_alb_id.zip"


def check_network() -> bool:
    try:
        urllib.request.urlopen("https://github.com", timeout=5)
        return True
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--small", action="store_true", help="download only small representative subsets")
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    if not check_network():
        print("No network access detected (or external hosts unreachable from this environment).")
        print("Skipping external dataset downloads. The synthetic dataset generator is the primary")
        print("data source for this build -- run generate_synthetic_documents.py and generate_forgeries.py.")
        return

    print("Network is reachable, but this hackathon build intentionally does not auto-download")
    print("SIDTD / IDNet / MIDV-500 by default -- they require dataset-specific auth (Zenodo/Kaggle) or")
    print("are too large for a 24-hour build. See DATASETS.md for manual, license-compliant acquisition")
    print("steps if you want to supplement the synthetic dataset with real public samples.")


if __name__ == "__main__":
    main()
