import { useCallback } from "react";
import { View, Text, Pressable, ScrollView, Image } from "react-native";
import { useTranslation } from "react-i18next";
import { Link, router, useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import {
  User, LogOut, Trash2, Pencil, Package, ShieldCheck, FileText, LifeBuoy, ExternalLink, Globe,
} from "lucide-react-native";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useProfile } from "../../lib/auth/useProfile";
import { setAppLanguage } from "../../lib/i18n";
import { WEB_BASE_URL } from "../../lib/api";
import { MenuRow } from "../../components/MenuRow";

const ICON = { size: 18, color: "#64748B" } as const;
const WEB_PANEL_ROLES = ["designer", "printer_partner", "admin"];

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      {title ? <Text className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 px-1">{title}</Text> : null}
      <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">{children}</View>
    </View>
  );
}

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const locale: "tr" | "en" = i18n.language === "en" ? "en" : "tr";
  const { user, loading, signOut } = useAuth();
  const { profile, refresh } = useProfile();

  // Düzenleme ekranından dönünce güncel bilgiler görünsün
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  if (loading) {
    return <View className="flex-1 bg-brand-light" />;
  }

  if (!user) {
    return (
      <View className="flex-1 bg-brand-light items-center justify-center px-6">
        <User color="#94A3B8" size={32} />
        <Text className="text-lg font-medium text-brand-dark mt-3 mb-1">
          {t("profile.loggedOutTitle")}
        </Text>
        <Text className="text-sm text-slate-500 text-center mb-6">
          {t("profile.loggedOutDesc")}
        </Text>
        <Link href="/auth/login" asChild>
          <Pressable className="h-12 px-8 rounded-xl bg-brand-orange items-center justify-center mb-3">
            <Text className="text-sm font-medium text-white">{t("auth.loginBtn")}</Text>
          </Pressable>
        </Link>
        <Link href="/auth/register" asChild>
          <Pressable>
            <Text className="text-sm text-brand-orange font-medium">{t("auth.registerBtn")}</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  const displayName = profile?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email || "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";
  const role = profile?.role ?? "buyer";
  const openWeb = (path: string) => WebBrowser.openBrowserAsync(`${WEB_BASE_URL}/${locale}${path}`);

  return (
    <ScrollView className="flex-1 bg-brand-light" contentContainerClassName="px-4 pt-14 pb-10">
      {/* Başlık */}
      <View className="bg-white rounded-2xl border border-slate-100 p-5 mb-5 items-center">
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} className="w-20 h-20 rounded-full bg-slate-100" />
        ) : (
          <View className="w-20 h-20 rounded-full bg-brand-orange items-center justify-center">
            <Text className="text-3xl font-semibold text-white">{initial}</Text>
          </View>
        )}
        <Text className="text-lg font-semibold text-brand-dark mt-3">{displayName}</Text>
        {profile?.username ? <Text className="text-sm text-slate-400">@{profile.username}</Text> : null}
        <Text className="text-xs text-slate-400 mt-0.5">{user.email}</Text>
        <View className="mt-2 px-3 py-1 rounded-full bg-slate-100">
          <Text className="text-xs font-medium text-slate-600">{t(`profile.roles.${role}`, { defaultValue: role })}</Text>
        </View>
        {profile?.bio ? <Text className="text-sm text-slate-500 text-center mt-3">{profile.bio}</Text> : null}
      </View>

      {/* Tasarımcı / yazıcı ortağı araçları web'de */}
      {WEB_PANEL_ROLES.includes(role) && (
        <View className="bg-orange-50 rounded-2xl p-4 mb-5">
          <Text className="text-sm font-medium text-brand-dark mb-1">{t("profile.panelTitle")}</Text>
          <Text className="text-xs text-slate-600 mb-3">{t("profile.panelDesc")}</Text>
          <Pressable
            onPress={() => openWeb("/dashboard")}
            className="h-10 rounded-xl bg-brand-orange flex-row items-center justify-center"
          >
            <Text className="text-sm font-medium text-white mr-1.5">{t("profile.panelOpen")}</Text>
            <ExternalLink size={14} color="#fff" />
          </Pressable>
        </View>
      )}

      <Group title={t("profile.accountSection")}>
        <MenuRow icon={<Pencil {...ICON} />} label={t("profile.editProfile")} onPress={() => router.push("/account/edit")} />
        <MenuRow icon={<Package {...ICON} />} label={t("profile.myOrders")} onPress={() => router.navigate("/(tabs)/orders")} divider />
      </Group>

      <Group title={t("profile.appSection")}>
        <View className="flex-row items-center px-4 h-14">
          <View className="w-7"><Globe {...ICON} /></View>
          <Text className="flex-1 text-sm text-brand-dark">{t("profile.language")}</Text>
          {(["tr", "en"] as const).map((lng) => (
            <Pressable
              key={lng}
              onPress={() => setAppLanguage(lng)}
              className={`ml-2 h-8 px-3 rounded-full items-center justify-center border ${
                locale === lng ? "bg-brand-orange border-brand-orange" : "bg-white border-slate-200"
              }`}
            >
              <Text className={`text-xs font-medium ${locale === lng ? "text-white" : "text-slate-600"}`}>
                {lng === "tr" ? "Türkçe" : "English"}
              </Text>
            </Pressable>
          ))}
        </View>
      </Group>

      <Group title={t("profile.legalSection")}>
        <MenuRow icon={<ShieldCheck {...ICON} />} label={t("profile.privacy")} onPress={() => openWeb("/privacy")} />
        <MenuRow icon={<FileText {...ICON} />} label={t("profile.terms")} onPress={() => openWeb("/terms")} divider />
        <MenuRow icon={<LifeBuoy {...ICON} />} label={t("profile.contact")} onPress={() => openWeb("/contact")} divider />
      </Group>

      <Group>
        <MenuRow icon={<LogOut size={18} color="#EF4444" />} label={t("profile.signOut")} onPress={() => signOut()} danger />
        <MenuRow
          icon={<Trash2 size={18} color="#EF4444" />}
          label={t("account.deleteLink")}
          onPress={() => router.push("/account/delete")}
          danger
          divider
        />
      </Group>

      <Text className="text-xs text-slate-300 text-center">
        {t("profile.version", { v: Constants.expoConfig?.version ?? "" })}
      </Text>
    </ScrollView>
  );
}
