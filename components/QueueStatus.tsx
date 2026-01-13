/**
 * Queue Status Component
 * Simple, clean display of queue processing status
 */

"use client";

import { useQueueState } from "@/hooks/useQueueState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { cn } from "@/lib/utils";

export function QueueStatus({ className }: { className?: string }) {
  const {
    currentTaskStatus,
    pendingCount,
    isProcessing,
    completedCount,
    failedCount,
  } = useQueueState();

  return (
    <Card className={cn(
      "h-full border-none shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Emails in Queue
          </CardTitle>
          <span className="text-xs text-blue-600 flex items-center gap-1">
            {isProcessing && currentTaskStatus ? (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                {currentTaskStatus.result?.current_step?.replace(/_/g, ' ') || 'Processing...'}
              </>
            ) : pendingCount > 0 ? (
              '• In queue'
            ) : (
              <span className="text-gray-500">• Ready</span>
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
          className="h-4 w-4 text-gray-400"
        >
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </CardHeader>
      <CardContent>
        {/* Dual Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-gray-900">{pendingCount}</div>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
        </div>

        {/* Failed Count - Only Shown When > 0 */}
        {failedCount > 0 && (
          <div className="mt-2">
            <p className="text-xs text-red-600">Failed: {failedCount}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
