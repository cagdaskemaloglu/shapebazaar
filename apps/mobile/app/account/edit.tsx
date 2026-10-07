import { useEffect, useState } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft } from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useProfile, PROFILE_COLUMNS } from "../../lib/auth/useProfile";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, loading } = useProfile();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity]         = useState("");
  const [bio, setBio]           = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Profil yüklenince alanları bir kez doldur
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (profile && !filled) {
      setFullName(profile.full_name ?? "");
      setUsername(profile.username ?? "");
      setCity(profile.city ?? "");
      setBio(profile.bio ?? "");
      setFilled(true);
    }
  }, [profile, filled]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"));

  async function save() {
    if (!user || !profile) return;
    setError(null);

    const name = fullName.trim();
    const uname = username.trim();
    if (name.length < 2 || name.length > 60) return setError(t("profileEdit.errNameRequired"));
    if (uname && !USERNAME_RE.test(uname))    return setError(t("profileEdit.errUsernameInvalid"));

    // Sadece değişen alanları gönder (kullanıcı adı boşsa dokunma: UNIQUE kısıtı)
    const patch: Record<string, string | null> = {};
    if (name !== (profile.full_name ?? ""))  patch.full_name = name;
    if (uname && uname !== (profile.username ?? "")) patch.username = uname;
    if (city.trim() !== (profile.city ?? "")) patch.city = city.trim() || null;
    if (bio.trim() !== (profile.bio ?? ""))   patch.bio = bio.trim() || null;
    if (Object.keys(patch).length === 0) return goBack();

    setSaving(true);
    const { error: err } = await supabase.from("profiles").update(patch).eq("id", user.id).select(PROFILE_COLUMNS).single();
    setSaving(false);

    if (err) {
      console.warn("[profile] update", err);
      setError(err.code === "23505" ? t("profileEdit.errUsernameTaken") : t("profileEdit.errSaveFailed"));
      return;
    }
    goBack();
  }

  const input = "h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm text-brand-dark mb-4";

  return (
    <KeyboardAvoidingView className="flex-1 bg-brand-light" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View className="flex-row items-center px-4 pt-14 pb-3">
        <Pressable onPress={goBack} hitSlop={10} className="w-9 h-9 rounded-full bg-white border border-slate-200 items-center justify-center mr-3">
          <ChevronLeft size={18} color="#0F172A" />
        </Pressable>
        <Text className="text-lg font-semibold text-brand-dark">{t("profileEdit.title")}</Text>
      </View>

      {loading || !profile ? (
        <ActivityIndicator className="mt-10" color="#FF6B35" />
      ) : (
        <ScrollView contentContainerClassName="px-4 pb-10" keyboardShouldPersistTaps="handled">
          <Text className="text-xs font-medium text-slate-500 mb-1.5">{t("profileEdit.fullName")}</Text>
          <TextInput value={fullName} onChangeText={setFullName} maxLength={60} className={input} />

          <Text className="text-xs font-medium text-slate-500 mb-1.5">{t("profileEdit.username")}</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
            placeholder="kullanici_adi"
            className="h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm text-brand-dark mb-1"
          />
          <Text className="text-xs text-slate-400 mb-4">{t("profileEdit.usernameHint")}</Text>

          <Text className="text-xs font-medium text-slate-500 mb-1.5">{t("profileEdit.city")}</Text>
          <TextInput value={city} onChangeText={setCity} maxLength={60} className={input} />

          <Text className="text-xs font-medium text-slate-500 mb-1.5">{t("profileEdit.bio")}</Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            maxLength={280}
            multiline
            textAlignVertical="top"
            className="min-h-[96px] px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-brand-dark mb-1"
          />
          <Text className="text-xs text-slate-400 text-right mb-4">{bio.length}/280</Text>

          {error ? <Text className="text-sm text-red-500 mb-3">{error}</Text> : null}

          <Pressable
            onPress={save}
            disabled={saving}
            className={`h-12 rounded-xl bg-brand-orange items-center justify-center ${saving ? "opacity-60" : ""}`}
          >
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text className="text-sm font-medium text-white">{t("profileEdit.save")}</Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}
