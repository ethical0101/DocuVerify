"""Generates a human-readable forensic explanation from structured evidence.

Architecture: forensic engines -> structured evidence -> fusion -> LLM (optional).
The LLM (if configured) only narrates the evidence it is given; it never
invents findings and never independently decides authenticity. If no LLM key
is configured, a deterministic template-based explanation is used instead so
the product works fully offline."""
from app.core.config import settings


def build_explanation(fusion_result: dict, region_findings: list, forgery_types: list) -> dict:
    if settings.llm_api_key and settings.llm_provider:
        try:
            return _llm_explanation(fusion_result, region_findings, forgery_types)
        except Exception:
            pass  # fall back silently -- core product must keep working
    return _template_explanation(fusion_result, region_findings, forgery_types)


def _template_explanation(fusion_result: dict, region_findings: list, forgery_types: list) -> dict:
    signals = fusion_result["signals"]
    risk = fusion_result["risk_level"]
    score = fusion_result["authenticity_score"]

    available = {k: v for k, v in signals.items() if v is not None}
    if not available or all(v == 0 for v in available.values()):
        return {
            "summary": "Insufficient evidence for a confident assessment.",
            "strongest_evidence": [],
            "recommended_checks": ["Manually inspect the original document", "Verify with the issuing authority"],
            "limitations": "Automated forensic signals were unavailable or inconclusive for this document.",
        }

    ranked = sorted(available.items(), key=lambda kv: kv[1], reverse=True)
    top = [f"{name.replace('_', ' ')} ({value:.0%})" for name, value in ranked if value > 0][:4]

    if risk == "LOW":
        summary = (f"This document shows an authenticity score of {score}%, indicating LOW forensic risk. "
                    "No strong manipulation signals were found across visual, typographic, structural, "
                    "or textual evidence.")
    elif risk == "MEDIUM":
        summary = (f"This document shows an authenticity score of {score}%, indicating MEDIUM forensic risk. "
                    f"The strongest contributing signal is {top[0] if top else 'unclear'}. "
                    "Manual review is recommended before relying on this document.")
    else:
        region_note = ""
        if region_findings:
            region_note = " Suspicious regions are concentrated where flagged evidence overlaps in the viewer."
        summary = (f"This document shows an authenticity score of {score}%, indicating HIGH forensic risk. "
                    f"The strongest evidence is {top[0] if top else 'unclear'}"
                    + (f", combined with {top[1]}" if len(top) > 1 else "") + "."
                    + region_note)

    checks = ["Verify document with the issuing authority", "Manually inspect flagged regions at full resolution"]
    if "typography_inconsistency" in forgery_types:
        checks.append("Compare font rendering against a known-genuine reference document")
    if "metadata_anomaly" in forgery_types:
        checks.append("Review file metadata and edit history if available")

    return {
        "summary": summary,
        "strongest_evidence": top,
        "likely_manipulation_types": forgery_types,
        "recommended_checks": checks,
        "limitations": ("This is an automated forensic risk assessment from a hackathon prototype, not a "
                         "definitive fraud determination. A human verifier should make the final call."),
    }


def _llm_explanation(fusion_result: dict, region_findings: list, forgery_types: list) -> dict:
    import json
    prompt = (
        "You are a document forensics assistant. You are given structured evidence from automated "
        "detectors. Summarize ONLY what is present in the evidence -- never invent findings. Respond as "
        "compact JSON with keys: summary, strongest_evidence (list), recommended_checks (list), limitations.\n\n"
        f"Evidence: {json.dumps(fusion_result)}\n"
        f"Region findings: {json.dumps(region_findings[:10])}\n"
        f"Likely manipulation types: {json.dumps(forgery_types)}\n"
    )
    if settings.llm_provider == "groq":
        return _call_groq(prompt)
    if settings.llm_provider == "gemini":
        return _call_gemini(prompt)
    raise RuntimeError(f"Unsupported LLM provider: {settings.llm_provider}")


def _call_groq(prompt: str) -> dict:
    import json
    import urllib.request
    body = json.dumps({
        "model": settings.llm_model or "llama-3.1-8b-instant",
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
    }).encode()
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions", data=body,
        headers={"Authorization": f"Bearer {settings.llm_api_key}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    return json.loads(data["choices"][0]["message"]["content"])


def _call_gemini(prompt: str) -> dict:
    import json
    import urllib.request
    model = settings.llm_model or "gemini-1.5-flash"
    url = (f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
           f"?key={settings.llm_api_key}")
    body = json.dumps({"contents": [{"parts": [{"text": prompt}]}]}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    text = data["candidates"][0]["content"]["parts"][0]["text"]
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    return json.loads(text)
