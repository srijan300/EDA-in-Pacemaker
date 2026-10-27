"""JSON API for the patient mobile app.

Plain Django (no DRF) to avoid adding a dependency. All endpoints are CSRF-exempt
(they're token-authenticated, not cookie/session based) and return JSON.

Auth model
----------
* ``POST /api/auth/request-password`` {email} -> if the email matches a
  registered patient, generate a random password, set it on the account, and
  email a deep link containing a one-time setup token.
* ``GET  /api/auth/setup/<token>`` -> validates the link (used by the deep link
  landing so the app can confirm the token before showing login).
* ``POST /api/auth/login`` {email, password} -> returns an API token.
* ``POST /api/auth/change-password`` (auth) {old_password, new_password}.
* ``GET  /api/me`` (auth) -> patient profile + current voltage.

Device sync
-----------
* ``GET  /api/pacemaker/voltage`` (auth) -> the doctor's target voltage for this
  patient (what the app must write to the pacemaker).
* ``POST /api/pacemaker/voltage/ack`` (auth) {voltage} -> app confirms it wrote
  the value to the device; server marks it delivered.
* ``POST /api/heartrate`` (auth) {readings:[{bpm, recorded_at, voltage}]} ->
  app uploads heart-rate readings it pulled from the pacemaker.
"""

import json
import secrets
from functools import wraps

from django.conf import settings
from django.contrib.auth import authenticate
from django.core.mail import send_mail
from django.db.models import Avg, Max, Min
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import ApiToken, HeartRateRecord, PasswordSetupLink, Patient
from .simulation import clamp_voltage, push_voltage


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _json_body(request):
    try:
        return json.loads(request.body or "{}")
    except (ValueError, TypeError):
        return {}


def _error(message, status=400):
    return JsonResponse({"ok": False, "error": message}, status=status)


