import { View } from "react-native";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/context/AuthContext";
import { theme } from "../src/lib/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.bg },
              headerTintColor: theme.text,
              contentStyle: { backgroundColor: theme.bg },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ title: "Sign in" }} />
            <Stack.Screen name="auth/setup/[token]" options={{ title: "Set up" }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </View>
    </AuthProvider>
  );
}
