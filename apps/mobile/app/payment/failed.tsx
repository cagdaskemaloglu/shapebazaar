import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { XCircle } from "lucide-react-native";

export default function PaymentFailedScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-brand-light items-center justify-center px-8">
      <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-5">
        <XCircle size={32} color="#EF4444" />
      </View>
      <Text className="text-2xl font-semibold text-brand-dark mb-2 text-center">{t("payment.failedTitle")}</Text>
      <Text className="text-sm text-slate-500 text-center mb-8">{t("payment.failedDesc")}</Text>

      {/* Sepet başarısız ödemede silinmez — tekrar denemek yeni bir ödeme oturumu açar */}
      <Pressable
        onPress={() => router.replace("/checkout")}
        className="h-12 w-full rounded-xl bg-brand-orange items-center justify-center mb-2"
      >
        <Text className="text-sm font-medium text-white">{t("payment.tryAgain")}</Text>
      </Pressable>
      <Pressable
        onPress={() => router.replace("/(tabs)/cart")}
        className="h-12 w-full rounded-xl border border-slate-200 bg-white items-center justify-center"
      >
        <Text className="text-sm text-brand-dark">{t("payment.backToCart")}</Text>
      </Pressable>
    </View>
  );
}
