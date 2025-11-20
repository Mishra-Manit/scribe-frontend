"use client";
import { useRouter } from "next/navigation"
import React from "react"
import { supabase } from "../config/supabase"
import { useAuth } from "../context/AuthContextProvider"

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  // Temporary helper: log the user's access token for backend testing.
  React.useEffect(() => {
    if (!user) return;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to retrieve Supabase session", error);
          return;
        }

        const token = data.session?.access_token;
        if (token) {
          console.log("Supabase JWT:", token);
        } else {
          console.warn("No active Supabase session found to extract a JWT.");
        }
      })
      .catch((err) => {
        console.error("Unexpected error while fetching Supabase session", err);
      });
  }, [user]);

  const loginWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        }
      });

      if (error) {
        console.error("Error signing in with Google: ", error);
      }
      // Note: After successful OAuth, AuthContextProvider will handle user initialization
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black bg-grid-pattern">
      <div className="text-center px-4 max-w-3xl">
        <div className="inline-block mb-12">
          <h1 className="text-white text-5xl md:text-6xl font-bold">
            <span className="bg-white text-black px-2">scribe</span>.com
          </h1>
        </div>

        <p className="text-white/90 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
          Your next research position is an email away.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={loginWithGoogle}
            className="inline-flex items-center justify-between px-6 py-3 border border-white text-white hover:bg-white/10 transition-colors"
          >
            Sign in
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-2"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </button>

          <button
            onClick={loginWithGoogle}
            className="inline-flex items-center justify-between px-6 py-3 bg-white text-black hover:bg-white/90 transition-colors"
          >
            Sign Up
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-2"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
