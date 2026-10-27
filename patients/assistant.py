"""Heart-health AI assistant for the patient mobile app.

Architecture (see design notes below for the reasoning):

* One tool, one round trip. The model can call ``get_heart_rate_data`` to
  pull the calling patient's own readings/voltage from the database. We cap
  the loop at a single tool round trip — this assistant answers questions
  about one patient's own data, not open-ended multi-step tasks, so there's
  no benefit to letting it chain further tool calls, and capping it bounds
  both latency and cost.
* Stateless on the server. Conversation history is passed in by the client
  each request (same pattern as everything else in this API — token auth,
  no server-side session). The client caps how much history it sends.
* Guardrails live in the system prompt, not in code that inspects the
  model's output after the fact: the model is told plainly it (1) is not a
  diagnostic tool, (2) must never recommend a specific voltage change —
  that decision belongs to the treating doctor — and (3) must redirect to
  emergency care for red-flag symptoms (chest pain, fainting, severe
  shortness of breath) rather than trying to triage them itself.
* No SDK dependency. Talks to the Anthropic Messages API directly over
  HTTPS with the standard library (``urllib``), consistent with the rest of
  this project's policy of not adding dependencies that can't be installed
  where it runs. This only needs a live HTTPS call at request time (the
  server machine has internet), not a package install.

Failure modes handled explicitly:
* No ANTHROPIC_API_KEY configured -> clear, non-crashing error to the app.
* Network/timeout errors -> surfaced as a normal error response, never a
  500; the mobile UI already knows how to show an inline error.
* Malformed tool-use response from the model -> falls back to returning
  whatever text the model did produce rather than failing the whole request.
"""

import json
import urllib.request
import urllib.error
import os

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Avg, Max, Min

from .models import HeartRateRecord
from .api import _error, _json_body, require_token

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
REQUEST_TIMEOUT_S = 25
MAX_TOKENS = 700
MAX_HISTORY_TURNS = 6  # most recent user/assistant pairs the client may send

SYSTEM_PROMPT = """You are the "Heart Assistant" inside PaceLink, an app for \
patients who have a pacemaker. You help the patient understand heart rate, \
pacemakers, and their own recorded data.

Rules you must always follow:
1. You are informational only, not a diagnostic or treatment tool. Never \
tell the patient they do or don't have a specific condition.
2. Never suggest a specific voltage / pacemaker setting change, or tell the \
patient to change one themselves. Voltage is set only by their doctor. If \
asked, explain that clearly and suggest they raise it with their care team.
3. If the patient describes a red-flag symptom — chest pain, fainting, \
severe shortness of breath, a fast or irregular heartbeat they've never had \
before, or anything that sounds like an emergency — tell them plainly to \
seek emergency care now, before anything else.
4. When it's useful, call the get_heart_rate_data tool to look at the \
patient's own recent readings and voltage before answering, and refer to \
specific numbers from it (e.g. "your average over the last 7 days was..."). \
Don't call it for questions that are purely general knowledge.
5. Keep answers short and plain-spoken — a few sentences, not an essay. \
This is a phone screen, not a report.
6. End with a brief reminder to talk to their care team about anything \
that concerns them, but only when the topic warrants it — don't repeat \
this on every single reply."""

TOOL_DEF = {
    "functionDeclarations": [
        {
            "name": "get_heart_rate_data",
            "description": (
                "Get this patient's own recent heart-rate readings and current/target "
                "pacemaker voltage. Use this before answering any question about the "
                "patient's actual heart rate, trends, or readings."
            ),
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "days": {
                        "type": "INTEGER",
                        "description": "How many days of history to pull. Default 14.",
                    }
                },
            },
        }
    ]
}


def _heart_rate_tool_result(patient, days=14):
    try:
        days = max(1, min(90, int(days)))
    except (TypeError, ValueError):
        days = 14
    since = timezone.now() - timezone.timedelta(days=days)
    qs = HeartRateRecord.objects.filter(patient=patient, recorded_at__gte=since)
    agg = qs.aggregate(avg_bpm=Avg("bpm"), min_bpm=Min("bpm"), max_bpm=Max("bpm"))
    latest = qs.order_by("-recorded_at").first()
    recent = list(
        qs.order_by("-recorded_at")[:20].values("bpm", "voltage_at_reading", "recorded_at")
    )
    return {
        "window_days": days,
        "reading_count": qs.count(),
        "avg_bpm": round(agg["avg_bpm"], 1) if agg["avg_bpm"] is not None else None,
        "min_bpm": agg["min_bpm"],
        "max_bpm": agg["max_bpm"],
        "latest_bpm": latest.bpm if latest else None,
        "latest_recorded_at": latest.recorded_at.isoformat() if latest else None,
        "current_voltage": round(patient.current_voltage, 2),
        "target_voltage": round(patient.target_voltage, 2),
        "recent_readings": [
            {
                "bpm": r["bpm"],
                "voltage": r["voltage_at_reading"],
                "recorded_at": r["recorded_at"].isoformat(),
            }
            for r in recent
        ],
    }


