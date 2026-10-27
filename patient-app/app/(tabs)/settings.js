// Account screen: change password + sign out.
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useAuth } from "../../src/context/AuthContext";
import { api } from "../../src/api/client";
import { saveToken } from "../../src/lib/storage";
import { theme } from "../../src/lib/theme";
import { s } from "../../src/lib/ui";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "").concat(parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "").toUpperCase();
}

export default function Settings() {
  const { patient, logout } = useAuth();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword() {
    setMsg("");
    setError("");
    if (newPw.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.changePassword(oldPw, newPw);
      if (res.token) await saveToken(res.token);
      setMsg("Password changed.");
      setOldPw("");
      setNewPw("");
    } catch (e) {
      setError(e.message || "Could not change password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: 20 }}>
      <Text style={s.eyebrow}>Your account</Text>
      <Text style={[s.h1, { marginBottom: 20 }]}>Account</Text>

      <View style={[s.card, { flexDirection: "row", alignItems: "center", gap: 14 }]}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: theme.pulseDim,
            borderWidth: 1,
            borderColor: "rgba(255,110,110,0.3)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: theme.pulse, fontWeight: "700", fontSize: 18 }}>
            {initials(patient?.full_name)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>{patient?.full_name}</Text>
          <Text style={{ color: theme.textLo, fontSize: 13, marginTop: 2 }}>{patient?.email}</Text>
          <Text style={{ color: theme.textFaint, fontSize: 12, marginTop: 2 }}>{patient?.patient_id}</Text>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.label}>Change password</Text>
        <TextInput
          style={s.input}
          value={oldPw}
          onChangeText={setOldPw}
          secureTextEntry
          placeholder="Current password"
          placeholderTextColor={theme.textLo}
        />
        <View style={{ height: 10 }} />
        <TextInput
          style={s.input}
          value={newPw}
          onChangeText={setNewPw}
          secureTextEntry
          placeholder="New password (min 8 chars)"
          placeholderTextColor={theme.textLo}
        />
        {msg ? <Text style={s.note}>{msg}</Text> : null}
        {error ? <Text style={s.error}>{error}</Text> : null}
        <TouchableOpacity style={s.btn} onPress={changePassword} disabled={busy}>
          <Text style={s.btnText}>{busy ? "Saving…" : "Update password"}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={s.btnGhost} onPress={logout}>
        <Text style={s.btnGhostText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
