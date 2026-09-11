import { View, Text } from "react-native";
import { ShoppingCart } from "lucide-react-native";

export default function CartScreen() {
  return (
    <View className="flex-1 bg-brand-light items-center justify-center px-6">
      <ShoppingCart color="#94A3B8" size={32} />
      <Text className="text-lg font-medium text-brand-dark mt-3 mb-1">Sepet</Text>
      <Text className="text-sm text-slate-500 text-center">
        Sepet ve yapılandırma (malzeme/renk/boyut/dolgu) burada gelecek (Faz 4).
      </Text>
    </View>
  );
}
