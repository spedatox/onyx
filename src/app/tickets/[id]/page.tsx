"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { PriorityBadge } from "@/components/PriorityBadge";
import { CompletionModal } from "@/components/CompletionModal";
import { WaitingModal } from "@/components/WaitingModal";
import { CancelModal } from "@/components/CancelModal";
import { DeleteModal } from "@/components/DeleteModal";
import {
  formatTicketNumber,
  formatDate,
  formatRelativeTime,
  PRIORITY_MAP,
} from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  ExternalLink,
  Paperclip,
  Send,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  XCircle,
  FileText,
  Check,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

function isImageAttachment(att: { mimeType?: string; filename?: string }) {
  return (
    Boolean(att.mimeType?.startsWith("image/")) ||
    /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i.test(att.filename || "")
  );
}

export default function TicketDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const ticketId = resolvedParams.id;
  const router = useRouter();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Modals state
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [isWaitingOpen, setIsWaitingOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  async function loadTicket() {
    try {
      const [meRes, ticketRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/tickets/${ticketId}`),
      ]);

      if (meRes.ok) {
        const meData = await meRes.json();
        setCurrentUser(meData.user);
      } else {
        router.push("/login");
        return;
      }

      if (ticketRes.ok) {
        const ticketData = await ticketRes.json();
        setTicket(ticketData.ticket);
      } else {
        router.push("/tickets");
      }
    } catch (err) {
      console.error("Error loading ticket detail:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  async function updateStatus(newStatus: string) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadTicket();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  }

  async function updatePriority(newPriority: string) {
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (res.ok) {
        await loadTicket();
      }
    } catch (err) {
      console.error("Failed to update priority:", err);
    }
  }

  async function handleReopen() {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Talep sahibi tarafından ek işlem için tekrar açıldı." }),
      });
      if (res.ok) {
        await loadTicket();
      }
    } catch (err) {
      console.error("Failed to reopen ticket:", err);
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;

    setIsSubmittingComment(true);
    try {
      const attachmentIds: string[] = [];
      for (const file of commentFiles) {
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

      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText.trim(),
          isInternal: isInternalNote,
          attachmentIds,
        }),
      });

      if (res.ok) {
        setCommentText("");
        setCommentFiles([]);
        setIsInternalNote(false);
        await loadTicket();
      }
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  }

  if (isLoading || !ticket) {
    return (
      <div className="min-h-screen bg-[#06090e] flex items-center justify-center text-zinc-500">
        <Loader2 className="w-10 h-10 animate-spin text-sky-400" />
      </div>
    );
  }

  const isAdmin = currentUser?.role === "ADMIN";
  const isCreator = currentUser?.id === ticket.createdById;

  return (
    <div className="min-h-screen bg-[#06090e] text-[#e6edf3]">
      <Navbar user={currentUser} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Top Breadcrumb & Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/tickets"
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Taleplere Dön</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono">
              Oluşturulma: {formatDate(ticket.createdAt)}
            </span>
          </div>
        </div>

        {/* Ticket Header Card */}
        <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 shadow-2xl p-7 sm:p-9 mb-8 backdrop-blur-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-white/5">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-sm font-bold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-xl border border-sky-500/25">
                  {formatTicketNumber(ticket.ticketNumber)}
                </span>
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <span className="flex items-center gap-1.5 text-xs text-zinc-300 bg-white/[0.05] px-3 py-1 rounded-xl border border-white/[0.08] font-medium">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{ticket.organization.name}</span>
                </span>
                <span className="text-xs text-zinc-400 bg-white/[0.03] px-3 py-1 rounded-xl border border-white/[0.05]">
                  {ticket.category}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                {ticket.title}
              </h1>
            </div>

            {/* Action Bar */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {ticket.status === "OPEN" && isAdmin && (
                <button
                  onClick={() => updateStatus("IN_PROGRESS")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm transition-all shadow-md shadow-sky-400/20 active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>İşleme Al</span>
                </button>
              )}

              {(ticket.status === "IN_PROGRESS" || ticket.status === "WAITING") && isAdmin && (
                <button
                  onClick={() => setIsCompletionOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-sm transition-all shadow-md shadow-emerald-400/20 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Talebi Tamamla</span>
                </button>
              )}

              {ticket.status === "IN_PROGRESS" && isAdmin && (
                <button
                  onClick={() => setIsWaitingOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-sm font-semibold transition-all"
                >
                  <Clock className="w-4 h-4" />
                  <span>Beklemeye Al</span>
                </button>
              )}

              {ticket.status === "WAITING" && isAdmin && (
                <button
                  onClick={() => updateStatus("IN_PROGRESS")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-sm font-semibold transition-all"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>İşleme Devam Et</span>
                </button>
              )}

              {(ticket.status === "COMPLETED" || ticket.status === "CLOSED") &&
                (isCreator || isAdmin) && (
                  <button
                    onClick={handleReopen}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-sm font-semibold transition-all"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Tekrar Aç</span>
                  </button>
                )}

              {ticket.status === "COMPLETED" && (isCreator || isAdmin) && (
                <button
                  onClick={() => updateStatus("CLOSED")}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-zinc-200 text-sm font-medium transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Onayla & Kapat</span>
                </button>
              )}

              {(ticket.status === "OPEN" || ticket.status === "WAITING") && isAdmin && (
                <button
                  onClick={() => setIsCancelOpen(true)}
                  className="p-2.5 rounded-2xl text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Talebi İptal Et"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              )}

              {isAdmin && (
                <select
                  value={ticket.priority}
                  onChange={(e) => updatePriority(e.target.value)}
                  className="px-3 py-2 rounded-2xl bg-[#06090e] border border-white/10 text-xs text-zinc-300 focus:outline-none cursor-pointer font-medium"
                  title="Öncelik Değiştir"
                >
                  {Object.keys(PRIORITY_MAP).map((k) => (
                    <option key={k} value={k} className="bg-[#0c1117]">
                      Öncelik: {PRIORITY_MAP[k].label}
                    </option>
                  ))}
                </select>
              )}

              {isAdmin && (
                <button
                  onClick={() => setIsDeleteOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/25 text-xs font-semibold transition-all shadow-sm active:scale-95"
                  title="Talebi Kalıcı Olarak Sil"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Talebi Sil</span>
                </button>
              )}
            </div>
          </div>

          {/* Meta Info Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 text-sm">
            <div>
              <span className="text-xs text-zinc-500 block mb-1">Talep Eden</span>
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <User className="w-4 h-4 text-zinc-500" />
                <span>{ticket.createdBy.fullName}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-zinc-500 block mb-1">Sorumlu</span>
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <User className="w-4 h-4 text-zinc-500" />
                <span>{ticket.assignedTo ? ticket.assignedTo.fullName : "Ahmet Bayrak"}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-zinc-500 block mb-1">Hedef Tarih</span>
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Calendar className="w-4 h-4 text-zinc-500" />
                <span>{ticket.targetDate ? formatDate(ticket.targetDate) : "Belirtilmedi"}</span>
              </div>
            </div>

            <div>
              <span className="text-xs text-zinc-500 block mb-1">Son Güncelleme</span>
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span>{formatRelativeTime(ticket.updatedAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* WAITING Banner if applicable */}
        {ticket.status === "WAITING" && ticket.waitingReason && (
          <div className="rounded-3xl bg-purple-500/10 border border-purple-500/25 p-6 mb-8 flex items-start gap-4">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-300 flex-shrink-0 mt-0.5">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                Çalışma Beklemede
              </h4>
              <p className="text-base text-purple-100 font-medium mt-1">{ticket.waitingReason}</p>
              <p className="text-xs text-purple-300/80 mt-2">
                İstenen bilgi sağlandığında talep otomatik olarak tekrar işlem durumuna geçecektir.
              </p>
            </div>
          </div>
        )}

        {/* COMPLETION Proof Banner if COMPLETED or CLOSED */}
        {(ticket.status === "COMPLETED" || ticket.status === "CLOSED") && (
          <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/25 p-7 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-300 flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-base font-bold text-emerald-300">
                    Talebiniz Başarıyla Tamamlandı
                  </h4>
                  <span className="text-xs text-emerald-400 font-mono">
                    {formatDate(ticket.completedAt)}
                  </span>
                </div>
                <p className="text-sm text-zinc-100 mt-2.5 leading-relaxed bg-black/40 p-4 rounded-2xl border border-emerald-500/20 font-medium">
                  {ticket.completionSummary || "İşlem teslim edildi."}
                </p>

                {ticket.completionUrl && (
                  <a
                    href={ticket.completionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3.5 text-sm text-emerald-400 hover:text-emerald-300 underline font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Teslim edilen sayfayı / içeriği görüntüle</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Details & Timeline */}
          <div className="lg:col-span-2 space-y-8">
            {/* Request Body */}
            <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 p-7 sm:p-8 backdrop-blur-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">
                Talep Açıklaması
              </h3>
              <p className="text-base text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>

              {ticket.attachments?.filter((a: any) => !a.commentId).length > 0 && (
                <div className="mt-6 pt-5 border-t border-white/5">
                  <span className="text-xs font-semibold text-zinc-400 block mb-3">
                    Ekli Dosyalar & Görseller:
                  </span>

                  {/* Image Previews */}
                  {ticket.attachments.filter((a: any) => !a.commentId && isImageAttachment(a)).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3.5">
                      {ticket.attachments
                        .filter((a: any) => !a.commentId && isImageAttachment(a))
                        .map((att: any) => (
                          <a
                            key={att.id}
                            href={att.storageKey}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 aspect-video flex items-center justify-center hover:border-sky-500/50 transition-all shadow-md"
                          >
                            <img
                              src={att.storageKey}
                              alt={att.filename}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5">
                              <span className="text-[11px] text-white truncate font-medium">
                                {att.filename}
                              </span>
                            </div>
                          </a>
                        ))}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2.5">
                    {ticket.attachments
                      .filter((a: any) => !a.commentId)
                      .map((att: any) => (
                        <a
                          key={att.id}
                          href={att.storageKey}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-sky-300 transition-colors font-medium"
                        >
                          <Paperclip className="w-4 h-4 text-zinc-400" />
                          <span className="truncate max-w-xs">{att.filename}</span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            ({(att.size / 1024).toFixed(0)} KB)
                          </span>
                        </a>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Activity & Comments Timeline */}
            <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 p-7 sm:p-8 backdrop-blur-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-5">
                Süreç & Mesaj Akışı
              </h3>

              <div className="space-y-4 mb-8">
                {ticket.comments?.length === 0 ? (
                  <p className="text-sm text-zinc-500 italic">Henüz yorum yapılmadı.</p>
                ) : (
                  ticket.comments.map((comment: any) => (
                    <div
                      key={comment.id}
                      className={`p-5 rounded-2xl text-sm transition-all ${
                        comment.isInternal
                          ? "bg-amber-500/10 border border-amber-500/30"
                          : comment.type === "SYSTEM_EVENT"
                          ? "bg-white/[0.02] border border-white/[0.04] text-zinc-400"
                          : comment.type === "ADMIN_MESSAGE"
                          ? "bg-[#141a22] border border-sky-500/25"
                          : "bg-white/[0.03] border border-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white">
                            {comment.user ? comment.user.fullName : "Sistem"}
                          </span>

                          {comment.isInternal && (
                            <span className="flex items-center gap-1.5 text-[11px] bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-lg border border-amber-500/30 font-semibold">
                              <Lock className="w-3 h-3" />
                              Dahili Not
                            </span>
                          )}

                          {comment.user?.role === "ADMIN" && !comment.isInternal && (
                            <span className="text-[11px] bg-sky-500/15 text-sky-300 px-2 py-0.5 rounded-md font-medium">
                              Yönetici
                            </span>
                          )}

                          {comment.user?.role === "MANAGER" && !comment.isInternal && (
                            <span className="text-[11px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-md font-medium">
                              Patron
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-zinc-500 font-mono">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                      </div>

                      <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {comment.content}
                      </p>

                      {comment.attachments?.length > 0 && (
                        <div className="mt-3.5 space-y-2.5 pt-3 border-t border-white/5">
                          {/* Image Previews */}
                          {comment.attachments.some((a: any) => isImageAttachment(a)) && (
                            <div className="flex flex-wrap gap-2.5">
                              {comment.attachments
                                .filter((a: any) => isImageAttachment(a))
                                .map((att: any) => (
                                  <a
                                    key={att.id}
                                    href={att.storageKey}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative rounded-xl overflow-hidden border border-white/10 bg-black/40 h-24 w-36 hover:border-sky-500/50 transition-all block"
                                  >
                                    <img
                                      src={att.storageKey}
                                      alt={att.filename}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  </a>
                                ))}
                            </div>
                          )}

                          {/* File Pills */}
                          <div className="flex flex-wrap gap-2">
                            {comment.attachments.map((att: any) => (
                              <a
                                key={att.id}
                                href={att.storageKey}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 text-xs text-sky-400 border border-white/5"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span className="truncate max-w-xs">{att.filename}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Comment Composer */}
              <form onSubmit={handleCommentSubmit} className="space-y-4 pt-5 border-t border-white/5">
                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? "Dahili not girin (Talep sahibi bu notu göremez)..."
                      : "Mesaj veya güncelleme ekleyin..."
                  }
                  className={`w-full px-4 py-3 rounded-2xl bg-[#06090e] border text-sm text-white placeholder-zinc-500 focus:outline-none transition-all resize-none font-medium leading-relaxed ${
                    isInternalNote
                      ? "border-amber-500/40 focus:border-amber-500"
                      : "border-white/10 focus:border-sky-500/60"
                  }`}
                />

                {commentFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {commentFiles.map((file, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 text-xs text-zinc-300"
                      >
                        <FileText className="w-4 h-4 text-sky-400" />
                        <span className="truncate max-w-xs">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setCommentFiles(commentFiles.filter((_, idx) => idx !== i))}
                          className="text-zinc-500 hover:text-red-400 ml-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-zinc-300 hover:text-white cursor-pointer transition-colors border border-white/[0.06] font-medium">
                      <Paperclip className="w-4 h-4" />
                      <span>Dosya Ekle</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) {
                            setCommentFiles([...commentFiles, ...Array.from(e.target.files)]);
                          }
                        }}
                      />
                    </label>

                    {isAdmin && (
                      <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none font-medium">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-0"
                        />
                        <span className={isInternalNote ? "text-amber-400 font-bold" : ""}>
                          Dahili Not (Gizli)
                        </span>
                      </label>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingComment || (!commentText.trim() && commentFiles.length === 0)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-sm transition-all shadow-md shadow-sky-400/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    {isSubmittingComment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>Gönder</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Col: Audit Events & Speda Link */}
          <div className="space-y-6">
            <div className="rounded-3xl bg-[#0c1117]/90 border border-white/10 p-6 backdrop-blur-2xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center justify-between">
                <span>Değişiklik Geçmişi</span>
                <span className="text-[11px] text-zinc-500 font-mono">Denetim İzi</span>
              </h3>

              <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
                {ticket.events?.map((ev: any) => (
                  <div key={ev.id} className="relative text-xs">
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-sky-400 ring-4 ring-[#0c1117]" />
                    <div className="text-zinc-200 font-semibold">
                      {ev.eventType === "CREATED" && "Talep Oluşturuldu"}
                      {ev.eventType === "STATUS_CHANGED" && `Durum: ${ev.oldValue} → ${ev.newValue}`}
                      {ev.eventType === "PRIORITY_CHANGED" && `Öncelik: ${ev.newValue}`}
                      {ev.eventType === "ASSIGNED" && "Sorumlu Atandı"}
                      {ev.eventType === "COMMENT_ADDED" && "Mesaj / Not Eklendi"}
                      {ev.eventType === "COMPLETED" && "Talep Tamamlandı"}
                      {ev.eventType === "REOPENED" && "Talep Tekrar Açıldı"}
                      {ev.eventType === "CANCELLED" && "Talep İptal Edildi"}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">
                      {ev.actor ? ev.actor.fullName : "Sistem"} • {formatRelativeTime(ev.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Action Modals */}
      <CompletionModal
        isOpen={isCompletionOpen}
        onClose={() => setIsCompletionOpen(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        onCompleted={loadTicket}
      />

      <WaitingModal
        isOpen={isWaitingOpen}
        onClose={() => setIsWaitingOpen(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        onSubmitted={loadTicket}
      />

      <CancelModal
        isOpen={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        onCancelled={loadTicket}
      />

      <DeleteModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.ticketNumber}
        ticketTitle={ticket.title}
        onDeleted={() => router.push("/tickets")}
      />
    </div>
  );
}
