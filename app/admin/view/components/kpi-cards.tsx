"use client";

import { motion } from "framer-motion";
import {
  Users,
  Mail,
  Clock,
  FileText,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminOverview } from "@/lib/api/admin";

const EASE = [0.21, 0.47, 0.32, 0.98] as const;

function HeroMetric({
  label,
  value,
  sub,
  accentLeft = false,
  index,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accentLeft?: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: EASE }}
      className="relative rounded-xl border border-border/50 bg-card p-6 overflow-hidden hover:border-border hover:bg-muted/20 transition-all duration-300"
    >
      {accentLeft && (
        <div className="absolute left-0 inset-y-0 w-[2px] bg-foreground/40 rounded-l-xl" />
      )}
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
        {label}
      </p>
      <div className="font-mono text-[2.5rem] font-semibold tracking-tight text-foreground tabular-nums leading-none">
        {value}
      </div>
      {sub && (
        <p className="mt-2 text-xs text-muted-foreground/60">{sub}</p>
      )}
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  index,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.28 + index * 0.045, ease: EASE }}
      className="rounded-xl border border-border/40 bg-card px-4 py-3.5 hover:border-border/70 hover:bg-muted/20 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("w-3.5 h-3.5", colorClass)} />
      </div>
      <div className={cn("font-mono text-xl font-semibold tabular-nums leading-none", colorClass)}>
        {value}
      </div>
    </motion.div>
  );
}

export function KpiCards({ overview }: { overview: AdminOverview }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <HeroMetric
          label="Emails this week"
          value={overview.emails_this_week.toLocaleString()}
          sub="rolling 7 days"
          accentLeft
          index={0}
        />
        <HeroMetric
          label="Success rate"
          value={`${overview.success_rate.toFixed(1)}%`}
          sub="completed / total queue"
          index={1}
        />
        <HeroMetric
          label="Active users this week"
          value={overview.active_users_this_week.toLocaleString()}
          sub="unique users"
          index={2}
        />
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <StatCard
          label="Total emails"
          value={overview.total_emails.toLocaleString()}
          icon={Mail}
          colorClass="text-foreground"
          index={0}
        />
        <StatCard
          label="Total users"
          value={overview.total_users.toLocaleString()}
          icon={Users}
          colorClass="text-foreground"
          index={1}
        />
        <StatCard
          label="Avg gen time"
          value={`${overview.avg_gen_time_seconds.toFixed(1)}s`}
          icon={Clock}
          colorClass="text-amber-500 dark:text-amber-400"
          index={2}
        />
        <StatCard
          label="Confidence"
          value={`${overview.confidence_rate.toFixed(1)}%`}
          icon={Sparkles}
          colorClass="text-indigo-500 dark:text-indigo-400"
          index={3}
        />
        <StatCard
          label="Templates"
          value={overview.total_templates.toLocaleString()}
          icon={FileText}
          colorClass="text-foreground"
          index={4}
        />
        <StatCard
          label="Errors"
          value={overview.error_count.toLocaleString()}
          icon={AlertTriangle}
          colorClass={overview.error_count > 0 ? "text-destructive dark:text-red-400" : "text-muted-foreground/40"}
          index={5}
        />
      </div>
    </div>
  );
}

export function KpiCardsSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/50 bg-card p-6"
          >
            <div className="h-2.5 w-24 rounded bg-muted mb-4" />
            <div className="h-10 w-20 rounded bg-muted" />
            <div className="h-2 w-32 rounded bg-muted/60 mt-3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-card px-4 py-3.5"
          >
            <div className="h-2 w-14 rounded bg-muted mb-3" />
            <div className="h-5 w-10 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
