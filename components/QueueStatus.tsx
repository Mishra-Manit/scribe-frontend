/**
 * Queue Status Component
 * Displays queue processing status from server data
 */

"use client";

import { useQueueManager } from "@/hooks/useQueueManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function QueueStatus({ className }: { className?: string }) {
  const {
    currentItem,
    pendingCount,
    processingCount,
    completedCount,
    failedCount,
  } = useQueueManager();

  const isProcessing = processingCount > 0;

  return (
    <Card className={cn(
      "h-full border-border/50 bg-card shadow-sm hover:shadow-md transition-all duration-300",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Emails in Queue
          </CardTitle>
          <span className="text-xs text-primary flex items-center gap-1">
            {isProcessing && currentItem ? (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                {currentItem.current_step?.replace(/_/g, ' ') || 'Processing...'}
              </>
            ) : pendingCount > 0 ? (
              '• In queue'
            ) : (
              <span className="text-muted-foreground">• Ready</span>
            )}
          </span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="h-4 w-4 text-muted-foreground"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </CardHeader>
      <CardContent>
        {/* Dual Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>

        {/* Failed Count - Only Shown When > 0 */}
        {failedCount > 0 && (
          <div className="mt-2">
            <p className="text-xs text-destructive">Failed: {failedCount}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
