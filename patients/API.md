# Patient Mobile API

Base: `/api`  ·  Auth: `Authorization: Token <key>`  ·  All JSON.

| Method | Path | Auth | Body | Returns |
|--------|------|------|------|---------|
| POST | `/auth/request-password` | — | `{email}` | generic ok (emails temp password + `pacelink://setup/<token>`) |
| GET  | `/auth/setup/<token>` | — | — | `{email}` if link valid |
| POST | `/auth/login` | — | `{email,password}` | `{token, patient}` |
| POST | `/auth/change-password` | ✓ | `{old_password,new_password}` | `{token}` (rotated) |
| GET  | `/me` | ✓ | — | `{patient}` |
| GET  | `/pacemaker/voltage` | ✓ | — | `{target_voltage,current_voltage,voltage_pending}` |
| POST | `/pacemaker/voltage/ack` | ✓ | `{voltage}` | `{current_voltage,changed}` |
| POST | `/heartrate` | ✓ | `{readings:[{bpm,recorded_at,voltage}]}` | `{stored}` |

Accounts are created automatically when a doctor registers a patient
(`patients/services.py:ensure_patient_account`), keyed on the patient email.

**Local testing without SMTP:** run the server with
`DJANGO_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` so the
temporary password and deep link print to the console.
