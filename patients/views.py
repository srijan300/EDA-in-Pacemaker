"""Views for the pacemaker clinic.

All views are scoped to the logged-in doctor: a doctor only ever sees and
mutates their own patients. The push/pull endpoints return JSON so the browser
can call them both on the 30-minute timer and via the immediate buttons.
"""

import json

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from .forms import AddPatientForm
from .models import MAX_VOLTAGE, MIN_VOLTAGE, Patient, VoltageChange
from .simulation import (
    SYNC_INTERVAL_MINUTES,
    clamp_voltage,
    pull_heart_rates,
    push_voltage,
    sync_patient,
)


def _get_patient(request, pk):
    """Fetch a patient owned by the current doctor, or 404."""
    return get_object_or_404(Patient, pk=pk, doctor=request.user)


def _patient_state(patient):
    """Serialisable snapshot of a patient's live pacemaker state."""
    records = list(
        patient.heart_rate_records.values("bpm", "recorded_at", "voltage_at_reading")[:60]
    )
    return {
        "id": patient.pk,
        "current_voltage": round(patient.current_voltage, 2),
        "target_voltage": round(patient.target_voltage, 2),
        "voltage_pending": patient.voltage_pending,
        "last_pushed_at": patient.last_pushed_at.isoformat() if patient.last_pushed_at else None,
        "last_pulled_at": patient.last_pulled_at.isoformat() if patient.last_pulled_at else None,
        "latest_heart_rate": patient.latest_heart_rate,
        "heart_rates": [
            {
                "bpm": r["bpm"],
                "recorded_at": r["recorded_at"].isoformat(),
                "voltage": r["voltage_at_reading"],
            }
            for r in records
        ],
    }


@login_required
def patient_list(request):
    patients = request.user.patients.all()
    return render(
        request,
        "patients/list.html",
        {"patients": patients, "sync_interval": SYNC_INTERVAL_MINUTES},
    )


@login_required
def add_patient(request):
    if request.method == "POST":
        form = AddPatientForm(request.POST, doctor=request.user)
        if form.is_valid():
            patient = form.save()
            messages.success(request, f"Patient {patient.full_name} registered.")
            return redirect("patient_detail", pk=patient.pk)
    else:
        form = AddPatientForm(doctor=request.user)
    return render(request, "patients/add.html", {"form": form})


@login_required
def patient_detail(request, pk):
    patient = _get_patient(request, pk)
    return render(
        request,
        "patients/detail.html",
        {
            "patient": patient,
            "min_voltage": MIN_VOLTAGE,
            "max_voltage": MAX_VOLTAGE,
            "sync_interval": SYNC_INTERVAL_MINUTES,
            "voltage_changes": patient.voltage_changes.all()[:10],
        },
    )


@login_required
def delete_patient(request, pk):
    """Confirm, then permanently remove a patient and all their history.

    GET  -> show a confirmation page spelling out exactly what will be deleted.
    POST -> perform the deletion (owner-scoped).

    Related rows (heart-rate records, voltage changes) cascade via the FK
    on_delete. The patient's linked auth User is removed too, so a deleted
    patient can no longer sign in to the mobile app.
    """
    patient = _get_patient(request, pk)

    if request.method != "POST":
        # Show the confirmation page with counts of what will be wiped.
        return render(
            request,
            "patients/confirm_delete.html",
            {
                "patient": patient,
                "heart_rate_count": patient.heart_rate_records.count(),
                "voltage_change_count": patient.voltage_changes.count(),
                "has_login": patient.user is not None,
            },
        )

    name = patient.full_name
    login_user = patient.user  # the auto-created patient login account, if any

    patient.delete()
    if login_user is not None:
        # Guard: never delete a staff/superuser account by mistake.
        if not (login_user.is_staff or login_user.is_superuser):
            login_user.delete()

    messages.success(
        request, f"Patient {name} and their entire history were permanently deleted."
    )
    return redirect("patient_list")


def _read_voltage(request):
    """Pull a voltage value out of either JSON body or form-encoded POST."""
    if request.content_type and "application/json" in request.content_type:
        try:
            data = json.loads(request.body or "{}")
        except (ValueError, TypeError):
            data = {}
        return data.get("voltage")
    return request.POST.get("voltage")


@login_required
@require_POST
def set_voltage(request, pk):
    """Alter the target voltage (create a pending VoltageChange). No push yet."""
    patient = _get_patient(request, pk)
    raw = _read_voltage(request)
    try:
        new_voltage = clamp_voltage(raw)
    except (TypeError, ValueError):
        return JsonResponse({"ok": False, "error": "Invalid voltage."}, status=400)

    previous = patient.target_voltage
    if abs(previous - new_voltage) > 1e-9:
        patient.target_voltage = new_voltage
        patient.save(update_fields=["target_voltage"])
        VoltageChange.objects.create(
            patient=patient,
            changed_by=request.user,
            previous_voltage=previous,
            new_voltage=new_voltage,
            pushed=False,
        )

    payload = {"ok": True, "state": _patient_state(patient)}
    if _wants_json(request):
        return JsonResponse(payload)
    messages.success(request, f"Target voltage set to {new_voltage} V (pending push).")
    return redirect("patient_detail", pk=patient.pk)


@login_required
@require_POST
def push_now(request, pk):
    """Immediately push the altered voltage to the device/server."""
    patient = _get_patient(request, pk)
    changed = push_voltage(patient, user=request.user)
    payload = {"ok": True, "changed": changed, "state": _patient_state(patient)}
    if _wants_json(request):
        return JsonResponse(payload)
    messages.success(
        request,
        "Voltage pushed to device." if changed else "Device already up to date.",
    )
    return redirect("patient_detail", pk=patient.pk)


@login_required
@require_POST
def pull_now(request, pk):
    """Immediately pull heart-rate records from the server."""
    patient = _get_patient(request, pk)
    new_records = pull_heart_rates(patient)
    payload = {
        "ok": True,
        "new_readings": len(new_records),
        "state": _patient_state(patient),
    }
    if _wants_json(request):
        return JsonResponse(payload)
    messages.success(request, f"Pulled {len(new_records)} new heart-rate reading(s).")
    return redirect("patient_detail", pk=patient.pk)


@login_required
@require_POST
def sync_now(request, pk):
    """Immediate full sync: push voltage then pull records (one patient)."""
    patient = _get_patient(request, pk)
    result = sync_patient(patient, user=request.user)
    payload = {"ok": True, **result, "state": _patient_state(patient)}
    if _wants_json(request):
        return JsonResponse(payload)
    messages.success(request, "Sync complete.")
    return redirect("patient_detail", pk=patient.pk)


@login_required
@require_POST
def sync_all(request):
    """Sync every patient for this doctor. Called by the 30-minute timer."""
    results = []
    for patient in request.user.patients.all():
        result = sync_patient(patient, user=request.user)
        results.append({"id": patient.pk, **result, "state": _patient_state(patient)})
    return JsonResponse(
        {"ok": True, "synced_at": timezone.now().isoformat(), "patients": results}
    )


def _wants_json(request):
    """True if the caller is the JS client rather than a plain form post."""
    return (
        request.headers.get("x-requested-with") == "XMLHttpRequest"
        or "application/json" in (request.headers.get("accept") or "")
        or "application/json" in (request.content_type or "")
    )
