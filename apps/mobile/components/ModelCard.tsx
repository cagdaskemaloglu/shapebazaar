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
// Görseller yüzdeyle (w-full h-full) değil, mutlak doldurmayla boyutlanır: katman boyutu animasyondan
// ve NativeWind yüzde hesabından bağımsız, kare çerçevenin tamamı olur.
const FILL = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

/**
 * 2 sütunlu model gridinde kullanılan kart (Ana sayfa + Ara).
 *
 * Admin bu modele bir vitrin baskı fotoğrafı seçtiyse sol üstte mini fotoğraf butonu görünür.
 * Butona basınca görsel alanı yatayda daralıp diğer yüzle açılır; buton fotoğraf görünürken
 * "3D" butonuna dönüşür ve tekrar basınca 3D görsele geri çevirir. (Kartta interaktif viewer yok —
 * 3D tarafı modelin render görseli; interaktif viewer detay sayfasında.)
 *
 * Tasarım, iOS'ta görülen iki hataya (çevirme sonrası beyaz kart, fotoğrafın ince şeride sıkışması)
 * karşı şöyle kuruldu:
 *  - İki yüz de HER ZAMAN bağlı (mount) kalır; hangisinin görüneceğini animasyonlu opaklık belirler.
 *    Animasyon sırasında React state'i değişmez → yeniden render yok.
 *  - ölçek/opaklık `interpolate` bağlantıları BİR KEZ oluşturulur. Eski sürüm her render'da yeni
 *    bağlantı üretiyordu; animasyon sürerken yeniden render olunca görünüm son güncellemeyi
 *    alamayıp ara değerde (ince/boş) kalıyordu.
 *  - `mix` 0 = 3D görsel, 1 = baskı fotoğrafı. Dinlenme durumunda ölçek tam 1, opaklık 0/1'dir.
 */
export function ModelCard({ item, locale, freeLabel }: Props) {
  const { t } = useTranslation();
  const title = locale === "en" && item.title_en ? item.title_en : item.title;
  const designerName = item.designer?.username
    ? `@${item.designer.username}`
    : item.designer?.full_name ?? "";

  const showcaseUrl = item.showcase_thumb_path ? buildPrintPhotoUrl(SUPABASE_URL, item.showcase_thumb_path) : null;

  // `showPhoto` yalnız buton etiketi içindir; görüntüyü `mix` belirler. Basış anında hemen güncellenir.
  const [showPhoto, setShowPhoto] = useState(false);
  const mix = useRef(new Animated.Value(0)).current; // 0 = 3D görsel, 1 = baskı fotoğrafı
  const busy = useRef(false);

  // Bağlantılar bir kez oluşturulur (render'lar arasında aynı kalmalı)
  const anim = useRef({
    scaleX: mix.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.02, 1] }),
    // Yüz değişimi tam orta noktada, kart en dar anındayken olur
    modelOpacity: mix.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [1, 1, 0, 0] }),
    photoOpacity: mix.interpolate({ inputRange: [0, 0.4999, 0.5, 1], outputRange: [0, 0, 1, 1] }),
  }).current;

  // Varsayılan ayarlarla baskı ücreti (kargo hariç) — ağırlığı olmayan modelde gösterilmez
  const printPrice = defaultPrintPrice(item.weight_grams, item.is_free ? 0 : item.base_price).printWithFee;

  function toggleFlip() {
    if (busy.current) return; // animasyon sürerken art arda basışları yok say
    busy.current = true;
    const target = showPhoto ? 0 : 1;
    setShowPhoto(target === 1); // buton anında tepki versin
    Animated.timing(mix, {
      toValue: target, duration: FLIP_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
    }).start(() => {
      mix.setValue(target); // son durumu açıkça yaz (ölçek 1, doğru yüz)
      busy.current = false;
    });
  }

  // maxWidth: sütun sayısı tek kalan son kart tüm satırı kaplamasın
  return (
    <View style={{ flex: 1, maxWidth: "50%" }} className="p-1.5">
      <Pressable
        onPress={() => router.push(`/models/${item.id}`)}
        className="bg-white rounded-2xl overflow-hidden border border-slate-100"
      >
        {/* 4:3 çerçeve = iPhone fotoğraf oranı; hem 3D görsel hem baskı fotoğrafı kesilmeden sığar */}
        <View style={{ aspectRatio: 4 / 3 }} className="bg-slate-100 overflow-hidden">
          <Animated.View style={[FILL, { transform: [{ scaleX: anim.scaleX }] }]}>
            {/* 3D model görseli */}
            <Animated.View style={[FILL, { opacity: anim.modelOpacity }]}>
              {item.thumbnail_url ? (
                <Image source={{ uri: item.thumbnail_url }} style={FILL} resizeMode="contain" />
              ) : null}
            </Animated.View>

            {/* Gerçek baskı fotoğrafı */}
            {showcaseUrl && (
              <Animated.View style={[FILL, { opacity: anim.photoOpacity }]} pointerEvents="none">
                <Image source={{ uri: showcaseUrl }} style={FILL} resizeMode="contain" />
                <View className="absolute bottom-2 left-2 flex-row items-center bg-black/55 px-2 py-0.5 rounded-full">
                  <Camera size={9} color="#fff" />
                  <Text className="text-[10px] text-white ml-1">{t("printPhotos.realPrint")}</Text>
                </View>
              </Animated.View>
            )}
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
