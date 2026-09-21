"use client";

import React, { useState } from "react";
import { Trash2, X, Loader2, AlertTriangle } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: number;
  ticketTitle?: string;
  onDeleted: () => void;
}

export function DeleteModal({
  isOpen,
  onClose,
  ticketId,
  ticketNumber,
  ticketTitle,
  onDeleted,
}: DeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Talep silinemedi.");
      }

      onDeleted();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-[#0e1319] border border-red-500/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161d26]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Talebi Kalıcı Olarak Sil</h3>
              <p className="text-xs text-zinc-400 font-mono">Talep #{ticketNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {ticketTitle && (
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] text-zinc-500 block uppercase tracking-wider font-semibold mb-1">
                Silinecek Talep
              </span>
              <p className="text-sm font-semibold text-zinc-200 line-clamp-2">
                {ticketTitle}
              </p>
            </div>
          )}

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Dikkat:</strong> Bu işlem geri alınamaz. Talep, tüm yorumları, ekleri ve etkinlik geçmişiyle birlikte kalıcı olarak silinecektir.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-all disabled:opacity-50 shadow-lg shadow-red-600/20 active:scale-95"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Siliniyor...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Talebi Sil</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
