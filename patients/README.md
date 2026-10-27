# Patients app — pacemaker clinic

Added to the existing Django auth project. Doctors (logged-in users) register
patients, alter pacemaker voltage, and sync heart-rate records.

## Run it (on your machine, Python 3.12+)

```bash
cd mysite
source venv/bin/activate          # or recreate: python -m venv venv && pip install -r requirements.txt
python manage.py makemigrations patients   # optional: a 0001_initial is already provided
python manage.py migrate
python manage.py test patients             # runs the included tests
python manage.py runserver
```

Then log in and go to **/patients/**.

## What it does
- **/patients/add/** — registration form with all hospital intake fields:
  name, patient ID, DOB, gender, blood type, phone, email, address, emergency
  contact, allergies, previous medical record, device serial, implant date,
  initial voltage.
- **/patients/<id>/** — alter voltage (slider → Set target → Push), view
  heart-rate chart + table, voltage-change history.
- **Every 30 min** the browser auto-pushes altered voltage and pulls heart-rate
  records (see the countdown). Buttons **Push now / Pull records now / Sync now**
  do it immediately. The patient list has **Sync all now**.

## The "server"
`patients/simulation.py` is the device/server layer. The Django DB stores state;
heart-rate readings are simulated (voltage-influenced, deterministic). Swap that
one module for a real HTTP/BLE client to talk to actual hardware — the views and
templates don't change.
