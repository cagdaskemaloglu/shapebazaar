import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "expo-router";
import { useAuth } from "../../lib/auth/AuthProvider";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError("");
    const { error } = await resetPassword(email);
    if (error) setError(t("auth.resetError"));
    else setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <View className="flex-1 bg-brand-light items-center justify-center px-6">
        <Text className="text-lg font-medium text-brand-dark mb-2">{t("auth.resetEmailSent")}</Text>
        <Trans
          i18nKey="auth.resetEmailSentDesc"
          values={{ email }}
          components={{ b: <Text className="font-semibold" /> }}
          parent={Text}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-light justify-center px-6">
      <Text className="text-2xl font-semibold text-brand-dark mb-2 text-center">
        {t("auth.forgotPasswordTitle")}
      </Text>
      <Text className="text-sm text-slate-500 mb-6 text-center">{t("auth.forgotPasswordDesc")}</Text>

      <Text className="text-xs text-slate-500 mb-1.5">{t("auth.email")}</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="ornek@email.com"
        className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-brand-dark mb-3"
      />

      {error ? (
        <Text className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        className="h-12 rounded-xl bg-brand-orange items-center justify-center mb-4"
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-sm font-medium text-white">{t("auth.sendResetLink")}</Text>
        )}
      </Pressable>

      <Link href="/auth/login" asChild>
        <Pressable className="items-center">
          <Text className="text-xs text-brand-orange font-medium">← {t("auth.backToLogin")}</Text>
        </Pressable>
      </Link>
    </View>
  );
}
