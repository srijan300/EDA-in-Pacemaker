import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Patient",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("patient_id", models.CharField(max_length=40)),
                ("full_name", models.CharField(max_length=120)),
                ("date_of_birth", models.DateField(blank=True, null=True)),
                ("gender", models.CharField(choices=[("M", "Male"), ("F", "Female"), ("O", "Other"), ("U", "Prefer not to say")], default="U", max_length=1)),
                ("blood_type", models.CharField(choices=[("A+", "A+"), ("A-", "A-"), ("B+", "B+"), ("B-", "B-"), ("AB+", "AB+"), ("AB-", "AB-"), ("O+", "O+"), ("O-", "O-"), ("UNK", "Unknown")], default="UNK", max_length=3)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("address", models.TextField(blank=True)),
                ("emergency_contact_name", models.CharField(blank=True, max_length=120)),
                ("emergency_contact_phone", models.CharField(blank=True, max_length=30)),
                ("previous_medical_record", models.TextField(blank=True, help_text="Past conditions, surgeries, medications, allergies, notes.")),
                ("allergies", models.CharField(blank=True, max_length=255)),
                ("pacemaker_serial", models.CharField(blank=True, help_text="Serial number of the implanted device.", max_length=60)),
                ("implant_date", models.DateField(blank=True, null=True)),
                ("current_voltage", models.FloatField(default=2.5)),
                ("target_voltage", models.FloatField(default=2.5)),
                ("last_pushed_at", models.DateTimeField(blank=True, null=True)),
                ("last_pulled_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("doctor", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="patients", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["full_name"]},
        ),
        migrations.CreateModel(
            name="VoltageChange",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("previous_voltage", models.FloatField()),
                ("new_voltage", models.FloatField()),
                ("pushed", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("pushed_at", models.DateTimeField(blank=True, null=True)),
                ("changed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="voltage_changes", to="patients.patient")),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="HeartRateRecord",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("bpm", models.PositiveIntegerField()),
                ("voltage_at_reading", models.FloatField(blank=True, null=True)),
                ("recorded_at", models.DateTimeField()),
                ("pulled_at", models.DateTimeField(auto_now_add=True)),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="heart_rate_records", to="patients.patient")),
            ],
            options={"ordering": ["-recorded_at"]},
        ),
        migrations.AddConstraint(
            model_name="patient",
            constraint=models.UniqueConstraint(fields=("doctor", "patient_id"), name="unique_patient_id_per_doctor"),
        ),
        migrations.AddIndex(
            model_name="heartraterecord",
            index=models.Index(fields=["patient", "-recorded_at"], name="patients_he_patient_5c5d3f_idx"),
        ),
    ]
