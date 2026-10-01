import { View, Text, Image, Pressable } from "react-native";
import { router } from "expo-router";
import type { Model } from "@shapebazaar/shared";

interface Props {
  item: Model;
  locale: "tr" | "en";
  freeLabel: string;
}

/** 2 sütunlu model gridinde kullanılan kart (Ana sayfa + Ara). */
export function ModelCard({ item, locale, freeLabel }: Props) {
  const title = locale === "en" && item.title_en ? item.title_en : item.title;
  const designerName = item.designer?.username
    ? `@${item.designer.username}`
    : item.designer?.full_name ?? "";

  // maxWidth: sütun sayısı tek kalan son kart tüm satırı kaplamasın
  return (
    <View style={{ flex: 1, maxWidth: "50%" }} className="p-1.5">
      <Pressable
        onPress={() => router.push(`/models/${item.id}`)}
        className="bg-white rounded-2xl overflow-hidden border border-slate-100"
      >
        <View className="aspect-square bg-slate-100">
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} className="w-full h-full" resizeMode="cover" />
          ) : null}
        </View>
        <View className="p-2.5">
          <Text numberOfLines={1} className="text-sm font-medium text-brand-dark">{title}</Text>
          {designerName ? (
            <Text numberOfLines={1} className="text-xs text-slate-400 mt-0.5">{designerName}</Text>
          ) : null}
          <Text className="text-sm font-semibold text-brand-orange mt-1.5">
            {item.is_free ? freeLabel : `₺${item.base_price}`}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
