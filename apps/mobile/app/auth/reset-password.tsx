import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { useAuth } from "../../lib/auth/AuthProvider";

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { session, updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (password.length < 8) { setError(t("auth.minPassword")); return; }
    setLoading(true);
    setError("");
    const { error } = await updatePassword(password);
    if (error) setError(t("auth.resetError"));
    else setDone(true);
    setLoading(false);
  }

  if (!session) {
    // Deep link'ten gelen recovery oturumu henüz kurulmadıysa (ya da link
    // geçersiz/süresi dolmuşsa) burada bekleriz — AuthProvider session'ı
    // yakalar yakalamaz bu ekran otomatik olarak forma geçer.
    return (
      <View className="flex-1 bg-brand-light items-center justify-center px-6">
        <Text className="text-sm text-slate-500 text-center mb-4">{t("auth.invalidSession")}</Text>
        <Pressable onPress={() => router.replace("/auth/forgot-password")}>
          <Text className="text-sm text-brand-orange font-medium">{t("auth.sendResetLink")}</Text>
        </Pressable>
      </View>
    );
  }

  if (done) {
    return (
      <View className="flex-1 bg-brand-light items-center justify-center px-6">
        <Text className="text-lg font-medium text-brand-dark mb-2">{t("auth.passwordUpdated")}</Text>
        <Text className="text-sm text-slate-500 text-center mb-6">{t("auth.passwordUpdatedDesc")}</Text>
        <Pressable
          onPress={() => router.replace("/(tabs)/profile")}
          className="h-12 px-6 rounded-xl bg-brand-orange items-center justify-center"
        >
          <Text className="text-sm font-medium text-white">{t("auth.goToLogin")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-light justify-center px-6">
      <Text className="text-2xl font-semibold text-brand-dark mb-6 text-center">
        {t("auth.resetPasswordTitle")}
      </Text>

      <Text className="text-xs text-slate-500 mb-1.5">{t("auth.newPassword")}</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
        className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-brand-dark mb-3"
      />

      {error ? (
        <Text className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        className="h-12 rounded-xl bg-brand-orange items-center justify-center"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-sm font-medium text-white">{t("auth.resetPasswordBtn")}</Text>
        )}
      </Pressable>
    </View>
  );
}
