"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Giriş yapılamadı.");
      }

      router.push("/tickets");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#06090e] relative overflow-hidden">
      {/* 2026 Ambient Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand Header: Modern lowercase wordmark */}
        <div className="text-center mb-8">
          <div className="inline-block mb-2">
            <span className="text-5xl font-black tracking-tight text-white font-sans">
              onyx<span className="text-sky-400 font-black text-6xl leading-none">.</span>
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-400 mt-1">
            Arel Tarım ve Kara Makine Dahili Talep ve İş Takip Platformu
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 shadow-2xl p-8 sm:p-10 backdrop-blur-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-zinc-200 mb-2">
                Kullanıcı Adı veya E-posta
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-zinc-500 absolute left-4 top-3.5" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="ahmet@arel.com veya sinan"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#06090e] border border-white/10 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/60 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-200 mb-2">
                Şifre
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-zinc-500 absolute left-4 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#06090e] border border-white/10 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/60 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 font-bold text-base transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Giriş Yapılıyor...</span>
                </>
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
