// Chooses which PacemakerLink implementation the app talks to. All three
// implement the exact same interface (connect/writeVoltage/readHeartRates/
// disconnect — see link.js), so sync.js and the dashboard never need to know
// which one is active.
//
//   "network" (default) — talks to the standalone pacemaker-simulator process
//       (mysite/pacemaker-simulator/server.js) over the local network. Each
//       sync cycle opens a brief session, exchanges data, and disconnects —
//       this is the one to run for a demo: `node server.js` in
//       pacemaker-simulator/, then run the app normally.
//   "inapp" — fabricates readings inside the app itself, no external process
//       needed at all. Useful if you just want the app to run standalone.
//   "ble" — real hardware via react-native-ble-plx. Needs a custom Expo dev
//       build (not Expo Go) and a physical BLE peripheral advertising the
//       GATT service described in link.js.
import { SimulatedPacemaker } from "./simulated";
import { BlePacemaker } from "./ble";
import { NetworkPacemaker } from "./network";

export const PACEMAKER_MODE = "network";

// Kept for existing UI checks that only distinguish real BLE vs. everything else.
export const USE_REAL_BLE = PACEMAKER_MODE === "ble";

let instance = null;
export function getPacemaker() {
  if (!instance) {
    if (PACEMAKER_MODE === "ble") instance = new BlePacemaker();
    else if (PACEMAKER_MODE === "network") instance = new NetworkPacemaker();
    else instance = new SimulatedPacemaker();
  }
  return instance;
}
