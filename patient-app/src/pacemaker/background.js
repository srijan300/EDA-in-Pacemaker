// Registers a background task that runs the sync cycle roughly every 30 minutes.
//
// NOTE ON PLATFORM REALITY: iOS/Android do not guarantee exact 30-minute
// background wakeups — the OS decides timing based on usage/battery. We request
// 30 min as the minimum interval; the OS may run it less often in the
// background. When the app is in the foreground, a JS interval (see dashboard)
// runs it exactly on schedule. For guaranteed timing you'd need a server-side
// scheduler or push-triggered sync.
//
// WEB: expo-background-fetch / expo-task-manager are native-only. Under
// `expo start --web` we skip them entirely so the browser demo doesn't crash;
// the foreground JS interval on the dashboard still drives the 30-min sync.
import { Platform } from "react-native";
import { runSyncCycle } from "./sync";

export const SYNC_TASK = "pacelink-sync";
export const SYNC_INTERVAL_SECONDS = 30 * 60;

const isWeb = Platform.OS === "web";

let BackgroundFetch = null;
let TaskManager = null;

if (!isWeb) {
  // eslint-disable-next-line global-require
  BackgroundFetch = require("expo-background-fetch");
  // eslint-disable-next-line global-require
  TaskManager = require("expo-task-manager");

  TaskManager.defineTask(SYNC_TASK, async () => {
    try {
      const result = await runSyncCycle();
      return result.ok
        ? BackgroundFetch.BackgroundFetchResult.NewData
        : BackgroundFetch.BackgroundFetchResult.Failed;
    } catch (_) {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerBackgroundSync() {
  if (isWeb) return false; // no OS background scheduler on web
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) {
      return false;
    }
    await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
      minimumInterval: SYNC_INTERVAL_SECONDS,
      stopOnTerminate: false,
      startOnBoot: true,
    });
    return true;
  } catch (_) {
    return false;
  }
}

export async function unregisterBackgroundSync() {
  if (isWeb) return;
  try {
    await BackgroundFetch.unregisterTaskAsync(SYNC_TASK);
  } catch (_) {}
}
