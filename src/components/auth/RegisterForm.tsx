"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Şifre en az 8 karakter olmalıdır."); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message === "User already registered" ? "Bu e-posta zaten kayıtlı." : "Kayıt sırasında hata oluştu.");
      setLoading(false);
    } else {
      setSuccess(true);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-[rgba(16,185,129,0.1)] flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" fill="none" stroke="#10B981" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-medium text-[var(--text-primary)] mb-2">E-postanı kontrol et!</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          <strong>{email}</strong> adresine doğrulama bağlantısı gönderdik.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button variant="secondary" className="w-full" onClick={handleGoogle} disabled={googleLoading}>
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {googleLoading ? "Yönlendiriliyor..." : "Google ile kayıt ol"}
      </Button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-xs text-[var(--text-tertiary)]">veya</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-3">
        <Input
          label="Ad Soyad"
          type="text"
          placeholder="Ahmet Yılmaz"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          icon={<User size={14} />}
          required
        />
        <Input
          label="E-posta"
          type="email"
          placeholder="ornek@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail size={14} />}
          required
        />
        <Input
          label="Şifre"
          type="password"
          placeholder="En az 8 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock size={14} />}
          required
        />

        {error && (
          <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
          Üye olarak{" "}
          <a href="/terms" className="text-[#FF6B35] hover:underline">Kullanım Koşulları</a>
          {" "}ve{" "}
          <a href="/privacy" className="text-[#FF6B35] hover:underline">Gizlilik Politikası</a>
          'nı kabul etmiş olursunuz.
        </p>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Kayıt yapılıyor..." : "Üye Ol"}
        </Button>
      </form>
    </div>
  );
}
