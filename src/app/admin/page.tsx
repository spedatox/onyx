"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { TicketCard, TicketListItem } from "@/components/TicketCard";
import {
  Inbox,
  Play,
  Clock,
  CheckCircle2,
  Building2,
  Tag,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"INBOX" | "ACTIVE" | "WAITING" | "COMPLETED">("INBOX");
  const [tabTickets, setTabTickets] = useState<TicketListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTicketsLoading, setIsTicketsLoading] = useState(false);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const [meRes, metricsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/admin/metrics"),
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

        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData.metrics);
        }
      } catch (err) {
        console.error("Failed to load admin dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, [router]);

  useEffect(() => {
    async function loadTabTickets() {
      setIsTicketsLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeTab === "INBOX") params.set("status", "OPEN");
        else if (activeTab === "ACTIVE") params.set("status", "IN_PROGRESS");
        else if (activeTab === "WAITING") params.set("status", "WAITING");
        else if (activeTab === "COMPLETED") params.set("status", "COMPLETED");

        const res = await fetch(`/api/tickets?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTabTickets(data.tickets || []);
        }
      } catch (err) {
        console.error("Failed to load tab tickets:", err);
      } finally {
        setIsTicketsLoading(false);
      }
    }
    loadTabTickets();
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06090e] flex items-center justify-center text-zinc-500">
        <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06090e] text-[#e6edf3]">
      <Navbar user={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3.5">
              Yönetim Komuta Merkezi
              <span className="text-xs px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold tracking-wide">
                Ahmet Erol Bayrak
              </span>
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5 font-medium">
              &quot;Neye dikkat etmem gerekiyor?&quot; odaklı operasyonel görünüm
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-sm font-semibold transition-all shadow-sm"
            >
              <Users className="w-4 h-4 text-sky-400" />
              <span>Kullanıcı Yönetimi</span>
            </Link>

            <Link
              href="/admin/settings/webhooks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 border border-white/[0.08] text-sm font-semibold transition-all shadow-sm"
            >
              <span>Speda Webhook Durumu</span>
              <ArrowUpRight className="w-4 h-4 text-zinc-500" />
            </Link>
          </div>
        </div>

        {/* 4 Core Focus Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Inbox / Open */}
          <button
            onClick={() => setActiveTab("INBOX")}
            className={`p-6 rounded-3xl border text-left transition-all relative overflow-hidden ${
              activeTab === "INBOX"
                ? "bg-blue-500/15 border-blue-500/50 shadow-xl shadow-blue-500/15"
                : "bg-[#0c1117]/90 border-white/[0.08] hover:border-white/20 hover:bg-[#121820]"
            }`}
          >
            <div className="flex items-center justify-between text-blue-400 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider">Gelen Kutusu</span>
              <Inbox className="w-5 h-5" />
            </div>
            <div className="text-4xl font-black text-white font-mono tracking-tight">
              {metrics?.open || 0}
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-medium">
              Başlanmamış yeni talepler
            </span>
          </button>

          {/* Active / In Progress */}
          <button
            onClick={() => setActiveTab("ACTIVE")}
            className={`p-6 rounded-3xl border text-left transition-all relative overflow-hidden ${
              activeTab === "ACTIVE"
                ? "bg-amber-500/15 border-amber-500/50 shadow-xl shadow-amber-500/15"
                : "bg-[#0c1117]/90 border-white/[0.08] hover:border-white/20 hover:bg-[#121820]"
            }`}
          >
            <div className="flex items-center justify-between text-amber-400 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider">İşlemde</span>
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="text-4xl font-black text-white font-mono tracking-tight">
              {metrics?.inProgress || 0}
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-medium">
              Şu an aktif çalışılanlar
            </span>
          </button>

          {/* Waiting */}
          <button
            onClick={() => setActiveTab("WAITING")}
            className={`p-6 rounded-3xl border text-left transition-all relative overflow-hidden ${
              activeTab === "WAITING"
                ? "bg-purple-500/15 border-purple-500/50 shadow-xl shadow-purple-500/15"
                : "bg-[#0c1117]/90 border-white/[0.08] hover:border-white/20 hover:bg-[#121820]"
            }`}
          >
            <div className="flex items-center justify-between text-purple-400 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider">Beklemede</span>
              <Clock className="w-5 h-5" />
            </div>
            <div className="text-4xl font-black text-white font-mono tracking-tight">
              {metrics?.waiting || 0}
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-medium">
              Ek bilgi / onay bekleyenler
            </span>
          </button>

          {/* Completed This Month */}
          <button
            onClick={() => setActiveTab("COMPLETED")}
            className={`p-6 rounded-3xl border text-left transition-all relative overflow-hidden ${
              activeTab === "COMPLETED"
                ? "bg-emerald-500/15 border-emerald-500/50 shadow-xl shadow-emerald-500/15"
                : "bg-[#0c1117]/90 border-white/[0.08] hover:border-white/20 hover:bg-[#121820]"
            }`}
          >
            <div className="flex items-center justify-between text-emerald-400 mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider">Bu Ay Teslim</span>
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="text-4xl font-black text-white font-mono tracking-tight">
              {metrics?.completedThisMonth || 0}
            </div>
            <span className="text-xs text-zinc-400 mt-2 block font-medium">
              Kayıtlı teslim kanıtları
            </span>
          </button>
        </div>

        {/* Focus Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List based on Active Tab */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-base font-bold text-white flex items-center gap-2.5">
                <span>
                  {activeTab === "INBOX" && "Gelen Kutusu (İşlem Bekleyenler)"}
                  {activeTab === "ACTIVE" && "Aktif Çalışmalar"}
                  {activeTab === "WAITING" && "Beklemedeki Talepler"}
                  {activeTab === "COMPLETED" && "Tamamlanan İşler"}
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  ({tabTickets.length})
                </span>
              </h3>
            </div>

            {isTicketsLoading ? (
              <div className="py-16 flex justify-center text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              </div>
            ) : tabTickets.length === 0 ? (
              <div className="py-16 text-center text-sm text-zinc-500 rounded-3xl bg-[#0c1117]/50 border border-white/[0.05]">
                Bu bölümde görüntülenecek talep yok.
              </div>
            ) : (
              <div className="space-y-4">
                {tabTickets.map((t) => (
                  <TicketCard key={t.id} ticket={t} />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Breakdown by Org & Category */}
          <div className="space-y-6">
            {/* By Organization */}
            <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 p-6 backdrop-blur-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-500" />
                Şirketlere Göre Dağılım
              </h3>
              <div className="space-y-4">
                {metrics?.breakdowns?.byOrganization &&
                  Object.entries(metrics.breakdowns.byOrganization).map(([org, count]) => (
                    <div key={org} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-zinc-200 font-semibold">{org}</span>
                        <span className="text-sky-400 font-mono font-bold">{String(count)}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-sky-400"
                          style={{
                            width: `${Math.min(
                              100,
                              ((count as number) / (metrics?.total || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* By Category */}
            <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 p-6 backdrop-blur-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4 text-zinc-500" />
                Kategorilere Göre Dağılım
              </h3>
              <div className="space-y-2.5">
                {metrics?.breakdowns?.byCategory &&
                  Object.entries(metrics.breakdowns.byCategory).map(([cat, count]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.04]"
                    >
                      <span className="text-zinc-300 font-medium">{cat}</span>
                      <span className="text-zinc-400 font-mono font-bold">{String(count)}</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Retainer Value Evidence helper */}
            <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 p-6 backdrop-blur-2xl">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <TrendingUp className="w-4 h-4" />
                <h4 className="text-xs font-bold uppercase tracking-wider">Hizmet Değeri Özeti</h4>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Bu ay tamamlanan <strong className="text-white font-bold">{metrics?.completedThisMonth || 0}</strong> adet iş, müşteri toplantılarında teslim edilen retainer değerinin somut kanıtı olarak sunulmaya hazırdır.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
