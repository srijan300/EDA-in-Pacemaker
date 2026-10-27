// ============================================================================
// NetworkPacemaker — talks to the standalone pacemaker-simulator process
// (mysite/pacemaker-simulator/server.js) instead of a real BLE device.
//
// This is the piece that answers "how does the phone connect to the
// pacemaker?" for the demo: the phone opens a short-lived session over the
// local network, writes the prescribed voltage, reads back heart-rate data,
// and explicitly disconnects — the exact same connect -> exchange ->
// disconnect shape as the real BlePacemaker in ble.js (same PacemakerLink
// interface, same call sequence in sync.js). Only the transport differs:
// BLE GATT here vs. real Bluetooth there. Swapping PACEMAKER_MODE in
// index.js to "ble" moves onto real hardware with zero changes anywhere else.
//
// Each sync cycle's connection is intentionally brief — a handful of HTTP
// calls that normally complete in well under a second — and disconnect() is
// always called from sync.js's `finally` block, so the simulated implant
// spends the vast majority of its time fully isolated (no open session,
// nothing listening) between the 30-minute sync cycles.
// ============================================================================
import { Platform } from "react-native";
import Constants from "expo-constants";
import { PacemakerLink } from "./link";

const PORT = 9090;
const REQUEST_TIMEOUT_MS = 5000;

// Reuses the same host-resolution strategy as src/api/client.js, just aimed
// at the simulator's own port instead of the Django server's.
function resolveSimulatorBase() {
  const override = Constants.expoConfig?.extra?.pacemakerSimulatorUrl;
  if (override) return override;

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:${PORT}`;
    }
    return `http://localhost:${PORT}`;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    "";
  const host = hostUri.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${PORT}`;
  }

  if (Platform.OS === "android") return `http://10.0.2.2:${PORT}`;
  return `http://localhost:${PORT}`;
}

async function call(path, { method = "GET", body } = {}) {
  const base = resolveSimulatorBase();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Pacemaker simulator error (${res.status}).`);
    return data;
  } catch (e) {
    if (e.name === "AbortError") {
      throw new Error(
        `Couldn't reach the pacemaker simulator at ${base}. Is "node server.js" running in pacemaker-simulator/?`
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export class NetworkPacemaker extends PacemakerLink {
  constructor() {
    super();
    this.session = null;
    this._connectedAt = null;
    this.lastConnectionMs = null; // how long the last session stayed open
  }

  async connect(serial) {
    const data = await call("/connect", { method: "POST", body: { serial } });
    this.session = data.session;
    this._connectedAt = Date.now();
    return data.device;
  }

  async writeVoltage(volts) {
    if (!this.session) throw new Error("Not connected to device.");
    await call("/voltage", { method: "POST", body: { session: this.session, volts } });
    return true;
  }

  async readHeartRates(currentVoltage) {
    if (!this.session) throw new Error("Not connected to device.");
    const data = await call(`/heart-rate?session=${encodeURIComponent(this.session)}`);
    return data.readings || [];
  }

  // Always safe to call even if connect() never succeeded — sync.js calls
  // this from a `finally` block on every cycle so the implant never stays
  // "open" longer than one sync.
  async disconnect() {
    if (!this.session) return;
    const session = this.session;
    this.session = null;
    try {
      const data = await call("/disconnect", { method: "POST", body: { session } });
      this.lastConnectionMs = data.durationMs ?? (Date.now() - this._connectedAt);
    } catch (_) {
      this.lastConnectionMs = this._connectedAt ? Date.now() - this._connectedAt : null;
    }
  }
}
