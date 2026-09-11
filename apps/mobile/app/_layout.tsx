import "../global.css";
import "../lib/i18n";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../lib/auth/AuthProvider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth/login" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/register" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/forgot-password" options={{ presentation: "modal" }} />
          <Stack.Screen name="auth/reset-password" options={{ presentation: "modal" }} />
          {/* Faz 3+'ta buraya eklenecek: models/[id], cart/checkout vb. */}
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
