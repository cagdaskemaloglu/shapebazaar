import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Bu sayfa yalnızca ilk admin kurulumu için kullanılır
// SECRET_ADMIN_KEY env ile koruma altında
export default async function AdminSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const setupKey = process.env.ADMIN_SETUP_KEY;

  if (!setupKey || key !== setupKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">Erişim reddedildi</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Geçersiz kurulum anahtarı.</p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">Önce giriş yapmanız gerekiyor.</p>
          <a href="/tr/auth/login?redirect=/tr/admin/setup" className="text-[#FF6B35] text-sm hover:underline mt-2 inline-block">Giriş yap →</a>
        </div>
      </div>
    );
  }

  // Mevcut kullanıcıyı admin yap
  await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", user.id);

  redirect("/tr/admin");
}
