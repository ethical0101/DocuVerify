# Security

## File handling
- Uploads are restricted to `.pdf`, `.png`, `.jpg`, `.jpeg` (checked by extension and re-validated by
  the image/PDF decoder itself — a malformed or renamed file fails to decode rather than being trusted).
- Upload size is capped (`MAX_UPLOAD_MB`, default 25MB).
- Uploaded files are renamed to a random UUID-based filename on disk (`app/api/routes.py`) — the
  original filename is stored only as metadata, never used as a path, which rules out path traversal
  via a crafted filename.
- Uploaded files are never executed, parsed as code, or passed to a shell. PDF rendering uses PyMuPDF
  (a pure library call, no external `pdftoppm`/poppler subprocess).
- The SHA-256 of every upload is recorded, giving a basic tamper-evidence / dedup fingerprint.

## Enterprise dataset ZIP handling
- Uploaded dataset ZIPs are untrusted input, handled defensively in
  `app/services/enterprise/dataset_service.py`: standard zip-slip / path-traversal guard (rejects any
  member path containing `..` or resolving outside the extraction directory), an extension allowlist
  (only `.png`/`.jpg`/`.jpeg`/`.csv` members are extracted — everything else, including any executable,
  is silently skipped), a total-size cap (`MAX_DATASET_MB`) and a member-count cap (`MAX_DATASET_FILES`).
- The ZIP is only ever treated as a bag of image files (opened with Pillow) plus one optional CSV parsed
  with `csv.DictReader` — nothing in it is ever executed, imported, or deserialized.
- A dataset ZIP can never contain a model file that gets loaded: the extension allowlist excludes
  `.joblib`/`.pkl`, and model loading (`EnterpriseDocumentClassifier.load()`) only ever reads a path this
  backend itself wrote during its own training run — never a path derived from user input.

## Authentication & authorization
- Passwords are hashed with PBKDF2-HMAC-SHA256 (200,000 iterations, per-user random salt) — never stored
  in plaintext, never logged. See `app/core/security.py`.
- Sessions are short-lived (12h) JWTs signed with a secret generated once per install and persisted to a
  gitignored local file (`data/.jwt_secret`); set `JWT_SECRET` in the environment to override.
- Role checks (`admin`/`hr`/`viewer`) are enforced **server-side** on every enterprise route
  (`app/api/deps.py`'s `require_admin`), not just hidden in the UI.
- Every enterprise record (`users`, `datasets`, `training_jobs`, `model_versions`, `audit_logs`,
  `documents`) carries an `organization_id`. Isolation is enforced at **both** levels, not just list
  views: `GET /api/documents` and `GET /api/dashboard/stats` are filtered by the caller's
  `organization_id`, and every per-document endpoint (`results`/`report`/`evidence`/`file`/`regions`)
  goes through `_get_authorized_document()`, which 404s (not 403, to avoid confirming a document exists)
  for anyone outside the document's organization — a document ID being hard to guess is not treated as
  sufficient access control. A document uploaded anonymously (no organization) stays readable by anyone,
  matching the "core forensics works without login" design. This is single-instance SQLite isolation,
  not a distributed/hardened multi-tenant architecture, appropriate for this hackathon's scope.
- **Not implemented** (accepted trade-offs for a hackathon build, not oversights hidden from you): no
  forgot-password/reset flow, no server-side token revocation list (a leaked token is valid until it
  expires), no rate limiting on login attempts, no email verification.

## Secrets
- No secrets are committed to this repository. `.env.example` lists the configurable secrets
  (`LLM_API_KEY` optional, `JWT_SECRET` optional — auto-generated otherwise). `.env` and
  `data/.jwt_secret` are gitignored.
- The LLM integration is entirely optional; with no key configured, the explainability engine falls
  back to a deterministic, template-based explanation and the product works fully offline.

## API surface
- CORS is currently permissive (`*`) for hackathon demo convenience — this should be restricted to a
  known frontend origin before any real deployment.
- Most document-analysis endpoints work fully unauthenticated by design (so the core forensic demo works
  standalone without requiring an account) — logging in only adds the organization context needed to
  layer an enterprise model on top of the same base assessment.
- No connection is made to any government identity database (Aadhaar, Passport Seva, DMV, etc.) — this
  is a forensic-signal prototype, not an official verification integration, by design (see README).

## Privacy
- Documents are processed locally (backend runs on your own machine/server); no document content is
  sent to a third party unless you explicitly configure an LLM provider for the explanation step — and
  even then, only the structured evidence object (scores/regions/labels) is sent, never the raw image.
- All identity/certificate sample documents shipped in this repo are synthetic and fictional
  (see `DATASETS.md`) — no real person's data is included.
- Uploaded documents are stored under `data/uploads/` (gitignored) and are not automatically deleted;
  add a retention/cleanup job before any non-demo use.

## Known limitations (threat model)
- This is a 24-hour hackathon prototype. It has not had a formal security audit or penetration test.
- Classical computer-vision forensic signals (ELA, noise residuals) can be defeated by a sufficiently
  careful forger; they are decision-support signals for a human reviewer, not a guarantee.
- The OCR/typography/layout heuristics are tuned on synthetic renders and may behave differently on
  real scanned/photographed documents (see `MODEL_CARD.md` limitations).
