"use client";

import { HeroBackground } from "./hero-background";

import { ArrowRight } from "lucide-react";

interface HeroProps {
    onGetStarted?: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
    return (
        <div className="flex flex-col h-svh justify-center relative">
            <HeroBackground />

            <div className="text-center relative z-10 flex flex-col items-center gap-8 sm:gap-10">
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-sentient">
                    Land your<br />
                    <i className="font-light">dream</i> lab
                </h1>
                <p className="font-mono text-sm sm:text-base text-white/60 text-balance max-w-[440px] mx-auto">
                    Trusted by top students at Harvard, Stanford, and UC Berkeley
                </p>

                <button
                    onClick={onGetStarted}
                    className="font-mono group relative inline-flex items-center justify-center px-6 py-2.5 sm:px-8 sm:py-3.5 bg-white text-black text-sm sm:text-base font-medium rounded-lg hover:bg-gray-100 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                    Get Started
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </div>
    );
}
