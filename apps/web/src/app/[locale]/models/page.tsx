import { permanentRedirect } from "next/navigation";

// /models artık anasayfayla birebir aynı içeriği gösteriyordu (model
// listeleme/filtreleme). Duplicate content ve kafa karışıklığını önlemek
// için kalıcı olarak anasayfaya yönlendiriyoruz. /models/[id] (model detay
// sayfası) bundan etkilenmez, sadece bu liste sayfası yönlendiriliyor.
export default async function ModelsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  permanentRedirect(`/${locale}`);
}
