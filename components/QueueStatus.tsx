/**
 * Queue Status Component
 * Simple, clean display of queue processing status
 */

"use client";

import { useQueueState } from "@/hooks/useQueueState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QueueStatus() {
  const {
    currentTaskStatus,
    pendingCount,
    isProcessing,
    completedCount,
    failedCount,
  } = useQueueState();
  
  // Determine status message
  const getStatusMessage = () => {
    if (isProcessing && currentTaskStatus) {
      const step = currentTaskStatus.result?.current_step;
      return {
        title: "Generating Email",
        subtitle: step ? `Step: ${step.replace(/_/g, ' ')}` : "Processing...",
        color: "text-blue-600",
      };
    }
    
    if (pendingCount > 0) {
      return {
        title: "Queue Active",
        subtitle: `${pendingCount} email${pendingCount > 1 ? 's' : ''} waiting`,
        color: "text-yellow-600",
      };
    }
    
    return {
      title: "Queue Empty",
      subtitle: "Ready to generate emails",
      color: "text-green-600",
    };
  };
  
  const status = getStatusMessage();
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Queue Status
        </CardTitle>
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
        <div className={`text-2xl font-bold ${status.color}`}>
          {status.title}
        </div>
        <p className="text-xs text-muted-foreground">
          {status.subtitle}
        </p>
        {(completedCount > 0 || failedCount > 0) && (
          <div className="mt-2 text-xs text-gray-500">
            {completedCount > 0 && <span className="mr-3">✓ {completedCount} completed</span>}
            {failedCount > 0 && <span>✗ {failedCount} failed</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
