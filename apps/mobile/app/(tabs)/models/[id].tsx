import { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, ActivityIndicator, Pressable, TextInput } from "react-native";
import { useLocalSearchParams, useFocusEffect, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Star, ChevronLeft, Check } from "lucide-react-native";
import {
  fetchModel, canRateModel, fetchRatings, submitRating,
  calcPrintCost, calcTotalPrice, SCALE_FACTOR, INFILL_FACTOR,
  MATERIALS, COLORS, SCALES, INFILLS, INFILL_LABEL_KEY,
  getModelPublicUrl, fetchModelPrintPhotos,
  type Model, type ModelRating, type PrintPhoto,
} from "@shapebazaar/shared";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth/AuthProvider";
import { useCartStore, buildCartItem } from "../../../lib/cart";
import { ModelViewer3D } from "../../../components/ModelViewer3D";
import { PrintPhotoStrip } from "../../../components/PrintPhotoStrip";


// Detay ekranı artık (tabs) içinde gizli bir sekme: alt sekme çubuğu görünür kalır.
// Sekme ekranları unmount olmadığı için:
//  - `key={id}`: başka ürüne geçilince malzeme/renk/ölçek state'i sıfırlanır
//  - odak kaybedilince içerik unmount edilir: 3D viewer (GL context) arka planda yaşamaz
export default function ModelDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  if (!focused || !id) return null;
  return <ModelDetailScreen key={id} id={id} />;
}

