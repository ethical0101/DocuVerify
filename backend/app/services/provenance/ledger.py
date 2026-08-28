"""Tamper-evident provenance ledger.

Records a verification fingerprint for each analyzed document so a previously
registered document can later be checked for changes. This is deliberately
minimal and privacy-preserving:

  * We store ONLY the document's SHA-256 hash, a verification id, a UTC
    timestamp, and the analysis summary (score/risk/model version). We NEVER
    store names, dates, ID numbers, OCR text, or the document image itself.
  * Each entry carries a `prev_hash` and an `entry_hash` chained over the
    previous entry, forming an append-only hash chain (a lightweight local
    stand-in for a blockchain). Any edit to a past entry breaks the chain and
    is detectable by verify_chain().

The ledger is a JSON-lines file on the local filesystem -- no external service,
no network, no keys. If the ledger file is unavailable, provenance degrades
gracefully (the core analysis product is never blocked by it)."""
import datetime as dt
import hashlib
import json
import uuid
from pathlib import Path

from app.core.config import settings

LEDGER_PATH: Path = settings.data_dir / "provenance_ledger.jsonl"

GENESIS_HASH = "0" * 64


def _entry_hash(payload: dict) -> str:
    """Deterministic hash over the canonical JSON of an entry's content
    (everything except the entry_hash field itself)."""
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _read_all() -> list[dict]:
    if not LEDGER_PATH.exists():
        return []
    entries = []
    for line in LEDGER_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries


def _last_hash(entries: list[dict]) -> str:
    return entries[-1]["entry_hash"] if entries else GENESIS_HASH


def register(document_sha256: str, summary: dict | None = None) -> dict:
    """Appends a verification fingerprint to the ledger and returns it.

    `summary` is an optional non-sensitive analysis summary (e.g.
    {"authenticity_score": 63.7, "risk_level": "MEDIUM", "model_version": ...}).
    Only whitelisted, non-identifying keys are persisted.
    """
    entries = _read_all()
    prev_hash = _last_hash(entries)

    safe_summary = {}
    if summary:
        for key in ("authenticity_score", "risk_level", "confidence", "model_version"):
            if key in summary:
                safe_summary[key] = summary[key]

    content = {
        "verification_id": uuid.uuid4().hex,
        "document_sha256": document_sha256,
        "timestamp": dt.datetime.utcnow().isoformat() + "Z",
        "summary": safe_summary,
        "prev_hash": prev_hash,
    }
    entry = {**content, "entry_hash": _entry_hash(content)}

    LEDGER_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LEDGER_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry) + "\n")
    return entry


def lookup(document_sha256: str) -> dict:
    """Checks whether a document hash has been registered before.

    Returns the earliest and latest matching entries plus a `changed` flag: if the
    same document content was registered more than once the hash is identical, so
    `changed` is about whether a *previously registered* document is now presenting
    a different hash -- that comparison is done by the caller who has the new hash.
    Here we simply report registration history for this exact hash."""
    matches = [e for e in _read_all() if e.get("document_sha256") == document_sha256]
    return {
        "registered": bool(matches),
        "occurrences": len(matches),
        "first_seen": matches[0]["timestamp"] if matches else None,
        "last_seen": matches[-1]["timestamp"] if matches else None,
        "verification_id": matches[0]["verification_id"] if matches else None,
        "history": [
            {"verification_id": m["verification_id"], "timestamp": m["timestamp"], "summary": m.get("summary", {})}
            for m in matches
        ],
    }


def verify_chain() -> dict:
    """Recomputes the hash chain over the whole ledger and reports its integrity.

    A mismatch means a past entry was altered or removed -- i.e. the tamper-evident
    property was triggered."""
    entries = _read_all()
    prev_hash = GENESIS_HASH
    for i, entry in enumerate(entries):
        content = {k: entry[k] for k in ("verification_id", "document_sha256", "timestamp", "summary", "prev_hash")
                   if k in entry}
        expected = _entry_hash(content)
        if entry.get("prev_hash") != prev_hash:
            return {"intact": False, "broken_at": i, "reason": "prev_hash mismatch", "entries": len(entries)}
        if entry.get("entry_hash") != expected:
            return {"intact": False, "broken_at": i, "reason": "entry_hash mismatch", "entries": len(entries)}
        prev_hash = entry["entry_hash"]
    return {"intact": True, "entries": len(entries), "head": prev_hash if entries else GENESIS_HASH}
