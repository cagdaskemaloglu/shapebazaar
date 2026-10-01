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
  signInWithGoogle: () => Promise<{ error: string | null; signedIn: boolean }>;
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

  // NOT: Supabase, `redirectTo` adresini Dashboard → Authentication → URL Configuration →
  // "Redirect URLs" listesinde bulamazsa kullanıcıyı Site URL'ine (web sitesi) yönlendirir —
  // uygulama o zaman tarayıcı sayfasında takılı kalır. Listede şunlar OLMALI:
  //   exp://**           (Expo Go ile geliştirme)
  //   shapebazaar://**   (development build / mağaza sürümü)
  // Ayrıca `__DEV__`'de aşağıdaki redirectTo değeri konsola yazılır.
  async function signInWithGoogle() {
    const redirectTo = makeRedirectUri({ path: "auth/callback" });
    if (__DEV__) console.log("[auth] Google redirectTo:", redirectTo);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      return { error: error?.message ?? "OAuth URL oluşturulamadı.", signedIn: false };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) {
      // Kullanıcı pencereyi kapattı (cancel/dismiss) — hata değil
      const closedByUser = result.type === "cancel" || result.type === "dismiss";
      return { error: closedByUser ? null : "Giriş tamamlanamadı.", signedIn: false };
    }

    // Token'lar genelde fragment'ta (#access_token=...), hata durumunda query'de gelebilir
    const [beforeHash, ...hashParts] = result.url.split("#");
    const query = beforeHash.includes("?") ? beforeHash.split("?")[1] : "";
    const params = new URLSearchParams(`${query}&${hashParts.join("#")}`);

    const oauthError = params.get("error_description") ?? params.get("error");
    if (oauthError) return { error: oauthError.replace(/\+/g, " "), signedIn: false };

    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return { error: "Oturum bilgisi alınamadı.", signedIn: false };

    const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
    return { error: sessionError?.message ?? null, signedIn: !sessionError };
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
