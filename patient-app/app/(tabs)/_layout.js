import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/context/AuthContext";
import { theme } from "../../src/lib/theme";

function icon(name) {
  return ({ color, size }) => <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const { isAuthed, loading } = useAuth();

  if (loading) return null;

  if (!isAuthed) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: { backgroundColor: theme.bg2, borderTopColor: theme.border, height: 58, paddingBottom: 8, paddingTop: 6 },
        tabBarActiveTintColor: theme.pulse,
        tabBarInactiveTintColor: theme.textLo,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        sceneContainerStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("home") }} />
      <Tabs.Screen name="readings" options={{ title: "Readings", tabBarIcon: icon("pulse") }} />

      <Tabs.Screen name="settings" options={{ title: "Account", tabBarIcon: icon("person-circle") }} />
    </Tabs>
  );
}
