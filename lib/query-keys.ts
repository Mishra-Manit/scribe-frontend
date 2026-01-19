/**
 * Query Key Factory
 * Centralized, hierarchical query keys for React Query cache management
 *
 * Benefits:
 * - Type-safe query key generation
 * - Easy cache invalidation (invalidate all emails with queryKeys.emails._def)
 * - Consistent key structure across the app
 * - Prevents typos and key conflicts
 */

/**
 * Query key factory for user-related queries
 */
export const queryKeys = {
  // User domain keys
  user: {
    // Base key for all user queries
    all: ['user'] as const,

    // Current authenticated user profile
    profile: () => [...queryKeys.user.all, 'profile'] as const,

    // User by ID (for future use)
    byId: (userId: string) => [...queryKeys.user.all, userId] as const,
  },

  // Email domain keys
  emails: {
    // Base key for all email queries
    all: ['emails'] as const,

    // Email history lists (invalidating this invalidates all list variations)
    lists: () => [...queryKeys.emails.all, 'list'] as const,

    // Email history lists scoped to a specific user
    listsByUser: (userId: string) =>
      [...queryKeys.emails.lists(), 'user', userId] as const,

    // Email history with user-specific pagination
    listByUser: (userId: string, limit: number, offset: number) =>
      [...queryKeys.emails.listsByUser(userId), { limit, offset }] as const,

    // Email history with specific pagination
    list: (limit: number, offset: number) =>
      [...queryKeys.emails.lists(), { limit, offset }] as const,

    // Infinite scroll email history for a specific user
    infinite: (userId: string) =>
      [...queryKeys.emails.all, 'infinite', userId] as const,

    // Base key for all infinite queries (for invalidation)
    infiniteAll: () => [...queryKeys.emails.all, 'infinite'] as const,

    // Individual email details
    detail: (emailId: string) =>
      [...queryKeys.emails.all, 'detail', emailId] as const,
  },

  // Task domain keys (for async email generation)
  tasks: {
    // Base key for all task queries
    all: ['tasks'] as const,

    // Task status by task ID
    status: (taskId: string) =>
      [...queryKeys.tasks.all, 'status', taskId] as const,
  },

  // Template domain keys
  templates: {
    // Base key for all template queries
    all: ['templates'] as const,

    // Template list for current user
    list: () => [...queryKeys.templates.all, 'list'] as const,

    // Individual template detail
    detail: (templateId: string) =>
      [...queryKeys.templates.all, 'detail', templateId] as const,
  },

  // Queue domain keys (database-backed batch queue)
  queue: {
    // Base key for all queue queries
    all: ['queue'] as const,

    // Queue items for current user
    items: () => [...queryKeys.queue.all, 'items'] as const,
  },
} as const;

// Type helper for query key inference

export type QueryKeys = typeof queryKeys;

/**
 * Usage Examples:
 *
 * 1. Fetch email history with pagination:
 *    useQuery({
 *      queryKey: queryKeys.emails.list(20, 0),
 *      queryFn: () => api.email.getEmailHistory(20, 0),
 *    })
 *
 * 2. Fetch infinite email history:
 *    useInfiniteQuery({
 *      queryKey: queryKeys.emails.infinite(userId),
 *      queryFn: ({ pageParam }) => api.email.getEmailHistory(20, pageParam),
 *    })
 *
 * 3. Invalidate all email lists after generating new email:
 *    queryClient.invalidateQueries({
 *      queryKey: queryKeys.emails.lists()
 *    })
 *    // This invalidates all variations: list(20,0), list(50,0), etc.
 *
 * 4. Invalidate all infinite queries:
 *    queryClient.invalidateQueries({
 *      queryKey: queryKeys.emails.infiniteAll()
 *    })
 *    // This invalidates all infinite queries for all users
 *
 * 5. Invalidate specific email after update:
 *    queryClient.invalidateQueries({
 *      queryKey: queryKeys.emails.detail(emailId)
 *    })
 *
 * 6. Prefetch email on hover:
 *    queryClient.prefetchQuery({
 *      queryKey: queryKeys.emails.detail(emailId),
 *      queryFn: () => api.email.getEmail(emailId),
 *    })
 *
 * 7. Poll task status:
 *    useQuery({
 *      queryKey: queryKeys.tasks.status(taskId),
 *      queryFn: () => api.email.getTaskStatus(taskId),
 *      refetchInterval: (data) => {
 *        if (data?.status === 'SUCCESS' || data?.status === 'FAILURE') {
 *          return false; // Stop polling
 *        }
 *        return 3000; // Poll every 3 seconds
 *      },
 *    })
 */
