/**
 * Legacy LocalStorage Cleanup
 *
 * One-time migration utility to remove orphaned localStorage data from
 * the deprecated localStorage-based queue implementation.
 *
 * Background:
 * - The queue system previously used Zustand with localStorage persistence
 * - Key: 'scribe-queue-storage' stored queue items, processing state, etc.
 * - This was replaced with a server-driven approach (database as source of truth)
 * - The old localStorage data is now orphaned and should be cleaned up
 *
 * This utility runs once per browser and records completion to prevent re-running.
 */

import logger from "@/utils/logger";

/** Version identifier for tracking which cleanup migrations have run */
const CLEANUP_VERSION = "v1";

/** Key used to track completed cleanup migrations */
const CLEANUP_MARKER_KEY = "scribe-legacy-cleanup-completed";

/** Legacy localStorage keys to remove */
const LEGACY_KEYS = [
    "scribe-queue-storage", // Old Zustand queue store (queue items, processing state)
] as const;

/**
 * Checks if the legacy cleanup has already been performed for this browser.
 */
function hasCleanupCompleted(): boolean {
    if (typeof window === "undefined") return true; // SSR safety

    const marker = localStorage.getItem(CLEANUP_MARKER_KEY);
    return marker === CLEANUP_VERSION;
}

/**
 * Marks the cleanup as completed so it won't run again.
 */
function markCleanupCompleted(): void {
    if (typeof window === "undefined") return;

    localStorage.setItem(CLEANUP_MARKER_KEY, CLEANUP_VERSION);
}

/**
 * Performs the one-time cleanup of legacy localStorage keys.
 *
 * @returns Object indicating whether cleanup ran and what was removed
 */
export function cleanupLegacyStorage(): {
    executed: boolean;
    keysRemoved: string[];
} {
    if (typeof window === "undefined") {
        return { executed: false, keysRemoved: [] };
    }

    if (hasCleanupCompleted()) {
        return { executed: false, keysRemoved: [] };
    }

    const keysRemoved: string[] = [];

    for (const key of LEGACY_KEYS) {
        const value = localStorage.getItem(key);
        if (value !== null) {
            localStorage.removeItem(key);
            keysRemoved.push(key);
            logger.info(`[Migration] Removed legacy localStorage key: ${key}`);
        }
    }

    markCleanupCompleted();

    if (keysRemoved.length > 0) {
        logger.info(
            `[Migration] Legacy storage cleanup complete. Removed ${keysRemoved.length} key(s).`
        );
    } else {
        logger.debug("[Migration] Legacy storage cleanup complete. No keys found.");
    }

    return { executed: true, keysRemoved };
}
