# DocuVerify

## Don't Just Verify Documents. Investigate Them.

DocuVerify is a hackathon-built AI forensic investigation platform for identity documents and
educational certificates. It treats verification as a multi-signal forensic investigation — not a
black-box fake/genuine classifier — and adds an **enterprise adaptive layer**: organizations can train a
lightweight classifier on their own labeled documents and use it alongside the general forensic engine.

**This is a research/hackathon prototype, not an official government verification service.** All
identity/certificate sample and demo documents in this repo are synthetic and fictional. No real
people's data, no real institutions, no connection to any government database.

---

## Table of Contents

1. [Overview](#1-overview) · 2. [Problem Statement](#2-problem-statement) · 3. [Our Solution](#3-our-solution)
4. [Why DocuVerify Is Different](#4-why-docuverify-is-different) · 5. [Key Features](#5-key-features)
6. [User Roles](#6-user-roles) · 7. [Product Workflow](#7-product-workflow)
8. [Quick Scan](#8-quick-scan) · 9. [Forensic Investigation Mode](#9-forensic-investigation-mode)
10. [AI/ML Architecture](#10-aiml-architecture) · 11–17. [OCR / Vision / Typography / Structure / Metadata / NLP / Anomaly Detection](#11-17-forensic-engines)
18. [Evidence Fusion](#18-evidence-fusion) · 19. [Authenticity / Risk / Confidence](#19-authenticity--risk--confidence)
20. [Suspicious Region Localization](#20-suspicious-region-localization) · 21. [Explainable AI](#21-explainable-ai)
22. [Enterprise Adaptive Model](#22-enterprise-adaptive-model) · 23–27. [Dataset Upload / Validation / Training / Registry / Versioning](#23-27-enterprise-training-pipeline)
28. [Authentication](#28-authentication) · 29. [Role-Based Access](#29-role-based-access)
30–31. [Enterprise & HR Workflows](#30-31-workflows) · 32–34. [Demo Dataset / Generation / Datasets](#32-34-datasets)
35. [Models](#35-models) · 36. [Technology Stack](#36-technology-stack) · 37–40. [Architecture](#37-40-architecture)
41. [API Endpoints](#41-api-endpoints) · 42. [Database](#42-database) · 43. [Security](#43-security)
44. [Privacy](#44-privacy) · 45. [Limitations](#45-limitations) · 46. [Evaluation](#46-evaluation)
47. [Performance](#47-performance) · 48–51. [Installation & Running](#48-51-installation--running)
52. [Training Demo Model](#52-training-demo-model) · 53–54. [Demo Accounts & Running the Demo](#53-54-demo)
55. [Testing](#55-testing) · 56. [Troubleshooting](#56-troubleshooting) · 57. [Project Structure](#57-project-structure)
58. [Future Improvements](#58-future-improvements) · 59. [Responsible AI](#59-responsible-ai)
60. [Hackathon Demo Flow](#60-hackathon-demo-flow) · 61. [License](#61-license) · 62. [Acknowledgements](#62-acknowledgements)

---

## 1. Overview

DocuVerify analyzes an uploaded identity document or educational certificate across five independent
forensic evidence sources, fuses them into a transparent risk assessment, localizes exactly which
regions triggered concern, and explains why — in language built for a human reviewer, not a data
scientist. An **enterprise layer** on top lets an organization train a small classifier on its own
labeled documents (e.g. its own certificate template) and get an organization-tuned second opinion
alongside the general engine.

## 2. Problem Statement

Banks, universities, government departments, and employers routinely need to assess whether an
uploaded certificate or identity document has been manipulated. A single "real/fake" score is not
enough: reviewers need to know *where* the concern is, *why* it was flagged, *how strong* the evidence
is, and *what to check by hand* — while every organization's own documents look slightly different from
everyone else's, which a purely general model can't fully account for.

## 3. Our Solution

```
Upload → Analyze → Localize → Diagnose → Explain → Assist Human Verification
```

A general forensic engine runs on every document, always. An organization can optionally layer a
lightweight model — trained on its own labeled examples — on top, without ever replacing or hiding the
general engine's evidence.

## 4. Why DocuVerify Is Different

- **Multi-signal, not single-score.** Visual, typography, structure, metadata, and text-consistency
  engines each contribute independently-inspectable evidence.
- **Region-level localization**, not just a verdict — every finding is boxed on the actual document.
- **Two analysis modes on one pipeline.** Quick Scan and step-by-step Forensic Investigation call the
  *exact same* backend stages; only the orchestration/reveal differs (see [§8–9](#8-quick-scan)).
- **Adaptive, not static.** The enterprise layer lets an organization's own document ecosystem improve
  the assessment, with full transparency about which model produced which number (§22).
- **Honest by construction.** Every metric in this repo is regenerated from live code, not authored by
  hand — including a documented case where a scoring idea was tried, measured, found to hurt, and
  disabled (see [`MODEL_CARD.md`](MODEL_CARD.md)).

## 5. Key Features

Document intake (PDF/PNG/JPG) · perspective correction · OCR · visual forensics (ELA, noise, edge-
sharpness, copy-move) · typography analysis · structure/layout analysis · metadata analysis · NLP
consistency checks · evidence fusion · authenticity/risk/confidence scoring · interactive region
overlays with an evidence drawer · WHAT/WHERE/WHY explanations · investigation history · evidence
explorer · document comparison · enterprise authentication & roles · dataset upload & validation ·
lightweight model training with real progress · model registry & activation · audit log · user
management.

## 6. User Roles

| Role | Can do |
|---|---|
| **Enterprise Admin** | Everything below, plus: manage organization users, upload/validate datasets, train models, view training progress & evaluation, create/activate/archive model versions, view the audit log, view organization analytics. |
| **HR / Verifier** | Upload documents, run Quick Scan or Forensic Investigation, inspect evidence, view reports, view investigation history — automatically uses the organization's active model if one exists. |
| **Viewer** | Read-only report access (role exists in the data model; UI for it is minimal in this build). |

Unauthenticated use is also fully supported — the core forensic pipeline (no enterprise model) works
without logging in at all, so the product demos standalone.

## 7. Product Workflow

```
DOCUMENT
   ↓
PREPROCESSING
   ↓
┌──────────┬────────────┬────────────┐
  OCR        VISION       STRUCTURE
   ↓            ↓             ↓
TYPOGRAPHY   METADATA        NLP
   └──────────┬────────────┘
              ↓
      FORENSIC FEATURES
              ↓
       EVIDENCE FUSION
              ↓
    BASE RISK ASSESSMENT
              ↓
    ORGANIZATION MODEL (if active)
              ↓
  FINAL ENTERPRISE ASSESSMENT
              ↓
     EXPLAINABLE REPORT
```

## 8. Quick Scan

Upload → the full pipeline runs automatically → the redesigned report: Document Evidence Map → Key
Findings → Overall Assessment → Evidence Matrix → Explanation → Recommended Human Checks → Technical
Details. Judges/evaluators typically use this path.

## 9. Forensic Investigation Mode

A manual, step-by-step workspace with a persistent timeline navigator: Document Intake → OCR → Visual
Forensics → Typography → Structure → Metadata → Consistency → Evidence Fusion. Each stage shows its own
real result (extracted OCR fields with confidence, per-stage findings, file metadata, the final score) —
you can revisit completed stages. **This calls the identical backend pipeline as Quick Scan**; the
pipeline was refactored into named stage functions (`analyze_document_intake`, `analyze_ocr`,
`analyze_visual_forensics`, `analyze_typography_stage`, `analyze_structure`, `analyze_metadata_stage`,
`analyze_consistency_stage`, `fuse_and_assess`) specifically so both modes share one implementation.

## 10. AI/ML Architecture

```
DOCUMENT
   ↓
PREPROCESSING (PyMuPDF, Pillow)
   ↓
OCR (EasyOCR → pytesseract → unavailable)
   ↓
COMPUTER VISION (OpenCV: ELA, noise residual, edge-sharpness/ringing, copy-move)
   ↓
TYPOGRAPHY (OCR-box glyph-height/ink-density statistics)
   ↓
STRUCTURE (OCR-box geometry statistics)
   ↓
METADATA (EXIF / PDF doc-info)
   ↓
NLP / CONSISTENCY (regex date/identifier cross-checks)
   ↓
ANOMALY DETECTION (per-engine 0-1 scores + region bboxes)
   ↓
EVIDENCE FUSION (transparent weighted average; optional trained fusion)
   ↓
RISK ASSESSMENT (authenticity / forensic risk / confidence)
   ↓
ENTERPRISE MODEL (org-trained RandomForest/LogisticRegression, additive)
   ↓
EXPLAINABLE AI (deterministic template, or optional LLM narration)
```

See [`docs/architecture.md`](docs/architecture.md) for the full stage-by-stage description and
[`docs/methodology.md`](docs/methodology.md) for the fusion-weight rationale.

## 11–17. Forensic Engines

| Stage | What it does | Nature |
|---|---|---|
| **OCR** | Text + bounding boxes + confidence via EasyOCR (CRAFT detector + CRNN recognizer), falling back to pytesseract or "unavailable." | **Pretrained** external model. |
| **Computer Vision Forensics** | ELA, noise-residual stats, edge-sharpness/ringing (Laplacian variance), copy-move block matching — each compared against the document's own robust (median/MAD) baseline. | **Feature/rule-based.** |
| **Typography Analysis** | Clusters OCR words by glyph height, flags outliers within their own cluster (so mixed label/value font sizes on a form aren't false positives). | **Feature/rule-based.** |
| **Document Structure Analysis** | Line-spacing regularity, margin conventions from OCR geometry. | **Feature/rule-based.** |
| **Metadata Analysis** | EXIF (images) / doc-info (PDFs); missing metadata is reported neutrally, never as suspicious. | **Feature/rule-based.** |
| **NLP / Consistency** | Date-relationship sanity checks, repeated-identifier consistency, over OCR text via regex. | **Rule-based.** |
| **Anomaly Detection** | Every engine above emits 0–1 anomaly scores + bounding boxes, normalized into one shared evidence schema (`app/services/evidence.py`). | **Feature/rule-based.** |

## 18. Evidence Fusion

A fixed, documented weighted average (`app/services/fusion/fusion.py`) — not a black box. Weights:
visual 0.30, semantic 0.25, typography 0.20, structure 0.15, metadata 0.10 (rationale in
`docs/methodology.md`). A "corroboration bonus" (extra weight when two different engines flag
overlapping regions) was tried, **measured to hurt** discrimination on the eval set, and disabled — see
[`MODEL_CARD.md`](MODEL_CARD.md) for that story told straight. An optional trained Logistic Regression
fusion alternative exists (`scripts/train_fusion_model.py`) but is not the production default.

## 19. Authenticity / Risk / Confidence

Three separate numbers, never conflated:

- **Authenticity (0–100):** higher = more evidence supporting authenticity.
- **Forensic Risk (0–100):** the complementary risk view, shown explicitly (not just implied).
- **Assessment Confidence (0–100):** how much of the *possible* evidence weight actually contributed a
  signal. A blurry scan that starves OCR (and everything downstream of it) lowers confidence — it does
  **not** manufacture risk. Missing metadata is neutral, not a red flag. Multiple independent strong
  findings in the same region raise risk more meaningfully than one weak signal ever could.

## 20. Suspicious Region Localization

Every visual/typography/structure/consistency finding that has a bounding box is rendered as an
interactive overlay on the actual document (`DocumentViewer.tsx`), color-coded by severity, with zoom
controls. Clicking a region opens an evidence drawer (desktop: right side; mobile: bottom
sheet/full-screen) with type, severity, confidence, what was found, why it matters, and a recommended
human check — synchronized with a "Key Findings" list so clicking either one highlights the other.

## 21. Explainable AI

The explanation is built from the *actual strongest evidence item* (WHAT was found, WHERE, WHY it
matters, HOW strong, corroboration if any) — not a generic "authenticity score of X% indicates Y risk"
sentence. If an LLM provider is configured (`LLM_PROVIDER`/`LLM_API_KEY`, optional, free-tier Groq/
Gemini), it narrates the same structured evidence object; it never independently decides authenticity
and never invents findings. With no LLM configured, a deterministic template runs instead — the product
works fully offline either way.

## 22. Enterprise Adaptive Model

```
BASE FORENSIC ENGINE
   ↓
OCR · Visual · Typography · Structure · Metadata · NLP · Anomaly signals
   ↓
FORENSIC FEATURE VECTOR  (9 features, fixed schema — ml/models/enterprise_classifier.py)
   ↓
ORGANIZATION DATASET  (admin-uploaded ZIP, validated)
   ↓
LIGHTWEIGHT ML TRAINING  (RandomForest, or LogisticRegression for very small datasets)
   ↓
ORGANIZATION MODEL
   ↓
MODEL EVALUATION  (real accuracy/precision/recall/F1/ROC-AUC on a held-out test split)
   ↓
MODEL VERSION  (stored in the model registry, archived by default)
   ↓
ADMIN ACTIVATES MODEL
   ↓
HR / VERIFIER USES ACTIVE MODEL  (additive to the base assessment, never a replacement)
```

The classifier consumes exactly the same structured features the base pipeline already computes for
every document (`ml/training/feature_extractor.py`) — it is **not** a deep model and does **not**
retrain OCR or any pretrained component. See `ml/models/enterprise_classifier.py`,
`ml/training/train_enterprise_model.py`, `ml/inference/enterprise_predictor.py`, and
[`docs/enterprise_training.md`](docs/enterprise_training.md) for the full pipeline and code map.

## 23–27. Enterprise Training Pipeline

**Dataset upload:** admin uploads a `.zip` (`genuine/`, `forged/`, optional `metadata.csv`) at
`/enterprise/datasets`. **Validation:** safe extraction (path-traversal guard, extension allowlist,
size/count caps) → per-image corruption check → class-balance/minimum-sample check → a plain pass/fail
checklist shown in the UI, never a crash for an imperfect dataset. **Training:** runs in a background
thread with **real** stage progress (dataset prep → feature extraction → split → model training →
validation → evaluation → packaging → completed) polled by the frontend every 1.5s — not a simulated
progress bar; each stage genuinely completes before the next begins. **Registry:** every trained version
is stored with its algorithm, dataset, metrics, and status. **Versioning:** activating a version
archives the previously-active one of the same name; nothing is silently overwritten, and rollback is
just re-activating an older version.

## 28. Authentication

Email/password with PBKDF2-HMAC-SHA256 password hashing (200,000 iterations, per-user random salt,
stdlib `hashlib` — no plaintext ever stored) and short-lived (12h) JWTs signed with a secret generated
once per install and persisted to a gitignored local file (`data/.jwt_secret`, or set `JWT_SECRET` in
the environment). Registration creates an Organization + its first admin User in one step. Logout is
stateless — the client discards the token. See [`SECURITY.md`](SECURITY.md) for the honest threat model
(no forgot-password flow, no token revocation list — accepted trade-offs for this build's scope).

## 29. Role-Based Access

Enforced **server-side** (`app/api/deps.py`'s `require_admin` dependency on every enterprise route), not
just hidden in the UI — an HR account calling an admin endpoint directly gets a 403, not just a missing
menu item. The frontend also role-gates enterprise routes (`ProtectedRoute requireRole="admin"`) purely
for UX, redirecting non-admins to the dashboard.

## 30–31. Workflows

**Enterprise (Admin):** Register/Login → Enterprise Dashboard → Dataset Management → upload ZIP →
validation → Train Organization Model → real progress → metrics → Model Registry → Activate → (optional)
add HR users → Audit Log shows every step. **HR / Verifier:** Login → Dashboard → New Investigation →
Quick Scan or Forensic Investigation → base pipeline runs → if the org has an active model, it runs too
→ Document Evidence Map → click a region → evidence drawer → Overall Assessment shows both the base
engine's number and the organization model's number side by side (`ReportPage.tsx`'s "Assessment Model"
section) → Investigation History → reopen any past case.

## 32–34. Datasets

**Core forensic dataset** (`data/synthetic/`): fictional identity cards + certificates and their forged
variants, generated by `scripts/generate_synthetic_documents.py` + `scripts/generate_forgeries.py`, split
70/15/15 by source document ID (no leakage). **Enterprise demo dataset**
(`demo_datasets/organization_demo_dataset.zip`, included in this repo, ~2.5MB): 15 genuine + 45 forged
fictional certificates for a fictional organization ("Northstar Institute of Technology" by default),
generated by `demo_datasets/generate_demo_dataset.py` (reuses the same underlying generators,
parameterized with a custom organization name, packaged into the flat `genuine/forged/metadata.csv`
layout the enterprise upload endpoint expects). Full dataset methodology, and which external datasets
(SIDTD/IDNet/MIDV-500/DocTamper) were considered and explicitly not downloaded, in
[`DATASETS.md`](DATASETS.md).

## 35. Models

| Model | Type | Trained by DocuVerify? |
|---|---|---|
| EasyOCR (CRAFT + CRNN) | Pretrained | No — external pretrained model, used as-is. |
| Visual/typography/structure/metadata/consistency engines | Classical CV / rule-based | N/A — not a trained model. |
| Fusion (default) | Fixed weighted average | No — hand-picked, documented weights. |
| Fusion (optional) | Logistic Regression | Yes — `scripts/train_fusion_model.py`, not production default. |
| **Enterprise classifier** | RandomForest (or LogisticRegression for small data) | **Yes** — trained per-organization on that organization's uploaded dataset. |

Full honesty breakdown (pretrained vs. trained-by-us vs. rule-based) in [`MODEL_CARD.md`](MODEL_CARD.md).

## 36. Technology Stack

**Backend:** FastAPI, SQLAlchemy + SQLite, OpenCV, PyMuPDF, EasyOCR, scikit-learn, PyJWT, joblib.
**Frontend:** React, Vite, TypeScript, Tailwind CSS, Framer Motion, React Router. **ML:** classical CV +
OCR-derived statistics + RandomForest/LogisticRegression (scikit-learn) for the enterprise layer.

## 37–40. Architecture

**System:** see the diagram in [§7](#7-product-workflow). **Backend:** `backend/app/{api,core,models,
services}` — `api/` holds routers (`routes.py` core forensics, `auth_routes.py`, `enterprise_routes.py`),
`services/` holds each forensic engine plus `enterprise/` (dataset validation, audit log) as its own
module, `models/db_models.py` holds every SQLAlchemy model. **Frontend:** `frontend/src/{pages,
components,layout,auth,api}` — `pages/` are route-level screens (including `pages/enterprise/` for the
admin console), `components/` are shared building blocks (`DocumentViewer`, `EvidenceDrawer`,
`EvidenceMatrix`, `ScoreCard`, `ForensicTimeline`, ...), `auth/` holds the auth context + route guard.
**ML code:** `ml/{models,training,inference}` at the repo root (see §22) — deliberately separate from
`backend/` and `scripts/` so training/inference code has no hard dependency on the FastAPI app and can
run standalone.

## 41. API Endpoints

**Core:** `POST /api/documents/upload`, `POST /api/documents/{id}/analyze`, `GET /api/documents/{id}`,
`GET /api/documents/{id}/results`, `GET /api/documents/{id}/evidence`, `GET /api/documents/{id}/regions`,
`GET /api/documents/{id}/report`, `GET /api/documents/{id}/file`, `GET /api/documents`,
`GET /api/dashboard/stats`, `GET /api/health`.
**Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`.
**Enterprise (admin unless noted):** `POST /api/enterprise/datasets/upload`, `GET /api/enterprise/datasets`,
`POST /api/enterprise/train`, `GET /api/enterprise/training-jobs/{id}`,
`GET /api/enterprise/models` (any org member), `POST /api/enterprise/models/{id}/activate`,
`GET|POST /api/enterprise/users`, `PATCH /api/enterprise/users/{id}`, `GET /api/enterprise/audit-log`,
`GET /api/enterprise/dashboard`. Full interactive docs at `/docs` once the backend is running.

## 42. Database

SQLite via SQLAlchemy. Core tables: `documents`, `analyses` (now includes `enterprise_model_id` +
`enterprise_assessment`). Enterprise tables: `organizations`, `users`, `datasets`, `training_jobs`,
`model_versions`, `audit_logs` — every enterprise record carries an `organization_id`, giving simple
local-DB multi-tenancy (no distributed system, appropriate for this hackathon's scope).

## 43. Security

Hashed passwords (never plaintext), signed short-lived JWTs, server-side role enforcement, safe ZIP
extraction (path-traversal guard, extension allowlist, size/count caps), randomized upload filenames (no
path traversal via filename), models are only ever loaded from paths this backend itself wrote (never
deserialized from an uploaded file), no secrets committed, SHA-256 fingerprinting of uploads. Full
threat model in [`SECURITY.md`](SECURITY.md) — including the honest list of what this build does *not*
harden (no forgot-password, no token revocation, permissive CORS for demo convenience).

## 44. Privacy

Fully local processing by default. No document content leaves the machine unless an LLM provider is
explicitly configured — and even then only the structured evidence object (never the raw image) is
sent. Audit log records *who did what*, never document contents. All demo/sample documents are
synthetic and fictional.

## 45. Limitations

- Evaluated only on this project's own synthetic dataset — not validated on real scans/photographs.
- Fusion ROC-AUC is a real-but-weak ~0.56 on the core forensic test set (see [`MODEL_CARD.md`](MODEL_CARD.md));
  the enterprise classifier scores meaningfully better (F1 ~71%, ROC-AUC ~0.67) on its own narrower,
  single-template dataset — expected, since one organization's documents are far more homogeneous than a
  cross-category benchmark, and not a claim that the general engine itself improved.
- No forgot-password flow; no token revocation list; CORS is permissive for demo convenience.
- English-only OCR/text heuristics. No real government database connection (by design).
- Two experimental visual detectors (`copy_move.py`, `jpeg_blockiness.py`) exist but are unwired due to
  false-positive rates — documented as future work, not shipped half-validated.

## 46. Evaluation

Real, regenerable numbers only — see [`evaluation/report.md`](evaluation/report.md),
[`evaluation/results.json`](evaluation/results.json), and [`MODEL_CARD.md`](MODEL_CARD.md). Nothing in
this repository is a fabricated metric.

## 47. Performance

Base pipeline: ~2–7s per document (CPU-only EasyOCR dominates; no GPU wired in this build). Enterprise
training: a 60-document demo dataset (15 genuine + 45 forged) trains in roughly 2–4 minutes end to end,
dominated by running the base pipeline once per document to extract features (cached within one training
run — never re-extracted twice for the same run).

## 48–51. Installation & Running

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; `source venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
cp .env.example .env            # optional
uvicorn app.main:app --reload --port 8000
```
API at `http://localhost:8000` (docs at `/docs`). On first run this creates a fresh SQLite DB and a
`data/.jwt_secret` file automatically.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` (proxies `/api` to `http://localhost:8000`).

### Core dataset (primary, synthetic)
```bash
python scripts/generate_synthetic_documents.py --count 40
python scripts/generate_forgeries.py
python scripts/prepare_datasets.py
```

## 52. Training Demo Model

```bash
python demo_datasets/generate_demo_dataset.py --count 15 --seed 42 --organization "Your Org Name"
```
generates `demo_datasets/organization_demo_dataset.zip`, ready to upload at `/enterprise/datasets` and
train from `/enterprise/training` — or let `scripts/setup_demo.py` (below) do the whole thing.

## 53–54. Demo Accounts & Running the Demo

```bash
python scripts/setup_demo.py
```
(backend must already be running) creates the demo organization + admin + HR accounts, generates the
demo dataset if missing, uploads/trains/activates a model — end to end, reproducibly.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@demo.docuverify.local` | `demopass123` |
| HR | `hr@demo.docuverify.local` | `demopass123` |

These are clearly-labeled local demo credentials, not real accounts — see
[`scripts/setup_demo.py`](scripts/setup_demo.py) for exactly what it creates.

## 55. Testing

Manually verified this session: admin/HR login and logout, invalid-login rejection, role-gated route
redirect (frontend) and 403 (backend), dataset upload with a valid ZIP and validation-checklist display,
end-to-end training with real per-stage progress, model activation/rollback, HR document analysis with
the organization model correctly layered on the base result, region-overlay click → evidence drawer,
Forensic Investigation stage-by-stage progression, investigation history reopening, unsupported/corrupt/
empty-file uploads failing gracefully, multi-page PDF, rotated image. See
[`docs/demo.md`](docs/demo.md) for the full scripted walkthrough.

## 56. Troubleshooting

- **Backend won't start / port 8000 busy:** another process is bound to it — stop it or change
  `--port`.
- **"OCR unavailable"** in a result: EasyOCR failed to load (first run downloads its models — needs
  network access once) or pytesseract isn't on PATH; the pipeline degrades gracefully either way.
- **Training seems stuck:** check `GET /api/enterprise/training-jobs/{id}` — the `feature_extraction`
  stage is the slow one (one base-pipeline pass per image); a 60-image dataset takes a few minutes.
- **Login works but enterprise pages 404/redirect:** you're logged in as `hr` or `viewer`, not `admin` —
  by design (§29).

## 57. Project Structure

```
DocuVerify/
├── backend/app/{api,core,models,schemas,services}   FastAPI app
│   └── services/enterprise/                          dataset validation, audit log
├── ml/{models,training,inference}                    enterprise classifier (repo-root, see §37-40)
├── frontend/src/{pages,pages/enterprise,components,layout,auth,api}
├── scripts/            dataset gen, split, forgery gen, evaluation, fusion training, setup_demo.py
├── demo_datasets/       enterprise demo ZIP + its generator
├── data/{synthetic,raw,uploads,enterprise}            (enterprise/ + uploads/ gitignored)
├── evaluation/          real evaluation results
├── demo/                curated sample documents
├── docs/{architecture,methodology,enterprise_training,demo}.md
├── README.md, DATASETS.md, MODEL_CARD.md, SECURITY.md, FINAL_REPORT.md
```

## 58. Future Improvements

Calibrate fusion weights on a larger dataset; wire the unshipped `copy_move.py`/`jpeg_blockiness.py`
detectors after reducing false positives; portrait-substitution detection; multi-page analysis; forgot-
password flow; token revocation; background job queue instead of a raw thread for training; model
comparison across organizations; hash-based provenance/fingerprint registry.

## 59. Responsible AI

DocuVerify never claims to be an official verification service, guaranteed fraud detection, or
production-grade enterprise security. Every result is framed as a **forensic risk assessment** requiring
**human verification** — never "100% fake" or "guaranteed forgery." The enterprise model is explicitly
additive and disclosed (§22, §44) — a reviewer always sees both the base engine's and the organization
model's numbers, never just one unexplained final figure.

## 60. Hackathon Demo Flow

See [`docs/demo.md`](docs/demo.md) for the full ~3–5 minute script:
Admin login → Enterprise Dashboard → Datasets → upload → validate → Train → real progress → metrics →
Model Registry → Activate → logout → HR login → New Investigation → Forensic Investigation → walk every
stage → Evidence Map → click a region → drawer → Overall Assessment (base vs. organization model) →
Investigation History → reopen a case.

## 61. License

See [`LICENSE`](LICENSE) (MIT).

## 62. Acknowledgements

Built for a 24-hour hackathon by [ethical0101](https://github.com/ethical0101). EasyOCR, OpenCV,
scikit-learn, FastAPI, and React/Vite/Tailwind power this prototype — see [§36](#36-technology-stack).
