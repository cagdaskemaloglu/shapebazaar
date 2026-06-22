import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { OrderTrackingClient } from "@/components/orders/OrderTrackingClient";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function OrderTrackingPage({ params }: Props) {
  const { locale, id } = await params;
  const supabase = await createClient();

  // Kullanıcı giriş yapmış mı?
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  // Siparişi çek
  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, status, total_amount, shipping_cost,
      recipient_name, address_line1, address_line2,
      city, district, phone, created_at, paid_at,
      tracking_number, cargo_company, buyer_id
    `)
    .eq("id", id)
    .single();

  if (!order || order.buyer_id !== user.id) {
    notFound();
  }

  // Sipariş ürünlerini çek
  const { data: items } = await supabase
    .from("order_items")
    .select("model_id, model_title, material, color_name, scale_percent, item_total, print_cost")
    .eq("order_id", id);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <OrderTrackingClient
          order={order}
          items={items ?? []}
          locale={locale}
        />
      </main>
      <Footer />
    </div>
  );
}