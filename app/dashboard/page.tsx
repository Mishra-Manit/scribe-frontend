"use client";

import { useAuth } from "@/hooks/use-auth";
import { useEmailHistory } from "@/hooks/queries/useEmailHistory";
import { useTaskStatus } from "@/hooks/queries/useTaskStatus";
import {
  useHoveredEmailId,
  useSetHoveredEmailId,
  useCopiedEmailId,
  useSetCopiedEmailId,
  useHasHydrated,
} from "@/stores/ui-store";
import {
  usePendingCount,
  useProcessingCount,
  useQueueHasHydrated,
  useCurrentProcessingItem,
} from "@/stores/queue-store";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  // Wait for Zustand stores to hydrate
  const queueHydrated = useQueueHasHydrated();
  const uiHydrated = useHasHydrated();
  const storesReady = queueHydrated && uiHydrated;

  // Email history with React Query (replaces manual polling)
  const {
    data: emailHistory = [],
    isLoading: emailsLoading,
    error: emailsError,
  } = useEmailHistory();

  // Queue processor now runs in dashboard layout (app/dashboard/layout.tsx)
  // This ensures it runs across all dashboard pages, not just this one

  // Get current processing item to show step status
  const currentProcessingItem = useCurrentProcessingItem();
  const { data: currentTaskStatus } = useTaskStatus({
    taskId: currentProcessingItem?.taskId || null,
  });

  // UI state from Zustand (replaces useState)
  const hoveredEmailId = useHoveredEmailId();
  const setHoveredEmailId = useSetHoveredEmailId();
  const copiedEmailId = useCopiedEmailId();
  const setCopiedEmailId = useSetCopiedEmailId();

  // Queue state
  const pendingCount = usePendingCount();
  const processingCount = useProcessingCount();

  // Derived state
  const emailCount = emailHistory.length;
  const queueCount = pendingCount + processingCount;

  // Wait for stores to hydrate before rendering
  if (!storesReady) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
          <Navbar />
          
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {/* Welcome Section */}
            <div className="px-4 py-6 sm:px-0">
              <div className="border-4 border-dashed border-gray-200 rounded-lg p-6 bg-white">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Welcome back, {user?.displayName || "Guest"}!
                </h1>
                <p className="text-gray-600">
                  Ready to generate some cold emails? Let&apos;s get started.
                </p>
              </div>
            </div>

            {/* Stats Section */}
            <div className="px-4 py-6 sm:px-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Emails Generated
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
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{emailCount}</div>
                    <p className="text-xs text-muted-foreground">
                      Lifetime total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Account Type
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">Free</div>
                    <p className="text-xs text-muted-foreground">
                      Current plan
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Status
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
                    {queueCount > 0 ? (
                      <>
                        <div className="text-2xl font-bold text-yellow-600">Generating...</div>
                        <p className="text-xs text-muted-foreground">
                          {queueCount} emails in queue
                        </p>
                        {currentTaskStatus?.result?.current_step && (
                          <p className="text-xs text-gray-600 mt-1">
                            Step: {currentTaskStatus.result.current_step.replace(/_/g, ' ')}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="text-2xl font-bold text-green-600">All emails generated</div>
                        <p className="text-xs text-muted-foreground">
                          Queue is empty
                        </p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Email History Section */}
            <div className="px-4 py-6 sm:px-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Email History</h2>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                            Recipient Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[15%]">
                            Interest/Field
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[10%]">
                            Template Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[60%]">
                            Email Content
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {emailHistory.length > 0 ? (
                          emailHistory.map((email) => (
                            <tr
                              key={email.id}
                              className="hover:bg-gray-50"
                              onMouseEnter={() => setHoveredEmailId(email.id)}
                              onMouseLeave={() => setHoveredEmailId(null)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 align-top">
                                {email.recipient_name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                <div className="max-w-xs break-words">
                                  {email.recipient_interest}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 capitalize">
                                  {email.template_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 relative">
                                <div className="max-w-full">
                                  <pre className="whitespace-pre-wrap font-sans">
                                    {email.email_message || "No content"}
                                  </pre>
                                  {hoveredEmailId === email.id && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="absolute top-4 right-4 shadow-lg"
                                      onClick={async () => {
                                        if (email.email_message) {
                                          await navigator.clipboard.writeText(email.email_message);
                                          setCopiedEmailId(email.id);
                                          setTimeout(() => setCopiedEmailId(null), 2000);
                                        }
                                      }}
                                    >
                                      {copiedEmailId === email.id ? (
                                        <>
                                          <Check className="h-4 w-4 mr-1" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="h-4 w-4 mr-1" />
                                          Copy
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                              No email history found. Generate some emails to see them here!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    </ProtectedRoute>
  );
}