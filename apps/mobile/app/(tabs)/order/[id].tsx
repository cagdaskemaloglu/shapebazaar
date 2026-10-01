import { useState, useCallback, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect, Redirect } from "expo-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Check } from "lucide-react-native";
import { fetchOrderDetail, type OrderDetail } from "@shapebazaar/shared";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { apiPost, ApiError } from "../../../lib/api";
import {
  TIMELINE_STEPS, timelineIndex, formatDate, formatMoney, shortOrderNo,
} from "../../../lib/orderStatus";
import { OrderStatusBadge } from "../../../components/OrderStatusBadge";

// Sekme ekranları unmount olmadığı için (bkz. models/[id].tsx): `key={id}` ile başka siparişe
// geçince state sıfırlanır, odak kaybedilince içerik unmount edilir ve geri dönüşte veri tazelenir.
export default function OrderDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  if (!focused || !id) return null;
  return <OrderDetailScreen key={id} id={id} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-xs font-medium text-slate-400 uppercase mb-2 tracking-wide">{title}</Text>
      <View className="bg-white rounded-2xl border border-slate-100 p-4">{children}</View>
    </View>
  );
}

function OrderDetailScreen({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "tr";
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [order, setOrder]           = useState<OrderDetail | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (isRefresh) setRefreshing(true);
    try {
      setOrder(await fetchOrderDetail(supabase, id, userId));
      setError(false);
    } catch (e) {
      console.warn("[order] load", e);
      setError(true);
    }
    setLoading(false);
    setRefreshing(false);
  }, [id, userId]);

  useEffect(() => { load(); }, [load]);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/orders"));

  async function doConfirm() {
    setConfirming(true);
    try {
      await apiPost("/api/orders/confirm-delivery", { orderId: id });
      setOrder((o) => (o ? { ...o, status: "delivered" } : o));
      Alert.alert(t("orders.confirmed"));
    } catch (e) {
      console.warn("[order] confirm", e);
      if (e instanceof ApiError && e.status === 409) {
        Alert.alert(t("orders.confirmConflict"));
        load(); // sipariş zaten onaylanmış olabilir — güncel durumu çek
      } else {
        Alert.alert(t("orders.confirmError"));
      }
    }
    setConfirming(false);
  }

  function askConfirm() {
    Alert.alert(t("orders.confirmAlertTitle"), t("orders.confirmAlertDesc"), [
      { text: t("orders.cancel"), style: "cancel" },
      { text: t("orders.confirmButton"), onPress: doConfirm },
    ]);
  }

  if (!authLoading && !user) return <Redirect href="/(tabs)/orders" />;

  const Header = (
    <View className="flex-row items-center px-4 pt-14 pb-3">
      <Pressable onPress={goBack} hitSlop={10} className="w-9 h-9 rounded-full bg-white border border-slate-200 items-center justify-center mr-3">
        <ChevronLeft size={18} color="#0F172A" />
      </Pressable>
      <Text className="text-lg font-semibold text-brand-dark">{t("orders.detailTitle")}</Text>
    </View>
  );

  if (loading || authLoading) {
    return (
      <View className="flex-1 bg-brand-light">
        {Header}
        <ActivityIndicator className="mt-10" color="#FF6B35" />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View className="flex-1 bg-brand-light">
        {Header}
        <View className="items-center px-8 mt-12">
          <Text className="text-base font-medium text-brand-dark mb-1">
            {error ? t("orders.error") : t("orders.notFound")}
          </Text>
          {!error && <Text className="text-sm text-slate-500 text-center">{t("orders.notFoundDesc")}</Text>}
          {error && (
            <Pressable onPress={() => { setLoading(true); load(); }} className="h-10 px-5 mt-4 rounded-xl bg-brand-orange items-center justify-center">
              <Text className="text-sm font-medium text-white">{t("orders.retry")}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const cur = timelineIndex(order.status);
  const isDelivered = order.status === "delivered";
  const showTimeline = cur >= 0;
  const addressLines = [
    order.recipient_name,
    order.address_line1,
    order.address_line2,
    [order.district, order.city].filter(Boolean).join(" / "),
    order.phone,
  ].filter((l): l is string => !!l && l.trim() !== "");
  const itemsSubtotal = order.order_items.reduce((sum, i) => sum + Number(i.item_total ?? 0), 0);

  return (
    <View className="flex-1 bg-brand-light">
      {Header}
      <ScrollView
        contentContainerClassName="px-4 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#FF6B35" />}
      >
        {/* Özet */}
        <View className="bg-white rounded-2xl border border-slate-100 p-4 mb-5">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xs text-slate-400">{t("orders.orderNo")}</Text>
            <OrderStatusBadge status={order.status} />
          </View>
          <Text selectable className="text-base font-mono font-semibold text-brand-dark">{shortOrderNo(order.id)}</Text>
          <Text className="text-xs text-slate-400 mt-1">{formatDate(order.created_at, locale)}</Text>
        </View>

        {/* Zaman çizelgesi / iptal-iade bilgisi */}
        {showTimeline ? (
          <Section title={t("orders.timeline")}>
            {TIMELINE_STEPS.map((step, i) => {
              const reached = i <= cur;
              const isCurrent = i === cur && !isDelivered;
              const last = i === TIMELINE_STEPS.length - 1;
              return (
                <View key={step} className="flex-row">
                  <View className="items-center mr-3">
                    <View
                      className={`w-6 h-6 rounded-full items-center justify-center ${
                        reached ? "bg-brand-orange" : "bg-slate-100"
                      } ${isCurrent ? "border-4 border-orange-200" : ""}`}
                    >
                      {reached && !isCurrent ? <Check size={12} color="#fff" /> : null}
                    </View>
                    {!last && <View className={`w-0.5 flex-1 min-h-[22px] ${i < cur ? "bg-brand-orange" : "bg-slate-200"}`} />}
                  </View>
                  <Text className={`text-sm pb-4 ${reached ? "text-brand-dark font-medium" : "text-slate-400"}`}>
                    {t(`orders.steps.${step}`)}
                  </Text>
                </View>
              );
            })}
          </Section>
        ) : (order.status === "cancelled" || order.status === "refunded") ? (
          <View className="bg-red-50 rounded-2xl p-4 mb-5">
            <Text className="text-sm text-red-700">
              {order.status === "refunded" ? t("orders.refundedInfo") : t("orders.cancelledInfo")}
            </Text>
          </View>
        ) : null}

        {/* Teslim onayı */}
        {order.status === "shipped" && (
          <View className="bg-orange-50 rounded-2xl p-4 mb-5">
            <Text className="text-sm font-medium text-brand-dark mb-1">{t("orders.confirmTitle")}</Text>
            <Text className="text-xs text-slate-600 mb-3">{t("orders.confirmDesc")}</Text>
            <Pressable
              onPress={askConfirm}
              disabled={confirming}
              className={`h-11 rounded-xl bg-brand-orange items-center justify-center ${confirming ? "opacity-60" : ""}`}
            >
              {confirming ? <ActivityIndicator color="#fff" /> : (
                <Text className="text-sm font-medium text-white">{t("orders.confirmButton")}</Text>
              )}
            </Pressable>
          </View>
        )}

        {/* Kargo */}
        {(order.tracking_number || order.cargo_company) && (
          <Section title={t("orders.cargo")}>
            {order.cargo_company ? (
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-sm text-slate-500">{t("orders.cargoCompany")}</Text>
                <Text className="text-sm text-brand-dark">{order.cargo_company}</Text>
              </View>
            ) : null}
            {order.tracking_number ? (
              <View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-slate-500">{t("orders.trackingNo")}</Text>
                  <Text selectable className="text-sm font-mono text-brand-dark">{order.tracking_number}</Text>
                </View>
                <Text className="text-xs text-slate-400 mt-1.5">{t("orders.trackingHint")}</Text>
              </View>
            ) : null}
          </Section>
        )}

        {/* Ürünler */}
        <Section title={t("orders.items")}>
          {order.order_items.map((it, idx) => {
            const meta = [
              it.material,
              it.color_name,
              it.scale_percent ? `${it.scale_percent}%` : null,
            ].filter(Boolean).join(" · ");
            return (
              <View key={it.id ?? idx} className={`flex-row items-start justify-between ${idx > 0 ? "mt-3 pt-3 border-t border-slate-100" : ""}`}>
                <View className="flex-1 pr-3">
                  <Text className="text-sm font-medium text-brand-dark">{it.model_title ?? t("orders.untitled")}</Text>
                  {meta ? <Text className="text-xs text-slate-400 mt-0.5">{meta}</Text> : null}
                </View>
                <Text className="text-sm text-brand-dark">{formatMoney(it.item_total)}</Text>
              </View>
            );
          })}
          <View className="mt-3 pt-3 border-t border-slate-100">
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-slate-500">{t("orders.subtotal")}</Text>
              <Text className="text-sm text-brand-dark">{formatMoney(itemsSubtotal)}</Text>
            </View>
            <View className="flex-row justify-between mb-1">
              <Text className="text-sm text-slate-500">{t("orders.shipping")}</Text>
              <Text className="text-sm text-brand-dark">{formatMoney(order.shipping_cost)}</Text>
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-sm font-semibold text-brand-dark">{t("orders.total")}</Text>
              <Text className="text-sm font-semibold text-brand-orange">{formatMoney(order.total_amount)}</Text>
            </View>
          </View>
        </Section>

        {/* Teslimat adresi */}
        {addressLines.length > 0 && (
          <Section title={t("orders.delivery")}>
            {addressLines.map((l, i) => (
              <Text key={i} selectable className={`text-sm ${i === 0 ? "font-medium text-brand-dark" : "text-slate-600"}`}>{l}</Text>
            ))}
          </Section>
        )}
      </ScrollView>
    </View>
  );
}
