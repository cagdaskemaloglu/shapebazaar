/**
 * Web ve mobile'ın ortak kullandığı temel domain tipleri.
 * Bileşene özel/UI'a özel alanlar (ör. bir formun local state şekli)
 * burada DEĞİL, kendi dosyasında tanımlanmalı — burası sadece iki app'in
 * de aynı şekilde anlaması gereken veri şekilleri için.
 */

export interface Designer {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url?: string | null;
  bio?: string | null;
}

export interface Category {
  id: number;
  slug?: string;
  name_tr: string;
  name_en: string | null;
}

export interface Model {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  base_price: number;
  is_free: boolean;
  thumbnail_url: string | null;
  file_url?: string;
  file_format: string;
  avg_rating: number;
  rating_count: number;
  print_count: number;
  created_at: string;
  tags?: string[] | null;
  weight_grams?: number | null;
  dimension_x?: number | null;
  dimension_y?: number | null;
  dimension_z?: number | null;
  rotation_x?: number | null;
  rotation_y?: number | null;
  rotation_z?: number | null;
  license?: "standard" | "multi_print" | "open";
  designer?: Designer | null;
  category?: Category | null;
}

export interface CartItem {
  modelId: string;
  modelTitle: string;
  material: string;
  colorName: string;
  colorHex: string;
  scale: string;
  infill: string;
  designPrice: number;
  printCost: number;
  itemTotal: number;
}

export type OrderStatus =
  | "pending" | "paid" | "in_print" | "printed"
  | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  order_id: string;
  model_id: string | null;
  model_title: string | null;
  material: string | null;
  color_name: string | null;
  color_hex: string | null;
  scale_percent: number;
  infill: string | null;
  model_price: number;
  print_cost: number;
  item_total: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  status: OrderStatus;
  total_amount: number;
  recipient_name?: string | null;
  city?: string | null;
  tracking_number?: string | null;
  created_at: string;
  items?: OrderItem[];
}
