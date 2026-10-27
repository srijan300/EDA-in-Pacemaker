// Global auth state: token bootstrap, login, logout.
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { clearToken, getToken, savePatient, saveToken, getPatient } from "../lib/storage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [token, setTokenState] = useState(null);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const existing = await getToken();
        if (existing) {
          setTokenState(existing);
          setPatient(await getPatient());
          // Refresh profile in the background; ignore failures (offline).
          try {
            const data = await api.me();
            setPatient(data.patient);
            await savePatient(data.patient);
          } catch (_) {}
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function login(email, password) {
    const data = await api.login(email, password);
    await saveToken(data.token);
    await savePatient(data.patient);
    setTokenState(data.token);
    setPatient(data.patient);
    return data;
  }

  async function logout() {
    await clearToken();
    setTokenState(null);
    setPatient(null);
  }

  return (
    <AuthContext.Provider
      value={{ loading, token, patient, setPatient, login, logout, isAuthed: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
