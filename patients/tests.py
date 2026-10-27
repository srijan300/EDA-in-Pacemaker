"""Tests for the pacemaker clinic simulation and views.

Run on your machine with:  python manage.py test patients
"""

from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone

from .models import DEFAULT_VOLTAGE, Patient, VoltageChange
from .simulation import (
    MAX_READINGS_PER_PULL,
    clamp_voltage,
    pull_heart_rates,
    push_voltage,
    sync_patient,
)


class SimulationTests(TestCase):
    def setUp(self):
        self.doctor = User.objects.create_user("doc", password="x")
        self.patient = Patient.objects.create(
            doctor=self.doctor,
            patient_id="P1",
            full_name="Jane Doe",
            current_voltage=DEFAULT_VOLTAGE,
            target_voltage=DEFAULT_VOLTAGE,
        )

    def test_clamp_voltage_bounds(self):
        self.assertEqual(clamp_voltage(99), 7.5)
        self.assertEqual(clamp_voltage(-1), 0.5)
        self.assertEqual(clamp_voltage(2.5), 2.5)

    def test_push_applies_target(self):
        self.patient.target_voltage = 3.4
        self.patient.save()
        changed = push_voltage(self.patient)
        self.assertTrue(changed)
        self.assertEqual(self.patient.current_voltage, 3.4)
        self.assertIsNotNone(self.patient.last_pushed_at)

    def test_push_marks_pending_changes(self):
        VoltageChange.objects.create(
            patient=self.patient, previous_voltage=2.5, new_voltage=3.0, pushed=False
        )
        self.patient.target_voltage = 3.0
        self.patient.save()
        push_voltage(self.patient)
        self.assertFalse(self.patient.voltage_changes.filter(pushed=False).exists())

    def test_pull_generates_readings(self):
        self.patient.last_pulled_at = timezone.now() - timedelta(minutes=30)
        self.patient.save()
        records = pull_heart_rates(self.patient)
        self.assertTrue(len(records) > 0)
        for r in records:
            self.assertGreaterEqual(r.bpm, 50)
            self.assertLessEqual(r.bpm, 120)

    def test_pull_is_capped(self):
        self.patient.last_pulled_at = timezone.now() - timedelta(days=10)
        self.patient.save()
        records = pull_heart_rates(self.patient)
        self.assertLessEqual(len(records), MAX_READINGS_PER_PULL)

    def test_sync_does_both(self):
        self.patient.target_voltage = 3.1
        self.patient.last_pulled_at = timezone.now() - timedelta(minutes=30)
        self.patient.save()
        result = sync_patient(self.patient)
        self.assertTrue(result["voltage_changed"])
        self.assertGreater(result["new_readings"], 0)


class ViewAccessTests(TestCase):
    def setUp(self):
        self.doc1 = User.objects.create_user("doc1", password="x")
        self.doc2 = User.objects.create_user("doc2", password="x")
        self.p = Patient.objects.create(
            doctor=self.doc1, patient_id="P1", full_name="Owned"
        )

    def test_other_doctor_cannot_see_patient(self):
        self.client.login(username="doc2", password="x")
        resp = self.client.get(f"/patients/{self.p.pk}/")
        self.assertEqual(resp.status_code, 404)

    def test_owner_can_see_patient(self):
        self.client.login(username="doc1", password="x")
        resp = self.client.get(f"/patients/{self.p.pk}/")
        self.assertEqual(resp.status_code, 200)
