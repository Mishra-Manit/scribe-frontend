"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api/admin";
import type {
  AdminUser,
  AdminEmail,
  AdminTemplate,
  AdminQueueItem,
  PaginatedEmails,
} from "@/lib/api/admin";
import { StatusBadge, StepBadge } from "./status-badge";

type TabId = "emails" | "templates" | "queue";

const TABS: { id: TabId; label: string }[] = [
  { id: "emails", label: "Emails" },
  { id: "templates", label: "Templates" },
  { id: "queue", label: "Queue" },
];

function EmailRow({ email }: { email: AdminEmail }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="hover:bg-muted/20 transition-colors cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="px-4 py-3 text-sm text-foreground">{email.recipient_name}</td>
        <td className="px-4 py-3 text-sm text-muted-foreground max-w-[180px] truncate">
          {email.recipient_interest}
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full border",
              email.is_confident
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            )}
          >
            {email.is_confident ? "Confident" : "Draft"}
          </span>
        </td>
        <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
          {new Date(email.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </td>
        <td className="px-4 py-3 text-muted-foreground/50">
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </td>
      </tr>
      <AnimatePresence>
        {open && (
          <tr>
            <td colSpan={5} className="px-0 py-0">
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                {/* Match the main dashboard email display style */}
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground bg-muted/20 border-t border-border/50 px-6 py-5">
                  {email.email_message}
                </pre>
              </motion.div>
            </td>
          </tr>
        )}
      </AnimatePresence>
    </>
  );
}

function EmailsTab({ userId }: { userId: string }) {
  const [data, setData] = useState<PaginatedEmails | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getUserEmails(userId, page, 20)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId, page]);

  if (loading) return <TabSkeleton rows={4} />;
  if (error) return <TabError message={error} />;
  if (!data || data.items.length === 0) return <TabEmpty message="No emails found" />;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/50 bg-muted/20">
              <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Recipient
              </th>
              <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Interest
              </th>
              <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Status
              </th>
              <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Date
              </th>
              <th className="px-4 py-2 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.items.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
          </tbody>
        </table>
      </div>
      {data.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40">
          <span className="text-xs text-muted-foreground font-mono">
            {data.total} total · page {data.page} / {data.pages}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs rounded-md border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className="px-3 py-1 text-xs rounded-md border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatesTab({ userId, emailTemplate }: { userId: string; emailTemplate: string | null }) {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getUserTemplates(userId)
      .then(setTemplates)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <TabSkeleton rows={2} />;
  if (error) return <TabError message={error} />;
  if (templates.length === 0 && !emailTemplate) return <TabEmpty message="No templates found" />;

  return (
    <div className="divide-y divide-border/40">
      {emailTemplate && (
        <div className="px-4 py-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Template
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
              in use
            </span>
          </div>
          <p className="text-xs text-muted-foreground/70 font-mono leading-relaxed whitespace-pre-wrap">
            {emailTemplate}
          </p>
        </div>
      )}
      {templates.map((t) => (
        <div key={t.id} className="px-4 py-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                PDF Template
              </span>
              <span className="text-xs font-mono text-muted-foreground/50">
                {new Date(t.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
            {t.pdf_url && (
              <a
                href={t.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 transition-colors"
              >
                PDF <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          {t.user_instructions && (
            <p className="text-sm text-muted-foreground mb-2 italic">{t.user_instructions}</p>
          )}
          <p className="text-xs text-muted-foreground/60 line-clamp-3 font-mono leading-relaxed">
            {t.template_text}
          </p>
        </div>
      ))}
    </div>
  );
}

function QueueTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<AdminQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    adminApi
      .getUserQueue(userId)
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <TabSkeleton rows={4} />;
  if (error) return <TabError message={error} />;
  if (items.length === 0) return <TabEmpty message="No queue items found" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/50 bg-muted/20">
            <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Recipient
            </th>
            <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Status
            </th>
            <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Step
            </th>
            <th className="px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Created
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-4 py-3 text-sm text-foreground">{item.recipient_name}</td>
              <td className="px-4 py-3">
                <StatusBadge status={item.status} />
              </td>
              <td className="px-4 py-3">
                {item.current_step ? (
                  <StepBadge step={item.current_step} />
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                {new Date(item.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabSkeleton({ rows }: { rows: number }) {
  return (
    <div className="p-4 space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          <div className="h-4 flex-1 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted/60" />
          <div className="h-4 w-16 rounded bg-muted/60" />
        </div>
      ))}
    </div>
  );
}

function TabError({ message }: { message: string }) {
  return (
    <p className="px-4 py-6 text-sm text-destructive/70 text-center">{message}</p>
  );
}

function TabEmpty({ message }: { message: string }) {
  return (
    <p className="px-4 py-6 text-sm text-muted-foreground text-center">{message}</p>
  );
}

export function UserDetail({ user }: { user: AdminUser }) {
  const [activeTab, setActiveTab] = useState<TabId>("emails");

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="border-t border-border/50 bg-muted/10">
        <div className="flex gap-0.5 px-4 pt-2.5 pb-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-3.5 py-1.5 text-xs font-medium rounded-t-md transition-all duration-200",
                activeTab === tab.id
                  ? "text-foreground bg-background border border-b-transparent border-border/50"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="border-t border-border/50 bg-background">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              {activeTab === "emails" && <EmailsTab userId={user.id} />}
              {activeTab === "templates" && <TemplatesTab userId={user.id} emailTemplate={user.email_template} />}
              {activeTab === "queue" && <QueueTab userId={user.id} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
