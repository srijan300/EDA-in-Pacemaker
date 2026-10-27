// Thin API client for the PaceLink Django backend.
// Base URL comes from app.json -> expo.extra.apiBaseUrl. For the Android
// emulator the host machine is reachable at 10.0.2.2; for a physical device
// use your computer's LAN IP (e.g. http://192.168.1.20:8000).

import Constants from "expo-constants";
import { Platform } from "react-native";
import { getToken } from "../lib/storage";

// Resolve the Django server address for whatever we're running on.
//
// The Django dev server listens on port 8000. How the app reaches it depends
// on the platform:
//   - Web (expo start --web):   same machine  -> http://localhost:8000
//   - Android emulator:         host is       -> http://10.0.2.2:8000
//   - iOS simulator:            same machine  -> http://localhost:8000
//   - Physical phone (Expo Go): reach the dev laptop over the LAN. Expo tells
//     us the laptop's IP via expoConfig.hostUri (e.g. "172.16.3.129:8081"),
//     so we reuse that host with port 8000.
//
// An explicit expo.extra.apiBaseUrl in app.json always wins if you set one.
const PORT = 8000;

function resolveBaseUrl() {
  // WEB: always use the browser's own hostname on port 8000. We deliberately
  // ignore any app.json override here, because Expo caches expoConfig and a
  // stale value (e.g. the Android-only 10.0.2.2) would otherwise win on web.
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.hostname) {
      return `http://${window.location.hostname}:${PORT}`;
    }
    return `http://localhost:${PORT}`;
  }

  // NATIVE: an explicit app.json override wins if you set one.
  const override = Constants.expoConfig?.extra?.apiBaseUrl;
  if (override) return override;

  // Physical device / Expo Go: derive the dev machine's LAN IP from Expo.
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

const BASE_URL = resolveBaseUrl();

async function request(path, { method = "GET", body, auth = false, timeoutMs = 12000 } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Token ${token}`;
  }
  const url = `${BASE_URL}/api${path}`;
  // Fail fast instead of hanging forever if the server is unreachable.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let resp;
  try {
    resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") {
      throw new Error(`Couldn't reach the server at ${BASE_URL} (timed out).`);
    }
    throw new Error(`Network error reaching ${url}: ${e.message}`);
  }
  clearTimeout(timer);
  let data = {};
  try {
    data = await resp.json();
  } catch (_) {
    // non-JSON response
  }
  if (!resp.ok || data.ok === false) {
    const message = data.error || `Request failed (${resp.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  baseUrl: BASE_URL,
  // Auth
  requestPassword: (email) =>
    request("/auth/request-password", { method: "POST", body: { email } }),
  checkSetupLink: (token) => request(`/auth/setup/${token}`),
  login: (email, password) =>
    request("/auth/login", { method: "POST", body: { email, password } }),
  changePassword: (old_password, new_password) =>
    request("/auth/change-password", {
      method: "POST",
      auth: true,
      body: { old_password, new_password },
    }),
  me: () => request("/me", { auth: true }),
  // Device sync
  getVoltage: () => request("/pacemaker/voltage", { auth: true }),
  ackVoltage: (voltage) =>
    request("/pacemaker/voltage/ack", { method: "POST", auth: true, body: { voltage } }),
  uploadHeartRate: (readings) =>
    request("/heartrate", { method: "POST", auth: true, body: { readings } }),
  getHeartRateHistory: (days) =>
    request(`/heartrate/history${days ? `?days=${days}` : ""}`, { auth: true }),
};
