// Landing screen for the emailed deep link: pacelink://auth/setup/<token>
// The token arrives as a PATH segment here (this file captures it via the
// [token] dynamic route). Validates the one-time token, then sends the
// patient to login with their email pre-filled; they enter the temporary
// password from the email.
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../../src/api/client";
import { s } from "../../../src/lib/ui";
import { theme } from "../../../src/lib/theme";

export default function SetupWithToken() {
  const { token } = useLocalSearchParams();
  const [state, setState] = useState({ loading: true, email: "", error: "" });

  useEffect(() => {
    (async () => {
      if (!token) {
        setState({ loading: false, email: "", error: "Missing setup token." });
        return;
      }
      try {
        const data = await api.checkSetupLink(String(token));
        setState({ loading: false, email: data.email, error: "" });
      } catch (e) {
        setState({ loading: false, email: "", error: e.message || "Invalid link." });
      }
    })();
  }, [token]);

  if (state.loading) {
    return (
      <View style={[s.screen, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={theme.accent} size="large" />
        <Text style={[s.sub, { marginTop: 16 }]}>Checking your link…</Text>
      </View>
    );
  }

  return (
    <View style={[s.screen, { justifyContent: "center" }]}>
      <Text style={s.h1}>Almost there</Text>
      {state.error ? (
        <>
          <Text style={s.error}>{state.error}</Text>
          <TouchableOpacity style={s.btn} onPress={() => router.replace("/auth/login")}>
            <Text style={s.btnText}>Back to sign in</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={s.sub}>
            Your link is valid. Sign in with{" "}
            <Text style={s.link}>{state.email}</Text> and the temporary password
            from your email.
          </Text>
          <TouchableOpacity
            style={s.btn}
            onPress={() =>
              router.replace({ pathname: "/auth/login", params: { email: state.email } })
            }
          >
            <Text style={s.btnText}>Continue to sign in</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
