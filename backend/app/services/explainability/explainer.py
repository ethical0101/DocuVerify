"""Generates a human-readable forensic explanation from structured evidence.

Architecture: forensic engines -> structured evidence -> fusion -> LLM (optional).
The LLM (if configured) only narrates the evidence it is given; it never
invents findings and never independently decides authenticity. If no LLM key
is configured, a deterministic template-based explanation is used instead so
the product works fully offline."""
from app.core.config import settings


def build_explanation(fusion_result: dict, region_findings: list, forgery_types: list,
                       evidence_list: list | None = None) -> dict:
    evidence_list = evidence_list or []
    if settings.llm_api_key and settings.llm_provider:
        try:
            return _llm_explanation(fusion_result, region_findings, forgery_types)
        except Exception:
            pass  # fall back silently -- core product must keep working
    return _template_explanation(fusion_result, region_findings, forgery_types, evidence_list)


def _template_explanation(fusion_result: dict, region_findings: list, forgery_types: list,
                           evidence_list: list) -> dict:
    """Builds a WHAT/WHERE/WHY-grounded summary from the actual evidence items rather than
    a generic 'authenticity score of X% indicates Y risk' sentence -- the score is already
    shown numerically elsewhere in the UI; the text here exists to say what was found and
    why it matters, which a bare number can't."""
    risk = fusion_result["risk_level"]

    real_findings = sorted(
        (e for e in evidence_list if not e.get("informational") and (e.get("score") or 0) > 0),
        key=lambda e: e.get("score") or 0, reverse=True,
    )

    if not real_findings:
        return {
            "summary": "No significant forensic anomalies were found across visual, typographic, "
                       "structural, or textual evidence. This does not by itself guarantee "
                       "authenticity -- only that this system's available signals found nothing "
                       "notable to flag.",
            "strongest_evidence": [],
            "likely_manipulation_types": [],
            "recommended_checks": ["Verify with the issuing authority as a standard precaution"],
            "limitations": ("This is an automated forensic risk assessment from a hackathon prototype, "
                             "not a definitive fraud determination. A human verifier should make the "
                             "final call."),
        }

    top = real_findings[0]
    location = f' in the "{top["matched_text"]}" region' if top.get("matched_text") else ""
    corroboration_note = ""
    if top.get("corroborated"):
        corroboration_note = " This was independently corroborated by more than one forensic engine."

    if risk == "LOW":
        summary = (f"No strong manipulation signals were found. The most notable observation is "
                    f"{top['title'].lower()}{location} (confidence {round((top['score'] or 0) * 100)}%), "
                    f"but it does not reach the threshold for elevated risk.")
    else:
        distinct_second = next((e for e in real_findings[1:] if e["title"] != top["title"]), None)
        second = f' A second, independent finding -- {distinct_second["title"].lower()} -- adds ' \
                 f'further evidence.' if distinct_second else ""
        summary = (f"{top['title']} was detected{location}. {top['why_it_matters']}{corroboration_note}"
                    f"{second}")

    strongest = [f"{e['title']} ({round((e['score'] or 0) * 100)}%)"
                 + (' -- corroborated by a second engine' if e.get("corroborated") else "")
                 for e in real_findings[:4]]

    checks = list(dict.fromkeys(e["recommended_check"] for e in real_findings[:3]))
    checks.append("Verify document with the issuing authority")

    return {
        "summary": summary,
        "strongest_evidence": strongest,
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
