import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUpWithPassword(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error?.message ?? null };
  }

  // NOT: Bu akış Supabase'in belgelenmiş Expo OAuth desenini takip eder, ama
  // Expo + Supabase Google OAuth entegrasyonu bilinen kırılganlıklara sahip
  // (redirect URI ortam bazlı değişebiliyor, setSession bazen takılabiliyor —
  // bkz. docs/mobile/ARCHITECTURE.md). Kullanmadan önce KENDİ Google Cloud
  // Console OAuth client'ınızı ve Supabase Dashboard → Authentication →
  // URL Configuration → Redirect URLs listesine bu uygulamanın şemasını
  // (shapebazaar://) eklemeniz gerekiyor. Gerçek cihazda/Expo Go'da test edin.
  async function signInWithGoogle() {
    const redirectTo = makeRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) return { error: error?.message ?? "OAuth URL oluşturulamadı." };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      return { error: result.type === "cancel" ? null : "Giriş tamamlanamadı." };
    }

    const url = new URL(result.url.replace("#", "?")); // token'lar fragment'ta gelir, query'ye çeviriyoruz
    const access_token = url.searchParams.get("access_token");
    const refresh_token = url.searchParams.get("refresh_token");
    if (!access_token || !refresh_token) return { error: "Oturum bilgisi alınamadı." };

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: sessionError?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    const redirectTo = makeRedirectUri({ path: "auth/reset-password" });
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  }

  async function updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalı");
  return ctx;
}
