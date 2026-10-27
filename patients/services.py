"""Business logic shared between the hospital web app and the mobile API."""

from django.contrib.auth.models import User


def ensure_patient_account(patient):
    """Create (or link) the auth User the patient uses to log into the app.

    The patient logs in with the email the doctor registered. The account is
    created inactive-password (unusable password) until they run the
    auto-generate-password flow, which sets a real one.

    Returns the User, or None if the patient has no email (can't create a
    login without one).
    """
    email = (patient.email or "").strip().lower()
    if not email:
        return None

    if patient.user_id:
        return patient.user

    # Username must be unique; derive from email, de-duplicating if needed.
    base_username = email
    username = base_username
    i = 1
    while User.objects.filter(username=username).exists():
        # If a user with this email already exists, reuse it (same person).
        existing = User.objects.filter(username=base_username).first()
        if existing and existing.email.lower() == email:
            patient.user = existing
            patient.save(update_fields=["user"])
            return existing
        i += 1
        username = f"{base_username}+{i}"

    user = User.objects.create(username=username, email=email, is_active=True)
    user.set_unusable_password()  # no password until auto-generate flow runs
    user.save()

    patient.user = user
    patient.save(update_fields=["user"])
    return user
