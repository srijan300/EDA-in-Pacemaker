// SimulatedPacemaker — stands in for real hardware so the whole flow runs in
// Expo Go with no device. It "accepts" voltage writes and fabricates plausible
// heart-rate readings (voltage-influenced, one per minute since the last read).
import { PacemakerLink } from "./link";

export class SimulatedPacemaker extends PacemakerLink {
  constructor() {
    super();
    this.voltage = 2.5;
    this.lastRead = Date.now() - 30 * 60 * 1000; // seed 30 min of history
    this.connected = false;
  }

  async connect(serial) {
    await new Promise((r) => setTimeout(r, 400));
    this.connected = true;
    return { id: serial || "SIM-DEVICE", name: "Simulated Pacemaker" };
  }

  async writeVoltage(volts) {
    if (!this.connected) throw new Error("Not connected to device.");
    await new Promise((r) => setTimeout(r, 200));
    this.voltage = volts;
    return true;
  }

  async readHeartRates(currentVoltage) {
    if (!this.connected) throw new Error("Not connected to device.");
    const v = currentVoltage ?? this.voltage;
    const now = Date.now();
    const readings = [];
    const stepMs = 60 * 1000; // one reading per minute
    let t = this.lastRead + stepMs;
    let guard = 0;
    while (t <= now && guard < 240) {
      const baseline = 70 + (v - 2.5) * 4;
      const bpm = Math.round(baseline + (Math.random() - 0.5) * 10);
      readings.push({
        bpm: Math.max(50, Math.min(120, bpm)),
        recorded_at: new Date(t).toISOString(),
        voltage: v,
      });
      t += stepMs;
      guard++;
    }
    this.lastRead = now;
    return readings;
  }

  async disconnect() {
    this.connected = false;
  }
}
