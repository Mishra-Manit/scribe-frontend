"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import type { AdminActivity } from "@/lib/api/admin";

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/60 bg-popover backdrop-blur-sm px-4 py-3 text-xs shadow-lg">
      <p className="font-mono text-muted-foreground text-xs mb-2 tracking-wide">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2.5 mb-1 last:mb-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-muted-foreground capitalize">
            {entry.dataKey === "emails_generated" ? "emails" : "users"}
          </span>
          <span className="font-mono font-semibold text-foreground tabular-nums ml-auto pl-4">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-5 mb-5">
      <div className="flex items-center gap-2">
        <span className="w-3 h-[2px] rounded-full bg-foreground/70 inline-block" />
        <span className="text-xs text-muted-foreground">emails generated</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-[2px] rounded-full bg-indigo-400 inline-block" />
        <span className="text-xs text-muted-foreground">active users</span>
      </div>
    </div>
  );
}

export function ActivityChart({ data }: { data: AdminActivity[] }) {
  const chartData = data.map((row) => {
    try {
      return {
        ...row,
        week: new Date(row.week).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    } catch {
      return row;
    }
  });

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.55, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Weekly Activity
        </p>
        <span className="text-xs text-muted-foreground/50 font-mono">
          {chartData.length}w
        </span>
      </div>

      <div className="rounded-xl border border-border/50 bg-card p-5 h-[320px] flex flex-col">
        <Legend />
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 2, right: 4, left: -20, bottom: 0 }}
            barCategoryGap="32%"
            barGap={3}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              stroke="currentColor"
              className="text-border/40"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 11,
                fontFamily: "var(--font-geist-mono)",
              }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis
              tick={{
                fill: "hsl(var(--muted-foreground))",
                fontSize: 11,
                fontFamily: "var(--font-geist-mono)",
              }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "currentColor", className: "text-muted/30 rounded" }}
            />
            <Bar
              dataKey="emails_generated"
              fill="hsl(var(--foreground))"
              radius={[3, 3, 0, 0]}
              opacity={0.7}
            />
            <Bar
              dataKey="active_users"
              fill="hsl(239 84% 67%)"
              radius={[3, 3, 0, 0]}
              opacity={0.65}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.section>
  );
}

export function ActivityChartSkeleton() {
  return (
    <section>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
        Weekly Activity
      </p>
      <div className="rounded-xl border border-border/50 bg-card p-5 h-[320px] animate-pulse">
        <div className="flex items-end gap-2 h-full pb-8 pt-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex-1 flex gap-1 items-end h-full">
              <div
                className="flex-1 rounded-t-sm bg-muted"
                style={{ height: `${25 + Math.random() * 55}%` }}
              />
              <div
                className="flex-1 rounded-t-sm bg-muted/60"
                style={{ height: `${15 + Math.random() * 40}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
