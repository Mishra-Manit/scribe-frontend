"use client";

import { ArrowRight, Wrench } from "lucide-react";

interface ShutdownNoticeProps {
  className?: string;
}

export function ShutdownNotice({ className }: ShutdownNoticeProps) {
  return (
    <div className={className}>
      <div className="bg-black border border-white/20 text-white max-w-lg p-8 rounded-lg">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Wrench className="h-8 w-8 text-white/80" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            <span className="bg-white text-black px-2">scribe</span> maintenance
          </h1>
          <p className="text-white/80 mt-4 text-base leading-relaxed">
            We are currently undergoing scheduled maintenance.
          </p>
          <p className="text-white/60 mt-2 text-sm">
            The service will be unavailable for the next 24 hours.
          </p>
        </div>

        <div className="mt-6 space-y-4 text-white/90 text-sm">
          <div className="border-t border-white/20 pt-4">
            <p className="font-medium mb-3">
              If necessary, use these GitHub links to self-host the service:
            </p>
            <ul className="space-y-4">
              <li>
                <span className="text-white/60">Self-host the service:</span>
                <br />
                <a
                  href="https://github.com/Mishra-Manit/scribe-frontend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-1 px-3 py-1.5 border border-white/40 text-white hover:bg-white/10 transition-colors text-xs"
                >
                  github.com/Mishra-Manit/scribe-frontend
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </a>
                <br />
                <a
                  href="https://github.com/Mishra-Manit/scribe-backend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center mt-1 px-3 py-1.5 border border-white/40 text-white hover:bg-white/10 transition-colors text-xs"
                >
                  github.com/Mishra-Manit/scribe-backend
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </a>
              </li>
              <li>
                <span className="text-white/60">Contact for service inquiries:</span>
                <br />
                <a
                  href="mailto:mshmanit@gmail.com"
                  className="inline-flex items-center mt-1 px-3 py-1.5 bg-white text-black hover:bg-white/90 transition-colors text-xs"
                >
                  mshmanit@gmail.com
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
