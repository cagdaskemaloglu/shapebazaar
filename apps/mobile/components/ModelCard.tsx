import { useRef, useState } from "react";
import { View, Text, Image, Pressable, Animated, Easing } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Box, Camera } from "lucide-react-native";
import { buildPrintPhotoUrl, type Model } from "@shapebazaar/shared";

interface Props {
  item: Model;
  locale: "tr" | "en";
  freeLabel: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const FACE = {
  position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0,
  backfaceVisibility: "hidden" as const,
};

/**
 * 2 sütunlu model gridinde kullanılan kart (Ana sayfa + Ara).
 *
 * Admin bu modele bir vitrin baskı fotoğrafı seçtiyse sol üstte mini fotoğraf butonu görünür.
 * Butona basınca görsel alanı 180° döner ve yerini gerçek baskı fotoğrafına bırakır; buton bu
 * durumda "3D" butonuna dönüşür ve tekrar basınca 3D görsele geri çevirir. (Kartta interaktif
 * viewer yok — 3D tarafı modelin render görseli; interaktif viewer detay sayfasında.)
 */
export function ModelCard({ item, locale, freeLabel }: Props) {
  const { t } = useTranslation();
  const title = locale === "en" && item.title_en ? item.title_en : item.title;
  const designerName = item.designer?.username
    ? `@${item.designer.username}`
    : item.designer?.full_name ?? "";

  const showcaseUrl = item.showcase_thumb_path ? buildPrintPhotoUrl(SUPABASE_URL, item.showcase_thumb_path) : null;

  const [flipped, setFlipped] = useState(false);
  const progress = useRef(new Animated.Value(0)).current; // 0 = 3D görsel, 1 = baskı fotoğrafı

  function toggleFlip() {
    const next = !flipped;
    setFlipped(next);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: 500,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  const frontRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate  = progress.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  // maxWidth: sütun sayısı tek kalan son kart tüm satırı kaplamasın
  return (
    <View style={{ flex: 1, maxWidth: "50%" }} className="p-1.5">
      <Pressable
        onPress={() => router.push(`/models/${item.id}`)}
        className="bg-white rounded-2xl overflow-hidden border border-slate-100"
      >
        <View className="aspect-square bg-slate-100">
          {/* Ön yüz: 3D model görseli */}
          <Animated.View style={[FACE, { transform: [{ perspective: 900 }, { rotateY: frontRotate }] }]}>
            {item.thumbnail_url ? (
              <Image source={{ uri: item.thumbnail_url }} className="w-full h-full" resizeMode="cover" />
            ) : null}
          </Animated.View>

          {/* Arka yüz: gerçek baskı fotoğrafı */}
          {showcaseUrl && (
            <Animated.View style={[FACE, { transform: [{ perspective: 900 }, { rotateY: backRotate }] }]}>
              <Image source={{ uri: showcaseUrl }} className="w-full h-full" resizeMode="cover" />
              <View className="absolute bottom-2 left-2 flex-row items-center bg-black/55 px-2 py-0.5 rounded-full">
                <Camera size={9} color="#fff" />
                <Text className="text-[10px] text-white ml-1">{t("printPhotos.realPrint")}</Text>
              </View>
            </Animated.View>
          )}

          {/* Sol üst: önce mini baskı fotoğrafı, çevrildikten sonra "3D" butonu */}
          {showcaseUrl && (
            <Pressable
              onPress={toggleFlip}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={flipped ? t("printPhotos.show3d") : t("printPhotos.showPhoto")}
              className="absolute top-2 left-2"
            >
              {flipped ? (
                <View className="h-9 px-2.5 flex-row items-center rounded-lg bg-white border border-slate-300">
                  <Box size={14} color="#FF6B35" />
                  <Text className="text-xs font-semibold text-brand-dark ml-1.5">{t("printPhotos.label3d")}</Text>
                </View>
              ) : (
                <Image source={{ uri: showcaseUrl }} className="w-9 h-9 rounded-lg border-2 border-white" resizeMode="cover" />
              )}
            </Pressable>
          )}
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
