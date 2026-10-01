import { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, Keyboard } from "react-native";
import { useTranslation } from "react-i18next";
import { Search as SearchIcon, X, SearchX } from "lucide-react-native";
import { fetchModels, CATEGORIES, type Model } from "@shapebazaar/shared";
import { supabase } from "../../lib/supabase";
import { PRICE_PRESETS, SORT_OPTIONS, type PricePresetKey, type SortKey } from "../../lib/modelFilters";
import { ModelCard } from "../../components/ModelCard";

const PAGE_SIZE = 20;

function Chip({ label, active, onPress, dark = false }: {
  label: string; active: boolean; onPress: () => void; dark?: boolean;
}) {
  const on = dark ? "bg-brand-dark border-brand-dark" : "bg-brand-orange border-brand-orange";
  return (
    <Pressable
      onPress={onPress}
      className={`h-9 px-4 rounded-full items-center justify-center border ${active ? on : "bg-white border-slate-200"}`}
    >
      <Text className={`text-xs font-medium ${active ? "text-white" : "text-slate-600"}`}>{label}</Text>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "tr";

  const [query, setQuery]             = useState("");
  const [categoryId, setCategoryId]   = useState<number | null>(null);
  const [pricePreset, setPricePreset] = useState<PricePresetKey>("all");
  const [sort, setSort]               = useState<SortKey>("popular");

  const [models, setModels]   = useState<Model[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]     = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Eski isteklerin yeni sonuçların üstüne yazmasını engeller (hızlı yazma/filtre değişimi)
  const requestId = useRef(0);

  const fetchPage = useCallback((offset: number) => {
    const preset = PRICE_PRESETS.find((p) => p.key === pricePreset)!;
    return fetchModels(supabase, {
      search: query || undefined,
      categoryId,
      priceMin: preset.min,
      priceMax: preset.max,
      sort,
      limit: PAGE_SIZE,
      offset,
      withCount: true,
    });
  }, [query, categoryId, pricePreset, sort]);

  // İlk sayfa: filtre/arama değiştikçe (arama için 300ms debounce)
  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError(false);
    const timer = setTimeout(async () => {
      try {
        const { data, count } = await fetchPage(0);
        if (id !== requestId.current) return;
        setModels(data as unknown as Model[]);
        setTotal(count);
      } catch (e) {
        console.warn("[search]", e);
        if (id !== requestId.current) return;
        setModels([]);
        setTotal(0);
        setError(true);
      }
      if (id === requestId.current) setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPage, reloadKey]);

  async function loadMore() {
    if (loading || loadingMore || error || models.length >= total) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const { data } = await fetchPage(models.length);
      if (id === requestId.current) setModels((prev) => [...prev, ...(data as unknown as Model[])]);
    } catch (e) {
      console.warn("[search] loadMore", e);
    }
    setLoadingMore(false);
  }

  const hasFilters = query !== "" || categoryId !== null || pricePreset !== "all" || sort !== "popular";
  function resetAll() {
    setQuery(""); setCategoryId(null); setPricePreset("all"); setSort("popular");
  }

  const categories = [{ id: null, name_tr: "Tümü", name_en: "All" }, ...CATEGORIES];

  return (
    <View className="flex-1 bg-brand-light pt-14">
      <View className="px-4 mb-3">
        <Text className="text-2xl font-semibold text-brand-dark mb-3">{t("tabs.search")}</Text>
        <View className="flex-row items-center h-11 px-3 rounded-xl bg-white border border-slate-200">
          <SearchIcon size={16} color="#94A3B8" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("home.searchPlaceholder")}
            returnKeyType="search"
            autoCorrect={false}
            className="flex-1 ml-2 text-sm text-brand-dark"
          />
          {query !== "" && (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Kategori */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="grow-0"
        contentContainerClassName="px-4 gap-2 mb-2.5"
        data={categories}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item: c }) => (
          <Chip
            label={locale === "en" ? c.name_en : c.name_tr}
            active={categoryId === c.id}
            onPress={() => setCategoryId(c.id)}
          />
        )}
      />

      {/* Fiyat */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="grow-0"
        contentContainerClassName="px-4 gap-2 mb-2.5"
        data={PRICE_PRESETS}
        keyExtractor={(p) => p.key}
        renderItem={({ item: p }) => (
          <Chip
            dark
            label={locale === "en" ? p.labelEn : p.labelTr}
            active={pricePreset === p.key}
            onPress={() => setPricePreset(p.key)}
          />
        )}
      />

      {/* Sıralama */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        className="grow-0"
        contentContainerClassName="px-4 gap-2 mb-3"
        data={SORT_OPTIONS}
        keyExtractor={(o) => o.key}
        renderItem={({ item: o }) => (
          <Chip
            dark
            label={locale === "en" ? o.labelEn : o.labelTr}
            active={sort === o.key}
            onPress={() => setSort(o.key)}
          />
        )}
      />

      <View className="flex-row items-center justify-between px-4 mb-1 h-6">
        <Text className="text-xs text-slate-400">
          {!loading && !error ? t("search.results", { n: total }) : ""}
        </Text>
        {hasFilters && (
          <Pressable onPress={resetAll} hitSlop={8}>
            <Text className="text-xs font-medium text-brand-orange">{t("search.clear")}</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator className="mt-8" color="#FF6B35" />
      ) : error ? (
        <View className="items-center px-8 mt-12">
          <Text className="text-sm text-slate-500 text-center mb-4">{t("search.error")}</Text>
          <Pressable
            onPress={() => setReloadKey((k) => k + 1)}
            className="h-10 px-5 rounded-xl bg-brand-orange items-center justify-center"
          >
            <Text className="text-sm font-medium text-white">{t("payment.retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={models}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ModelCard item={item} locale={locale} freeLabel={t("home.free")} />}
          numColumns={2}
          contentContainerClassName="px-2.5 pb-6"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={Keyboard.dismiss}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator className="my-4" color="#FF6B35" /> : null}
          ListEmptyComponent={
            <View className="items-center mt-12 px-8">
              <SearchX size={32} color="#94A3B8" />
              <Text className="text-base font-medium text-brand-dark mt-3 mb-1">{t("search.noResults")}</Text>
              <Text className="text-sm text-slate-500 text-center">{t("search.noResultsDesc")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
