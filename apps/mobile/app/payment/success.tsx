import { View, Text, Pressable } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { CheckCircle } from "lucide-react-native";

export default function PaymentSuccessScreen() {
  const { t } = useTranslation();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();

  return (
    <View className="flex-1 bg-brand-light items-center justify-center px-8">
      <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-5">
        <CheckCircle size={32} color="#10B981" />
      </View>
      <Text className="text-2xl font-semibold text-brand-dark mb-2 text-center">{t("payment.successTitle")}</Text>
      <Text className="text-sm text-slate-500 text-center mb-2">{t("payment.successDesc")}</Text>
      {orderId ? (
        <Text className="text-xs text-slate-400 mb-6">
          {t("payment.orderNo")} <Text className="font-mono">{orderId.slice(0, 8).toUpperCase()}</Text>
        </Text>
      ) : <View className="mb-4" />}
      <Text className="text-sm text-slate-500 text-center mb-8">{t("payment.successInfo")}</Text>

      <Pressable
        onPress={() => router.replace("/(tabs)/orders")}
        className="h-12 w-full rounded-xl bg-brand-orange items-center justify-center mb-2"
      >
        <Text className="text-sm font-medium text-white">{t("payment.viewOrders")}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.replace("/(tabs)")}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white items-center justify-center"
      >
        <Text className="text-sm text-brand-dark">{t("payment.backToModels")}</Text>
      </Pressable>
    </View>
  );
}
