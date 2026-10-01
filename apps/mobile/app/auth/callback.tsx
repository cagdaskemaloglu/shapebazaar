import { Redirect } from "expo-router";

// OAuth dönüş URL'si (shapebazaar://auth/callback#access_token=...). Token'ları
// AuthProvider.signInWithGoogle okur; ama Expo Router aynı derin bağlantıyı bir
// rota olarak da yakalayabilir — "Unmatched Route" ekranı çıkmasın diye boş bir yönlendirme.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
