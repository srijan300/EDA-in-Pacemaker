// BlePacemaker — real Bluetooth Low Energy implementation using
// react-native-ble-plx. Requires a custom Expo dev build (NOT Expo Go) and a
// physical device with Bluetooth. See README for build instructions.
//
// Because BLE modules crash in Expo Go, we import ble-plx lazily so the
// simulated path keeps working there.
import { GATT, encodeVoltage, decodeHeartRate } from "./link";
import { PacemakerLink } from "./link";

function toBase64(bytes) {
  // btoa isn't always available in RN; do a manual base64 of the byte array.
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
    out += chars[b0 >> 2];
    out += chars[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)];
    out += b1 === undefined ? "=" : chars[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)];
    out += b2 === undefined ? "=" : chars[b2 & 63];
  }
  return out;
}

function fromBase64(b64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = b64.replace(/=+$/, "");
  const bytes = [];
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (chars.indexOf(clean[i]) << 18) |
      (chars.indexOf(clean[i + 1]) << 12) |
      ((chars.indexOf(clean[i + 2]) || 0) << 6) |
      (chars.indexOf(clean[i + 3]) || 0);
    bytes.push((n >> 16) & 0xff);
    if (clean[i + 2]) bytes.push((n >> 8) & 0xff);
    if (clean[i + 3]) bytes.push(n & 0xff);
  }
  return bytes;
}

export class BlePacemaker extends PacemakerLink {
  constructor() {
    super();
    this.manager = null;
    this.device = null;
    this.hrBuffer = [];
    this.currentVoltage = 2.5;
  }

  async _ensureManager() {
    if (this.manager) return;
    const { BleManager } = await import("react-native-ble-plx");
    this.manager = new BleManager();
  }

  // Connect by scanning for the device advertising our service, optionally
  // matching the known serial in its name.
  async connect(serial) {
    await this._ensureManager();
    const device = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        reject(new Error("Pacemaker not found. Is it in range?"));
      }, 15000);

      this.manager.startDeviceScan([GATT.SERVICE], null, (error, dev) => {
        if (error) {
          clearTimeout(timeout);
          this.manager.stopDeviceScan();
          reject(error);
          return;
        }
        if (!dev) return;
        if (!serial || (dev.name && dev.name.includes(serial))) {
          clearTimeout(timeout);
          this.manager.stopDeviceScan();
          resolve(dev);
        }
      });
    });

    this.device = await device.connect();
    await this.device.discoverAllServicesAndCharacteristics();

    // Subscribe to heart-rate notifications, buffering them for readHeartRates.
    this.device.monitorCharacteristicForService(
      GATT.SERVICE,
      GATT.HR_CHAR,
      (error, ch) => {
        if (error || !ch?.value) return;
        const bpm = decodeHeartRate(fromBase64(ch.value));
        if (bpm != null) {
          this.hrBuffer.push({
            bpm,
            recorded_at: new Date().toISOString(),
            voltage: this.currentVoltage,
          });
        }
      }
    );

    return { id: this.device.id, name: this.device.name };
  }

  async writeVoltage(volts) {
    if (!this.device) throw new Error("Not connected to device.");
    this.currentVoltage = volts;
    const payload = toBase64(encodeVoltage(volts));
    await this.device.writeCharacteristicWithResponseForService(
      GATT.SERVICE,
      GATT.VOLTAGE_CHAR,
      payload
    );
    return true;
  }

  // Return everything buffered from notifications since the last call. If the
  // device only supports READ (not NOTIFY), fall back to a single read.
  async readHeartRates(currentVoltage) {
    if (!this.device) throw new Error("Not connected to device.");
    if (currentVoltage != null) this.currentVoltage = currentVoltage;

    if (this.hrBuffer.length === 0) {
      try {
        const ch = await this.device.readCharacteristicForService(
          GATT.SERVICE,
          GATT.HR_CHAR
        );
        const bpm = decodeHeartRate(fromBase64(ch.value));
        if (bpm != null) {
          this.hrBuffer.push({
            bpm,
            recorded_at: new Date().toISOString(),
            voltage: this.currentVoltage,
          });
        }
      } catch (_) {}
    }
    const out = this.hrBuffer;
    this.hrBuffer = [];
    return out;
  }

  async disconnect() {
    try {
      if (this.device) await this.device.cancelConnection();
    } finally {
      this.device = null;
    }
  }
}
