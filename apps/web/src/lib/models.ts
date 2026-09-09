import { createClient } from "@/lib/supabase/client";

export interface ModelInsert {
  designer_id: string;
  title: string;
  title_en?: string;
  description?: string;
  description_en?: string;
  category_id?: number;
  tags?: string[];
  file_url: string;
  file_format: "stl" | "obj" | "3mf";
  file_size_mb?: number;
  thumbnail_url?: string;
  license: "standard" | "multi_print" | "open";
  base_price: number;
  is_free: boolean;
  weight_grams?: number | null;   // ← EKLENDİ
  dimension_x?: number | null;    // ← EKLENDİ
  dimension_y?: number | null;    // ← EKLENDİ
  dimension_z?: number | null;    // ← EKLENDİ
  rotation_x?: number;
  rotation_y?: number;
  rotation_z?: number;
}

/** Insert a new model record */
export async function createModel(data: ModelInsert) {
  const supabase = createClient();
  const { data: model, error } = await supabase
    .from("models")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return model;
}

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
  designer:profiles(id, full_name, username, avatar_url),
  category:categories(id, slug, name_tr, name_en)
`;

export async function fetchModels(opts: FetchModelsOptions = {}) {
  const {
    search, categoryId, designerId, priceMin, priceMax,
    sort = "popular", limit = 24, offset = 0, withCount = false,
  } = opts;

  const supabase = createClient();

  let query = supabase
    .from("models")
    .select(MODEL_LIST_SELECT, withCount ? { count: "exact" } : undefined)
    .eq("is_published", true);

  if (search?.trim()) {
    const q = search.trim();
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

/** Fetch single model by id */
export async function fetchModel(id: string) {
  const supabase = createClient();
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

/** Increment view count */
export async function incrementViewCount(modelId: string) {
  const supabase = createClient();
  await supabase.rpc("increment_model_views", { model_id: modelId });
}
