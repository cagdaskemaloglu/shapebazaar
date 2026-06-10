import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PartnerDashboardClient } from "@/components/partner/PartnerDashboardClient";

export default async function PartnerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/auth/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_partner_approved, full_name")
    .eq("id", user.id)
    .single();

  if (!profile?.is_partner_approved) {
    redirect(`/${locale}/become-partner`);
  }

  return <PartnerDashboardClient userId={user.id} />;
}
