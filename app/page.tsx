"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { supabase } from "../config/supabase";
import { useAuth } from "../context/AuthContextProvider";
import { SHOW_SHUTDOWN_NOTICE } from "@/config/api";
import { ShutdownNotice } from "@/components/ShutdownNotice";
import { FadeIn } from "@/components/motion/FadeIn";
import { ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { user } = useAuth();

  React.useEffect(() => {
    if (SHOW_SHUTDOWN_NOTICE) return;
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const loginWithGoogle = async () => {
    if (SHOW_SHUTDOWN_NOTICE) return;

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("Error signing in with Google: ", error);
      }
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  if (SHOW_SHUTDOWN_NOTICE) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black bg-grid-pattern-black">
        <ShutdownNotice />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black bg-grid-pattern-black">
      <div className="text-center px-4 max-w-4xl">
        <FadeIn delay={0.1}>
          <div className="inline-flex items-center gap-2 mb-8 border border-white/10 bg-white/5 rounded-full px-4 py-1.5 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-white/70" />
            <span className="text-sm text-white/70 font-medium">AI-Powered Research Outreach</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="text-white text-5xl md:text-7xl font-bold tracking-tight mb-6">
            scribe
            <span className="text-gray-500">.</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Your next research position is an email away. Generate personalized, high-conversion cold emails to professors in seconds.
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={loginWithGoogle}
              className="group relative inline-flex items-center justify-center px-8 py-3.5 bg-white text-black font-medium rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={loginWithGoogle}
              className="inline-flex items-center justify-center px-8 py-3.5 border border-white/20 text-white font-medium rounded-lg hover:bg-white/5 transition-all duration-200 hover:border-white/40"
            >
              Log in
            </button>
          </div>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="mt-8 pt-8 border-t border-white/5">
            <p className="text-gray-600 text-sm">
              Trusted by students in top university labs at Stanford, Harvard, and UC Berkeley
            </p>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
