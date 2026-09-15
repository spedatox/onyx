"use client";

import React, { useState } from "react";
import { CheckCircle2, Upload, Link as LinkIcon, X, Loader2 } from "lucide-react";

interface CompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: number;
  onCompleted: () => void;
}

export function CompletionModal({
  isOpen,
  onClose,
  ticketId,
  ticketNumber,
  onCompleted,
}: CompletionModalProps) {
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) {
      setError("Lütfen yapılan işlemi özetleyen bir tamamlama açıklaması girin.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Upload any attached files first
      const attachmentIds: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("ticketId", ticketId);

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

      // 2. Call complete endpoint
      const res = await fetch(`/api/tickets/${ticketId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completionSummary: summary.trim(),
          completionUrl: url.trim() || undefined,
          attachmentIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Tamamlama işlemi başarısız oldu.");
      }

      onCompleted();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-[#0e1319] border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161d26]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Talebi Tamamla</h3>
              <p className="text-xs text-zinc-400">Talep #{ticketNumber} teslim kanıtı ve açıklaması</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Tamamlama Açıklaması <span className="text-emerald-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Yapılan işlemi detaylandırın (Örn: 15 ürün fotoğrafı düzenlendi, arka planlar temizlendi ve e-ticaret paneline yüklendi)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080b10] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Bağlantı / Canlı URL (İsteğe Bağlı)
            </label>
            <div className="relative">
              <LinkIcon className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://karamakine.com/urunler/yeni-model"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#080b10] border border-white/10 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Görsel / Kanıt Dosyaları (İsteğe Bağlı)
            </label>
            <label className="flex flex-col items-center justify-center p-4 border border-dashed border-white/15 rounded-xl bg-[#080b10]/50 hover:bg-[#080b10] cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-zinc-400 mb-1" />
              <span className="text-xs text-zinc-300 font-medium">Dosya seç veya buraya bırak</span>
              <span className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, PDF, ZIP (Maks 50MB)</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(Array.from(e.target.files));
                  }
                }}
              />
            </label>
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-zinc-300">
                    <span className="truncate">{f.name}</span>
                    <span className="text-zinc-500 text-[10px]">{(f.size / 1024).toFixed(0)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Talebi Tamamla</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
