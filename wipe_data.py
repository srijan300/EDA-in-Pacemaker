import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')
django.setup()

from patients.models import Patient
from django.contrib.auth.models import User

# Get all user IDs that are linked to patients
patient_users = [p.user.id for p in Patient.objects.filter(user__isnull=False)]

# Delete all patients (this also deletes HeartRateRecords, VoltageChanges, etc. due to CASCADE)
deleted_patients, _ = Patient.objects.all().delete()
print(f"Deleted {deleted_patients} patients (and their records).")

# Delete the user accounts that belonged to those patients
deleted_users, _ = User.objects.filter(id__in=patient_users).delete()
print(f"Deleted {deleted_users} patient login accounts.")

print("\nYour doctor account remains intact. You can now test it fresh!")
