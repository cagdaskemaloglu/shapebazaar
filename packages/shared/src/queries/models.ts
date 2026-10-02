import type { SupabaseClient } from "@supabase/supabase-js";

/** Yayınlanmış modelleri filtreye göre getirir. Ortak select alanları,
 *  bu fonksiyonu kullanan tüm bileşenlerin (liste, grid, viewer, profil)
 *  ihtiyaç duyabileceği alanların birleşimidir — küçük ölçekli bir
 *  pazaryeri için bunun performans maliyeti ihmal edilebilir düzeydedir. */
export interface FetchModelsOptions {
  search?: string;
  categoryId?: number | null;
  designerId?: string;
  priceMin?: number;
  priceMax?: number;
  sort?: "popular" | "newest" | "price_asc" | "price_desc" | "rating";
  limit?: number;
  offset?: number;
  withCount?: boolean;
}

const MODEL_LIST_SELECT = `
  id, title, title_en, description, base_price, is_free,
  thumbnail_url, file_url, file_format,
  avg_rating, rating_count, print_count, created_at, tags,
  weight_grams, dimension_x, dimension_y, dimension_z,
  rotation_x, rotation_y, rotation_z,
  showcase_thumb_path,
  designer:profiles(id, full_name, username, avatar_url),
  category:categories(id, slug, name_tr, name_en)
`;

/** supabase parametresi web'in `createClient()`'ından ya da mobile'ın
 *  kendi `lib/supabase.ts`'inden gelen bir client olabilir — bu fonksiyon
 *  hangi ortamda çalıştığını bilmez, sadece kendisine verilen client'ı kullanır. */
export async function fetchModels(supabase: SupabaseClient, opts: FetchModelsOptions = {}) {
  const {
    search, categoryId, designerId, priceMin, priceMax,
    sort = "popular", limit = 24, offset = 0, withCount = false,
  } = opts;

  let query = supabase
    .from("models")
    .select(MODEL_LIST_SELECT, withCount ? { count: "exact" } : undefined)
    .eq("is_published", true);

  // `,` `(` `)` `%` `*` `\` PostgREST `.or()` söz diziminde özel anlam taşır; kullanıcı
  // bunları yazınca istek 400 dönüyordu (arama kutusunda "a,b" veya "(" gibi).
  const q = search?.replace(/[,()%*\\]/g, " ").trim();
  if (q) {
    query = query.or(`title.ilike.%${q}%,title_en.ilike.%${q}%`);
  }
  if (categoryId != null) query = query.eq("category_id", categoryId);
  if (designerId)         query = query.eq("designer_id", designerId);
  if (priceMin != null && priceMin > 0) query = query.gte("base_price", priceMin);
  if (priceMax != null)                 query = query.lte("base_price", priceMax);

  if (sort === "popular")    query = query.order("print_count", { ascending: false });
  if (sort === "newest")     query = query.order("created_at",  { ascending: false });
  if (sort === "price_asc")  query = query.order("base_price",  { ascending: true  });
  if (sort === "price_desc") query = query.order("base_price",  { ascending: false });
  if (sort === "rating")     query = query.order("avg_rating",  { ascending: false });

  const { data, error, count } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

/** Tek bir modeli id ile getirir (model detay ekranı için). */
export async function fetchModel(supabase: SupabaseClient, id: string) {
  const { data, error } = await supabase
    .from("models")
    .select(`
      *,
      designer:profiles(id, full_name, username, avatar_url, bio),
      category:categories(slug, name_tr, name_en)
    `)
    .eq("id", id)
    .eq("is_published", true)
    .single();
  if (error) throw error;
  return data;
}

export async function incrementViewCount(supabase: SupabaseClient, modelId: string) {
  await supabase.rpc("increment_model_views", { model_id: modelId });
}

/** Bir kullanıcının bir modeli değerlendirebilmesi için, o modeli içeren
 *  kargolanmış/teslim edilmiş bir siparişi olması gerekir (bkz. Faz 1'de
 *  eklenen RLS politikası). Bu fonksiyon aynı kontrolü UI'da erken
 *  göstermek için kullanılır — asıl güvenlik RLS'te. */
export async function canRateModel(supabase: SupabaseClient, modelId: string, userId: string) {
  const { data } = await supabase
    .from("order_items")
    .select("id, orders!inner(status, buyer_id)")
    .eq("model_id", modelId)
    .eq("orders.buyer_id", userId)
    .in("orders.status", ["shipped", "delivered"])
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export interface ModelRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { username: string | null; full_name: string | null } | null;
}

export async function fetchRatings(supabase: SupabaseClient, modelId: string): Promise<ModelRating[]> {
  const { data, error } = await supabase
    .from("model_ratings")
    .select("id, rating, comment, created_at, user:profiles(username, full_name)")
    .eq("model_id", modelId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ModelRating[];
}

export async function submitRating(
  supabase: SupabaseClient,
  params: { modelId: string; userId: string; rating: number; comment?: string | null }
) {
  const { error } = await supabase.from("model_ratings").upsert(
    {
      model_id: params.modelId,
      user_id: params.userId,
      rating: params.rating,
      comment: params.comment || null,
    },
    { onConflict: "model_id,user_id" }
  );
  return { error: error?.message ?? null };
}
