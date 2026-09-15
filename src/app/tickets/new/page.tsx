"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { CATEGORIES } from "@/lib/utils";
import {
  Upload,
  Send,
  Loader2,
  Calendar,
  Building2,
  Tag,
  AlertTriangle,
  ArrowLeft,
  X,
  FileText,
} from "lucide-react";
import Link from "next/link";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function NewTicketPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [category, setCategory] = useState("Other");
  const [targetDate, setTargetDate] = useState("");
  const [isUrgentReported, setIsUrgentReported] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, orgsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/organizations"),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
          if (meData.user?.organizations?.length > 0) {
            setSelectedOrg(meData.user.organizations[0].id);
          }
        } else {
          router.push("/login");
          return;
        }

        if (orgsRes.ok) {
          const orgsData = await orgsRes.json();
          setOrganizations(orgsData.organizations || []);
          if (orgsData.organizations?.length > 0 && !selectedOrg) {
            setSelectedOrg(orgsData.organizations[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load user or orgs:", err);
      }
    }
    loadData();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Lütfen talep başlığını ve açıklamasını doldurun.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const attachmentIds: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          if (uploadData.attachment?.id) {
            attachmentIds.push(uploadData.attachment.id);
          }
        }
      }

      const priority = isUrgentReported ? "HIGH" : "NORMAL";
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          organizationId: selectedOrg,
          category,
          priority,
          targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
          attachmentIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Talep oluşturulamadı.");
      }

      router.push(`/tickets/${data.ticket.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
      setError(msg);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#06090e] text-[#e6edf3]">
      <Navbar user={currentUser} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Back Link */}
        <Link
          href="/tickets"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Taleplere Dön</span>
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Yeni Talep Oluştur
          </h1>
          <p className="text-sm text-zinc-400 mt-1.5 font-medium">
            Talebinizi 30 saniye içinde oluşturun. İlgili ekip anında bildirim alacaktır.
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 shadow-2xl p-7 sm:p-10 backdrop-blur-2xl">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-zinc-200 mb-2">
                Başlık <span className="text-sky-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: Instagram için yeni ürün tanıtım görseli hazırla"
                className="w-full px-4 py-3.5 rounded-2xl bg-[#06090e] border border-white/10 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/60 transition-all font-medium"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-zinc-200 mb-2">
                Ne yapılmasını istiyorsunuz? <span className="text-sky-400">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Talebinizi olabildiğince açık şekilde yazın (Yapılacak değişiklikler, metinler, ölçüler veya beklentiler)..."
                className="w-full px-4 py-3.5 rounded-2xl bg-[#06090e] border border-white/10 text-base text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/60 transition-all leading-relaxed resize-none font-normal"
              />
            </div>

            {/* File Upload Dropzone */}
            <div>
              <label className="block text-sm font-semibold text-zinc-200 mb-2">
                Dosyalar / Görseller (İsteğe Bağlı)
              </label>
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/10 rounded-2xl bg-[#06090e]/50 hover:bg-[#06090e] hover:border-sky-500/40 cursor-pointer transition-all">
                <Upload className="w-7 h-7 text-sky-400 mb-2.5" />
                <span className="text-sm text-zinc-200 font-semibold">
                  Dosya seçin veya buraya sürükleyin
                </span>
                <span className="text-xs text-zinc-400 mt-1">
                  Fotoğraflar, PDF dokümanlar, Excel, Word veya ZIP (Maks 50MB)
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      setFiles([...files, ...Array.from(e.target.files)]);
                    }
                  }}
                />
              </label>

              {files.length > 0 && (
                <div className="mt-3.5 space-y-2">
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-xs text-zinc-300 font-medium"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="w-4 h-4 text-sky-400 flex-shrink-0" />
                        <span className="truncate">{file.name}</span>
                        <span className="text-zinc-500 text-[11px] font-mono">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Optional / Advanced Details */}
            <div className="pt-6 border-t border-white/5">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-4">
                İsteğe Bağlı Detaylar
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Organization */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    Şirket
                  </label>
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#06090e] border border-white/10 text-sm text-white focus:outline-none focus:border-sky-500/60 font-medium"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id} className="bg-[#0c1117]">
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-zinc-500" />
                    Kategori
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#06090e] border border-white/10 text-sm text-white focus:outline-none focus:border-sky-500/60 font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#0c1117]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Date */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-2 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-zinc-500" />
                    İstenen Teslim Tarihi
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#06090e] border border-white/10 text-sm text-white focus:outline-none focus:border-sky-500/60 font-medium"
                  />
                </div>

                {/* Urgency Report Flag */}
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isUrgentReported}
                      onChange={(e) => setIsUrgentReported(e.target.checked)}
                      className="w-5 h-5 rounded-lg bg-[#06090e] border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span className="text-sm text-zinc-200 flex items-center gap-2 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Aciliyet bildir (Öncelik bildirimi)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3.5 pt-6 border-t border-white/5">
              <Link
                href="/tickets"
                className="px-5 py-3 rounded-2xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                İptal
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-400 to-sky-500 hover:from-sky-300 hover:to-sky-400 text-slate-950 font-bold text-base transition-all shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gönderiliyor...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 stroke-[2.5]" />
                    <span>Talebi Gönder</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
