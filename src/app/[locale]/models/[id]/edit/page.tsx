import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditModelClient } from "@/components/models/EditModelClient";

export default async function EditModelPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: model } = await supabase
    .from("models")
    .select("id, designer_id, title, title_en, description, description_en, category_id, tags, license, base_price, is_free, weight_grams, dimension_x, dimension_y, dimension_z")
    .eq("id", id)
    .single();

  if (!model) notFound();
  // RLS zaten yazma işlemini engeller ama sayfayı hiç göstermemek daha iyi bir UX.
  if (model.designer_id !== user.id) redirect(`/${locale}/dashboard?tab=uploads`);

  return <EditModelClient model={model} />;
}