# Models to try, in order. gemini-1.5-* was retired by Google (all requests
# now 404) so the configured/default model is a current GA model; the
# fallbacks below only kick in if that specific model id isn't available for
# this API key/project (e.g. account only has access to an older or newer
# tier), so one stale model id doesn't take the whole assistant down.
FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"]


def _gemini_request(model, api_key, contents):
    url = GEMINI_URL.format(model=model, key=api_key)

    payload = json.dumps(
        {
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}]
            },
            "tools": [TOOL_DEF],
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": MAX_TOKENS,
            }
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        method="POST",
        headers={
            "content-type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_S) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _gemini_call(contents):
    # Using the ANTHROPIC_API_KEY environment variable just so we don't have to
    # modify settings.py, which requires finding everywhere it is used.
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return None, "The heart assistant isn't configured yet (missing API key)."

    configured_model = getattr(settings, "ANTHROPIC_MODEL", "") or FALLBACK_MODELS[0]
    models_to_try = [configured_model] + [m for m in FALLBACK_MODELS if m != configured_model]

    last_error = None
    for model in models_to_try:
        try:
            return _gemini_request(model, api_key, contents), None
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")[:300]
            last_error = f"Heart assistant service error ({e.code}): {detail}"
            # 404 means this particular model id isn't available for this key
            # — worth trying the next candidate. Anything else (401/403/429/5xx)
            # won't be fixed by switching models, so stop immediately.
            if e.code != 404:
                return None, last_error
            continue
        except urllib.error.URLError as e:
            return None, f"Couldn't reach the heart assistant service: {e.reason}"
        except TimeoutError:
            return None, "The heart assistant took too long to respond. Try again."

    return None, last_error or "The heart assistant is temporarily unavailable."


def _extract_text(parts):
    return "\n".join(p["text"] for p in parts if "text" in p).strip()


@csrf_exempt
@require_token
def ask_assistant(request):
    """POST {question, history?} -> {answer}.

    ``history`` is an optional list of {role: "user"|"assistant", content: str}
    from earlier in this on-screen conversation (client-held, not stored
    server-side). Only the most recent MAX_HISTORY_TURNS*2 messages are used.
    """
    if request.method != "POST":
        return _error("POST required.", status=405)

    data = _json_body(request)
    question = (data.get("question") or "").strip()
    if not question:
        return _error("A question is required.")

    history = data.get("history") or []
    if not isinstance(history, list):
        history = []
        
    contents = []
    
    for h in history[-MAX_HISTORY_TURNS * 2 :]:
        role = h.get("role")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            # map assistant to model for gemini API
            gemini_role = "model" if role == "assistant" else "user"
            contents.append({"role": gemini_role, "parts": [{"text": content}]})

    contents.append({"role": "user", "parts": [{"text": question}]})

    result, error = _gemini_call(contents)
    if error:
        return _error(error, status=502)

    # Extract the response from Gemini
    if not result.get("candidates"):
        return JsonResponse({"ok": True, "answer": "Sorry, I couldn't process that.", "used_data": False})
        
    candidate = result["candidates"][0]
    content = candidate.get("content", {})
    parts = content.get("parts", [])
    
    # Check if a tool was called
    tool_call = next((p["functionCall"] for p in parts if "functionCall" in p), None)
    preamble = _extract_text(parts)
    
    if tool_call:
        if tool_call["name"] == "get_heart_rate_data":
            args = tool_call.get("args", {})
            tool_result = _heart_rate_tool_result(request.patient, days=args.get("days", 14))
            
            # Create a response that contains both the assistant's previous function call 
            # and the user's function response
            contents.append({"role": "model", "parts": parts})
            # Current Gemini API expects the function response back under
            # role "user", not "function" (older docs/examples used
            # "function", but that's been superseded).
            contents.append({
                "role": "user",
                "parts": [{
                    "functionResponse": {
                        "name": "get_heart_rate_data",
                        "response": {"result": tool_result}
                    }
                }]
            })
            
            final, error2 = _gemini_call(contents)
            if error2:
                return _error(error2, status=502)
                
            if not final.get("candidates"):
                return JsonResponse({"ok": True, "answer": preamble or "Sorry, I couldn't process that.", "used_data": True})
                
            final_content = final["candidates"][0].get("content", {})
            answer = _extract_text(final_content.get("parts", []))
            return JsonResponse({"ok": True, "answer": answer or preamble or "Sorry, I couldn't process that.", "used_data": True})
            
    answer = _extract_text(parts)
    return JsonResponse({"ok": True, "answer": answer or "Sorry, I couldn't process that.", "used_data": False})
