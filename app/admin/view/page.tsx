"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { adminApi } from "@/lib/api/admin";
import { AuthenticationError } from "@/lib/api/errors";
import type { AdminOverview, AdminUser, AdminActivity, AdminError } from "@/lib/api/admin";
import { KpiCards, KpiCardsSkeleton } from "./components/kpi-cards";
import { UserTable, UserTableSkeleton } from "./components/user-table";
import { ActivityChart, ActivityChartSkeleton } from "./components/activity-chart";
import { ErrorLog, ErrorLogSkeleton } from "./components/error-log";

interface AdminData {
  overview: AdminOverview;
  users: AdminUser[];
  activity: AdminActivity[];
  errors: AdminError[];
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <KpiCardsSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ActivityChartSkeleton />
        </div>
        <div className="lg:col-span-2">
          <ErrorLogSkeleton />
        </div>
      </div>
      <UserTableSkeleton />
    </div>
  );
}

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="inline-block w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary/60 animate-spin mb-4" />
        <p className="text-xs font-mono text-muted-foreground">verifying access</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-xs">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-5 h-5 text-destructive" />
        </div>
        <h2 className="text-sm font-semibold text-foreground mb-1.5">Access Denied</h2>
        <p className="text-xs text-muted-foreground mb-6">
          You do not have permission to view this page.
        </p>
        <button
          onClick={() => router.replace("/dashboard")}
          className="px-4 py-1.5 rounded-lg text-xs bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function AdminViewPage() {
  const { user, loading: authLoading } = useAuth();

  const [data, setData] = useState<AdminData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  // Prevent re-fetching on tab focus / auth token refresh
  const hasFetchedRef = useRef(false);

  const loadData = useCallback(async () => {
    setFetching(true);
    setFetchError(null);
    try {
      const [overview, users, activity, errors] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getUsers(),
        adminApi.getActivity(),
        adminApi.getErrors(),
      ]);
      setData({ overview, users, activity, errors });
    } catch (e: unknown) {
      if (e instanceof AuthenticationError) {
        setAccessDenied(true);
      } else {
        setFetchError(e instanceof Error ? e.message : "Failed to load admin data.");
      }
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadData();
    }
  }, [authLoading, user, loadData]);

  if (authLoading) return <AuthLoading />;
  if (!user) return <AuthLoading />;
  if (accessDenied) return <AccessDenied />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-12 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-foreground tracking-tight">
              Admin
            </span>
            <span className="text-border">·</span>
            <span className="text-xs text-muted-foreground">Scribe internal</span>
            <div className="flex items-center gap-1.5 ml-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={loadData}
              disabled={fetching}
              aria-label="Refresh data"
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs border border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-all duration-200"
            >
              <RefreshCw className={`w-3 h-3 ${fetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1440px] mx-auto px-6 lg:px-12 py-8">
        {fetchError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3"
          >
            <p className="text-xs text-destructive">{fetchError}</p>
            <button
              onClick={loadData}
              className="text-xs text-destructive hover:text-destructive/70 transition-colors ml-4 shrink-0"
            >
              Retry
            </button>
          </motion.div>
        )}

        {fetching || !data ? (
          <PageSkeleton />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <KpiCards overview={data.overview} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
              <div className="lg:col-span-3 h-full">
                <ActivityChart data={data.activity} />
              </div>
              <div className="lg:col-span-2 h-full">
                <ErrorLog errors={data.errors} />
              </div>
            </div>

            <UserTable users={data.users} />
          </motion.div>
        )}
      </main>
    </div>
  );
}
