"use client";
import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Rating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user: { full_name: string | null; username: string | null } | null;
}

export function RatingSection({ modelId }: { modelId: string }) {
  const [ratings,    setRatings]    = useState<Rating[]>([]);
  const [userRating, setUserRating] = useState(0);
  const [hover,      setHover]      = useState(0);
  const [comment,    setComment]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [userId,     setUserId]     = useState<string | null>(null);

  useEffect(() => {
    fetchRatings();
    checkUser();
  }, [modelId]);

  async function checkUser() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    if (user) {
      const { data } = await supabase
        .from("model_ratings")
        .select("rating")
        .eq("model_id", modelId)
        .eq("user_id", user.id)
        .single();
      if (data) { setUserRating(data.rating); setSubmitted(true); }
    }
  }

  async function fetchRatings() {
    const supabase = createClient();
    const { data } = await supabase
      .from("model_ratings")
      .select("id, rating, comment, created_at, user:profiles(full_name, username)")
      .eq("model_id", modelId)
      .order("created_at", { ascending: false })
      .limit(10);
    setRatings((data ?? []) as unknown as Rating[]);
  }

  async function submitRating() {
    if (!userId || userRating === 0) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("model_ratings").upsert({
      model_id: modelId, user_id: userId, rating: userRating, comment: comment || null,
    }, { onConflict: "model_id,user_id" });
    setSubmitted(true);
    setLoading(false);
    fetchRatings();
  }

  return (
    <div className="mt-8 border-t border-[var(--border)] pt-8">
      <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">Değerlendirmeler</h2>

      {/* Submit rating */}
      {userId && !submitted && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl p-5 mb-6">
          <div className="text-sm font-medium text-[var(--text-primary)] mb-3">Bu modeli değerlendirin</div>
          <div className="flex gap-1 mb-3">
            {[1,2,3,4,5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setUserRating(s)}
              >
                <Star
                  size={24}
                  fill={(hover || userRating) >= s ? "#FBBF24" : "none"}
                  className={(hover || userRating) >= s ? "text-amber-400" : "text-[var(--text-tertiary)]"}
                />
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            placeholder="Yorumunuz (isteğe bağlı)…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:border-[#FF6B35] transition-colors placeholder:text-[var(--text-tertiary)] resize-none mb-3"
          />
          <button
            onClick={submitRating}
            disabled={loading || userRating === 0}
            className="px-4 py-2 text-sm bg-[#FF6B35] text-white rounded-xl hover:bg-[#e85e2a] disabled:opacity-40 transition-colors"
          >
            {loading ? "Gönderiliyor…" : "Değerlendirmeyi Gönder"}
          </button>
        </div>
      )}

      {submitted && (
        <div className="bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.2)] rounded-xl px-4 py-3 text-sm text-[#10B981] mb-6">
          Değerlendirmeniz kaydedildi. Teşekkürler!
        </div>
      )}

      {/* Rating list */}
      {ratings.length === 0 ? (
        <p className="text-sm text-[var(--text-tertiary)]">Henüz değerlendirme yok. İlk değerlendirmeyi siz yapın!</p>
      ) : (
        <div className="flex flex-col gap-4">
          {ratings.map((r) => (
            <div key={r.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[rgba(255,107,53,0.1)] flex items-center justify-center text-[#FF6B35] text-xs font-semibold shrink-0">
                {(r.user?.full_name ?? r.user?.username ?? "?")[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {r.user?.username ? `@${r.user.username}` : r.user?.full_name ?? "Kullanıcı"}
                  </span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={12} fill={r.rating >= s ? "#FBBF24" : "none"} className={r.rating >= s ? "text-amber-400" : "text-[var(--text-tertiary)]"} />
                    ))}
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">{new Date(r.created_at).toLocaleDateString("tr-TR")}</span>
                </div>
                {r.comment && <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{r.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
