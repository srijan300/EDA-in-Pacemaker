// ============================================================================
// PacemakerLink — abstraction over the connection to the implanted device.
//
// The phone talks to the pacemaker over Bluetooth Low Energy (BLE / GATT).
// We assume the device exposes a custom GATT service with two characteristics:
//
//   Service  UUID: 0000fe10-0000-1000-8000-00805f9b34fb   (PACE_SERVICE)
//     - Voltage    characteristic (WRITE):   0000fe11-...  (PACE_VOLTAGE_CHAR)
//         Payload: 2 bytes, uint16 millivolts, little-endian.
//         e.g. 3.6 V -> 3600 -> [0x10, 0x0E]
//     - HeartRate  characteristic (NOTIFY/READ): 0000fe12-... (PACE_HR_CHAR)
//         Payload: standard BLE Heart Rate Measurement layout —
//         byte0 flags; if (flags & 0x01) bpm is uint16 at [1..2] else uint8 at [1].
//
// Two implementations share this interface:
//   * SimulatedPacemaker — no hardware, works in Expo Go. Default.
//   * BlePacemaker       — real react-native-ble-plx. Needs a dev build + device.
//
// Swap which one `getPacemaker()` returns; the sync engine is unchanged.
// ============================================================================

export const GATT = {
  SERVICE: "0000fe10-0000-1000-8000-00805f9b34fb",
  VOLTAGE_CHAR: "0000fe11-0000-1000-8000-00805f9b34fb",
  HR_CHAR: "0000fe12-0000-1000-8000-00805f9b34fb",
};

// Encode volts -> 2-byte little-endian millivolts (what we write to the device).
export function encodeVoltage(volts) {
  const mv = Math.max(0, Math.min(65535, Math.round(volts * 1000)));
  return [mv & 0xff, (mv >> 8) & 0xff];
}

// Decode a BLE Heart Rate Measurement byte array -> bpm integer.
export function decodeHeartRate(bytes) {
  if (!bytes || bytes.length < 2) return null;
  const flags = bytes[0];
  const is16 = (flags & 0x01) === 1;
  return is16 ? bytes[1] | (bytes[2] << 8) : bytes[1];
}

// The interface every implementation fulfils.
export class PacemakerLink {
  async connect(serial) {
    throw new Error("not implemented");
  }
  async writeVoltage(volts) {
    throw new Error("not implemented");
  }
  // Returns an array of { bpm, recorded_at, voltage } collected since the last call.
  async readHeartRates(currentVoltage) {
    throw new Error("not implemented");
  }
  async disconnect() {}
}
