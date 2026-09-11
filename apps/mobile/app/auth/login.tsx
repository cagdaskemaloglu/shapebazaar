import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { router, Link } from "expo-router";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../../lib/auth/AuthProvider";

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signInWithPassword, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");
    const { error } = await signInWithPassword(email, password);
    if (error) {
      setError(t("auth.wrongCredentials"));
    } else {
      router.replace("/(tabs)/profile");
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    const { error } = await signInWithGoogle();
    if (error) setError(error);
    setGoogleLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-brand-light"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-2xl font-semibold text-brand-dark mb-6 text-center">
          {t("auth.loginTitle")}
        </Text>

        <Pressable
          onPress={handleGoogle}
          disabled={googleLoading}
          className="h-12 rounded-xl border border-slate-200 bg-white items-center justify-center mb-4"
        >
          <Text className="text-sm font-medium text-brand-dark">
            {googleLoading ? t("auth.redirecting") : t("auth.googleLogin")}
          </Text>
        </Pressable>

        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-slate-200" />
          <Text className="text-xs text-slate-400 mx-3">{t("auth.or")}</Text>
          <View className="flex-1 h-px bg-slate-200" />
        </View>

        <Text className="text-xs text-slate-500 mb-1.5">{t("auth.email")}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="ornek@email.com"
          className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-brand-dark mb-3"
        />

        <Text className="text-xs text-slate-500 mb-1.5">{t("auth.password")}</Text>
        <View className="relative mb-1">
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
            placeholder="••••••••"
            className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-brand-dark"
          />
          <Pressable
            onPress={() => setShowPass((s) => !s)}
            className="absolute right-4 top-0 h-12 justify-center"
          >
            {showPass ? <EyeOff size={16} color="#94A3B8" /> : <Eye size={16} color="#94A3B8" />}
          </Pressable>
        </View>

        <Link href="/auth/forgot-password" asChild>
          <Pressable className="self-end mb-4">
            <Text className="text-xs text-brand-orange">{t("auth.forgotPassword")}</Text>
          </Pressable>
        </Link>

        {error ? (
          <Text className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</Text>
        ) : null}

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          className="h-12 rounded-xl bg-brand-orange items-center justify-center mb-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-medium text-white">{t("auth.loginBtn")}</Text>
          )}
        </Pressable>

        <View className="flex-row justify-center">
          <Text className="text-xs text-slate-500">{t("auth.noAccount")} </Text>
          <Link href="/auth/register" asChild>
            <Pressable>
              <Text className="text-xs text-brand-orange font-medium">{t("auth.registerBtn")}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
