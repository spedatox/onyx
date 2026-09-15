"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { TicketCard, TicketListItem } from "@/components/TicketCard";
import {
  Search,
  Plus,
  Building2,
  Inbox,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function TicketsPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    async function init() {
      try {
        const [meRes, orgsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/organizations"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
        } else {
          router.push("/login");
          return;
        }

        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          setOrganizations(orgsData.organizations || []);
        }
      } catch (err) {
        console.error("Failed to initialize tickets page:", err);
      }
    }
    init();
  }, [router]);

  useEffect(() => {
    async function loadTickets() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (activeTab === "OPEN") params.set("status", "OPEN");
        else if (activeTab === "IN_PROGRESS") params.set("status", "IN_PROGRESS");
        else if (activeTab === "WAITING") params.set("status", "WAITING");
        else if (activeTab === "COMPLETED") params.set("status", "COMPLETED");
        else if (activeTab === "CANCELLED") params.set("status", "CANCELLED");

        if (selectedOrg) params.set("organizationId", selectedOrg);
        if (searchQuery.trim()) params.set("search", searchQuery.trim());

        const res = await fetch(`/api/tickets?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTickets(data.tickets || []);
        }
      } catch (err) {
        console.error("Failed to load tickets:", err);
      } finally {
        setIsLoading(false);
      }
    }

    startTransition(() => {
      loadTickets();
    });
  }, [activeTab, selectedOrg, searchQuery]);

  const tabs = [
    { id: "ALL", label: "Tümü" },
    { id: "OPEN", label: "Açık", countFilter: "OPEN" },
    { id: "IN_PROGRESS", label: "İşlemde", countFilter: "IN_PROGRESS" },
    { id: "WAITING", label: "Beklemede", countFilter: "WAITING" },
    { id: "COMPLETED", label: "Tamamlananlar", countFilter: "COMPLETED" },
    { id: "CANCELLED", label: "İptal", countFilter: "CANCELLED" },
  ];

  return (
    <div className="min-h-screen bg-[#06090e] text-[#e6edf3]">
      <Navbar user={currentUser} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-10">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3.5">
              Talepler
              {currentUser?.role === "ADMIN" && (
                <span className="text-xs px-3 py-1 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold tracking-wide">
                  Tüm Şirketler
                </span>
              )}
            </h1>
            <p className="text-sm text-zinc-400 mt-1.5 font-medium">
              İş emirleri, grafik, e-ticaret ve operasyonel talep akışı
            </p>
          </div>

          <Link
            href="/tickets/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-sky-500/25 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Yeni Talep Aç</span>
          </Link>
        </div>

        {/* 2026 Filter Bar */}
        <div className="space-y-4 mb-8">
          {/* Status Tabs - Modern Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none bg-[#0c1117] p-1.5 rounded-2xl border border-white/[0.06] w-fit max-w-full">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search and Org Selector */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            {/* Search */}
            <div className="relative w-full sm:flex-1">
              <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Talep başlığı, açıklama veya #1001 ile ara..."
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-[#0c1117] border border-white/[0.08] text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500/60 transition-all font-medium"
              />
            </div>

            {/* Org Filter */}
            {organizations.length > 1 && (
              <div className="relative w-full sm:w-72">
                <Building2 className="w-4 h-4 text-zinc-500 absolute left-4 top-3.5 pointer-events-none" />
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0c1117] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-sky-500/60 appearance-none cursor-pointer font-medium"
                >
                  <option value="">Tüm Şirketler</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id} className="bg-[#0c1117]">
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tickets Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
            <Loader2 className="w-10 h-10 animate-spin text-sky-400 mb-3" />
            <span className="text-sm font-medium">Talepler getiriliyor...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-24 px-6 rounded-3xl bg-[#0c1117]/60 border border-white/[0.06]">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 text-zinc-500">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white mb-1.5">
              Görüntülenecek talep bulunamadı
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mx-auto mb-6">
              Seçilen filtrelerde kayıtlı talep yok. Yeni bir iş isteği oluşturabilirsiniz.
            </p>
            <Link
              href="/tickets/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Talep Başlat</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
