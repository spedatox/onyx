"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Ticket,
  Plus,
  LayoutDashboard,
  Users,
  Webhook,
  LogOut,
  ChevronDown,
} from "lucide-react";

interface UserOrg {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface CurrentUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: "USER" | "MANAGER" | "ADMIN" | "SERVICE";
  organizations: UserOrg[];
}

interface NavbarProps {
  user: CurrentUser | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }


  const roleLabels = {
    ADMIN: "Yönetici (Ahmet)",
    MANAGER: "Müdür (Sinan)",
    USER: "Kullanıcı",
    SERVICE: "Servis",
  };

  const roleBadges = {
    ADMIN: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    MANAGER: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    USER: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    SERVICE: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#06090e]/85 backdrop-blur-2xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        {/* Left: Lowercase Wordmark & Nav */}
        <div className="flex items-center gap-8 lg:gap-10">
          <Link href="/tickets" className="flex items-baseline gap-2.5 group select-none">
            <span className="text-2xl sm:text-[26px] font-bold tracking-tight text-white group-hover:text-sky-300 transition-colors font-sans">
              onyx<span className="text-sky-400 font-black text-3xl leading-none">.</span>
            </span>
            <span className="hidden sm:inline-block text-xs text-zinc-500 font-medium tracking-wide">
              iş takip
            </span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1.5 lg:gap-2">
              <Link
                href="/tickets"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/tickets" || (pathname.startsWith("/tickets/") && pathname !== "/tickets/new")
                    ? "bg-white/10 text-white shadow-sm border border-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Ticket className="w-4 h-4 text-sky-400" />
                <span>Talepler</span>
              </Link>

              {user.role === "ADMIN" && (
                <>
                  <Link
                    href="/admin"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      pathname === "/admin"
                        ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 text-sky-400" />
                    <span>Yönetim</span>
                  </Link>

                  <Link
                    href="/admin/users"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      pathname.startsWith("/admin/users")
                        ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Users className="w-4 h-4 text-sky-400" />
                    <span>Kullanıcılar</span>
                  </Link>

                  <Link
                    href="/admin/settings/webhooks"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      pathname.startsWith("/admin/settings/webhooks")
                        ? "bg-sky-500/15 text-sky-300 border border-sky-500/30"
                        : "text-zinc-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Webhook className="w-4 h-4 text-sky-400" />
                    <span>Speda Webhook</span>
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right: New Ticket CTA & User Profile */}
        <div className="flex items-center gap-3.5">
          {user && (
            <Link
              href="/tickets/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-sky-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Yeni Talep</span>
            </Link>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-3 p-2 pr-3.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-950 to-slate-900 text-sky-300 border border-sky-500/30 flex items-center justify-center text-xs font-bold font-mono">
                  {user.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-sm font-semibold text-white leading-tight mb-0.5">
                    {user.fullName}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium leading-none ${
                        roleBadges[user.role]
                      }`}
                    >
                      {roleLabels[user.role]}
                    </span>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-3xl bg-[#0c1117] border border-white/10 shadow-2xl p-2.5 space-y-2.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-2xl">
                  <div className="px-3 py-2.5 border-b border-white/5">
                    <p className="text-sm font-semibold text-white">{user.fullName}</p>
                    <p className="text-xs text-zinc-400 font-mono truncate mt-0.5">{user.email}</p>
                    <div className="mt-1.5 text-xs text-zinc-500">
                      Şirketler: {user.organizations.map((o) => o.name).join(", ") || "Genel"}
                    </div>
                  </div>

                  {user.role === "ADMIN" && (
                    <div className="px-1 py-1 space-y-1">
                      <Link
                        href="/admin/users"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Users className="w-4 h-4 text-sky-400" />
                        <span>Kullanıcı Yönetimi</span>
                      </Link>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-white/5">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              Giriş Yap
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
