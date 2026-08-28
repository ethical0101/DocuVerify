# Demo Script (~5 minutes: ~2 min enterprise setup, ~3 min investigation)

Sample documents live in `demo/identity/` and `demo/certificate/` (also served to the frontend via
`frontend/public/samples/` for the one-click "Try a Sample Document" buttons). All are synthetic and
fictional — see `DATASETS.md`. Run `python scripts/setup_demo.py` before this script to have the demo
organization, accounts, dataset, and an activated model ready in one step (see `README.md` §53–54).

**For a one-click "everything lights up" walkthrough** (e.g. showing a professor/judge the full pipeline
in a single pass): New Investigation → **Sample: all signals triggered (demo)**. This one document
(`demo/identity/showcase_all_signals.png`, built by `scripts/generate_showcase_demo.py`) genuinely
triggers all five non-OCR forensic signals at once — visual, typography, structure, metadata, and
consistency all show real findings, and the Evidence Matrix shows every non-OCR row as "Suspicious." It
combines a text-replaced name field, a mismatched-font-size re-render, an implausible issue-date gap
against the expiry date, and an embedded Photoshop EXIF signature — each independently verified against
the live pipeline by the generator script, not hand-set.

## Part A — Enterprise Setup (Admin)

### 1. Admin login (~15s)
- `/login` → `admin@demo.docuverify.local` / `demopass123` → redirected to the Enterprise Dashboard.
- Point out: active model, F1/accuracy, investigation counts by risk — all real DB values.

### 2. Dataset Management (~45s)
- `/enterprise/datasets` → upload `demo_datasets/organization_demo_dataset.zip` (or generate a fresh one
  with `python demo_datasets/generate_demo_dataset.py`).
- Show the validation checklist appearing live: image counts, genuine/forged split, no corrupted files.

### 3. Train Organization Model (~60–90s, mostly waiting)
- `/enterprise/training` → select the validated dataset → **Start Training**.
- Point out the real stage-by-stage progress (preparing dataset → extracting forensic features → split →
  training estimators → validating → evaluating → saving model) — this is genuinely happening, not a
  fake progress bar; feature extraction is the slow step because it runs the full base pipeline once per
  image.
- When it completes: real accuracy/precision/recall/F1/ROC-AUC appear.

### 4. Model Registry & Activation (~20s)
- `/enterprise/models` → **Activate** the new version. Note the previous version automatically moves to
  Archived (still available for rollback).
- Optionally: `/enterprise/audit-log` to show every step above was recorded.
- Logout.

## Part B — Investigation (HR / Verifier)

### 5. HR login (~10s)
- `hr@demo.docuverify.local` / `demopass123` → Dashboard (no Enterprise nav visible — role-gated).

### 6. Genuine certificate — Quick Scan (~20s)
- New Investigation → Quick Scan → **Sample: genuine ID** or a genuine certificate sample.
- Expect LOW-to-MEDIUM risk, few or no flagged regions.

### 7. Forged certificate — Forensic Investigation (~90s)
- New Investigation → **Forensic Investigation** mode → **Sample: forged certificate**.
- Walk the timeline: Document Intake → OCR (extracted fields with confidence) → Visual Forensics
  (suspicious regions on the document) → Typography → Structure → Metadata (shown as neutral "INFO," not
  a warning, when unavailable) → Consistency → Evidence Fusion (Authenticity / Forensic Risk / Confidence
  as three distinct numbers) → **View Full Report**.

### 8. Evidence Map interaction (~30s)
- On the report: click a highlighted region → evidence drawer opens (what was found, why it matters,
  recommended human check) — synced with the Key Findings list.
- Scroll to **Assessment Model**: base forensic engine's authenticity number *next to* the organization
  model's number — the enterprise "wow" moment, showing the org-trained model as an additive second
  opinion, never a hidden replacement.
- Scroll to Evidence Matrix: per-layer contribution table.

### 9. Investigation History (~15s)
- `/investigations` → reopen the case just analyzed.

## Honest limitations callout (~15s)
- Every report footer states this is a forensic risk-assessment prototype, not an official verification
  service. Real evaluation numbers (never fabricated) are in `evaluation/report.md` and `MODEL_CARD.md`
  — including a documented case where a scoring idea was tried, measured to hurt, and disabled.

## Fallback if the backend/LLM is unavailable
- The pipeline runs fully offline; no external API is required for the demo. If OCR itself is
  unavailable in a given environment, the app still returns a graceful result noting which signals
  could not be computed rather than crashing (see `SECURITY.md` / `MODEL_CARD.md` fallback behavior).
