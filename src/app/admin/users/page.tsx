"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { formatDate } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  KeyRound,
  Loader2,
  ArrowLeft,
  X,
  AlertTriangle,
  Ticket,
} from "lucide-react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface UserItem {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: "USER" | "MANAGER" | "ADMIN" | "SERVICE";
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  memberships: {
    id: string;
    role: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
  _count: {
    createdTickets: number;
    assignedTickets: number;
    comments: number;
  };
}

export default function AdminUsersPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    role: "USER" as "USER" | "MANAGER" | "ADMIN" | "SERVICE",
    isActive: true,
    selectedOrgIds: [] as string[],
  });

  // Delete State
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<{ message: string; requiresForce: boolean } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadData() {
    try {
      const [meRes, usersRes, orgsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/admin/users"),
        fetch("/api/organizations"),
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

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        setOrganizations(orgsData.organizations || []);
      }
    } catch (err) {
      console.error("Failed to load user management data:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [router]);

  function openCreateModal() {
    setEditingUser(null);
    setFormData({
      fullName: "",
      username: "",
      email: "",
      password: "",
      role: "USER",
      isActive: true,
      selectedOrgIds: organizations.map((o) => o.id), // default to all
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  function openEditModal(user: UserItem) {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      password: "", // empty means keep current
      role: user.role,
      isActive: user.isActive,
      selectedOrgIds: user.memberships.map((m) => m.organization.id),
    });
    setModalError(null);
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);

    try {
      if (editingUser) {
        // Update user
        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.fullName,
            username: formData.username,
            email: formData.email,
            password: formData.password || undefined,
            role: formData.role,
            isActive: formData.isActive,
            organizationIds: formData.selectedOrgIds,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Kullanıcı güncellenemedi.");
        }
      } else {
        // Create user
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: formData.fullName,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            role: formData.role,
            isActive: formData.isActive,
            organizationIds: formData.selectedOrgIds,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Kullanıcı eklenemedi.");
        }
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Beklenmeyen hata";
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDelete(user: UserItem, force = false) {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}${force ? "?force=true" : ""}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.requiresConfirmation) {
          setDeleteWarning({
            message: data.error,
            requiresForce: true,
          });
          return;
        }
        throw new Error(data.error || "Kullanıcı silinemedi.");
      }

      setDeletingUser(null);
      setDeleteWarning(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Silme hatası";
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleActive(user: UserItem) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to toggle user status:", err);
    }
  }

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleLabels: Record<string, string> = {
    ADMIN: "Yönetici (ADMIN)",
    MANAGER: "Müdür (MANAGER)",
    USER: "Kullanıcı (USER)",
    SERVICE: "Servis (SERVICE)",
  };

  const roleBadges: Record<string, string> = {
    ADMIN: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    MANAGER: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    USER: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    SERVICE: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  };

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
        {/* Navigation Breadcrumb */}
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Yönetim Komuta Merkezine Dön</span>
        </Link>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-sky-400" />
              Kullanıcı Yönetimi
            </h1>
            <p className="text-sm text-zinc-400 mt-1 font-medium">
              Sistem kullanıcılarını, erişim rollerini ve şirket yetkilendirmelerini yönetin
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-sky-500/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4 stroke-[2.5]" />
            <span>Yeni Kullanıcı Ekle</span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Ad, kullanıcı adı veya e-posta ile ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-[#0c1117] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {["ALL", "ADMIN", "MANAGER", "USER"].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  roleFilter === r
                    ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                    : "bg-[#0c1117] text-zinc-400 border-white/[0.08] hover:text-white"
                }`}
              >
                {r === "ALL" ? "Tümü" : r}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 overflow-hidden shadow-2xl backdrop-blur-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-white/[0.02] border-b border-white/[0.06] text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-4 px-6">Kullanıcı</th>
                  <th className="py-4 px-4">Rol</th>
                  <th className="py-4 px-4">Bağlı Şirketler</th>
                  <th className="py-4 px-4 text-center">Talep Sayısı</th>
                  <th className="py-4 px-4">Durum</th>
                  <th className="py-4 px-6 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500 text-sm">
                      Arama kriterlerine uygun kullanıcı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-950 to-slate-900 text-sky-300 border border-sky-500/30 flex items-center justify-center font-bold text-xs font-mono">
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {u.id === currentUser?.id && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-white/10 text-zinc-300 rounded font-normal">
                                  Sen
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 font-mono mt-0.5">
                              @{u.username} • {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium inline-block ${
                            roleBadges[u.role] || roleBadges.USER
                          }`}
                        >
                          {roleLabels[u.role] || u.role}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {u.memberships.length === 0 ? (
                            <span className="text-zinc-500 text-xs italic">Tanımsız</span>
                          ) : (
                            u.memberships.map((m) => (
                              <span
                                key={m.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-300 font-medium"
                              >
                                <Building2 className="w-3 h-3 text-sky-400" />
                                {m.organization.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-1 text-xs font-mono font-bold text-zinc-300 bg-white/[0.03] px-2 py-1 rounded-lg border border-white/[0.05]">
                          <Ticket className="w-3 h-3 text-zinc-400" />
                          <span>{u._count.createdTickets}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === currentUser?.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            u.isActive
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25"
                              : "bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25"
                          } ${u.id === currentUser?.id ? "opacity-60 cursor-not-allowed" : ""}`}
                          title={u.id === currentUser?.id ? "Kendi hesabınızı kapatamazsınız" : "Durumu Değiştir"}
                        >
                          {u.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Pasif</span>
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setDeletingUser(u);
                              setDeleteWarning(null);
                            }}
                            disabled={u.id === currentUser?.id}
                            className={`p-2 rounded-xl bg-white/[0.04] hover:bg-red-500/15 text-zinc-400 hover:text-red-300 border border-white/[0.08] hover:border-red-500/30 transition-colors ${
                              u.id === currentUser?.id ? "opacity-30 cursor-not-allowed" : ""
                            }`}
                            title={u.id === currentUser?.id ? "Kendinizi silemezsiniz" : "Kullanıcıyı Sil"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-lg rounded-3xl bg-[#0c1117] border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
                  <UserPlus className="w-5 h-5 text-sky-400" />
                  <span>{editingUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Oluştur"}</span>
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {modalError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="Örn: Sinan Kara"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Kullanıcı Adı
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="sinan"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-white/10 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-sky-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                    E-Posta Adresi
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="sinan@karamakine.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-white/10 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span>{editingUser ? "Yeni Şifre (Boş bırakılırsa değişmez)" : "Şifre"}</span>
                    <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? "••••••••" : "En az 6 karakter"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Yetki Rolü
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          role: e.target.value as any,
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500/50"
                    >
                      <option value="USER">USER (Standart Kullanıcı)</option>
                      <option value="MANAGER">MANAGER (Bölüm Yöneticisi)</option>
                      <option value="ADMIN">ADMIN (Tam Yetkili)</option>
                      <option value="SERVICE">SERVICE (API / Bot)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Hesap Durumu
                    </label>
                    <select
                      value={formData.isActive ? "true" : "false"}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.value === "true" })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#06090e] border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500/50"
                    >
                      <option value="true">Aktif (Giriş Yapabilir)</option>
                      <option value="false">Pasif (Erişim Engelli)</option>
                    </select>
                  </div>
                </div>

                {/* Organization Checkboxes */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2">
                    Erişebileceği Şirketler
                  </label>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {organizations.map((org) => {
                      const isChecked = formData.selectedOrgIds.includes(org.id);
                      return (
                        <label
                          key={org.id}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-[#06090e] border border-white/5 hover:border-white/15 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selectedOrgIds: [...formData.selectedOrgIds, org.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedOrgIds: formData.selectedOrgIds.filter((id) => id !== org.id),
                                });
                              }
                            }}
                            className="rounded border-zinc-700 text-sky-500 focus:ring-0 focus:ring-offset-0 bg-zinc-900"
                          />
                          <span className="font-semibold text-white">{org.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">({org.slug})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-sky-500/20 disabled:opacity-50"
                  >
                    {modalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingUser ? "Değişiklikleri Kaydet" : "Kullanıcıyı Kaydet"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md rounded-3xl bg-[#0c1117] border border-red-500/30 shadow-2xl p-6 space-y-5">
              <div className="flex items-center gap-3 text-red-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold text-white">Kullanıcıyı Sil</h3>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                <strong className="text-white font-bold">{deletingUser.fullName}</strong> (@{deletingUser.username}) kullanıcısını silmek istediğinize emin misiniz?
              </p>

              {deleteWarning && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-2">
                  <p>{deleteWarning.message}</p>
                  <p className="text-[11px] text-zinc-400">
                    Onaylarsanız açtığı talepler silinmez, yönetici hesabınıza aktarılarak arşiv korunur.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeletingUser(null);
                    setDeleteWarning(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-zinc-300 text-xs font-semibold"
                >
                  Vazgeç
                </button>

                {deleteWarning?.requiresForce ? (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(deletingUser, true)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20"
                  >
                    {isDeleting ? "Aktarılıyor ve Siliniyor..." : "Talepleri Devralarak Sil"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDelete(deletingUser, false)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20"
                  >
                    {isDeleting ? "Siliniyor..." : "Evet, Sil"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
