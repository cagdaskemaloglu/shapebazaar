import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  // `select("*")` ARTIK ÇALIŞMAZ (012): telefon ve cüzdan bakiyesi herkese açık okumadan çıkarıldı.
  // Açık kolon listesi + kullanıcının KENDİ bakiyesi `my_profile_private()` ile.
  const [{ data: profileRow }, { data: priv }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, username, avatar_url, bio, role, is_partner_approved, city, region, shop_name, shop_description, shop_city")
      .eq("id", user.id)
      .single(),
    supabase.rpc("my_profile_private"),
  ]);
  const privateRow = Array.isArray(priv) ? priv[0] : priv;
  const profile = profileRow ? { ...profileRow, wallet_balance: Number(privateRow?.wallet_balance ?? 0) } : null;

  return <DashboardClient user={user} profile={profile} />;
}
