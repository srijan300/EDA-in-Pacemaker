"""The 'server side' of the pacemaker link.

In a real deployment these functions would talk to the device / cloud service.
Here the Django database plays that role and heart-rate readings are simulated.
Keeping this logic in one module means it can be swapped for a real HTTP client
later without touching the views.
"""

import hashlib
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import HeartRateRecord, MAX_VOLTAGE, MIN_VOLTAGE

# How often the phone syncs, in minutes. Referenced by the views and templates.
SYNC_INTERVAL_MINUTES = 30

# One simulated reading every this many minutes.
READING_EVERY_MINUTES = 1
# Cap how many readings a single pull can generate (e.g. after a long gap) so a
# stale patient doesn't create thousands of rows at once. At 1-minute spacing
# this covers a 2-hour catch-up window; a normal 30-minute sync produces 30
# readings, well under the cap.
MAX_READINGS_PER_PULL = 120


def clamp_voltage(value):
    """Clamp a requested voltage into the device's safe programmable range."""
    return max(MIN_VOLTAGE, min(MAX_VOLTAGE, float(value)))


def _deterministic_jitter(seed_text):
    """Return a stable pseudo-random float in [0, 1) from a seed string.

    Deterministic (no ``random``) so results are reproducible and testable.
    """
    digest = hashlib.sha256(seed_text.encode("utf-8")).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def _simulate_bpm(voltage, seed_text):
    """Model a heart rate from the pacemaker voltage.

    Higher output voltage nudges the paced rate up a little. A resting baseline
    of ~70 bpm with modest voltage influence and bounded jitter keeps values in
    a physiologically plausible 55-110 range.
    """
    baseline = 70.0
    voltage_effect = (voltage - 2.5) * 4.0  # ~ +/-20 bpm across the range
    jitter = (_deterministic_jitter(seed_text) - 0.5) * 12.0  # +/-6 bpm
    bpm = baseline + voltage_effect + jitter
    return int(max(50, min(120, round(bpm))))


@transaction.atomic
def push_voltage(patient, user=None):
    """Push the patient's target voltage to the 'device'.

    Commits target -> current and marks any pending VoltageChange rows pushed.
    Returns True if a change was actually applied, False if already in sync.
    """
    patient.target_voltage = clamp_voltage(patient.target_voltage)

    changed = patient.voltage_pending
    now = timezone.now()

    if changed:
        patient.current_voltage = patient.target_voltage

    patient.last_pushed_at = now
    patient.save(update_fields=["current_voltage", "target_voltage", "last_pushed_at"])

    # Mark every still-pending alteration for this patient as pushed.
    pending = patient.voltage_changes.filter(pushed=False)
    for change in pending:
        change.mark_pushed()

    return changed


@transaction.atomic
def pull_heart_rates(patient):
    """Generate heart-rate readings since the last pull and store them.

    Returns the list of newly created HeartRateRecord objects (may be empty).
    """
    now = timezone.now()
    last = patient.last_pulled_at

    # On the first pull, look back one interval so there is data to show.
    window_start = last or (now - timedelta(minutes=SYNC_INTERVAL_MINUTES))

    minutes_elapsed = (now - window_start).total_seconds() / 60.0
    count = int(minutes_elapsed // READING_EVERY_MINUTES)
    count = max(0, min(count, MAX_READINGS_PER_PULL))

    new_records = []
    for i in range(count):
        # Space readings evenly from window_start up to now.
        recorded_at = window_start + timedelta(minutes=READING_EVERY_MINUTES * (i + 1))
        if recorded_at > now:
            recorded_at = now
        seed = f"{patient.pk}-{recorded_at.isoformat()}"
        bpm = _simulate_bpm(patient.current_voltage, seed)
        new_records.append(
            HeartRateRecord(
                patient=patient,
                bpm=bpm,
                voltage_at_reading=patient.current_voltage,
                recorded_at=recorded_at,
            )
        )

    if new_records:
        HeartRateRecord.objects.bulk_create(new_records)

    patient.last_pulled_at = now
    patient.save(update_fields=["last_pulled_at"])

    return new_records


def sync_patient(patient, user=None):
    """Full cycle: push the altered voltage, then pull heart-rate records."""
    changed = push_voltage(patient, user=user)
    new_records = pull_heart_rates(patient)
    return {"voltage_changed": changed, "new_readings": len(new_records)}
