import React from "react";
import { STATUS_MAP } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({ status, showDot = true, className = "" }: StatusBadgeProps) {
  const config = STATUS_MAP[status] || {
    label: status,
    description: "",
    badgeClass: "bg-zinc-800 text-zinc-300 border-zinc-700",
    dotClass: "bg-zinc-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${config.badgeClass} tracking-wide ${className}`}
      title={config.description}
    >
      {showDot && <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />}
      <span>{config.label}</span>
    </span>
  );
}
