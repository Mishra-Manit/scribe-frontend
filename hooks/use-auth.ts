"use client";

/**
 * Auth hook wrapper - future-proofing for Context → React Query migration
 *
 * For now, this simply re-exports the existing AuthContext hook.
 * This provides a single import location for all components, making it easy
 * to swap the implementation later without changing consumers.
 *
 * Future migration path:
 * - Replace with React Query for user profile data
 * - Move to Zustand for client-side auth state
 * - Keep Supabase for actual authentication
 */
export { useAuth } from "@/context/AuthContextProvider";

/**
 * Future implementation (Phase 5):
 *
 * export function useAuth() {
 *   const { data: user, isLoading } = useQuery({
 *     queryKey: queryKeys.user.profile(),
 *     queryFn: () => api.user.getUserData(),
 *     staleTime: 30 * 60 * 1000, // 30 minutes
 *   });
 *
 *   return {
 *     user,
 *     isLoading,
 *     logout: () => supabase.auth.signOut(),
 *   };
 * }
 */
