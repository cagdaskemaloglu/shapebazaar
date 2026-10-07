import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DeleteAccountClient } from "@/components/account/DeleteAccountClient";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Delete Account | ShapeBazaar",
};

// Herkese AÇIK sayfa (giriş gerektirmez): Google Play "Data safety" formu hesap silme için bir web bağlantısı ister.
// Giriş yapmış kullanıcı silmeyi doğrudan buradan yapar; yapmamışsa adımlar anlatılır ve giriş yaptırılır.
export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <DeleteAccountClient loggedIn={!!user} />
      </main>
      <Footer />
    </div>
  );
}
