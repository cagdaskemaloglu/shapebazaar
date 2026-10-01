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
          <Stack.Screen name="checkout" options={{ presentation: "fullScreenModal", gestureEnabled: false }} />
          <Stack.Screen name="payment/success" options={{ gestureEnabled: false }} />
          <Stack.Screen name="payment/failed" options={{ gestureEnabled: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
