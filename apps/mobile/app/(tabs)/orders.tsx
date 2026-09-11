import { View, Text } from "react-native";
import { Package } from "lucide-react-native";

export default function OrdersScreen() {
  return (
    <View className="flex-1 bg-brand-light items-center justify-center px-6">
      <Package color="#94A3B8" size={32} />
      <Text className="text-lg font-medium text-brand-dark mt-3 mb-1">Siparişlerim</Text>
      <Text className="text-sm text-slate-500 text-center">
        Sipariş listesi ve takip burada gelecek (Faz 6).
      </Text>
    </View>
  );
}
