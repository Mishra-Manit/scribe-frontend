"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AdminError } from "@/lib/api/admin";
import { StepBadge } from "./status-badge";

function ErrorEntry({ item, index }: { item: AdminError; index: number }) {
  const time = new Date(item.created_at);
  const timeStr = time.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dateStr = time.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const msg = item.error_message ?? "unknown error";
  const preview = msg.length > 90 ? msg.slice(0, 90) + "…" : msg;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.6 + index * 0.04 }}
      className="px-4 py-3 border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0">
          <span className="text-sm font-medium text-foreground truncate block">
            {item.user_display_name ?? item.user_email.split("@")[0]}
          </span>
          <span className="text-xs text-muted-foreground truncate block">
            {item.user_email}
          </span>
        </div>
        <div className="text-right shrink-0">
          <span className="text-xs font-mono text-muted-foreground block">{timeStr}</span>
          <span className="text-xs font-mono text-muted-foreground/50 block">{dateStr}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs text-muted-foreground">
          {item.recipient_name}
        </span>
        {item.current_step && (
          <>
            <span className="text-border">·</span>
            <StepBadge step={item.current_step} />
          </>
        )}
      </div>

      <p className="text-xs font-mono text-destructive/70 dark:text-red-400/80 leading-relaxed break-all">
        {preview}
      </p>
    </motion.div>
  );
}

export function ErrorLog({ errors }: { errors: AdminError[] }) {
  const hasErrors = errors.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Error Log
          </p>
          {hasErrors && (
            <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse shrink-0" />
          )}
        </div>
        <span className="text-xs text-muted-foreground/50 font-mono">
          {errors.length} {errors.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      <div
        className={cn(
          "rounded-xl border overflow-hidden h-[320px] flex flex-col",
          hasErrors
            ? "border-destructive/20 bg-destructive/[0.02]"
            : "border-border/50 bg-card"
        )}
      >
        {!hasErrors ? (
          <div className="px-4 py-10 text-center">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mx-auto mb-3" />
            <p className="text-xs font-mono text-muted-foreground/50">no errors recorded</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {errors.map((item, i) => (
              <ErrorEntry key={item.id} item={item} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

export function ErrorLogSkeleton() {
  return (
    <section>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
        Error Log
      </p>
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden animate-pulse h-[320px]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-border/40">
            <div className="flex justify-between mb-2">
              <div className="h-3 w-24 rounded bg-muted" />
              <div className="h-2.5 w-16 rounded bg-muted/60" />
            </div>
            <div className="h-2.5 w-16 rounded bg-muted/60 mb-2" />
            <div className="h-2.5 w-full rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </section>
  );
}
