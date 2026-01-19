"use client";

/**
 * LegacyCleanup Component
 *
 * Silent, render-nothing component that performs one-time cleanup
 * of orphaned localStorage data from deprecated features.
 *
 * Include this in the root layout to ensure cleanup runs on first load.
 */

import { useEffect } from "react";
import { cleanupLegacyStorage } from "@/lib/legacy-storage-cleanup";

export function LegacyCleanup() {
    useEffect(() => {
        cleanupLegacyStorage();
    }, []);

    return null;
}
