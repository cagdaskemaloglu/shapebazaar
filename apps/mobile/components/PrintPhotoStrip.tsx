import { useState } from "react";
import { View, Text, FlatList, Image, Pressable, Modal, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { Camera, X } from "lucide-react-native";
import { buildPrintPhotoUrl, type PrintPhoto } from "@shapebazaar/shared";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";

interface Props {
  photos: PrintPhoto[];
  title: string;
  description?: string;
}

/** Yatay kaydırmalı baskı fotoğrafı şeridi + dokununca tam ekran, sağa sola kaydırmalı görüntüleyici. */
export function PrintPhotoStrip({ photos, title, description }: Props) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null; // onaylı fotoğraf yoksa bölüm hiç görünmez

  const caption = (p: PrintPhoto) => {
    const meta = [p.material, p.color_name, p.scale_percent ? `%${p.scale_percent}` : null].filter(Boolean).join(" · ");
    const who = p.printer?.username ? `@${p.printer.username}` : p.printer?.full_name ?? null;
    return [meta, who ? t("printPhotos.printedBy", { name: who }) : null].filter(Boolean).join(" — ");
  };

  return (
    <View className="mb-6">
      <View className="flex-row items-center mb-1">
        <Camera size={14} color="#FF6B35" />
        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1.5">{title}</Text>
      </View>
      {description ? <Text className="text-xs text-slate-400 mb-3">{description}</Text> : <View className="mb-2" />}

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={photos}
        keyExtractor={(p) => p.id}
        ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => setOpenIndex(index)}>
            <Image
              source={{ uri: buildPrintPhotoUrl(SUPABASE_URL, item.thumb_path) }}
              style={{ width: 112, height: 112, borderRadius: 12 }}
              className="bg-slate-100"
              resizeMode="cover"
            />
          </Pressable>
        )}
      />

      <Modal visible={openIndex !== null} transparent animationType="fade" onRequestClose={() => setOpenIndex(null)}>
        <View className="flex-1 bg-black/90">
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={photos}
            keyExtractor={(p) => p.id}
            initialScrollIndex={openIndex ?? 0}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setOpenIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <View style={{ width, height }} className="items-center justify-center">
                <Image
                  source={{ uri: buildPrintPhotoUrl(SUPABASE_URL, item.photo_path) }}
                  style={{ width, height: height * 0.7 }}
                  resizeMode="contain"
                />
                {caption(item) ? (
                  <Text className="text-sm text-white/80 text-center px-6 mt-3">{caption(item)}</Text>
                ) : null}
              </View>
            )}
          />
          <Pressable
            onPress={() => setOpenIndex(null)}
            accessibilityLabel={t("printPhotos.close")}
            hitSlop={10}
            className="absolute top-14 right-5 w-10 h-10 rounded-full bg-white/15 items-center justify-center"
          >
            <X size={20} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
