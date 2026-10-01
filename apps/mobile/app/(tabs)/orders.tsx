import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Package, ChevronRight, User } from "lucide-react-native";
import { fetchMyOrders, type OrderListItem } from "@shapebazaar/shared";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth/AuthProvider";
import { formatDate, formatMoney, shortOrderNo } from "../../lib/orderStatus";
import { OrderStatusBadge } from "../../components/OrderStatusBadge";

const PAGE_SIZE = 20;

export default function OrdersScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "tr";
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;

  const [orders, setOrders]         = useState<OrderListItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(false);
  const [error, setError]           = useState(false);

  const requestId = useRef(0);
  const hasLoaded = useRef(false);

  // Kullanıcı değişince (çıkış/giriş) eski kullanıcının siparişleri ekranda kalmasın
  useEffect(() => {
    requestId.current++;
    hasLoaded.current = false;
    setOrders([]);
    setHasMore(false);
    setError(false);
    setLoading(true);
  }, [userId]);

  const load = useCallback(async (mode: "initial" | "silent" | "refresh") => {
    if (!userId) return;
    const id = ++requestId.current;
    if (mode === "initial") setLoading(true);
    if (mode === "refresh") setRefreshing(true);
    try {
      const rows = await fetchMyOrders(supabase, userId, { limit: PAGE_SIZE, offset: 0 });
      if (id !== requestId.current) return;
      setOrders(rows);
      setHasMore(rows.length === PAGE_SIZE);
      setError(false);
      hasLoaded.current = true;
    } catch (e) {
      console.warn("[orders] load", e);
      if (id !== requestId.current) return;
      // Sessiz yenilemede mevcut liste korunur; hata ekranı sadece liste hiç yüklenmediyse
      if (!hasLoaded.current) setError(true);
    }
    if (id === requestId.current) { setLoading(false); setRefreshing(false); }
  }, [userId]);

  // Sekmeye her dönüşte yenile (ödeme sonrası yeni sipariş / durum değişikliği görünsün)
  useFocusEffect(
    useCallback(() => {
      load(hasLoaded.current ? "silent" : "initial");
    }, [load])
  );

  async function loadMore() {
    if (!userId || loading || refreshing || loadingMore || !hasMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const rows = await fetchMyOrders(supabase, userId, { limit: PAGE_SIZE, offset: orders.length });
      if (id === requestId.current) {
        setOrders((prev) => [...prev, ...rows]);
        setHasMore(rows.length === PAGE_SIZE);
      }
    } catch (e) {
      console.warn("[orders] loadMore", e);
    }
    setLoadingMore(false);
  }

  if (authLoading) return <View className="flex-1 bg-brand-light" />;

  if (!user) {
    return (
      <View className="flex-1 bg-brand-light items-center justify-center px-6">
        <User color="#94A3B8" size={32} />
        <Text className="text-lg font-medium text-brand-dark mt-3 mb-1">{t("orders.loggedOutTitle")}</Text>
        <Text className="text-sm text-slate-500 text-center mb-6">{t("orders.loggedOutDesc")}</Text>
        <Pressable
          onPress={() => router.push("/auth/login")}
          className="h-12 px-8 rounded-xl bg-brand-orange items-center justify-center"
        >
          <Text className="text-sm font-medium text-white">{t("auth.loginBtn")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-light pt-14">
      <Text className="text-2xl font-semibold text-brand-dark px-4 mb-3">{t("tabs.orders")}</Text>

      {loading ? (
        <ActivityIndicator className="mt-10" color="#FF6B35" />
      ) : error ? (
        <View className="items-center px-8 mt-12">
          <Text className="text-sm text-slate-500 text-center mb-4">{t("orders.error")}</Text>
          <Pressable
            onPress={() => load("initial")}
            className="h-10 px-5 rounded-xl bg-brand-orange items-center justify-center"
          >
            <Text className="text-sm font-medium text-white">{t("orders.retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          contentContainerClassName="px-4 pb-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor="#FF6B35" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator className="my-4" color="#FF6B35" /> : null}
          ListEmptyComponent={
            <View className="items-center mt-16 px-8">
              <Package size={32} color="#94A3B8" />
              <Text className="text-base font-medium text-brand-dark mt-3 mb-1">{t("orders.emptyTitle")}</Text>
              <Text className="text-sm text-slate-500 text-center mb-5">{t("orders.emptyDesc")}</Text>
              <Pressable
                onPress={() => router.navigate("/(tabs)")}
                className="h-11 px-6 rounded-xl bg-brand-orange items-center justify-center"
              >
                <Text className="text-sm font-medium text-white">{t("orders.browse")}</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: o }) => {
            const titles = o.order_items.map((i) => i.model_title).filter(Boolean) as string[];
            const extra = titles.length - 1;
            return (
              <Pressable
                onPress={() => router.push(`/order/${o.id}`)}
                className="bg-white rounded-2xl border border-slate-100 p-4 mb-3"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs text-slate-400 font-mono">{shortOrderNo(o.id)}</Text>
                  <OrderStatusBadge status={o.status} />
                </View>
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text numberOfLines={1} className="text-sm font-medium text-brand-dark">
                      {titles[0] ?? t("orders.untitled")}
                      {extra > 0 ? `  ${t("orders.moreItems", { n: extra })}` : ""}
                    </Text>
                    <Text className="text-xs text-slate-400 mt-1">{formatDate(o.created_at, locale)}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-brand-orange mr-2">{formatMoney(o.total_amount)}</Text>
                  <ChevronRight size={16} color="#94A3B8" />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
