import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, AlertTriangle, XCircle } from "lucide-react-native";
import { apiPost, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth/AuthProvider";

interface Blocker { code: string; count?: number; amount?: number }
interface Report { blockers: Blocker[]; willCancelOrders: number; willUnpublishModels: number }

// "SİL" / "sil" / "SIL" hepsi kabul: Türkçe i/ı farkı yüzünden kullanıcı takılmasın
const canon = (s: string) => s.trim().toLowerCase().replace(/\u0307/g, "").replace(/ı/g, "i");

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();

  const [report, setReport]   = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [typed, setTyped]     = useState("");
  const [deleting, setDeleting] = useState(false);

  const word = t("account.confirmWord");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setReport(await apiPost<Report>("/api/account/delete", { dryRun: true }));
    } catch (e) {
      console.warn("[account] dry run", e);
      setLoadError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"));

  async function deleteAccount() {
    if (!report) return;
    setDeleting(true);
    try {
      await apiPost("/api/account/delete", {
        confirm: true,
        // Ekranda "X sipariş iptal edilecek" uyarısı gösterildi → kullanıcı bunu onayladı
        acknowledgeCancelOrders: report.willCancelOrders > 0,
      });
      try { await signOut(); } catch { /* hesap silindi, oturum zaten geçersiz */ }
      Alert.alert(t("account.done"));
      router.replace("/(tabs)");
    } catch (e) {
      console.warn("[account] delete", e);
      if (e instanceof ApiError && e.status === 409 && e.data?.code === "BLOCKED") {
        await load(); // durum arada değişti (ör. yeni sipariş) — engelleri yeniden göster
      } else {
        Alert.alert(t("account.failed"));
      }
    }
    setDeleting(false);
  }

  const blockerText = (b: Blocker) =>
    t(`account.blockers.${b.code}`, {
      count: b.count ?? 0,
      amount: b.amount != null ? Number(b.amount).toFixed(2) : "",
      defaultValue: t("account.blockers.UNKNOWN"),
    });

  const Header = (
    <View className="flex-row items-center px-4 pt-14 pb-3">
      <Pressable onPress={goBack} hitSlop={10} className="w-9 h-9 rounded-full bg-white border border-slate-200 items-center justify-center mr-3">
        <ChevronLeft size={18} color="#0F172A" />
      </Pressable>
      <Text className="text-lg font-semibold text-brand-dark">{t("account.title")}</Text>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-brand-light">
        {Header}
        <ActivityIndicator className="mt-10" color="#FF6B35" />
        <Text className="text-xs text-slate-400 text-center mt-3">{t("account.checking")}</Text>
      </View>
    );
  }

  if (loadError || !report) {
    return (
      <View className="flex-1 bg-brand-light">
        {Header}
        <View className="items-center px-8 mt-12">
          <Text className="text-sm text-slate-500 text-center mb-4">{t("account.loadFailed")}</Text>
          <Pressable onPress={load} className="h-10 px-5 rounded-xl bg-brand-orange items-center justify-center">
            <Text className="text-sm font-medium text-white">{t("account.retry")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Silmeyi engelleyen açık yükümlülükler
  if (report.blockers.length > 0) {
    return (
      <View className="flex-1 bg-brand-light">
        {Header}
        <ScrollView contentContainerClassName="px-4 pb-10">
          <View className="bg-white rounded-2xl border border-slate-100 p-4">
            <View className="flex-row items-center mb-2">
              <XCircle size={18} color="#EF4444" />
              <Text className="text-base font-semibold text-brand-dark ml-2">{t("account.blockedTitle")}</Text>
            </View>
            <Text className="text-sm text-slate-500 mb-3">{t("account.blockedIntro")}</Text>
            {report.blockers.map((b) => (
              <Text key={b.code} className="text-sm text-brand-dark mb-2">• {blockerText(b)}</Text>
            ))}
          </View>
          <Pressable onPress={goBack} className="mt-5 h-12 rounded-xl border border-slate-200 bg-white items-center justify-center">
            <Text className="text-sm text-brand-dark">{t("account.back")}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  const canDelete = canon(typed) === canon(word) && !deleting;

  return (
    <View className="flex-1 bg-brand-light">
      {Header}
      <ScrollView contentContainerClassName="px-4 pb-10" keyboardShouldPersistTaps="handled">
        <View className="bg-red-50 rounded-2xl p-4 mb-4 flex-row items-center">
          <AlertTriangle size={18} color="#DC2626" />
          <Text className="text-sm font-medium text-red-700 ml-2 flex-1">{t("account.irreversible")}</Text>
        </View>

        <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-4">
          <Text className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">{t("account.willDeleteTitle")}</Text>
          <Text className="text-sm text-brand-dark mb-2">• {t("account.willDelete")}</Text>
          <Text className="text-sm text-brand-dark mb-2">• {t("account.willKeepOrders")}</Text>
          {report.willUnpublishModels > 0 && (
            <Text className="text-sm text-brand-dark mb-2">• {t("account.willUnpublish", { count: report.willUnpublishModels })}</Text>
          )}
          {report.willCancelOrders > 0 && (
            <Text className="text-sm font-medium text-red-700">• {t("account.willCancel", { count: report.willCancelOrders })}</Text>
          )}
        </View>

        <Text className="text-sm text-slate-600 mb-2">{t("account.confirmPrompt", { word })}</Text>
        <TextInput
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={word}
          className="h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm text-brand-dark mb-4"
        />

        <Pressable
          onPress={deleteAccount}
          disabled={!canDelete}
          className={`h-12 rounded-xl items-center justify-center ${canDelete ? "bg-red-600" : "bg-red-300"}`}
        >
          {deleting ? <ActivityIndicator color="#fff" /> : (
            <Text className="text-sm font-medium text-white">{t("account.deleteButton")}</Text>
          )}
        </Pressable>
        <Pressable onPress={goBack} disabled={deleting} className="mt-3 h-12 items-center justify-center">
          <Text className="text-sm text-slate-500">{t("account.back")}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
