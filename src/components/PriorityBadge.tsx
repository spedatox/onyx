import React from "react";
import { PRIORITY_MAP } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const config = PRIORITY_MAP[priority] || {
    label: priority,
    badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
    dotClass: "bg-zinc-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold border ${config.badgeClass} tracking-wide ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  );
}
