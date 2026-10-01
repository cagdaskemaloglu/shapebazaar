import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import type { OrderStatus } from "@shapebazaar/shared";

// Tailwind sınıfları sadece app/ ve components/ içinde taranır (tailwind.config.js) — o yüzden burada.
const STYLE: Record<OrderStatus, { bg: string; text: string }> = {
  pending:   { bg: "bg-slate-100",   text: "text-slate-600" },
  paid:      { bg: "bg-blue-50",     text: "text-blue-700" },
  in_print:  { bg: "bg-purple-50",   text: "text-purple-700" },
  printed:   { bg: "bg-purple-50",   text: "text-purple-700" },
  shipped:   { bg: "bg-orange-50",   text: "text-orange-700" },
  delivered: { bg: "bg-emerald-50",  text: "text-emerald-700" },
  cancelled: { bg: "bg-red-50",      text: "text-red-600" },
  refunded:  { bg: "bg-slate-100",   text: "text-slate-600" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const s = STYLE[status] ?? STYLE.pending;
  return (
    <View className={`px-2.5 py-1 rounded-full ${s.bg}`}>
      <Text className={`text-xs font-medium ${s.text}`}>{t(`orders.statuses.${status}`)}</Text>
    </View>
  );
}
