import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, Pressable,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Search as SearchIcon } from "lucide-react-native";
import { fetchModels, CATEGORIES, type Model } from "@shapebazaar/shared";
import { supabase } from "../../lib/supabase";
import { PRICE_PRESETS, type PricePresetKey } from "../../lib/modelFilters";
import { ModelCard } from "../../components/ModelCard";

const PAGE_SIZE = 20;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en" : "tr";

  const [search, setSearch]           = useState("");
  const [categoryId, setCategoryId]   = useState<number | null>(null);
  const [pricePreset, setPricePreset] = useState<PricePresetKey>("all");
  const [models, setModels]           = useState<Model[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const preset = PRICE_PRESETS.find((p) => p.key === pricePreset)!;

  const load = useCallback(async () => {
    try {
      const { data } = await fetchModels(supabase, {
        search: search || undefined,
        categoryId,
        priceMin: preset.min,
        priceMax: preset.max,
        limit: PAGE_SIZE,
      });
      setModels(data as unknown as Model[]);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    setRefreshing(false);
  }, [search, categoryId, pricePreset]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(load, 300); // arama için debounce
    return () => clearTimeout(timer);
  }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  return (
    <View className="flex-1 bg-brand-light pt-14">
      <View className="px-4 mb-3">
        <Text className="text-2xl font-semibold text-brand-dark mb-3">
          <Text className="text-brand-orange">Shape</Text>Bazaar
        </Text>
        <View className="flex-row items-center h-11 px-3 rounded-xl bg-white border border-slate-200">
          <SearchIcon size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t("home.searchPlaceholder")}
            className="flex-1 ml-2 text-sm text-brand-dark"
          />
        </View>
      </View>

      {/* Kategori filtresi */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-2 mb-3"
        data={[{ id: null, name_tr: "Tümü", name_en: "All" }, ...CATEGORIES]}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item: c }) => (
          <Pressable
            onPress={() => setCategoryId(c.id)}
            className={`h-9 px-4 rounded-full items-center justify-center border ${
              categoryId === c.id ? "bg-brand-orange border-brand-orange" : "bg-white border-slate-200"
            }`}
          >
            <Text className={`text-xs font-medium ${categoryId === c.id ? "text-white" : "text-slate-600"}`}>
              {locale === "en" ? c.name_en : c.name_tr}
            </Text>
          </Pressable>
        )}
      />

      {/* Fiyat filtresi */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="px-4 gap-2 mb-3"
        data={PRICE_PRESETS}
        keyExtractor={(p) => p.key}
        renderItem={({ item: p }) => (
          <Pressable
            onPress={() => setPricePreset(p.key)}
            className={`h-8 px-3 rounded-full items-center justify-center border ${
              pricePreset === p.key ? "bg-brand-dark border-brand-dark" : "bg-white border-slate-200"
            }`}
          >
            <Text className={`text-[11px] font-medium ${pricePreset === p.key ? "text-white" : "text-slate-600"}`}>
              {locale === "en" ? p.labelEn : p.labelTr}
            </Text>
          </Pressable>
        )}
      />

      {loading ? (
        <ActivityIndicator className="mt-8" color="#FF6B35" />
      ) : (
        <FlatList
          data={models}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => <ModelCard item={item} locale={locale} freeLabel={t("home.free")} />}
          numColumns={2}
          contentContainerClassName="px-2.5 pb-6"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B35" />}
          ListEmptyComponent={
            <Text className="text-center text-sm text-slate-400 mt-10">{t("home.noResults")}</Text>
          }
        />
      )}
    </View>
  );
}
