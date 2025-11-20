// components/ProtectedRoute.tsx
"use client";

import { useAuth } from "@/context/AuthContextProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  /* redirect once we know the auth state */
  useEffect(() => {
    if (!loading && !user) router.replace("/"); // or "/login"
  }, [user, loading, router]);

  /* 1) still checking → show loading spinner
     2) unauthenticated → the effect above will fire
     3) authenticated → render the protected page */
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent mb-4"></div>
          <p className="text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
