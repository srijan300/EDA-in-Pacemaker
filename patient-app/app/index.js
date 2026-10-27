// Entry gate. The patient app has no signup (accounts are created by the
// hospital when the doctor registers the patient), so the FIRST screen is
// always the LOGIN page — every time the app opens.
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { theme } from "../src/lib/theme";

export default function Index() {
  const { isAuthed, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: "center" }}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    );
  }

  if (isAuthed) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth/login" />;
}
