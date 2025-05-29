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

  /* 1) still checking → render nothing (or a spinner)
     2) unauthenticated → the effect above will fire
     3) authenticated → render the protected page */
  if (loading || !user) return null;

  return <>{children}</>;
}
