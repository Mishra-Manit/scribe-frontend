"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useEmailHistory } from "@/hooks/useEmailHistory";
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
import { Copy, Check, Shield } from "lucide-react";
import { QueueStatus } from "@/components/QueueStatus";
import { supabase } from "@/config/supabase";

export default function DashboardPage() {
  const { user, supabaseReady } = useAuth();

  // Wait for Zustand stores to hydrate
  const uiHydrated = useHasHydrated();

  // Email history with React Query
  const {
    data: emailHistory = [],
  } = useEmailHistory();

  // UI state from Zustand
  const hoveredEmailId = useHoveredEmailId();
  const setHoveredEmailId = useSetHoveredEmailId();
  const copiedEmailId = useCopiedEmailId();
  const setCopiedEmailId = useSetCopiedEmailId();

  // Auth check state
  const [authCheckRunning, setAuthCheckRunning] = useState(false);
  const [authCheckResult, setAuthCheckResult] = useState<string | null>(null);

  // Derived state
  const emailCount = emailHistory.length;

  // Auth check handler
  const handleAuthCheck = async () => {
    setAuthCheckRunning(true);
    setAuthCheckResult(null);

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║ [Dashboard] 🔍 AUTH CHECK BUTTON CLICKED                 ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('[Dashboard] 📊 Initial state:', {
      hasUser: !!user,
      userId: user?.uid,
      userEmail: user?.email,
      supabaseReady,
      timestamp: new Date().toISOString()
    });

    try {
      console.log('[Dashboard] 📡 Calling supabase.auth.getSession()...');
      const startTime = Date.now();

      // Add timeout to match ApiClient behavior
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.log('[Dashboard] ⏱️  Auth check timeout after 5000ms');
          reject(new Error('Auth check timeout after 5000ms'));
        }, 5000);
      });

      const sessionPromise = supabase.auth.getSession();

      const { data, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as Awaited<typeof sessionPromise>;

      const duration = Date.now() - startTime;

      console.log(`[Dashboard] ✅ getSession() completed in ${duration}ms`);
      console.log('[Dashboard] 📊 Session result:', {
        hasSession: !!data?.session,
        hasToken: !!data?.session?.access_token,
        tokenLength: data?.session?.access_token?.length || 0,
        userId: data?.session?.user?.id,
        userEmail: data?.session?.user?.email,
        error: error?.message,
        duration: `${duration}ms`
      });

      if (error) {
        console.error('[Dashboard] ❌ Auth check failed:', error);
        setAuthCheckResult(`❌ Failed: ${error.message}`);
      } else if (!data?.session?.access_token) {
        console.warn('[Dashboard] ⚠️  No auth token found');
        setAuthCheckResult('⚠️  No auth token found');
      } else {
        console.log('[Dashboard] ✅ Auth check successful!');
        setAuthCheckResult(`✅ Success (${duration}ms) - Token: ${data.session.access_token.substring(0, 20)}...`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Dashboard] ❌ Auth check exception:', error);
      setAuthCheckResult(`❌ Exception: ${errorMessage}`);
    } finally {
      console.log('╔═══════════════════════════════════════════════════════════╗\n');
      setAuthCheckRunning(false);
    }
  };

  // Wait for stores to hydrate before rendering
  if (!uiHydrated) {
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

                <QueueStatus />
              </div>
            </div>

            {/* Auth Check Section */}
            <div className="px-4 py-6 sm:px-0">
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Shield className="h-5 w-5" />
                    Authentication Debug
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-blue-800">
                    <p className="mb-2">
                      <strong>Purpose:</strong> This button tests the same Supabase auth flow
                      that the generate button uses. Check the browser console for detailed logs.
                    </p>
                    <p className="mb-4">
                      <strong>Status:</strong> Supabase Ready = {supabaseReady ? '✅ Yes' : '❌ No'}
                    </p>
                  </div>
                  <Button
                    onClick={handleAuthCheck}
                    disabled={authCheckRunning}
                    variant="outline"
                    className="w-full border-blue-300 hover:bg-blue-100"
                  >
                    {authCheckRunning ? (
                      <>
                        <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent mr-2"></div>
                        Running Auth Check...
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Run Auth Check
                      </>
                    )}
                  </Button>
                  {authCheckResult && (
                    <div className={`p-3 rounded-md text-sm font-mono ${
                      authCheckResult.startsWith('✅')
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}>
                      {authCheckResult}
                    </div>
                  )}
                </CardContent>
              </Card>
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