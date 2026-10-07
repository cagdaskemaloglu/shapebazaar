import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import { useAuth } from "./AuthProvider";

export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  city: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
}

// `*` DEĞİL, açık kolon listesi: telefon/cüzdan gibi hassas kolonlar ileride herkese açık okumadan
// çıkarıldığında (bkz. roadmap "profiles_public_read") bu sorgu bozulmasın.
export const PROFILE_COLUMNS = "id, full_name, username, city, bio, avatar_url, role";

/** Giriş yapmış kullanıcının profil satırı. */
export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setProfile(null); setLoading(false); return; }
    const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", userId).maybeSingle();
    if (error) console.warn("[profile] load", error);
    setProfile((data as Profile | null) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { setLoading(true); refresh(); }, [refresh]);

  return { profile, loading, refresh, setProfile };
}
