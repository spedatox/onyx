"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { formatDate } from "@/lib/utils";
import {
  Webhook,
  ArrowLeft,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Shield,
  Loader2,
  RefreshCw,
  Code2,
} from "lucide-react";
import Link from "next/link";

export default function WebhookSettingsPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [endpoints, setEndpoints] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [testResult, setTestResult] = useState<any>(null);

  // New endpoint form
  const [newUrl, setNewUrl] = useState("");
  const [newSecret, setNewSecret] = useState("onyx_speda_secret_key_" + Math.floor(Math.random() * 10000));
  const [newDesc, setNewDesc] = useState("Speda Mark VI Webhook");
  const [isAdding, setIsAdding] = useState(false);

  async function loadWebhooks() {
    try {
      const [meRes, whRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/admin/webhooks"),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user?.role !== "ADMIN") {
          router.push("/tickets");
          return;
        }
        setCurrentUser(meData.user);
      } else {
        router.push("/login");
        return;
      }

      if (whRes.ok) {
        const whData = await whRes.json();
        setEndpoints(whData.endpoints || []);
        setDeliveries(whData.recentDeliveries || []);
      }
    } catch (err) {
      console.error("Failed to load webhooks:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadWebhooks();
  }, [router]);

  async function handleCreateEndpoint(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl.trim() || !newSecret.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newUrl.trim(),
          secret: newSecret.trim(),
          description: newDesc.trim(),
        }),
      });

      if (res.ok) {
        setNewUrl("");
        await loadWebhooks();
      }
    } catch (err) {
      console.error("Failed to add webhook:", err);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleTestPing(endpointId: string) {
    setTestingId(endpointId);
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/webhooks/${endpointId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult(data);
      await loadWebhooks();
    } catch (err) {
      console.error("Test ping failed:", err);
    } finally {
      setTestingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080b10] flex items-center justify-center text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080b10] text-[#dbe6ec]">
      <Navbar user={currentUser} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Link */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Yönetim Paneline Dön</span>
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <Webhook className="w-6 h-6 text-sky-400" />
              Speda Webhook Entegrasyonu
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              ONYX olaylarını Ahmet&apos;in Speda yapay zeka asistanına ileten HMAC-SHA256 imzalı webhooks
            </p>
          </div>

          <button
            onClick={loadWebhooks}
            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white border border-white/[0.06] transition-colors"
            title="Yenile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Security Info Card */}
        <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 p-4 mb-8 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-sky-500/20 text-sky-300 flex-shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <h4 className="font-semibold text-sky-200">HMAC-SHA256 İmzalı Güvenlik</h4>
            <p className="text-zinc-300 mt-1 leading-relaxed">
              Her istek <code className="font-mono text-[11px] text-sky-300 bg-black/40 px-1 py-0.5 rounded">X-ONYX-Signature</code> başlığı altında gizli anahtar ile imzalanır. Tekrar saldırılarını engellemek için <code className="font-mono text-[11px] text-sky-300 bg-black/40 px-1 py-0.5 rounded">event_id</code> ve Unix <code className="font-mono text-[11px] text-sky-300 bg-black/40 px-1 py-0.5 rounded">timestamp</code> içerir.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Endpoints & Test Ping */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl bg-[#0e1319]/90 border border-white/10 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white mb-4">
                Kayıtlı Webhook Hedefleri
              </h3>

              {endpoints.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Henüz webhook adresi tanımlanmadı.</p>
              ) : (
                <div className="space-y-4">
                  {endpoints.map((ep) => (
                    <div
                      key={ep.id}
                      className="p-4 rounded-2xl bg-[#161d26]/60 border border-white/[0.08] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          {ep.description || "Speda Gateway"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Aktif
                        </span>
                      </div>

                      <div className="font-mono text-xs text-sky-300 bg-black/40 p-2.5 rounded-xl border border-white/5 break-all">
                        {ep.url}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                        <span className="text-[11px] text-zinc-400">
                          Secret: ••••••••••••••••
                        </span>

                        <button
                          onClick={() => handleTestPing(ep.id)}
                          disabled={testingId === ep.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-medium transition-all"
                        >
                          {testingId === ep.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Test Ping Gönder</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {testResult && (
                <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/10 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-2 font-bold text-white">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span>
                      Sonuç: {testResult.success ? "Başarılı" : "Hedefe ulaşılamadı"} (HTTP {testResult.statusCode})
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">{testResult.responseBody}</p>
                </div>
              )}
            </div>

            {/* Live Delivery Logs */}
            <div className="rounded-3xl bg-[#0e1319]/90 border border-white/10 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
                <span>Son İletim Günlüğü (Delivery Log)</span>
                <span className="text-xs text-zinc-500 font-mono">Canlı Akış</span>
              </h3>

              {deliveries.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Henüz olay iletimi gerçekleşmedi.</p>
              ) : (
                <div className="space-y-2">
                  {deliveries.map((del) => (
                    <div
                      key={del.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              del.success ? "bg-emerald-400" : "bg-red-400"
                            }`}
                          />
                          <span className="font-mono font-semibold text-white">
                            {del.eventType}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500">
                          {formatDate(del.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-400">
                        <span className="font-mono">
                          HTTP Durumu:{" "}
                          <strong className={del.success ? "text-emerald-400" : "text-red-400"}>
                            {del.statusCode}
                          </strong>
                        </span>
                        <span className="text-zinc-500 truncate max-w-xs">
                          {del.responseBody || "Boş yanıt"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Add New Webhook */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-[#0e1319]/90 border border-white/10 p-6 backdrop-blur-xl">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Yeni Webhook Ekle</span>
              </h3>

              <form onSubmit={handleCreateEndpoint} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-300 font-medium mb-1">
                    Açıklama / Hedef Adı
                  </label>
                  <input
                    type="text"
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Örn: Speda Mark VI Gateway"
                    className="w-full px-3 py-2 rounded-xl bg-[#080b10] border border-white/10 text-xs text-white focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 font-medium mb-1">
                    Webhook URL (Target Endpoint)
                  </label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="http://localhost:8000/api/v1/onyx/webhook"
                    className="w-full px-3 py-2 rounded-xl bg-[#080b10] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-300 font-medium mb-1">
                    Gizli Anahtar (Webhook Secret)
                  </label>
                  <input
                    type="text"
                    required
                    value={newSecret}
                    onChange={(e) => setNewSecret(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080b10] border border-white/10 text-xs text-white font-mono focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAdding}
                  className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-xs transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
                >
                  {isAdding ? "Ekleniyor..." : "Hedefi Kaydet"}
                </button>
              </form>
            </div>

            {/* Speda Tool Reference */}
            <div className="rounded-3xl bg-[#0e1319]/90 border border-white/10 p-5 backdrop-blur-xl">
              <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-sky-400" />
                Speda Assistant Token
              </h3>
              <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                Speda asistanının ONYX API&apos;sini çağırması için tanımlı Bearer token:
              </p>
              <div className="font-mono text-[10px] text-zinc-300 bg-black/40 p-2.5 rounded-xl border border-white/5 break-all select-all">
                speda-service-token-2026
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
