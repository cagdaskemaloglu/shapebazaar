import { createClient } from "@/lib/supabase/client";

export interface ModelInsert {
  designer_id: string;
  title: string;
  description?: string;
  category_id?: number;
  tags?: string[];
  file_url: string;
  file_format: "stl" | "obj" | "3mf";
  file_size_mb?: number;
  thumbnail_url?: string;
  license: "standard" | "multi_print" | "open";
  base_price: number;
  is_free: boolean;
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

/** Fetch published models with optional filters */
export async function fetchModels({
  category,
  search,
  sort = "popular",
  limit = 24,
  offset = 0,
}: {
  category?: string;
  search?: string;
  sort?: "popular" | "newest" | "price_asc" | "price_desc" | "rating";
  limit?: number;
  offset?: number;
} = {}) {
  const supabase = createClient();

  let query = supabase
    .from("models")
    .select(`
      id, title, base_price, is_free, thumbnail_url,
      avg_rating, rating_count, print_count, created_at, tags,
      designer:profiles(id, full_name, username, avatar_url),
      category:categories(slug, name_tr)
    `)
    .eq("is_published", true);

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (sort === "popular")    query = query.order("print_count", { ascending: false });
  if (sort === "newest")     query = query.order("created_at",  { ascending: false });
  if (sort === "price_asc")  query = query.order("base_price",  { ascending: true  });
  if (sort === "price_desc") query = query.order("base_price",  { ascending: false });
  if (sort === "rating")     query = query.order("avg_rating",  { ascending: false });

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
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
