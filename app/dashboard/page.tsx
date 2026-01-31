"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useInfiniteEmailHistory } from "@/hooks/useInfiniteEmailHistory";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  useHoveredEmailId,
  useSetHoveredEmailId,
  useCopiedEmailId,
  useSetCopiedEmailId,
  useHasHydrated,
} from "@/stores/ui-store";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, Loader2, ChevronDown, Trash2 } from "lucide-react";
import { QueueStatus } from "@/components/QueueStatus";
import { getAuthToken } from "@/lib/api/client";
import { useEmailExport } from "@/hooks/useEmailExport";
import { useEmailDiscard } from "@/hooks/useEmailDiscard";
import { FadeIn } from "@/components/motion/FadeIn";
import { ScaleIn } from "@/components/motion/ScaleIn";
import { SlideIn } from "@/components/motion/SlideIn";

export default function DashboardPage() {
  const { user, loading, supabaseReady } = useAuth();

  // Wait for Zustand stores to hydrate
  const uiHydrated = useHasHydrated();

  // Dev-only: trigger a token fetch once auth is ready so ApiClient logs the JWT
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!supabaseReady || loading) return;

    try {
      const token = getAuthToken();
      console.log("[Dashboard] getAuthToken() length:", token.length);
      console.log("[Dashboard] JWT token:", token);
    } catch (error) {
      console.error("[Dashboard] getAuthToken() failed:", error);
    }
  }, [supabaseReady, loading]);

  // Email history with React Query infinite pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteEmailHistory();

  // Flatten all pages into a single array
  const emailHistory = data?.pages.flatMap(page => page) ?? [];

  // Fetch user profile for generation_count
  const { data: userProfile } = useQuery({
    queryKey: queryKeys.user.profile(),
    queryFn: ({ signal }) => api.template.getUserProfile({ signal }),
    enabled: !!user?.uid && supabaseReady,
    staleTime: 30000,
  });

  // Email export functionality
  const { isExporting, error, exportEmails } = useEmailExport();

  // Email discard functionality
  const { mutate: discardEmail } = useEmailDiscard({
    onSuccess: (data) => {
      console.log(`Email ${data.displayed ? 'restored' : 'discarded'}`);
    },
    onError: (error) => {
      console.error('Failed to discard email:', error);
    },
  });

  // Track which email is being discarded
  const [discardingEmailId, setDiscardingEmailId] = useState<string | null>(null);

  // UI state from Zustand
  const hoveredEmailId = useHoveredEmailId();
  const setHoveredEmailId = useSetHoveredEmailId();
  const copiedEmailId = useCopiedEmailId();
  const setCopiedEmailId = useSetCopiedEmailId();

  // Derived state
  const totalEmailsGenerated = userProfile?.generation_count ?? 0;

  // Wait for stores to hydrate before rendering
  if (!uiHydrated) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-gray-900 border-r-transparent mb-4"></div>
            <p className="text-gray-500 font-medium">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50/50 pb-12">
          <Navbar />
          
          <main className="max-w-7xl mx-auto pt-24 px-4 sm:px-6 lg:px-8">
            <FadeIn>
              {/* Welcome Section */}
              <div className="py-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                  Welcome back, {user?.displayName || "Guest"}
                </h1>
                <p className="text-gray-500 text-lg">
                  Overview of your email generation activity.
                </p>
              </div>

              {/* Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <ScaleIn delay={0.1}>
                  <Card className="h-full border-none shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">
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
                        className="h-4 w-4 text-gray-400"
                      >
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">{totalEmailsGenerated}</div>
                      <p className="text-xs text-gray-400 mt-1">
                        Lifetime total
                      </p>
                    </CardContent>
                  </Card>
                </ScaleIn>

                <ScaleIn delay={0.2}>
                  <Card className="h-full border-none shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.1)] transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">
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
                        className="h-4 w-4 text-gray-400"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gray-900">Free</div>
                      <p className="text-xs text-gray-400 mt-1">
                        Current plan
                      </p>
                    </CardContent>
                  </Card>
                </ScaleIn>

                <ScaleIn delay={0.3}>
                  <QueueStatus />
                </ScaleIn>
              </div>
            </FadeIn>
            
            {/* Email History Section */}
            <SlideIn delay={0.4} className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Email History</h2>
                <Button
                  onClick={exportEmails}
                  disabled={isExporting || emailHistory.length === 0}
                  variant="outline"
                  size="sm"
                  className="bg-white"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Excel
                    </>
                  )}
                </Button>
              </div>

              {/* Error display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Card className="border-none shadow-[0_2px_10px_-2px_rgba(0,0,0,0.1)] overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[12%]">
                            Recipient
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[12%]">
                            Interest
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[8%]">
                            Type
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[10%]">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[58%]">
                            Content
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-50">
                        {emailHistory.length > 0 ? (
                          emailHistory.map((email) => (
                            <tr
                              key={email.id}
                              className="hover:bg-gray-50/80 transition-colors duration-150"
                              onMouseEnter={() => setHoveredEmailId(email.id)}
                              onMouseLeave={() => setHoveredEmailId(null)}
                            >
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 align-top">
                                <div className="max-w-xs wrap-break-word">
                                  {email.recipient_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 align-top">
                                <div className="max-w-xs wrap-break-word">
                                  {email.recipient_interest}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 capitalize border border-purple-100">
                                  {email.template_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm align-top">
                                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${
                                  email.is_confident
                                    ? 'bg-green-50 text-green-700 border-green-100'
                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                }`}>
                                  {email.is_confident ? 'Confident' : 'Draft'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 relative group">
                                <div className="max-w-full">
                                  <div>
                                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-600">
                                      {email.email_message || "No content"}
                                    </pre>
                                  </div>
                                  <div className={`absolute top-2 right-4 flex gap-2 transition-opacity duration-200 ${hoveredEmailId === email.id ? 'opacity-100' : 'opacity-0'}`}>
                                    {/* Discard Button */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 bg-white shadow-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                                      onClick={() => {
                                        setDiscardingEmailId(email.id);
                                        discardEmail(
                                          { emailId: email.id, displayed: false },
                                          {
                                            onSettled: () => setDiscardingEmailId(null),
                                          }
                                        );
                                      }}
                                      disabled={discardingEmailId === email.id}
                                    >
                                      {discardingEmailId === email.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
                                    </Button>

                                    {/* Copy Button */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 bg-white shadow-xs hover:bg-gray-50 hover:text-gray-900"
                                      onClick={async () => {
                                        if (email.email_message) {
                                          await navigator.clipboard.writeText(email.email_message);
                                          setCopiedEmailId(email.id);
                                          setTimeout(() => setCopiedEmailId(null), 2000);
                                        }
                                      }}
                                    >
                                      {copiedEmailId === email.id ? (
                                        <Check className="h-3.5 w-3.5" />
                                      ) : (
                                        <Copy className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <div className="p-3 bg-gray-100 rounded-full">
                                  <Download className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="font-medium text-gray-900">No emails yet</p>
                                <p className="text-gray-400">Generate your first email to see it here.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Load More Button */}
                  {hasNextPage && (
                    <div className="p-6 border-t border-gray-100 flex justify-center bg-gray-50/30">
                      <Button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        variant="outline"
                        size="lg"
                        className="group relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-lg bg-white border-gray-200"
                      >
                        <span className={`flex items-center gap-2 transition-all duration-300 ${
                          isFetchingNextPage ? 'opacity-0' : 'opacity-100'
                        }`}>
                          Load More Emails
                          <ChevronDown className="h-4 w-4 text-gray-400 group-hover:translate-y-0.5 transition-transform" />
                        </span>

                        {isFetchingNextPage && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                          </span>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* End of emails indicator */}
                  {!hasNextPage && emailHistory.length > 0 && (
                    <div className="p-4 text-center text-xs text-gray-400 border-t border-gray-100 bg-gray-50/30">
                      All emails loaded
                    </div>
                  )}
                </CardContent>
              </Card>
            </SlideIn>
          </main>
      </div>
    </ProtectedRoute>
  );
}
