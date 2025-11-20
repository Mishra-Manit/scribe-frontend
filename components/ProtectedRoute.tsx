// components/ProtectedRoute.tsx
"use client";

import { useAuth } from "@/context/AuthContextProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  /* redirect once we know the auth state */
  useEffect(() => {
    if (!loading && !user) router.replace("/"); // or "/login"
  }, [user, loading, router]);

  // Timeout safeguard - if loading takes longer than 15 seconds, show error
  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        setTimedOut(true);
      }, 15000); // 15 seconds

      return () => clearTimeout(timeoutId);
    } else {
      setTimedOut(false);
    }
  }, [loading]);

  // Show timeout error with refresh option
  if (timedOut && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 mb-4">
            <svg
              className="h-12 w-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Loading Timeout
          </h2>
          <p className="text-gray-600 mb-4">
            Authentication is taking longer than expected. Please try refreshing
            the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  /* 1) still checking → show loading spinner
     2) unauthenticated → the effect above will fire
     3) authenticated → render the protected page */
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent mb-4"></div>
          <p className="text-white/70 text-sm">
            {loading ? "Authenticating..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
