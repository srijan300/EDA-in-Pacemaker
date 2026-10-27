// Persistence for the auth token + cached patient profile.
//
// expo-secure-store is a NATIVE-ONLY module (iOS Keychain / Android Keystore).
// It has no implementation on web, so calling it in a browser throws
// "getValueWithKeyAsync is not a function". To let the app also run under
// `expo start --web` (handy for a quick demo), we fall back to localStorage
// on web and use SecureStore on real devices.
import { Platform } from "react-native";

const TOKEN_KEY = "pacelink.token";
const PATIENT_KEY = "pacelink.patient";

const isWeb = Platform.OS === "web";

// Lazily require SecureStore only on native so web never touches it.
let SecureStore = null;
if (!isWeb) {
  // eslint-disable-next-line global-require
  SecureStore = require("expo-secure-store");
}

async function setItem(key, value) {
  if (isWeb) {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key) {
  if (isWeb) {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key) {
  if (isWeb) {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(token) {
  await setItem(TOKEN_KEY, token);
}
export async function getToken() {
  return getItem(TOKEN_KEY);
}
export async function clearToken() {
  await removeItem(TOKEN_KEY);
  await removeItem(PATIENT_KEY);
}
export async function savePatient(patient) {
  await setItem(PATIENT_KEY, JSON.stringify(patient));
}
export async function getPatient() {
  const raw = await getItem(PATIENT_KEY);
  return raw ? JSON.parse(raw) : null;
}


