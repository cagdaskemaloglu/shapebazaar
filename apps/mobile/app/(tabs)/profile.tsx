import { View, Text, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { Link } from "expo-router";
import { User, LogOut } from "lucide-react-native";
import { useAuth } from "../../lib/auth/AuthProvider";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, loading, signOut } = useAuth();

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

  return (
    <View className="flex-1 bg-brand-light px-6 pt-16">
      <Text className="text-lg text-slate-500">{t("profile.welcome")}</Text>
      <Text className="text-2xl font-semibold text-brand-dark mb-8">
        {user.user_metadata?.full_name ?? user.email}
      </Text>

      <Pressable
        onPress={signOut}
        className="h-12 rounded-xl border border-slate-200 bg-white flex-row items-center justify-center gap-2"
      >
        <LogOut size={16} color="#EF4444" />
        <Text className="text-sm font-medium text-red-500">{t("profile.signOut")}</Text>
      </Pressable>
    </View>
  );
}
