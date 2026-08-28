"""One-click enterprise demo setup: registers a demo organization + admin + HR
user, generates the organization demo dataset (if not already present), and
optionally uploads + trains + activates a model against it via the live API --
so an evaluator can go straight to logging in and clicking through the demo
flow instead of performing every setup step by hand.

Requires the backend to already be running (`uvicorn app.main:app`).

Usage:
    python scripts/setup_demo.py
    python scripts/setup_demo.py --skip-training   # just create accounts + dataset
    python scripts/setup_demo.py --api http://127.0.0.1:8000/api
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]

DEMO_ORG = "Northstar Institute of Technology"
DEMO_ADMIN = ("admin@demo.docuverify.local", "demopass123")
DEMO_HR = ("hr@demo.docuverify.local", "demopass123")
DATASET_ZIP = ROOT / "demo_datasets" / "organization_demo_dataset.zip"


def wait_for_backend(api_base: str, timeout: int = 30) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            if requests.get(f"{api_base}/health", timeout=3).ok:
                return
        except requests.RequestException:
            pass
        time.sleep(1)
    raise SystemExit(f"Backend not reachable at {api_base} -- start it with "
                      "`uvicorn app.main:app` from backend/ first.")


def ensure_account(api_base: str, org: str, email: str, password: str, is_first: bool) -> str | None:
    """Registers the org+admin on the first call, adds subsequent users via the
    admin token. Returns a login token for `email`, or None if login failed."""
    login_resp = requests.post(f"{api_base}/auth/login", json={"email": email, "password": password})
    if login_resp.ok:
        print(f"  {email} already exists -- reusing.")
        return login_resp.json()["token"]

    if is_first:
        resp = requests.post(f"{api_base}/auth/register",
                              json={"organization_name": org, "email": email, "password": password})
        if not resp.ok:
            print(f"  Could not register {email}: {resp.text}")
            return None
        print(f"  Registered organization '{org}' with admin {email}.")
        return resp.json()["token"]
    return None


def ensure_hr_user(api_base: str, admin_token: str, email: str, password: str) -> None:
    check = requests.post(f"{api_base}/auth/login", json={"email": email, "password": password})
    if check.ok:
        print(f"  {email} already exists -- reusing.")
        return
    resp = requests.post(f"{api_base}/enterprise/users", headers={"Authorization": f"Bearer {admin_token}"},
                          json={"email": email, "password": password, "role": "hr"})
    if resp.ok:
        print(f"  Added HR user {email}.")
    else:
        print(f"  Could not add HR user: {resp.text}")


def ensure_dataset() -> None:
    if DATASET_ZIP.exists():
        print(f"  Dataset already present: {DATASET_ZIP}")
        return
    print("  Generating organization demo dataset...")
    subprocess.run([sys.executable, str(ROOT / "demo_datasets" / "generate_demo_dataset.py"),
                     "--count", "15", "--seed", "42", "--organization", DEMO_ORG], check=True)


def train_and_activate(api_base: str, admin_token: str) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    with open(DATASET_ZIP, "rb") as f:
        resp = requests.post(f"{api_base}/enterprise/datasets/upload", headers=headers,
                              files={"file": (DATASET_ZIP.name, f, "application/zip")})
    if not resp.ok:
        print(f"  Dataset upload failed: {resp.text}")
        return
    dataset = resp.json()
    print(f"  Uploaded dataset: {dataset['genuine_count']} genuine / {dataset['forged_count']} forged "
          f"({dataset['status']}).")
    if dataset["status"] != "validated":
        print("  Dataset not ready for training -- skipping.")
        return

    resp = requests.post(f"{api_base}/enterprise/train", headers=headers,
                          json={"dataset_id": dataset["id"], "model_name": "Certificate Forensics"})
    job_id = resp.json()["training_job_id"]
    print(f"  Training started (job {job_id}) -- this runs the base forensic pipeline over every "
          f"document, so it can take a few minutes...")

    deadline = time.time() + 600
    while time.time() < deadline:
        job = requests.get(f"{api_base}/enterprise/training-jobs/{job_id}", headers=headers).json()
        if job["status"] in ("completed", "failed"):
            break
        time.sleep(3)
    else:
        print("  Training did not finish within the timeout -- check it later in the UI.")
        return

    if job["status"] == "failed":
        print(f"  Training failed: {job['error']}")
        return

    model_id = job["model_version_id"]
    resp = requests.post(f"{api_base}/enterprise/models/{model_id}/activate", headers=headers)
    model = resp.json()
    print(f"  Trained and activated {model['name']} {model['version']} "
          f"(F1={model['metrics'].get('f1')}, ROC-AUC={model['metrics'].get('roc_auc')}).")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://127.0.0.1:8000/api")
    parser.add_argument("--skip-training", action="store_true",
                         help="only create accounts + generate the dataset, skip upload/train/activate")
    args = parser.parse_args()

    print("Waiting for backend...")
    wait_for_backend(args.api)

    print("\nSetting up demo organization and accounts...")
    admin_token = ensure_account(args.api, DEMO_ORG, *DEMO_ADMIN, is_first=True)
    if not admin_token:
        raise SystemExit("Could not obtain an admin session -- aborting.")
    ensure_hr_user(args.api, admin_token, *DEMO_HR)

    print("\nPreparing demo dataset...")
    ensure_dataset()

    if not args.skip_training:
        print("\nTraining and activating the demo organization model...")
        train_and_activate(args.api, admin_token)

    print("\nDemo setup complete.")
    print(f"  Admin login: {DEMO_ADMIN[0]} / {DEMO_ADMIN[1]}")
    print(f"  HR login:    {DEMO_HR[0]} / {DEMO_HR[1]}")


if __name__ == "__main__":
    main()