def _auth_user(request):
    """Resolve the user from an ``Authorization: Token <key>`` header."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Token "):
        return None
    key = header[6:].strip()
    try:
        token = ApiToken.objects.select_related("user").get(key=key)
    except ApiToken.DoesNotExist:
        return None
    token.last_used_at = timezone.now()
    token.save(update_fields=["last_used_at"])
    return token.user


def require_token(view):
    @wraps(view)
    def wrapper(request, *args, **kwargs):
        user = _auth_user(request)
        if user is None:
            return _error("Authentication required.", status=401)
        request.api_user = user
        try:
            request.patient = user.patient_profile
        except Patient.DoesNotExist:
            return _error("No patient profile for this account.", status=403)
        return view(request, *args, **kwargs)

    return wrapper


def _patient_payload(patient):
    return {
        "id": patient.pk,
        "patient_id": patient.patient_id,
        "full_name": patient.full_name,
        "email": patient.email,
        "blood_type": patient.blood_type,
        "current_voltage": round(patient.current_voltage, 2),
        "target_voltage": round(patient.target_voltage, 2),
        "voltage_pending": patient.voltage_pending,
        "pacemaker_serial": patient.pacemaker_serial,
        "last_pushed_at": patient.last_pushed_at.isoformat() if patient.last_pushed_at else None,
        "last_pulled_at": patient.last_pulled_at.isoformat() if patient.last_pulled_at else None,
    }


# --------------------------------------------------------------------------
# Auth endpoints
# --------------------------------------------------------------------------
@csrf_exempt
def request_password(request):
    """Auto-generate a password and email a setup link, if the email matches."""
    try:
        if request.method != "POST":
            return _error("POST required.", status=405)
        email = _json_body(request).get("email", "").strip().lower()
        if not email:
            return _error("Email is required.")

        # Find a patient registered with this email that has a login account.
        patient = (
            Patient.objects.select_related("user")
            .filter(email__iexact=email, user__isnull=False)
            .first()
        )

        # Always return the same response so we don't leak which emails exist.
        generic = JsonResponse(
            {"ok": True, "message": "If that email is registered, a password link has been sent."}
        )
        if not patient or not patient.user:
            return generic

        user = patient.user
        temp_password = secrets.token_urlsafe(9)  # ~12 chars
        user.set_password(temp_password)
        user.is_active = True
        user.save()

        link = PasswordSetupLink.issue_for(user)
        # Deep link back into the app (Expo scheme) with the email + password baked
        # in so the landing screen can auto-fill and log in.
        deep_link = f"{getattr(settings, 'APP_DEEP_LINK_BASE', 'pacelink://auth/setup')}/{link.token}"

        body = (
            f"Hello {patient.full_name},\n\n"
            f"Here is your temporary password for the PaceLink patient app:\n\n"
            f"    {temp_password}\n\n"
            f"Open the app and log in with your email and this password, or tap:\n"
            f"    {deep_link}\n\n"
            f"You can change your password from the app after logging in.\n"
            f"This link expires in {PasswordSetupLink.EXPIRY_HOURS} hours.\n"
        )
        send_mail(
            "Your PaceLink app password",
            body,
            settings.DEFAULT_FROM_EMAIL,
            [patient.email],
            fail_silently=False,
        )
        return generic
    except Exception as e:
        import traceback
        with open("error.log", "w") as f:
            f.write(traceback.format_exc())
        return _error(f"Internal error: {str(e)}", status=500)


@csrf_exempt
def setup_link(request, token):
    """Validate a setup link (used by the app's deep-link landing)."""
    try:
        link = PasswordSetupLink.objects.select_related("user").get(token=token)
    except PasswordSetupLink.DoesNotExist:
        return _error("Invalid link.", status=404)
    if not link.is_valid:
        return _error("This link has expired or already been used.", status=410)
    return JsonResponse({"ok": True, "email": link.user.email})


import traceback

@csrf_exempt
def login(request):
    try:
        if request.method != "POST":
            return _error("POST required.", status=405)
        data = _json_body(request)
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        if not email or not password:
            return _error("Email and password are required.")

        patient = (
            Patient.objects.select_related("user")
            .filter(email__iexact=email, user__isnull=False)
            .first()
        )
        if not patient or not patient.user:
            return _error("Invalid email or password.", status=401)

        user = authenticate(username=patient.user.username, password=password)
        if user is None:
            return _error("Invalid email or password.", status=401)

        # Mark any pending setup link consumed now that they've logged in.
        PasswordSetupLink.objects.filter(user=user, used_at__isnull=True).update(
            used_at=timezone.now()
        )

        token = ApiToken.generate_for(user)
        return JsonResponse(
            {"ok": True, "token": token.key, "patient": _patient_payload(patient)}
        )
    except Exception as e:
        with open("error.log", "w") as f:
            f.write(traceback.format_exc())
        return _error(f"Internal error: {str(e)}", status=500)


@csrf_exempt
@require_token
def change_password(request):
    if request.method != "POST":
        return _error("POST required.", status=405)
    data = _json_body(request)
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")
    if len(new_password) < 8:
        return _error("New password must be at least 8 characters.")
    if not request.api_user.check_password(old_password):
        return _error("Current password is incorrect.", status=401)
    request.api_user.set_password(new_password)
    request.api_user.save()
    # Invalidate other tokens for safety; keep the current session working by
    # issuing a fresh one.
    request.api_user.api_tokens.all().delete()
    token = ApiToken.generate_for(request.api_user)
    return JsonResponse({"ok": True, "token": token.key})


@csrf_exempt
@require_token
def me(request):
    return JsonResponse({"ok": True, "patient": _patient_payload(request.patient)})


# --------------------------------------------------------------------------
# Device-sync endpoints
# --------------------------------------------------------------------------
@csrf_exempt
@require_token
def get_voltage(request):
    """The target voltage the app should write to the pacemaker."""
    p = request.patient
    return JsonResponse(
        {
            "ok": True,
            "target_voltage": round(p.target_voltage, 2),
            "current_voltage": round(p.current_voltage, 2),
            "voltage_pending": p.voltage_pending,
        }
    )


@csrf_exempt
@require_token
def ack_voltage(request):
    """App confirms it wrote the voltage to the device -> mark delivered."""
    if request.method != "POST":
        return _error("POST required.", status=405)
    p = request.patient
    raw = _json_body(request).get("voltage", p.target_voltage)
    try:
        written = clamp_voltage(raw)
    except (TypeError, ValueError):
        return _error("Invalid voltage.")
    # Align the target to what was actually written, then mark pushed/delivered.
    p.target_voltage = written
    p.save(update_fields=["target_voltage"])
    changed = push_voltage(p, user=request.api_user)
    return JsonResponse(
        {"ok": True, "current_voltage": round(p.current_voltage, 2), "changed": changed}
    )


@csrf_exempt
@require_token
def upload_heartrate(request):
    """App uploads heart-rate readings it pulled from the pacemaker."""
    if request.method != "POST":
        return _error("POST required.", status=405)
    p = request.patient
    readings = _json_body(request).get("readings", [])
    if not isinstance(readings, list):
        return _error("readings must be a list.")

    created = 0
    objs = []
    for r in readings:
        try:
            bpm = int(r["bpm"])
        except (KeyError, TypeError, ValueError):
            continue
        recorded_at = r.get("recorded_at")
        when = timezone.now()
        if recorded_at:
            from django.utils.dateparse import parse_datetime

            parsed = parse_datetime(recorded_at)
            if parsed is not None:
                when = parsed
        objs.append(
            HeartRateRecord(
                patient=p,
                bpm=max(0, min(300, bpm)),
                voltage_at_reading=r.get("voltage", p.current_voltage),
                recorded_at=when,
            )
        )
    if objs:
        HeartRateRecord.objects.bulk_create(objs)
        created = len(objs)
        p.last_pulled_at = timezone.now()
        p.save(update_fields=["last_pulled_at"])

    return JsonResponse({"ok": True, "stored": created})


@csrf_exempt
@require_token
def list_heartrate(request):
    """The patient's own heart-rate history, for the app's Readings tab.

    Query params:
      limit - max readings to return, newest first (default 200, max 500).
      days  - only include readings from the last N days (optional).
    """
    p = request.patient
    qs = HeartRateRecord.objects.filter(patient=p)

    days = request.GET.get("days")
    if days:
        try:
            since = timezone.now() - timezone.timedelta(days=int(days))
            qs = qs.filter(recorded_at__gte=since)
        except (TypeError, ValueError):
            pass

    agg = qs.aggregate(avg_bpm=Avg("bpm"), min_bpm=Min("bpm"), max_bpm=Max("bpm"))
    count = qs.count()

    try:
        limit = min(500, max(1, int(request.GET.get("limit", 200))))
    except (TypeError, ValueError):
        limit = 200

    readings = [
        {
            "bpm": r.bpm,
            "voltage": r.voltage_at_reading,
            "recorded_at": r.recorded_at.isoformat(),
        }
        for r in qs.order_by("-recorded_at")[:limit]
    ]

    return JsonResponse(
        {
            "ok": True,
            "count": count,
            "avg_bpm": round(agg["avg_bpm"], 1) if agg["avg_bpm"] is not None else None,
            "min_bpm": agg["min_bpm"],
            "max_bpm": agg["max_bpm"],
            "readings": readings,
        }
    )
