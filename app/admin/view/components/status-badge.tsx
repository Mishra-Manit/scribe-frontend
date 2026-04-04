"use client";

import { cn } from "@/lib/utils";

type Status = "pending" | "processing" | "completed" | "failed" | string;

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const STATUS_CONFIG: Record<string, { dot: string; text: string; bg: string }> = {
  completed: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
  },
  failed: {
    dot: "bg-red-400",
    text: "text-red-400",
    bg: "bg-red-400/10 border-red-400/20",
  },
  pending: {
    dot: "bg-amber-400 animate-pulse",
    text: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
  },
  processing: {
    dot: "bg-cyan-400 animate-pulse",
    text: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
  },
};

const STEP_COLORS: Record<string, string> = {
  template_parser: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  web_scraper: "bg-sky-400/10 text-sky-400 border-sky-400/20",
  arxiv_helper: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20",
  email_composer: "bg-indigo-400/10 text-indigo-400 border-indigo-400/20",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    dot: "bg-zinc-500",
    text: "text-zinc-400",
    bg: "bg-zinc-400/10 border-zinc-400/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dot)} />
      {status}
    </span>
  );
}

export function StepBadge({ step, className }: { step: string; className?: string }) {
  const colorClass =
    STEP_COLORS[step] ?? "bg-zinc-400/10 text-zinc-400 border-zinc-400/20";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border",
        colorClass,
        className
      )}
    >
      {step.replace(/_/g, " ")}
    </span>
  );
}
