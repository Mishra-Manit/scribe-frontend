"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../context/AuthContextProvider";
import { Hero } from "@/components/landing/hero";
import { LandingHeader } from "@/components/landing/header";

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const redirectParam = searchParams.get("redirect");
  const redirectPath = getSafeRedirectPath(redirectParam);

  React.useEffect(() => {
    if (user) {
      router.replace(redirectPath);
    }
  }, [user, router, redirectPath]);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
            redirectPath
          )}`,
        },
      });

      if (error) {
        console.error("Error signing in with Google: ", error);
      }
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <LandingHeader onSignIn={loginWithGoogle} />
      <Hero onGetStarted={loginWithGoogle} />
    </div>
  );
}

function getSafeRedirectPath(redirectParam: string | null) {
  if (!redirectParam) return "/dashboard";
  if (redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
    return redirectParam;
  }
  return "/dashboard";
}
