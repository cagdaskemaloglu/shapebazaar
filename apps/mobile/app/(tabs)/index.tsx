import { View, Text } from "react-native";
import { CATEGORIES } from "@shapebazaar/shared";

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-brand-light items-center justify-center px-6">
      <Text className="text-2xl font-semibold text-brand-dark mb-2">
        <Text className="text-brand-orange">Shape</Text>Bazaar
      </Text>
      <Text className="text-sm text-slate-500 text-center mb-6">
        Model listeleme ve filtreleme burada gelecek (Faz 3).
      </Text>
      {/* @shapebazaar/shared'ın gerçekten çözüldüğünün kanıtı: */}
      <Text className="text-xs text-slate-400">
        packages/shared bağlantısı çalışıyor — {CATEGORIES.length} kategori yüklendi.
      </Text>
    </View>
  );
}
