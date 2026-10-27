// The sync cycle that runs every 30 minutes (and on demand).
//
// One cycle:
//   1. Pull the doctor's target voltage from the server.
//   2. Connect to the pacemaker and WRITE that voltage to it.
//   3. Acknowledge to the server that the voltage was delivered.
//   4. READ heart-rate readings the device collected.
//   5. Upload those readings to the server (where the hospital app reads them).
//
// Returns a summary the UI can show. Never throws for expected offline cases —
// it returns { ok:false, error } so the caller can display it.
import { api } from "../api/client";
import { getPacemaker } from "./index";
import { savePatient } from "../lib/storage";

export async function runSyncCycle({ onStep } = {}) {
  const step = (name) => onStep && onStep(name);
  const pacemaker = getPacemaker();
  const summary = {
    ok: false,
    voltageWritten: null,
    readingsUploaded: 0,
    connectionMs: null, // how long the pacemaker connection stayed open this cycle
    at: new Date().toISOString(),
    error: null,
  };

  try {
    // 1. Pull target voltage.
    step("Fetching prescribed voltage…");
    const v = await api.getVoltage();
    const target = v.target_voltage;

    // 2. Connect + write to device.
    step("Writing voltage to pacemaker…");
    const me = await api.me().catch(() => null);
    const serial = me?.patient?.pacemaker_serial || null;
    await pacemaker.connect(serial);
    await pacemaker.writeVoltage(target);
    summary.voltageWritten = target;

    // 3. Acknowledge delivery to server.
    step("Confirming delivery…");
    await api.ackVoltage(target);

    // 4. Read heart-rate data from device.
    step("Reading heart-rate data…");
    const readings = await pacemaker.readHeartRates(target);

    // 5. Upload to server.
    if (readings.length > 0) {
      step("Uploading heart-rate data…");
      const res = await api.uploadHeartRate(readings);
      summary.readingsUploaded = res.stored ?? readings.length;
    }

    // Refresh cached profile.
    const fresh = await api.me().catch(() => null);
    if (fresh?.patient) await savePatient(fresh.patient);

    summary.ok = true;
  } catch (e) {
    summary.error = e.message || "Sync failed.";
  } finally {
    try {
      await pacemaker.disconnect();
      summary.connectionMs = pacemaker.lastConnectionMs ?? null;
    } catch (_) {}
  }
  return summary;
}
