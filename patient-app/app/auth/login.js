import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../../src/context/AuthContext";
import { api } from "../../src/api/client";

export default function Login() {
  const { login } = useAuth();
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(params.email ? String(params.email) : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit() {
    setError("");
    setNote("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (e) {
      setError(e.message || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  // Auto-generate password lives on this page. Patient types their registered
  // email above and taps this; if it matches, the server emails a temporary
  // password + a link that reopens the app on this same login screen.
  async function onGenerate() {
    setError("");
    setNote("");
    if (!email.trim()) {
      setError("Enter your registered email first, then tap auto-generate.");
      return;
    }
    setGenBusy(true);
    try {
      const data = await api.requestPassword(email.trim());
      setNote(
        data.message ||
          "If that email is registered, we've emailed you a temporary password and a link back into the app."
      );
    } catch (e) {
      setError(e.message || "Something went wrong. Try again.");
    } finally {
      setGenBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={c.screen}
    >
      <View style={c.wrap}>
        <View style={c.card}>
          <Text style={c.title}>Welcome back</Text>
          <Text style={c.subtitle}>Log in to your account</Text>

          <Text style={c.label}>Email</Text>
          <TextInput
            style={c.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder=""
            placeholderTextColor="#9CA3AF"
          />

          <Text style={c.label}>Password</Text>
          <View style={c.passwordRow}>
            <TextInput
              style={c.passwordInput}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder=""
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              style={c.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Text style={c.eyeText}>{showPassword ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>

          {note ? <Text style={c.note}>{note}</Text> : null}
          {error ? <Text style={c.error}>{error}</Text> : null}

          <TouchableOpacity style={c.btn} onPress={onSubmit} disabled={busy}>
            <Text style={c.btnText}>{busy ? "Logging in…" : "Log In"}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={c.linkRow}
            onPress={onGenerate}
            disabled={genBusy}
          >
            <Text style={c.link}>
              {genBusy ? "Sending…" : "Auto generate password"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const c = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F8" },
  wrap: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 14,
    padding: 28,
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: { color: "#111827", fontSize: 26, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#6B7280", fontSize: 14, marginBottom: 22 },
  label: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 8,
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderWidth: 1,
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    color: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 11 },
  eyeText: { color: "#4F46E5", fontWeight: "600", fontSize: 13 },
  btn: {
    backgroundColor: "#18181B",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 22,
  },
  btnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  linkRow: { alignItems: "center", marginTop: 16 },
  link: { color: "#4F46E5", fontWeight: "600", fontSize: 14 },
  error: { color: "#DC2626", fontSize: 13, marginTop: 12 },
  note: { color: "#059669", fontSize: 13, marginTop: 12 },
});
