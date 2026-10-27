// ============================================================================
// Pacemaker simulator — a standalone process that stands in for the
// implanted device itself, running completely separately from both the
// Django backend and the Expo app.
//
// WHY A SEPARATE PROCESS (the answer to "how does the phone connect to the
// pacemaker?"):
//
//   A real implantable pacemaker does NOT stay connected to anything. For
//   battery life and security, its radio (BLE in most modern devices) is
//   normally OFF / advertising-only. A programmer or phone app briefly wakes
//   it, opens a connection, reads/writes the handful of values it needs,
//   and disconnects — the device is "isolated" the rest of the time so nothing
//   can reach it. That's the pattern this simulator enforces on purpose:
//
//     1. Phone calls  POST /connect         -> device "wakes up", issues a
//                                              one-time session id.
//     2. Phone calls  POST /voltage         -> writes the prescribed voltage.
//     3. Phone calls  GET  /heart-rate      -> reads back collected data.
//     4. Phone calls  POST /disconnect      -> device goes back to sleep;
//                                              the session id is destroyed.
//
//   Steps 2-3 normally complete in well under a second, and the server also
//   force-kills any session that's still open after SESSION_TIMEOUT_MS as a
//   safety net — so even if the app crashed mid-sync, the "implant" isolates
//   itself again automatically. Every response also sends `Connection: close`
//   so no HTTP keep-alive socket lingers between sync cycles.
//
//   In production this whole file would instead be firmware inside the real
//   pacemaker speaking BLE GATT (see src/pacemaker/link.js + ble.js in the
//   mobile app for the exact same interface implemented over real
//   Bluetooth) — the app-level code doesn't change at all, only which
//   PacemakerLink implementation is plugged in. This HTTP version exists so
//   the whole flow can be demoed on a laptop/phone without special BLE
//   hardware.
//
// Run it with:   node server.js        (no npm install needed — built-ins only)
// Default port:  9090
// ============================================================================

const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PACEMAKER_SIM_PORT || 9090;
const SESSION_TIMEOUT_MS = 5000; // safety net: auto-isolate if never disconnected

// --- "Implant" state -------------------------------------------------------
let currentVoltage = 2.5;
let lastReadAt = Date.now() - 30 * 60 * 1000; // seed 30 min of history
const sessions = new Map(); // sessionId -> { connectedAt, timer }

function log(icon, msg) {
  const t = new Date().toISOString().split("T")[1].replace("Z", "");
  console.log(`${icon}  [${t}] ${msg}`);
}

function generateReadings(uptoVoltage) {
  const now = Date.now();
  const readings = [];
  const stepMs = 60 * 1000; // one reading per simulated minute
  let t = lastReadAt + stepMs;
  let guard = 0;
  while (t <= now && guard < 240) {
    const baseline = 70 + (uptoVoltage - 2.5) * 4;
    const bpm = Math.round(baseline + (Math.random() - 0.5) * 10);
    readings.push({
      bpm: Math.max(50, Math.min(120, bpm)),
      recorded_at: new Date(t).toISOString(),
      voltage: uptoVoltage,
    });
    t += stepMs;
    guard++;
  }
  lastReadAt = now;
  return readings;
}

function forceIsolate(sessionId, reason) {
  const s = sessions.get(sessionId);
  if (!s) return;
  clearTimeout(s.timer);
  sessions.delete(sessionId);
  const durationMs = Date.now() - s.connectedAt;
  log("🔒", `SESSION ${sessionId.slice(0, 8)} CLOSED (${reason}) — connected ${durationMs}ms, now isolated`);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
    "Connection": "close", // no keep-alive: each exchange is a fresh, brief connection
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // ---- POST /connect -> wake the device, open a brief session -----------
  if (req.method === "POST" && url.pathname === "/connect") {
    const body = await readBody(req);
    const sessionId = crypto.randomUUID();
    const connectedAt = Date.now();
    const timer = setTimeout(
      () => forceIsolate(sessionId, "safety timeout — app never disconnected"),
      SESSION_TIMEOUT_MS
    );
    sessions.set(sessionId, { connectedAt, timer });
    log("🔵", `CONNECT session=${sessionId.slice(0, 8)} serial=${body.serial || "?"} — implant woken up`);
    sendJson(res, 200, {
      ok: true,
      session: sessionId,
      device: { id: body.serial || "SIM-DEVICE", name: "Simulated Pacemaker (network)" },
    });
    return;
  }

  // ---- POST /voltage -> write the prescribed voltage to the device ------
  if (req.method === "POST" && url.pathname === "/voltage") {
    const body = await readBody(req);
    const s = sessions.get(body.session);
    if (!s) {
      sendJson(res, 409, { ok: false, error: "No active session — device is isolated." });
      return;
    }
    currentVoltage = Number(body.volts);
    log("⚡", `VOLTAGE session=${body.session.slice(0, 8)} -> ${currentVoltage} V`);
    sendJson(res, 200, { ok: true, voltage: currentVoltage });
    return;
  }

  // ---- GET /heart-rate -> read back readings collected by the implant ---
  if (req.method === "GET" && url.pathname === "/heart-rate") {
    const sessionId = url.searchParams.get("session");
    const s = sessions.get(sessionId);
    if (!s) {
      sendJson(res, 409, { ok: false, error: "No active session — device is isolated." });
      return;
    }
    const readings = generateReadings(currentVoltage);
    log("❤️ ", `HEART-RATE session=${sessionId.slice(0, 8)} -> sent ${readings.length} reading(s)`);
    sendJson(res, 200, { ok: true, readings });
    return;
  }

  // ---- POST /disconnect -> close the session, isolate the device --------
  if (req.method === "POST" && url.pathname === "/disconnect") {
    const body = await readBody(req);
    const s = sessions.get(body.session);
    if (!s) {
      sendJson(res, 200, { ok: true, durationMs: 0 });
      return;
    }
    clearTimeout(s.timer);
    const durationMs = Date.now() - s.connectedAt;
    sessions.delete(body.session);
    log("🔴", `DISCONNECT session=${body.session.slice(0, 8)} — connected ${durationMs}ms, now isolated`);
    sendJson(res, 200, { ok: true, durationMs });
    return;
  }

  // ---- GET /status -> human-readable snapshot for demos -----------------
  if (req.method === "GET" && url.pathname === "/status") {
    sendJson(res, 200, {
      ok: true,
      currentVoltage,
      activeSessions: sessions.size,
      isolated: sessions.size === 0,
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "Unknown endpoint." });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("============================================================");
  console.log(`  Pacemaker simulator listening on port ${PORT}`);
  console.log(`  Idle now — isolated until the app opens a connection.`);
  console.log("============================================================");
});
