import React from "react";
import Link from "next/link";
import { StatusBadge } from "./StatusBadge";
import { PriorityBadge } from "./PriorityBadge";
import { formatTicketNumber, formatRelativeTime } from "@/lib/utils";
import { MessageSquare, Paperclip, Building2, User } from "lucide-react";

export interface TicketListItem {
  id: string;
  ticketNumber: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  createdBy: {
    id: string;
    fullName: string;
    email: string;
  };
  assignedTo?: {
    id: string;
    fullName: string;
  } | null;
  _count?: {
    comments: number;
    attachments: number;
  };
}

interface TicketCardProps {
  ticket: TicketListItem;
}

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block rounded-3xl bg-[#0c1117]/85 border border-white/[0.08] hover:border-sky-500/35 hover:bg-[#141a24]/90 transition-all p-6 shadow-md hover:shadow-xl hover:shadow-black/40 group backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-4 mb-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-lg border border-sky-500/25">
            {formatTicketNumber(ticket.ticketNumber)}
          </span>

          <span className="flex items-center gap-1.5 text-xs text-zinc-300 bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/[0.08] font-medium">
            <Building2 className="w-3.5 h-3.5 text-zinc-400" />
            <span>{ticket.organization.name}</span>
          </span>

          <span className="text-xs text-zinc-400 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.05]">
            {ticket.category}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1 mb-2">
        {ticket.title}
      </h3>

      <p className="text-sm text-zinc-300/90 line-clamp-2 mb-5 leading-relaxed">
        {ticket.description}
      </p>

      <div className="flex items-center justify-between text-xs text-zinc-400 pt-3.5 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <User className="w-4 h-4 text-zinc-500" />
          <span className="text-zinc-200 font-semibold">{ticket.createdBy.fullName}</span>
          <span>•</span>
          <span>{formatRelativeTime(ticket.createdAt)}</span>
        </div>

        <div className="flex items-center gap-3.5">
          {ticket._count && ticket._count.attachments > 0 && (
            <span className="flex items-center gap-1 text-zinc-400 font-medium">
              <Paperclip className="w-4 h-4 text-zinc-500" />
              <span>{ticket._count.attachments}</span>
            </span>
          )}

          {ticket._count && ticket._count.comments > 0 && (
            <span className="flex items-center gap-1 text-zinc-400 font-medium">
              <MessageSquare className="w-4 h-4 text-zinc-500" />
              <span>{ticket._count.comments}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
