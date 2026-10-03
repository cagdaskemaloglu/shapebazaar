import { useRef, useState } from "react";
import { View, Text, Image, Pressable, Animated, Easing } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Box, Camera } from "lucide-react-native";
import { buildPrintPhotoUrl, defaultPrintPrice, type Model } from "@shapebazaar/shared";

interface Props {
  item: Model;
  locale: "tr" | "en";
  freeLabel: string;
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const FLIP_MS = 440;

/**
 * 2 sütunlu model gridinde kullanılan kart (Ana sayfa + Ara).
 *
 * Admin bu modele bir vitrin baskı fotoğrafı seçtiyse sol üstte mini fotoğraf butonu görünür.
 * Butona basınca görsel alanı yatayda daralıp diğer yüzle açılır; buton fotoğraf görünürken
 * "3D" butonuna dönüşür ve tekrar basınca 3D görsele geri çevirir. (Kartta interaktif viewer yok —
 * 3D tarafı modelin render görseli; interaktif viewer detay sayfasında.)
 *
 * Hangi yüzün görüneceği ve buton etiketi AYNI state'ten (`showPhoto`) türer. Çevirme tek bir
 * zaman çizelgesidir: ilk yarıda kart daralır, yarıda yüz değişir, ikinci yarıda genişler.
 * Perspektifli 3D döndürme (rotateY + native driver) iOS'ta çevirme sonunda kartı boş (beyaz)
 * bırakıyordu; bu yüzden 2D `scaleX` + JS sürücüsü kullanılıyor ve bitişte son durum
 * (yüz + ölçek) açıkça yeniden yazılıyor.
 */
export function ModelCard({ item, locale, freeLabel }: Props) {
  const { t } = useTranslation();
  const title = locale === "en" && item.title_en ? item.title_en : item.title;
  const designerName = item.designer?.username
    ? `@${item.designer.username}`
    : item.designer?.full_name ?? "";

  const showcaseUrl = item.showcase_thumb_path ? buildPrintPhotoUrl(SUPABASE_URL, item.showcase_thumb_path) : null;

  const [showPhoto, setShowPhoto] = useState(false); // şu an hangi yüz görünüyor (tek doğruluk kaynağı)
  const progress = useRef(new Animated.Value(0)).current; // 0 → 1: tek çevirme zaman çizelgesi
  const busy = useRef(false);

  // Varsayılan ayarlarla baskı ücreti (kargo hariç) — ağırlığı olmayan modelde gösterilmez
  const printPrice = defaultPrintPrice(item.weight_grams, item.is_free ? 0 : item.base_price)?.printWithFee ?? null;

  function toggleFlip() {
    if (busy.current) return; // animasyon sürerken art arda basışları yok say
    busy.current = true;
    const target = !showPhoto;
    let swapped = false;

    progress.setValue(0);
    const id = progress.addListener(({ value }) => {
      if (!swapped && value >= 0.5) { swapped = true; setShowPhoto(target); } // kart en dar anındayken yüz değişir
    });
    Animated.timing(progress, {
      toValue: 1, duration: FLIP_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
    }).start(() => {
      progress.removeListener(id);
      setShowPhoto(target);   // animasyon kesilse bile son durum kesin
      progress.setValue(0);   // ölçek tam boyuta döner
      busy.current = false;
    });
  }

  // 1 → 0 (daralır) → 1 (açılır); ortada yüz değişir
  const scaleX = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.02, 1] });

  // maxWidth: sütun sayısı tek kalan son kart tüm satırı kaplamasın
  return (
    <View style={{ flex: 1, maxWidth: "50%" }} className="p-1.5">
      <Pressable
        onPress={() => router.push(`/models/${item.id}`)}
        className="bg-white rounded-2xl overflow-hidden border border-slate-100"
      >
        {/* 4:3 çerçeve = iPhone fotoğraf oranı; hem 3D görsel hem baskı fotoğrafı kesilmeden sığar */}
        <View style={{ aspectRatio: 4 / 3 }} className="bg-slate-100">
          <Animated.View style={{ flex: 1, transform: [{ scaleX }] }}>
            {showPhoto && showcaseUrl ? (
              // Gerçek baskı fotoğrafı
              <View className="flex-1">
                <Image source={{ uri: showcaseUrl }} className="w-full h-full" resizeMode="contain" />
                <View className="absolute bottom-2 left-2 flex-row items-center bg-black/55 px-2 py-0.5 rounded-full">
                  <Camera size={9} color="#fff" />
                  <Text className="text-[10px] text-white ml-1">{t("printPhotos.realPrint")}</Text>
                </View>
              </View>
            ) : item.thumbnail_url ? (
              // 3D model görseli
              <Image source={{ uri: item.thumbnail_url }} className="w-full h-full" resizeMode="contain" />
            ) : null}
          </Animated.View>

          {/* Sol üst: önce mini baskı fotoğrafı, fotoğraf görünürken "3D" butonu */}
          {showcaseUrl && (
            <Pressable
              onPress={toggleFlip}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={showPhoto ? t("printPhotos.show3d") : t("printPhotos.showPhoto")}
              className="absolute top-2 left-2"
            >
              {showPhoto ? (
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
          <View className="flex-row items-baseline flex-wrap mt-1.5">
            <Text className="text-sm font-semibold text-brand-orange">
              {item.is_free ? freeLabel : `₺${item.base_price}`}
            </Text>
            {printPrice !== null && (
              <Text className="text-[11px] text-slate-400 ml-1.5">
                + {t("home.printPrice", { price: Math.round(printPrice) })}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
