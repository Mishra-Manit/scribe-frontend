"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminUser } from "@/lib/api/admin";
import { UserDetail } from "./user-detail";

type SortField = "created_at" | "actual_email_count";
type SortDir = "asc" | "desc";

const AVATAR_COLORS = [
  "bg-violet-500/15 text-violet-500 dark:text-violet-400",
  "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "bg-rose-500/15 text-rose-500 dark:text-rose-400",
  "bg-indigo-500/15 text-indigo-500 dark:text-indigo-400",
  "bg-sky-500/15 text-sky-600 dark:text-sky-400",
];

function userInitials(user: AdminUser): string {
  if (user.display_name) {
    return user.display_name
      .split(" ")
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return user.email.slice(0, 2).toUpperCase();
}

function userColor(email: string): string {
  const hash = email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function sortUsers(users: AdminUser[], field: SortField, dir: SortDir): AdminUser[] {
  return [...users].sort((a, b) => {
    let aVal: number | string = a[field];
    let bVal: number | string = b[field];

    if (field === "created_at") {
      aVal = new Date(a.created_at).getTime();
      bVal = new Date(b.created_at).getTime();
    }

    if (aVal < bVal) return dir === "asc" ? -1 : 1;
    if (aVal > bVal) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

function SortButton({
  label,
  field,
  active,
  dir,
  onToggle,
}: {
  label: string;
  field: SortField;
  active: boolean;
  dir: SortDir;
  onToggle: (f: SortField) => void;
}) {
  return (
    <button
      onClick={() => onToggle(field)}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-all duration-200",
        active
          ? "bg-muted border-border text-foreground"
          : "bg-transparent border-border/40 text-muted-foreground hover:text-foreground hover:border-border/70"
      )}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )
      ) : (
        <ChevronsUpDown className="w-3 h-3 opacity-30" />
      )}
    </button>
  );
}

export function UserTable({ users }: { users: AdminUser[] }) {
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? users.filter(
          (u) =>
            u.email.toLowerCase().includes(q) ||
            (u.display_name ?? "").toLowerCase().includes(q)
        )
      : users;
    return sortUsers(base, sortField, sortDir);
  }, [users, query, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Users
        </p>
        <span className="text-xs text-muted-foreground/50 font-mono">
          {users.length} total
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search users..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search users"
            className={cn(
              "w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border",
              "bg-background border-border/50 text-foreground",
              "placeholder:text-muted-foreground/40 focus:outline-none focus:border-border focus:ring-1 focus:ring-ring/20",
              "transition-all duration-200"
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground/50 shrink-0 uppercase tracking-wide">
            Sort
          </span>
          <SortButton
            label="Emails"
            field="actual_email_count"
            active={sortField === "actual_email_count"}
            dir={sortDir}
            onToggle={toggleSort}
          />
          <SortButton
            label="Joined"
            field="created_at"
            active={sortField === "created_at"}
            dir={sortDir}
            onToggle={toggleSort}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  User
                </th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">
                  Emails
                </th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium text-right">
                  Templates
                </th>
                <th className="px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  Joined
                </th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-sm text-muted-foreground"
                  >
                    No users match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isExpanded = expandedId === user.id;
                  const initials = userInitials(user);
                  const colorClass = userColor(user.email);

                  return (
                    <React.Fragment key={user.id}>
                      <tr
                        onClick={() => toggleExpand(user.id)}
                        className={cn(
                          "cursor-pointer transition-colors duration-150",
                          isExpanded ? "bg-muted/30" : "hover:bg-muted/20"
                        )}
                        aria-expanded={isExpanded}
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold shrink-0 font-mono",
                                colorClass
                              )}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {user.display_name ?? (
                                  <span className="text-muted-foreground italic font-normal">
                                    unnamed
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-sm tabular-nums text-foreground">
                          {user.actual_email_count}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                          {user.template_count}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground/50">
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        </td>
                      </tr>

                      <AnimatePresence>
                        {isExpanded && (
                          <tr key={`${user.id}-detail`}>
                            <td colSpan={5} className="p-0">
                              <UserDetail user={user} />
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-2 border-t border-border/40 bg-muted/20">
            <span className="text-xs text-muted-foreground/60 font-mono">
              {filtered.length === users.length
                ? `${users.length} users`
                : `${filtered.length} of ${users.length} users`}
            </span>
          </div>
        )}
      </div>
    </motion.section>
  );
}

export function UserTableSkeleton() {
  return (
    <section>
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
        Users
      </p>
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden animate-pulse">
        <div className="px-5 py-3 border-b border-border/50 bg-muted/30 flex gap-4">
          {[60, 40, 30, 50, 60].map((w, i) => (
            <div key={i} className="h-2.5 rounded bg-muted" style={{ width: `${w}px` }} />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-5 py-3 border-b border-border/40 flex items-center gap-4">
            <div className="w-7 h-7 rounded-lg bg-muted shrink-0" />
            <div className="flex-1">
              <div className="h-3.5 w-28 rounded bg-muted mb-1.5" />
              <div className="h-2.5 w-40 rounded bg-muted/60" />
            </div>
            <div className="h-3 w-6 rounded bg-muted/60" />
            <div className="h-3 w-6 rounded bg-muted/60" />
            <div className="h-3 w-6 rounded bg-muted/60" />
            <div className="h-2.5 w-20 rounded bg-muted/40" />
          </div>
        ))}
      </div>
    </section>
  );
}
