import { useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Linking } from "react-native";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "expo-router";
import { useAuth } from "../../lib/auth/AuthProvider";
import { leaveAuthScreen } from "../../lib/auth/navigation";

const WEB_BASE_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://www.shapebazaar.com";

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const { signUpWithPassword, signInWithGoogle } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleRegister() {
    if (password.length < 8) { setError(t("auth.minPassword")); return; }
    setLoading(true);
    setError("");
    const { error } = await signUpWithPassword(email, password, fullName);
    if (error) {
      setError(error.includes("already registered") ? t("auth.alreadyRegistered") : t("auth.registerError"));
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    const { error, signedIn } = await signInWithGoogle();
    if (error) setError(error);
    else if (signedIn) leaveAuthScreen();
    setGoogleLoading(false);
  }

  // Kullanım koşulları/gizlilik sayfaları web'de duruyor — mobilde ayrı bir
  // ekrana taşımak yerine şimdilik tarayıcıda açıyoruz.
  const locale = i18n.language === "en" ? "en" : "tr";

  if (done) {
    return (
      <View className="flex-1 bg-brand-light items-center justify-center px-6">
        <Text className="text-lg font-medium text-brand-dark mb-2">{t("auth.checkEmail")}</Text>
        <Trans
          i18nKey="auth.checkEmailDesc"
          values={{ email }}
          components={{ b: <Text className="font-semibold" /> }}
          parent={Text}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-brand-light"
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-2xl font-semibold text-brand-dark mb-6 text-center">
          {t("auth.registerTitle")}
        </Text>

        <Pressable
          onPress={handleGoogle}
          disabled={googleLoading}
          className="h-12 rounded-xl border border-slate-200 bg-white items-center justify-center mb-4"
        >
          <Text className="text-sm font-medium text-brand-dark">
            {googleLoading ? t("auth.redirecting") : t("auth.googleRegister")}
          </Text>
        </Pressable>

        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-slate-200" />
          <Text className="text-xs text-slate-400 mx-3">{t("auth.or")}</Text>
          <View className="flex-1 h-px bg-slate-200" />
        </View>

        <Text className="text-xs text-slate-500 mb-1.5">{t("auth.fullName")}</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Ahmet Yılmaz"
          className="h-12 px-4 rounded-xl border border-slate-200 bg-white text-brand-dark mb-3"
        />

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

        <Text className="text-[11px] text-slate-500 leading-relaxed mb-4">
          <Trans
            i18nKey="auth.termsText"
            components={{
              terms: (
                <Text
                  className="text-brand-orange"
                  onPress={() => Linking.openURL(`${WEB_BASE_URL}/${locale}/terms`)}
                />
              ),
              privacy: (
                <Text
                  className="text-brand-orange"
                  onPress={() => Linking.openURL(`${WEB_BASE_URL}/${locale}/privacy`)}
                />
              ),
            }}
          />
        </Text>

        <Pressable
          onPress={handleRegister}
          disabled={loading}
          className="h-12 rounded-xl bg-brand-orange items-center justify-center mb-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-sm font-medium text-white">{t("auth.registerBtn")}</Text>
          )}
        </Pressable>

        <View className="flex-row justify-center">
          <Text className="text-xs text-slate-500">{t("auth.hasAccount")} </Text>
          <Link href="/auth/login" asChild>
            <Pressable>
              <Text className="text-xs text-brand-orange font-medium">{t("auth.loginBtn")}</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
