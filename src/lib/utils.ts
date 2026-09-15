import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTicketNumber(num: number): string {
  return `#${num}`;
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Az önce";
  if (diffMinutes < 60) return `${diffMinutes} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays === 1) return "Dün";
  if (diffDays < 7) return `${diffDays} gün önce`;
  return formatDate(date);
}

export interface StatusConfig {
  label: string;
  description: string;
  badgeClass: string;
  dotClass: string;
  borderClass: string;
}

export const STATUS_MAP: Record<string, StatusConfig> = {
  OPEN: {
    label: "Açık",
    description: "Talebiniz alındı",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dotClass: "bg-blue-400",
    borderClass: "border-l-blue-500",
  },
  IN_PROGRESS: {
    label: "İşlemde",
    description: "Talebiniz üzerinde çalışılıyor",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-400 animate-pulse",
    borderClass: "border-l-amber-500",
  },
  WAITING: {
    label: "Beklemede",
    description: "Ek bilgi / onay bekleniyor",
    badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    dotClass: "bg-purple-400",
    borderClass: "border-l-purple-500",
  },
  COMPLETED: {
    label: "Tamamlandı",
    description: "Çalışma teslim edildi",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-400",
    borderClass: "border-l-emerald-500",
  },
  CLOSED: {
    label: "Kapatıldı",
    description: "Talep sonlandırıldı",
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dotClass: "bg-zinc-400",
    borderClass: "border-l-zinc-600",
  },
  CANCELLED: {
    label: "İptal Edildi",
    description: "Talep işleme alınmayacak",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClass: "bg-red-400",
    borderClass: "border-l-red-500",
  },
};

export interface PriorityConfig {
  label: string;
  badgeClass: string;
  dotClass: string;
}

export const PRIORITY_MAP: Record<string, PriorityConfig> = {
  LOW: {
    label: "Düşük",
    badgeClass: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    dotClass: "bg-zinc-400",
  },
  NORMAL: {
    label: "Normal",
    badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    dotClass: "bg-sky-400",
  },
  HIGH: {
    label: "Yüksek",
    badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    dotClass: "bg-orange-400",
  },
  URGENT: {
    label: "Acil",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
    dotClass: "bg-red-400",
  },
};

export const CATEGORIES = [
  "Website",
  "E-Commerce",
  "Social Media",
  "Graphic Design",
  "Video",
  "Advertising",
  "Catalog / Product",
  "Technical Support",
  "Automation",
  "Other",
] as const;
