# PaceLink — Patient Mobile App (Expo / React Native)

Companion app for the pacemaker clinic. The patient logs in with the email their
hospital registered, and every 30 minutes the app relays the doctor's prescribed
pacemaker voltage to the device and uploads heart-rate data to the server.

## Architecture

```
Doctor (hospital web app)  --alters voltage-->  Django server (DB)
                                                    ^   |
                     POST heart-rate batch          |   | GET target voltage
                                                     |   v
                        +----------------------------+---------------+
                        |          PATIENT APP (this project)        |
                        |  every 30 min:                             |
                        |   1. pull target voltage from server       |
                        |   2. write voltage to pacemaker (BLE)      |
                        |   3. ack delivery to server                |
                        |   4. read heart-rate from pacemaker (BLE)  |
                        |   5. upload heart-rate to server           |
                        +---------------------+----------------------+
                                              | BLE / GATT
                                              v
                                         PACEMAKER
```

## How the app connects to the pacemaker (BLE/GATT)

The phone talks to the device over **Bluetooth Low Energy**. The device is
assumed to expose a custom GATT service (`src/pacemaker/link.js`):

| Item | UUID | Operation | Payload |
|------|------|-----------|---------|
| Service | `0000fe10-…` | — | — |
| Voltage | `0000fe11-…` | **Write** | uint16 millivolts, little-endian (3.6 V → 3600 → `10 0E`) |
| Heart rate | `0000fe12-…` | **Notify/Read** | standard BLE Heart-Rate Measurement (flags byte + uint8/uint16 bpm) |

Two interchangeable implementations behind one interface:

- **`SimulatedPacemaker`** (default, `USE_REAL_BLE = false` in `src/pacemaker/index.js`)
  — no hardware, runs in **Expo Go**. Accepts voltage writes and fabricates
  heart-rate readings so you can exercise the entire flow.
- **`BlePacemaker`** — real `react-native-ble-plx`. Requires a **custom dev
  build** (BLE native code doesn't run in Expo Go) and a physical device.
  Flip `USE_REAL_BLE = true` to use it.

## Auth flow (matches the spec)

1. The moment a doctor registers the patient in the hospital app, a login
   account is auto-created using the patient's email (no password yet).
2. In the app the patient taps **Auto-generate password**, enters that email.
3. If it matches, the server emails a temporary password + a deep link
   (`pacelink://setup/<token>`).
4. Tapping the link opens the app, validates the token, and forwards to the
   login screen with the email pre-filled. The patient enters the temp password.
5. After login they can change the password in **Account**.

## Run it (on your machine — needs internet)

```bash
cd patient-app
npm install
# Point the app at your running Django server. Edit app.json ->
# expo.extra.apiBaseUrl:
#   Android emulator:  http://10.0.2.2:8000
#   iOS simulator:     http://localhost:8000
#   Physical device:   http://<your-computer-LAN-IP>:8000
npx expo start
```

Scan the QR with **Expo Go** (simulated pacemaker works here). For real BLE:

```bash
npx expo install expo-dev-client
eas build --profile development --platform android   # or ios
```

### Backend prerequisites
In the Django project (`../mysite`):
```bash
python manage.py migrate            # applies patients/0002_accounts
# For local testing without SMTP, run with the console email backend so the
# generated password/link prints to the terminal:
DJANGO_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend \
  python manage.py runserver 0.0.0.0:8000
```
Register a patient (with an email) in the hospital app, then use that email in
the mobile app's auto-generate-password screen. The temp password + deep link
appear in the server console.

## Important caveats

- **30-minute timing:** exact only while the app is foregrounded (JS interval).
  In the background, iOS/Android decide wakeup timing — `expo-background-fetch`
  treats 30 min as a *minimum*, not a guarantee. For guaranteed cadence, drive
  sync from the server or via push.
- **This is a simulation/demo.** Real pacemaker communication and any voltage
  control is a regulated medical-device function requiring proper hardware
  protocols, security, and regulatory clearance. The GATT contract here is a
  reasonable placeholder, not a real device spec.
- **Security:** for a public release, never let the app hold long-lived secrets;
  the token here is a simple bearer token suitable for testing.
