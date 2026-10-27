"""Data models for the pacemaker clinic.

A doctor (the built-in ``auth.User``) registers ``Patient`` records. Each
patient has an implanted pacemaker whose voltage the doctor can alter. The
Django database *is* the "server" referred to in the product spec:

* Altering the voltage creates a ``VoltageChange`` row with ``pushed=False``
  (a pending order). "Pushing" marks it ``pushed=True`` and copies the value
  onto ``Patient.current_voltage`` -- i.e. the device has accepted the new
  setting.
* "Pulling" generates ``HeartRateRecord`` rows to simulate readings the device
  reported to the server since the last pull.

The push/pull cycle runs automatically every 30 minutes from the browser, and
can also be triggered immediately by the doctor.
"""

from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone


# Pacemaker output voltage is measured in volts. Typical programmable range for
# a real device is roughly 0.5 V - 7.5 V; we clamp to that as a safety bound.
MIN_VOLTAGE = 0.5
MAX_VOLTAGE = 7.5
DEFAULT_VOLTAGE = 2.5


class BloodType(models.TextChoices):
    A_POS = "A+", "A+"
    A_NEG = "A-", "A-"
    B_POS = "B+", "B+"
    B_NEG = "B-", "B-"
    AB_POS = "AB+", "AB+"
    AB_NEG = "AB-", "AB-"
    O_POS = "O+", "O+"
    O_NEG = "O-", "O-"
    UNKNOWN = "UNK", "Unknown"


class Patient(models.Model):
    """A patient owned by the registering doctor."""

    # --- Ownership -----------------------------------------------------
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patients",
    )
    # The patient's own login account for the mobile app. Created automatically
    # when the doctor registers the patient (see forms.AddPatientForm.save).
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="patient_profile",
    )

    # --- Identity ------------------------------------------------------
    # Hospital-assigned identifier, unique per doctor.
    patient_id = models.CharField(max_length=40)
    full_name = models.CharField(max_length=120)
    date_of_birth = models.DateField(null=True, blank=True)

    GENDER_CHOICES = [
        ("M", "Male"),
        ("F", "Female"),
        ("O", "Other"),
        ("U", "Prefer not to say"),
    ]
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, default="U")

    blood_type = models.CharField(
        max_length=3, choices=BloodType.choices, default=BloodType.UNKNOWN
    )

    # --- Contact -------------------------------------------------------
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)

    emergency_contact_name = models.CharField(max_length=120, blank=True)
    emergency_contact_phone = models.CharField(max_length=30, blank=True)

    # --- Clinical ------------------------------------------------------
    previous_medical_record = models.TextField(
        blank=True,
        help_text="Past conditions, surgeries, medications, allergies, notes.",
    )
    allergies = models.CharField(max_length=255, blank=True)

    pacemaker_serial = models.CharField(
        max_length=60, blank=True, help_text="Serial number of the implanted device."
    )
    implant_date = models.DateField(null=True, blank=True)

    # --- Pacemaker state ----------------------------------------------
    # current_voltage = value the device is currently running (last pushed).
    # target_voltage  = value the doctor wants; may be pending a push.
    current_voltage = models.FloatField(default=DEFAULT_VOLTAGE)
    target_voltage = models.FloatField(default=DEFAULT_VOLTAGE)

    last_pushed_at = models.DateTimeField(null=True, blank=True)
    last_pulled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["full_name"]
        constraints = [
            models.UniqueConstraint(
                fields=["doctor", "patient_id"],
                name="unique_patient_id_per_doctor",
            )
        ]

    def __str__(self):
        return f"{self.full_name} ({self.patient_id})"

    @property
    def voltage_pending(self):
        """True when the target differs from what the device is running."""
        return abs(self.target_voltage - self.current_voltage) > 1e-9

    @property
    def latest_heart_rate(self):
        record = self.heart_rate_records.first()
        return record.bpm if record else None


class VoltageChange(models.Model):
    """Audit log of every voltage alteration the doctor makes.

    A row is created the moment the doctor sets a new target (``pushed=False``).
    When the value is pushed to the device it is stamped ``pushed=True``.
    """

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="voltage_changes"
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )

    previous_voltage = models.FloatField()
    new_voltage = models.FloatField()

    pushed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    pushed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        state = "pushed" if self.pushed else "pending"
        return f"{self.patient.patient_id}: {self.previous_voltage}V -> {self.new_voltage}V ({state})"

    def mark_pushed(self):
        self.pushed = True
        self.pushed_at = timezone.now()
        self.save(update_fields=["pushed", "pushed_at"])


class HeartRateRecord(models.Model):
    """A single heart-rate reading pulled from the server for a patient."""

    patient = models.ForeignKey(
        Patient, on_delete=models.CASCADE, related_name="heart_rate_records"
    )
    bpm = models.PositiveIntegerField()
    # The voltage the device was running when this reading was taken -- lets the
    # doctor correlate rate with the setting.
    voltage_at_reading = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField()
    pulled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]
        indexes = [models.Index(fields=["patient", "-recorded_at"])]

    def __str__(self):
        return f"{self.patient.patient_id}: {self.bpm} bpm @ {self.recorded_at:%Y-%m-%d %H:%M}"


class ApiToken(models.Model):
    """Bearer token for authenticating the patient mobile app.

    Simple opaque token (no DRF dependency). The app stores it in secure
    storage and sends it as ``Authorization: Token <key>``.
    """

    key = models.CharField(max_length=64, unique=True, db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="api_tokens"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    @classmethod
    def generate_for(cls, user):
        import secrets

        return cls.objects.create(key=secrets.token_hex(24), user=user)

    def __str__(self):
        return f"Token for {self.user} ({self.key[:6]}...)"


class PasswordSetupLink(models.Model):
    """One-time link emailed to a patient to deliver an auto-generated password.

    Flow: patient enters their email in the app and taps "auto-generate
    password". If the email matches a registered patient, we generate a random
    password, set it on their account, store a hash of the temp password here,
    and email a deep link. Following the link opens the app's set-password /
    login screen. The link is single-use and expires.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="setup_links"
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    EXPIRY_HOURS = 24

    @classmethod
    def issue_for(cls, user):
        import secrets

        # Invalidate older unused links for this user.
        cls.objects.filter(user=user, used_at__isnull=True).update(used_at=timezone.now())
        return cls.objects.create(token=secrets.token_urlsafe(32), user=user)

    @property
    def is_expired(self):
        return timezone.now() > self.created_at + timedelta(hours=self.EXPIRY_HOURS)

    @property
    def is_valid(self):
        return self.used_at is None and not self.is_expired

    def consume(self):
        self.used_at = timezone.now()
        self.save(update_fields=["used_at"])
