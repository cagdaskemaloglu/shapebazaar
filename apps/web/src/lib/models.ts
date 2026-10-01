import { createClient } from "@/lib/supabase/client";
import {
  fetchModels as fetchModelsShared,
  fetchModel as fetchModelShared,
  incrementViewCount as incrementViewCountShared,
  canRateModel as canRateModelShared,
  fetchRatings as fetchRatingsShared,
  submitRating as submitRatingShared,
  type FetchModelsOptions,
} from "@shapebazaar/shared";

export type { FetchModelsOptions };

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
  weight_grams?: number | null;
  dimension_x?: number | null;
  dimension_y?: number | null;
  dimension_z?: number | null;
  rotation_x?: number;
  rotation_y?: number;
  rotation_z?: number;
}

/** Insert a new model record — sadece web'de kullanılıyor (tasarımcı yükleme akışı,
 *  mobile v1 kapsamı dışında), bu yüzden packages/shared'a taşınmadı. */
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

// Aşağıdaki fonksiyonlar artık packages/shared'da tanımlı — burada sadece
// web'in kendi Supabase client'ını enjekte eden ince sarmalayıcılar (wrapper)
// var, böylece mevcut import'lar (`@/lib/models`) hiçbir yerde değişmeden çalışmaya devam ediyor.

export function fetchModels(opts?: FetchModelsOptions) {
  return fetchModelsShared(createClient(), opts);
}

export function fetchModel(id: string) {
  return fetchModelShared(createClient(), id);
}

export function incrementViewCount(modelId: string) {
  return incrementViewCountShared(createClient(), modelId);
}

export function canRateModel(modelId: string, userId: string) {
  return canRateModelShared(createClient(), modelId, userId);
}

export function fetchRatings(modelId: string) {
  return fetchRatingsShared(createClient(), modelId);
}

export function submitRating(params: { modelId: string; userId: string; rating: number; comment?: string | null }) {
  return submitRatingShared(createClient(), params);
}
