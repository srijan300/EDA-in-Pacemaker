# Pacemaker simulator

A standalone process that stands in for the implanted pacemaker itself. It
runs completely separately from the Django server and the Expo app — three
independent processes, exactly like the real system would have three
independent parties: hospital backend, patient's phone, implanted device.

## Run it

```
cd pacemaker-simulator
node server.js
```

No `npm install` needed — it's built only on Node's built-in `http` module.
It listens on port `9090` and logs every connection/voltage write/heart-rate
read/disconnect with a timestamp, so you can watch the session open and close
live during a demo.

Then run the patient app as usual (`cd ../patient-app && npm start`). The app
auto-detects the simulator's address using the same LAN-IP logic it uses to
find the Django server, so no config is needed on the same Wi-Fi network.

## How the phone connects to the pacemaker (the answer for your mentor)

A real implanted pacemaker does not stay connected to anything. Its radio
(BLE, in virtually all modern devices) sits idle/advertising-only for
battery life and — just as important — security: a device that is only
reachable for a few hundred milliseconds every so often has almost no attack
surface compared to one sitting on an open connection all day.

So the connection this project models is **transient, not persistent**:

1. **Connect** — the phone opens a session (`POST /connect`). The "implant"
   wakes up and hands back a one-time session id.
2. **Write** — the phone sends the doctor-prescribed voltage
   (`POST /voltage`).
3. **Read** — the phone pulls back whatever heart-rate data the device has
   collected since the last visit (`GET /heart-rate`).
4. **Disconnect** — the phone explicitly closes the session
   (`POST /disconnect`). The device goes back to being isolated: no
   listening session, nothing an attacker could reach.

Steps 2–3 normally complete in a few milliseconds. The whole connect →
write → read → disconnect exchange typically finishes in well under a
second, and the app shows exactly how long it stayed open on the dashboard
after each sync (e.g. "connected 41ms then isolated"). If the app ever
crashes mid-sync and never calls `/disconnect`, the server force-closes the
session after 5 seconds on its own (`SESSION_TIMEOUT_MS`) — the implant
always returns to isolation on its own, it never depends on the client
behaving correctly. Every HTTP response also sends `Connection: close`, so
no socket is left open between exchanges either.

This repeats every 30 minutes (`patient-app/src/pacemaker/background.js`),
or on demand when the patient taps "Sync now" — the device is isolated
essentially all the time and only briefly reachable during these windows.

## Why HTTP and not real Bluetooth

There's no BLE hardware to demo against, so this simulator swaps in a tiny
local HTTP server as the transport. The important part — the interface the
rest of the app talks to — is identical either way:

```
connect(serial) -> device info
writeVoltage(volts)
readHeartRates(currentVoltage) -> [{ bpm, recorded_at, voltage }, ...]
disconnect()
```

`patient-app/src/pacemaker/link.js` defines that interface once
(`PacemakerLink`), and there are three interchangeable implementations:

- **`network.js`** (default, `NetworkPacemaker`) — talks to *this* simulator
  over HTTP. What you're running right now.
- **`ble.js`** (`BlePacemaker`) — the real version, using
  `react-native-ble-plx` over actual Bluetooth GATT. Same four calls, same
  connect → write → read → disconnect shape, just over a BLE central/peripheral
  link instead of HTTP. Needs a custom Expo dev build + a physical BLE
  peripheral (e.g. an ESP32 flashed with firmware exposing the GATT service
  described at the top of `link.js`).
- **`simulated.js`** (`SimulatedPacemaker`) — fabricates data entirely inside
  the app, no external process or network at all.

Which one is active is a single line in `patient-app/src/pacemaker/index.js`
(`PACEMAKER_MODE`). Nothing else in the app — the sync engine, the dashboard,
the 30-minute scheduler — needs to know or care which transport is underneath.
So the answer to "how would this work with a *real* pacemaker" is: swap
`PACEMAKER_MODE` to `"ble"` and point `BlePacemaker` at the real GATT service;
every other line of the app is unchanged, because it was already written
against the transport-agnostic `PacemakerLink` interface.

## Endpoints

| Method | Path           | Purpose                                              |
|--------|----------------|-------------------------------------------------------|
| POST   | `/connect`     | Wake the device, open a session                       |
| POST   | `/voltage`     | Write the prescribed voltage (requires a session)      |
| GET    | `/heart-rate`  | Read back collected heart-rate data (requires a session)|
| POST   | `/disconnect`  | Close the session, isolate the device again            |
| GET    | `/status`      | Snapshot for demos: current voltage, whether isolated   |

`GET /status` is handy to poll from a browser tab during a demo to show the
device sitting isolated (`"isolated": true`) between syncs, then briefly
`false` while a sync is in flight.
