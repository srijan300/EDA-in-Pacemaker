# Pacemaker Telemetry Sandbox

An academic prototype for exploring remote pacemaker monitoring workflows. It
brings together a Django clinician portal and API, an Expo patient app, and a
standalone device simulator so the end-to-end data flow can be demonstrated
without medical hardware.

> **Research and education only.** This software is not a medical device and
> must not be used to diagnose, treat, or make decisions about a person's
> health. Device readings and interactions are simulated. Do not connect this
> prototype to a real pacemaker or use real patient information.

## What is included

| Component | Technology | Purpose |
| --- | --- | --- |
| Clinician portal and API | Django, SQLite | Patient records, voltage-change workflow, and heart-rate history |
| Patient app | React Native, Expo | Patient sign-in and periodic synchronization with the backend and simulator |
| Pacemaker simulator | Node.js built-in HTTP server | Emulates brief device sessions, voltage updates, and generated heart-rate readings |
| Security research material | Project presentation | Academic discussion of energy-depletion risks in implantable-device systems |

The app currently uses the network simulator. A BLE implementation is also
present in the app, but it is a development interface and has not been
validated with a real medical device.

## Data flow

```text
Clinician portal (Django) <--> Patient app (Expo)
                                  |          |
                           Django API   Simulator (HTTP)
                                  |          |
                           SQLite data   Simulated device
```

The Django backend maintains patient records and simulated telemetry. During a
sync, the app requests pending settings, exchanges data with the simulator, and
uploads readings to the API. The simulator listens on port `9090`; Django's
development server uses port `8000`.

## Run locally

Start each component in its own terminal from the repository root.

### 1. Django backend

Python 3.12 or newer is recommended.

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The clinician portal is available at `http://127.0.0.1:8000/`. Create an
account at `/accounts/signup/`; the patient pages are under `/patients/`, and
the mobile API is under `/api/`.

### 2. Pacemaker simulator

Node.js is required. The server uses built-in Node modules, so a separate
package installation is not needed.

```powershell
cd pacemaker-simulator
node server.js
```

### 3. Patient app

In another terminal:

```powershell
cd patient-app
npm install
npx expo start
```

The app detects the Expo host for local backend and simulator connections. For
a physical device, keep the phone and development computer on the same network
and allow the development servers through the computer's firewall. If needed,
set `expo.extra.apiBaseUrl` in `patient-app/app.json` to the backend URL
reachable from the device.

## Tests

Run the Django test suite from the repository root:

```powershell
python manage.py test
```

## More details

- [Patient app guide](patient-app/README.md) — app setup, authentication, and
  simulator/BLE modes.
- [Simulator guide](pacemaker-simulator/README.md) — simulator behavior and
  local endpoints.
- [Patient API reference](patients/API.md) — API routes and authentication.
- [Patients app guide](patients/README.md) — clinician workflows and Django
  app details.

## Safety and security

This repository is for local demonstration and academic research. It has not
been assessed or approved for clinical use, and its simulated behavior does
not represent a particular manufacturer's device or protocol. Do not expose
the development servers to the public internet, use real health records, or
rely on the prototype for patient care.
