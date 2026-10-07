import { View, Text, Pressable } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { ReactNode } from "react";

interface Props {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  /** Sağda gösterilen ikincil metin (ör. mevcut değer) */
  value?: string;
  /** Kırmızı (yıkıcı) satır */
  danger?: boolean;
  /** Gruptaki ilk satır değilse üstte ince çizgi */
  divider?: boolean;
  /** Dış bağlantı: ok yerine gösterilecek */
  trailing?: ReactNode;
}

export function MenuRow({ icon, label, onPress, value, danger = false, divider = false, trailing }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center px-4 h-14 ${divider ? "border-t border-slate-100" : ""}`}
    >
      <View className="w-7">{icon}</View>
      <Text className={`flex-1 text-sm ${danger ? "text-red-500" : "text-brand-dark"}`}>{label}</Text>
      {value ? <Text className="text-xs text-slate-400 mr-2">{value}</Text> : null}
      {trailing ?? <ChevronRight size={16} color="#94A3B8" />}
    </Pressable>
  );
}
