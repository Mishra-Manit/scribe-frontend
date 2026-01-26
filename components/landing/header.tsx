"use client";

import Link from "next/link";
import { Logo } from "./logo";

interface LandingHeaderProps {
    onSignIn?: () => void;
}

export const LandingHeader = ({ onSignIn }: LandingHeaderProps) => {
    return (
        <div className="fixed z-50 pt-8 md:pt-14 top-0 left-0 w-full">
            <header className="flex items-center justify-between container mx-auto px-8">
                <Link href="/">
                    <Logo className="w-[100px] md:w-[120px]" />
                </Link>

                <button
                    onClick={onSignIn}
                    className="uppercase transition-colors ease-out duration-150 font-mono text-white hover:text-white/80"
                >
                    Sign In
                </button>
            </header>
        </div>
    );
};