function ModelDetailScreen({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const addItem = useCartStore((s) => s.addItem);
  const locale = i18n.language === "en" ? "en" : "tr";

  const [material, setMaterial] = useState<string>(MATERIALS[0]);
  const [colorIdx, setColorIdx] = useState(0);
  const [scale, setScale]       = useState<string>("100%");
  const [infill, setInfill]     = useState<string>(INFILLS[1]);

  const [model, setModel]     = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [ratings, setRatings]       = useState<ModelRating[]>([]);
  const [canRate, setCanRate]       = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [comment, setComment]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [viewerActive, setViewerActive] = useState(false);
  const [printPhotos, setPrintPhotos] = useState<PrintPhoto[]>([]);

  const loadRatings = useCallback(async () => {
    if (!id) return;
    setRatings(await fetchRatings(supabase, id));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await fetchModel(supabase, id);
        setModel(data as unknown as Model);
      } catch {
        setNotFound(true);
      }
      setLoading(false);
    })();
    loadRatings();
    // Yazıcı ortaklarının bastığı gerçek ürün fotoğrafları (sadece admin onaylıları; hata olursa bölüm gizli kalır)
    fetchModelPrintPhotos(supabase, id).then(setPrintPhotos).catch((e) => console.warn("[print photos]", e));
  }, [id, loadRatings]);

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setCanRate(await canRateModel(supabase, id, user.id));
    })();
  }, [id, user, ratings.length]);

  async function handleSubmitRating() {
    if (!user || userRating === 0 || !id) return;
    setSubmitting(true);
    setRatingError("");
    const { error } = await submitRating(supabase, {
      modelId: id, userId: user.id, rating: userRating, comment,
    });
    if (error) setRatingError(t("rating.purchaseRequired"));
    else { setSubmitted(true); loadRatings(); }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-brand-light items-center justify-center">
        <ActivityIndicator color="#FF6B35" />
      </View>
    );
  }

  if (notFound || !model) {
    return (
      <View className="flex-1 bg-brand-light items-center justify-center px-6">
        <Text className="text-sm text-slate-500">{t("modelDetail.notFound")}</Text>
      </View>
    );
  }

  const title       = locale === "en" && model.title_en ? model.title_en : model.title;
  const description = locale === "en" && model.description_en ? model.description_en : model.description;
  const designerName = model.designer?.username
    ? `@${model.designer.username}`
    : model.designer?.full_name ?? t("modelDetail.designer");

  return (
    <View className="flex-1 bg-brand-light">
      <ScrollView contentContainerClassName="pb-10" scrollEnabled={!viewerActive}>
        <View className="pt-14 px-4 pb-3 flex-row items-center">
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)"))} className="w-9 h-9 items-center justify-center -ml-2">
            <ChevronLeft size={22} color="#1E293B" />
          </Pressable>
        </View>

        <View className="px-4">
          <ModelViewer3D
            fileUrl={model.file_url ? getModelPublicUrl(supabase, model.file_url) : ""}
            fileFormat={model.file_format}
            rotation={{
              x: model.rotation_x ?? 0,
              y: model.rotation_y ?? 0,
              z: model.rotation_z ?? 0,
            }}
            colorHex={COLORS[colorIdx].hex}
            onInteractionChange={setViewerActive}
          />
        </View>

        <View className="px-4 mt-4">
          <Text className="text-xl font-semibold text-brand-dark mb-1">{title}</Text>
          <Text className="text-sm text-slate-400 mb-3">{designerName}</Text>

          <Text className="text-lg font-semibold text-brand-orange mb-4">
            {model.is_free ? t("modelDetail.free") : `₺${model.base_price}`}
          </Text>

          {description ? (
            <View className="mb-6">
              <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {t("modelDetail.description")}
              </Text>
              <Text className="text-sm text-slate-600 leading-relaxed">{description}</Text>
            </View>
          ) : null}

          <PrintPhotoStrip
            photos={printPhotos}
            title={t("printPhotos.galleryTitle")}
            description={t("printPhotos.galleryDesc")}
          />

          {/* Yapılandırma */}
          <View className="mb-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t("modelDetail.material")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {MATERIALS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMaterial(m)}
                  className={`h-9 px-3.5 rounded-full items-center justify-center border ${
                    material === m ? "bg-brand-orange border-brand-orange" : "bg-white border-slate-200"
                  }`}
                >
                  <Text className={`text-xs font-medium ${material === m ? "text-white" : "text-slate-600"}`}>{m}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t("modelDetail.color")} — {t(`modelDetail.colors.${COLORS[colorIdx].name}`)}
            </Text>
            <View className="flex-row gap-2.5">
              {COLORS.map((c, i) => (
                <Pressable
                  key={c.hex}
                  onPress={() => setColorIdx(i)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-8 h-8 rounded-full items-center justify-center ${
                    colorIdx === i ? "border-2 border-brand-orange" : c.border ? "border border-slate-300" : ""
                  }`}
                >
                  {colorIdx === i && <Check size={14} color={c.name === "Beyaz" ? "#1E293B" : "white"} />}
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t("modelDetail.size")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {SCALES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setScale(s)}
                  className={`h-9 px-3.5 rounded-full items-center justify-center border ${
                    scale === s ? "bg-brand-orange border-brand-orange" : "bg-white border-slate-200"
                  }`}
                >
                  <Text className={`text-xs font-medium ${scale === s ? "text-white" : "text-slate-600"}`}>
                    {s === "Özel" ? t("modelDetail.custom") : s}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              {t("modelDetail.infill")}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {INFILLS.map((inf) => (
                <Pressable
                  key={inf}
                  onPress={() => setInfill(inf)}
                  className={`h-9 px-3.5 rounded-full items-center justify-center border ${
                    infill === inf ? "bg-brand-orange border-brand-orange" : "bg-white border-slate-200"
                  }`}
                >
                  <Text className={`text-xs font-medium ${infill === inf ? "text-white" : "text-slate-600"}`}>
                    {inf.split(" ")[0]} ({t(`modelDetail.infills.${INFILL_LABEL_KEY[inf]}`)})
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Fiyat dökümü */}
          {(() => {
            const designPrice = model.is_free ? 0 : model.base_price;
            const printCost = calcPrintCost(
              material, model.weight_grams ?? 0,
              SCALE_FACTOR[scale] ?? 1, INFILL_FACTOR[infill] ?? 1
            );
            const { platformFee, total } = calcTotalPrice(designPrice, printCost);

            function handleAddToCart() {
              if (!model) return;
              addItem(buildCartItem({
                modelId: model.id,
                modelTitle: model.title,
                thumbnailUrl: model.thumbnail_url ?? undefined,
                material,
                colorName: COLORS[colorIdx].name,
                colorHex: COLORS[colorIdx].hex,
                scale,
                infill,
                weightGrams: model.weight_grams ?? 0,
                isFree: model.is_free,
                basePrice: model.base_price,
              }));
              router.navigate("/(tabs)/cart");
            }

            return (
              <View className="mb-8">
                <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-3">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-sm text-slate-500">{t("modelDetail.designPrice")}</Text>
                    <Text className="text-sm text-brand-dark">
                      {model.is_free ? t("modelDetail.free") : `₺${designPrice}`}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-sm text-slate-500">{t("modelDetail.printCost")}</Text>
                    <Text className="text-sm text-brand-dark">₺{printCost.toFixed(0)}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-slate-500">{t("modelDetail.platformFee")}</Text>
                    <Text className="text-sm text-brand-dark">₺{platformFee.toFixed(0)}</Text>
                  </View>
                  <View className="flex-row justify-between border-t border-slate-100 pt-2">
                    <Text className="text-sm font-semibold text-brand-dark">{t("modelDetail.total")}</Text>
                    <Text className="text-sm font-semibold text-brand-orange">₺{total.toFixed(0)}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleAddToCart}
                  className="h-12 rounded-xl bg-brand-orange items-center justify-center"
                >
                  <Text className="text-sm font-medium text-white">
                    {`${t("modelDetail.addToCart")} — ₺${total.toFixed(0)}`}
                  </Text>
                </Pressable>
              </View>
            );
          })()}

          {/* Değerlendirmeler */}
          <View className="border-t border-slate-200 pt-6">
            <Text className="text-base font-semibold text-brand-dark mb-4">{t("rating.title")}</Text>

            {user && canRate && !submitted && (
              <View className="bg-white border border-slate-200 rounded-2xl p-4 mb-5">
                <Text className="text-sm font-medium text-brand-dark mb-2">{t("rating.rateThis")}</Text>
                <View className="flex-row gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Pressable key={s} onPress={() => setUserRating(s)}>
                      <Star size={24} color="#FBBF24" fill={userRating >= s ? "#FBBF24" : "none"} />
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder={t("rating.commentPlaceholder")}
                  multiline
                  className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-brand-dark mb-3 min-h-[60px]"
                />
                {ratingError ? (
                  <Text className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{ratingError}</Text>
                ) : null}
                <Pressable
                  onPress={handleSubmitRating}
                  disabled={submitting || userRating === 0}
                  className="h-10 rounded-xl bg-brand-orange items-center justify-center"
                >
                  <Text className="text-sm font-medium text-white">
                    {submitting ? t("rating.submitting") : t("rating.submit")}
                  </Text>
                </Pressable>
              </View>
            )}

            {user && !canRate && !submitted && (
              <View className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-5">
                <Text className="text-sm text-slate-500">{t("rating.purchaseRequired")}</Text>
              </View>
            )}

            {submitted && (
              <View className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl px-4 py-3 mb-5">
                <Text className="text-sm text-[#10B981]">{t("rating.success")}</Text>
              </View>
            )}

            {ratings.length === 0 ? (
              <Text className="text-sm text-slate-400">{t("rating.noRatings")}</Text>
            ) : (
              <View className="gap-4">
                {ratings.map((r) => (
                  <View key={r.id} className="flex-row gap-3">
                    <View className="w-8 h-8 rounded-full bg-orange-50 items-center justify-center">
                      <Text className="text-xs font-semibold text-brand-orange">
                        {(r.user?.full_name ?? r.user?.username ?? "?")[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2 mb-1">
                        <Text className="text-sm font-medium text-brand-dark">
                          {r.user?.username ? `@${r.user.username}` : r.user?.full_name ?? t("rating.user")}
                        </Text>
                        <View className="flex-row gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={11} color="#FBBF24" fill={r.rating >= s ? "#FBBF24" : "none"} />
                          ))}
                        </View>
                      </View>
                      {r.comment ? (
                        <Text className="text-sm text-slate-600 leading-relaxed">{r.comment}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
