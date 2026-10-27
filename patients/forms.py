from django import forms

from .models import DEFAULT_VOLTAGE, MAX_VOLTAGE, MIN_VOLTAGE, Patient


class AddPatientForm(forms.ModelForm):
    """Registration form a doctor fills in for a new patient.

    Collects the details a hospital would ask on intake: identity, contact,
    blood type, address, previous medical record, and the implanted device.
    """

    class Meta:
        model = Patient
        fields = [
            "patient_id",
            "full_name",
            "date_of_birth",
            "gender",
            "blood_type",
            "phone",
            "email",
            "address",
            "emergency_contact_name",
            "emergency_contact_phone",
            "allergies",
            "previous_medical_record",
            "pacemaker_serial",
            "implant_date",
            "target_voltage",
        ]
        widgets = {
            "date_of_birth": forms.DateInput(attrs={"type": "date"}),
            "implant_date": forms.DateInput(attrs={"type": "date"}),
            "address": forms.Textarea(attrs={"rows": 2}),
            "previous_medical_record": forms.Textarea(attrs={"rows": 4}),
            "target_voltage": forms.NumberInput(
                attrs={"step": "0.1", "min": MIN_VOLTAGE, "max": MAX_VOLTAGE}
            ),
        }
        labels = {
            "patient_id": "Patient ID",
            "target_voltage": "Initial pacemaker voltage (V)",
            "previous_medical_record": "Previous medical record",
        }

    def __init__(self, *args, doctor=None, **kwargs):
        self.doctor = doctor
        super().__init__(*args, **kwargs)
        self.fields["target_voltage"].initial = DEFAULT_VOLTAGE
        self.fields["patient_id"].required = True
        self.fields["full_name"].required = True
        # Mark the genuinely required fields; the rest are optional intake data.
        for name, field in self.fields.items():
            field.widget.attrs.setdefault("class", "input")

    def clean_target_voltage(self):
        v = self.cleaned_data["target_voltage"]
        if v < MIN_VOLTAGE or v > MAX_VOLTAGE:
            raise forms.ValidationError(
                f"Voltage must be between {MIN_VOLTAGE} V and {MAX_VOLTAGE} V."
            )
        return v

    def clean_patient_id(self):
        pid = self.cleaned_data["patient_id"].strip()
        if self.doctor and Patient.objects.filter(
            doctor=self.doctor, patient_id=pid
        ).exists():
            raise forms.ValidationError("You already have a patient with this ID.")
        return pid

    def save(self, commit=True):
        patient = super().save(commit=False)
        if self.doctor is not None:
            patient.doctor = self.doctor
        # A new device starts already in sync: current == target.
        patient.current_voltage = patient.target_voltage
        if commit:
            patient.save()
            # Auto-create the patient's mobile-app login account (by email).
            from .services import ensure_patient_account
            ensure_patient_account(patient)
        return patient
