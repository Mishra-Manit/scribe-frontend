# Scribe Code Patterns

This document catalogs the established code patterns used throughout the Scribe codebase. Following these patterns ensures consistency, maintainability, and optimal performance.

## Table of Contents

1. [Session Manager Pattern](#session-manager-pattern)
2. [Granular Selector Pattern](#granular-selector-pattern)
3. [Protected Route Pattern](#protected-route-pattern)
4. [Query Key Factory Pattern](#query-key-factory-pattern)
5. [Hydration Safety Pattern](#hydration-safety-pattern)
6. [API Client Pattern](#api-client-pattern)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Queue Hook Separation Pattern](#queue-hook-separation-pattern)

---

## Session Manager Pattern

### Problem

Calling `supabase.auth.getSession()` repeatedly causes:
- Performance degradation (50-500ms per call)
- Rate limiting from Supabase
- Concurrent request race conditions
- Unnecessary network calls

### Solution

Use an in-memory token cache with intelligent expiration and mutex-protected refresh.

**Location:** `/lib/auth/session-manager.ts`

### Implementation

```typescript
class SessionManager {
  private tokenCache: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  async getToken(): Promise<string | null> {
    // Fast path - return cached token
    if (this.tokenCache && this.isTokenValid()) {
      return this.tokenCache;
    }

    // Slow path - refresh token with mutex protection
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken();
    }

    const token = await this.refreshPromise;
    this.refreshPromise = null;
    return token;
  }

  private async refreshToken(): Promise<string | null> {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      this.tokenCache = null;
      this.tokenExpiry = null;
      return null;
    }

    const token = data.session.access_token;
    const expiresAt = data.session.expires_at * 1000; // Convert to ms

    this.tokenCache = token;
    this.tokenExpiry = expiresAt;

    // Schedule proactive refresh
    this.scheduleRefresh(expiresAt);

    return token;
  }

  private isTokenValid(): boolean {
    if (!this.tokenExpiry) return false;
    // 5-minute buffer before expiration
    const buffer = 5 * 60 * 1000;
    return Date.now() < this.tokenExpiry - buffer;
  }

  private scheduleRefresh(expiresAt: number): void {
    const buffer = 5 * 60 * 1000;
    const refreshAt = expiresAt - buffer - Date.now();

    if (refreshAt > 0) {
      setTimeout(() => {
        this.refreshToken();
      }, refreshAt);
    }
  }
}

export const sessionManager = new SessionManager();
```

### Usage

```typescript
// ✅ CORRECT - Always use session manager
import { sessionManager } from '@/lib/auth/session-manager';

const token = await sessionManager.getToken();

// ❌ WRONG - Never bypass cache
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;
```

### Benefits

- **Performance:** 0ms for cached tokens vs 50-500ms for fresh calls
- **Reliability:** Prevents rate limiting
- **Concurrency:** Mutex prevents duplicate refresh calls
- **Proactive:** Auto-refreshes before expiration

### When to Use

- ✅ Every API call requiring authentication
- ✅ Checking if user is authenticated
- ✅ Accessing token for external services

### Pitfalls to Avoid

```typescript
// ❌ Don't create multiple instances
const manager = new SessionManager(); // Wrong!

// ✅ Use singleton export
import { sessionManager } from '@/lib/auth/session-manager';

// ❌ Don't store token in localStorage
localStorage.setItem('token', token); // Security risk!

// ✅ Token stays in memory only
```

---

## Granular Selector Pattern

### Problem

Subscribing to entire Zustand store causes unnecessary re-renders when any part of the store changes, leading to poor performance.

### Solution

Export granular selector hooks that subscribe to specific slices of state.

**Location:** Any Zustand store (e.g., `/stores/ui-store.ts`)

### Implementation

```typescript
// /stores/ui-store.ts
interface UIStore {
  emailTemplate: string;
  recipientName: string;
  recipientInterest: string;
  hoveredEmailId: string | null;

  setEmailTemplate: (template: string) => void;
  setRecipientName: (name: string) => void;
  // ... other actions
}

const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      emailTemplate: '',
      recipientName: '',
      recipientInterest: '',
      hoveredEmailId: null,

      setEmailTemplate: (template) => set({ emailTemplate: template }),
      setRecipientName: (name) => set({ recipientName: name }),
      // ... other setters
    }),
    { name: 'scribe-ui-storage' }
  )
);

// ✅ Export granular selectors
export const useEmailTemplate = () =>
  useUIStore((state) => state.emailTemplate);

export const useSetEmailTemplate = () =>
  useUIStore((state) => state.setEmailTemplate);

export const useRecipientName = () =>
  useUIStore((state) => state.recipientName);

export const useSetRecipientName = () =>
  useUIStore((state) => state.setRecipientName);

export const useHoveredEmailId = () =>
  useUIStore((state) => state.hoveredEmailId);
```

### Usage

```typescript
// ✅ CORRECT - Granular selectors
function TemplateEditor() {
  const template = useEmailTemplate();      // Only re-renders when template changes
  const setTemplate = useSetEmailTemplate(); // Never re-renders (stable reference)

  return (
    <textarea
      value={template}
      onChange={(e) => setTemplate(e.target.value)}
    />
  );
}

// ❌ WRONG - Whole store subscription
function TemplateEditor() {
  const store = useUIStore();  // Re-renders on ANY store change

  return (
    <textarea
      value={store.emailTemplate}
      onChange={(e) => store.setEmailTemplate(e.target.value)}
    />
  );
}
```

### Performance Impact

**Before (whole-store subscription):**
- Component re-renders: ~100/second during active use
- Wasted renders: ~95/second

**After (granular selectors):**
- Component re-renders: ~5/second during active use
- Wasted renders: ~0/second

### When to Use

- ✅ All Zustand stores
- ✅ Any component reading store state
- ✅ Any component calling store actions

### Patterns

#### State Selector

```typescript
export const useEmailTemplate = () =>
  useUIStore((state) => state.emailTemplate);
```

#### Action Selector

```typescript
export const useSetEmailTemplate = () =>
  useUIStore((state) => state.setEmailTemplate);
```

#### Computed Selector

```typescript
export const usePendingCount = () =>
  useQueueStore((state) =>
    state.queue.filter(item => item.status === 'pending').length
  );
```

#### Multiple Values

```typescript
// If component truly needs multiple values
export const useTemplateForm = () =>
  useUIStore((state) => ({
    template: state.emailTemplate,
    name: state.recipientName,
    interest: state.recipientInterest,
  }));
```

### Pitfalls to Avoid

```typescript
// ❌ Don't select entire store
const store = useUIStore();

// ❌ Don't use object spread (creates new object every time)
const { emailTemplate } = useUIStore((state) => ({
  emailTemplate: state.emailTemplate
}));

// ✅ Return primitive values or stable references
const emailTemplate = useUIStore((state) => state.emailTemplate);
```

---

## Protected Route Pattern

### Problem

Unauthenticated users can access protected pages by typing the URL directly, causing errors when accessing user-specific data.

### Solution

Wrap protected page content in a ProtectedRoute component that checks authentication and redirects if needed.

**Location:** `/components/ProtectedRoute.tsx`

### Implementation

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');  // Redirect to landing page
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!user) {
    return null;
  }

  // User is authenticated, render page
  return <>{children}</>;
}
```

### Usage

```typescript
// /app/dashboard/page.tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <h1>Dashboard</h1>
        {/* Page content only accessible to authenticated users */}
      </div>
    </ProtectedRoute>
  );
}

// Or wrap in layout for entire section
// /app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <ProtectedRoute>
      <div>
        <Navbar />
        {children}
      </div>
    </ProtectedRoute>
  );
}
```

### Variations

#### With Timeout

```typescript
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        setShowTimeout(true);
      }
    }, 15000); // 15 seconds

    return () => clearTimeout(timeout);
  }, [loading]);

  if (showTimeout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p>Authentication is taking longer than expected.</p>
        <Button onClick={() => router.push('/')}>Return to Home</Button>
      </div>
    );
  }

  // ... rest of implementation
}
```

#### With Role Checking

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export default function ProtectedRoute({
  children,
  requiredRole
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }

    if (!loading && user && requiredRole) {
      const userRole = user.claims?.role;
      if (userRole !== requiredRole) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, requiredRole, router]);

  // ... rest of implementation
}
```

### When to Use

- ✅ Dashboard pages
- ✅ User profile pages
- ✅ Settings pages
- ✅ Any page requiring authentication

### Pitfalls to Avoid

```typescript
// ❌ Don't check auth in page component
export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return <div>Not authorized</div>; // Wrong!
}

// ✅ Use ProtectedRoute wrapper
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      {/* Content */}
    </ProtectedRoute>
  );
}
```

---

## Query Key Factory Pattern

### Problem

Hardcoded query keys lead to:
- Typos and bugs
- Difficult invalidation
- No type safety
- Unclear hierarchies

### Solution

Centralized query key factory with hierarchical structure and type safety.

**Location:** `/lib/query-keys.ts`

### Implementation

```typescript
export const queryKeys = {
  // User queries
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
  },

  // Email queries
  emails: {
    all: ['emails'] as const,
    lists: () => [...queryKeys.emails.all, 'list'] as const,
    listsByUser: (userId: string) =>
      [...queryKeys.emails.lists(), userId] as const,
    listByUser: (userId: string, limit: number, offset: number) =>
      [...queryKeys.emails.listsByUser(userId), { limit, offset }] as const,
    detail: (id: string) =>
      [...queryKeys.emails.all, 'detail', id] as const,
  },

  // Task queries
  tasks: {
    all: ['tasks'] as const,
    status: (taskId: string) =>
      [...queryKeys.tasks.all, 'status', taskId] as const,
  },
};
```

### Usage

```typescript
// ✅ CORRECT - Use factory
import { queryKeys } from '@/lib/query-keys';

const { data } = useQuery({
  queryKey: queryKeys.emails.listByUser(user.uid, 20, 0),
  queryFn: () => emailAPI.getEmailHistory(20, 0),
});

// ❌ WRONG - Hardcoded keys
const { data } = useQuery({
  queryKey: ['emails', user.uid, 20, 0],  // Prone to typos
  queryFn: () => emailAPI.getEmailHistory(20, 0),
});
```

### Invalidation Patterns

```typescript
// Invalidate all emails
queryClient.invalidateQueries({
  queryKey: queryKeys.emails.all
});

// Invalidate all email lists
queryClient.invalidateQueries({
  queryKey: queryKeys.emails.lists()
});

// Invalidate specific user's emails
queryClient.invalidateQueries({
  queryKey: queryKeys.emails.listsByUser(userId)
});

// Invalidate specific email
queryClient.invalidateQueries({
  queryKey: queryKeys.emails.detail(emailId)
});
```

### Hierarchical Structure

```
emails
├── all: ['emails']
├── lists: ['emails', 'list']
│   ├── listsByUser: ['emails', 'list', userId]
│   │   └── listByUser: ['emails', 'list', userId, { limit, offset }]
└── detail: ['emails', 'detail', id]
```

**Benefits of Hierarchy:**
- Invalidate `emails.all` → Clears everything
- Invalidate `emails.lists()` → Clears all lists, keeps details
- Invalidate `emails.listsByUser(userId)` → Clears specific user's lists

### When to Use

- ✅ All React Query queries
- ✅ All React Query mutations
- ✅ Query invalidation
- ✅ Cache manipulation

### Pitfalls to Avoid

```typescript
// ❌ Don't duplicate keys
queryKey: ['emails', userId]  // In one place
queryKey: ['email', userId]   // Typo in another place

// ✅ Use factory for consistency
queryKey: queryKeys.emails.listsByUser(userId)

// ❌ Don't mix factory and hardcoded
queryKey: [...queryKeys.emails.all, 'custom']  // Inconsistent

// ✅ Add to factory
emails: {
  all: ['emails'] as const,
  custom: () => [...queryKeys.emails.all, 'custom'] as const,
}
```

---

## Hydration Safety Pattern

### Problem

Next.js SSR renders without localStorage, but client hydrates with localStorage, causing:
- Hydration mismatch errors
- Flash of incorrect content
- Console warnings

### Solution

Wait for Zustand store to hydrate from localStorage before rendering persisted state.

**Location:** Any Zustand store using persist middleware

### Implementation

```typescript
// /stores/ui-store.ts
interface UIStore {
  emailTemplate: string;
  _hasHydrated: boolean;

  setEmailTemplate: (template: string) => void;
  setHasHydrated: (state: boolean) => void;
}

const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      emailTemplate: '',
      _hasHydrated: false,

      setEmailTemplate: (template) => set({ emailTemplate: template }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'scribe-ui-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        // Mark as hydrated after localStorage loads
        state?.setHasHydrated(true);
      },
    }
  )
);

// Export hydration status
export const useHasHydrated = () =>
  useUIStore((state) => state._hasHydrated);

export const useEmailTemplate = () =>
  useUIStore((state) => state.emailTemplate);
```

### Usage

```typescript
// ✅ CORRECT - Wait for hydration
import { useHasHydrated, useEmailTemplate } from '@/stores/ui-store';

export default function TemplatePage() {
  const hasHydrated = useHasHydrated();
  const template = useEmailTemplate();

  // Don't render persisted state until hydrated
  if (!hasHydrated) {
    return <LoadingSpinner />;
  }

  // Now safe to use persisted state
  return (
    <div>
      <h1>Template</h1>
      <p>{template}</p>
    </div>
  );
}

// ❌ WRONG - Render before hydration
export default function TemplatePage() {
  const template = useEmailTemplate();  // May cause hydration mismatch

  return (
    <div>
      <h1>Template</h1>
      <p>{template}</p>  {/* SSR: empty, Client: loaded from localStorage */}
    </div>
  );
}
```

### Variations

#### Loading State

```typescript
if (!hasHydrated) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner />
    </div>
  );
}
```

#### Skeleton UI

```typescript
if (!hasHydrated) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

#### Conditional Rendering

```typescript
<div>
  <h1>Template</h1>
  {hasHydrated ? (
    <textarea value={template} />
  ) : (
    <Skeleton className="h-64" />
  )}
</div>
```

### When to Use

- ✅ Any page using persisted Zustand state
- ✅ Components rendering localStorage data
- ✅ Forms with saved drafts
- ✅ User preferences/settings

### Pitfalls to Avoid

```typescript
// ❌ Don't render persisted state without check
const template = useEmailTemplate();
return <div>{template}</div>;  // Hydration mismatch!

// ✅ Always check hydration first
const hasHydrated = useHasHydrated();
const template = useEmailTemplate();
if (!hasHydrated) return <Loading />;
return <div>{template}</div>;

// ❌ Don't use localStorage directly
const template = localStorage.getItem('template');  // SSR error!

// ✅ Use Zustand persist with hydration check
```

---

## API Client Pattern

### Problem

Direct fetch calls lack:
- Retry logic
- Error handling
- Request cancellation
- Authentication
- Type safety

### Solution

Use centralized API client with comprehensive request handling.

**Location:** `/lib/api/client.ts` and `/lib/api/index.ts`

### Implementation

```typescript
// /lib/api/index.ts - High-level API
export const emailAPI = {
  getEmailHistory: async (
    limit: number = 20,
    offset: number = 0,
    options?: ApiRequestOptions
  ): Promise<EmailResponse[]> => {
    return apiClient.requestWithValidation(
      `/api/email/?limit=${limit}&offset=${offset}`,
      EmailHistorySchema,  // Zod validation
      options
    );
  },

  generateEmail: async (
    emailData: EmailGenerationData,
    options?: ApiRequestOptions
  ): Promise<GenerateEmailResponse> => {
    return apiClient.requestWithValidation(
      '/api/email/generate',
      GenerateEmailResponseSchema,
      {
        ...options,
        method: 'POST',
        body: JSON.stringify(emailData),
      }
    );
  },
};

// /lib/api/client.ts - Low-level client
class ApiClient {
  async request<T>(
    endpoint: string,
    options?: ApiRequestOptions
  ): Promise<T> {
    const token = await sessionManager.getToken();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && !options?.skipAuth && {
          Authorization: `Bearer ${token}`
        }),
        ...options?.headers,
      },
      signal: options?.signal,
    });

    if (!response.ok) {
      throw this.handleError(response);
    }

    return response.json();
  }

  async requestWithValidation<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    options?: ApiRequestOptions
  ): Promise<T> {
    const data = await this.request<T>(endpoint, options);
    return schema.parse(data);  // Runtime validation
  }

  private handleError(response: Response): ApiError {
    if (response.status === 401 || response.status === 403) {
      return new AuthenticationError(response.statusText);
    }
    if (response.status === 400) {
      return new ValidationError(response.statusText);
    }
    if (response.status === 429) {
      return new RateLimitError();
    }
    if (response.status >= 500) {
      return new ServerError(response.statusText);
    }
    return new ApiError(response.statusText, response.status);
  }
}

export const apiClient = new ApiClient();
```

### Usage

```typescript
// ✅ CORRECT - Use API client
import { emailAPI } from '@/lib/api';

const { data } = useQuery({
  queryKey: ['emails'],
  queryFn: ({ signal }) => emailAPI.getEmailHistory(20, 0, { signal })
});

// ❌ WRONG - Direct fetch
const response = await fetch('/api/email/history');
const data = await response.json();  // No error handling, no auth, no validation
```

### Error Handling

```typescript
try {
  await emailAPI.generateEmail(data);
} catch (error) {
  if (error instanceof NetworkError) {
    toast.error('Connection lost. Check your internet.');
  } else if (error instanceof AuthenticationError) {
    router.push('/');
  } else if (error instanceof ValidationError) {
    setFormErrors(error.validationErrors);
  } else if (error instanceof ApiError) {
    toast.error(error.getUserMessage());
  }
}
```

### Request Options

```typescript
interface ApiRequestOptions {
  signal?: AbortSignal;        // For cancellation
  timeout?: number;             // Request timeout
  retry?: RetryOptions | false; // Retry configuration
  skipAuth?: boolean;           // Skip auth header
  deduplicate?: boolean;        // Prevent duplicate requests
}

// With React Query
queryFn: ({ signal }) => emailAPI.getEmailHistory(20, 0, {
  signal,           // Auto-cancel on unmount
  timeout: 10000,   // 10 second timeout
  retry: false,     // No retry (React Query handles it)
})
```

### When to Use

- ✅ All API calls to backend
- ✅ All React Query queries
- ✅ All React Query mutations

### Pitfalls to Avoid

```typescript
// ❌ Don't use fetch directly
await fetch('/api/endpoint');

// ✅ Use API client
await api.endpoint.method();

// ❌ Don't forget signal
queryFn: () => emailAPI.getHistory()

// ✅ Pass signal for cancellation
queryFn: ({ signal }) => emailAPI.getHistory(20, 0, { signal })

// ❌ Don't skip error handling
const data = await emailAPI.generateEmail(data);  // Unhandled errors

// ✅ Handle errors by type
try {
  const data = await emailAPI.generateEmail(data);
} catch (error) {
  if (error instanceof ApiError) {
    // Handle
  }
}
```

---

## Error Handling Patterns

### Problem

Unhandled errors cause crashes, poor UX, and debugging difficulties.

### Solution

Multiple layers of error handling with type-specific strategies.

### Layer 1: Error Boundaries

```typescript
// /components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>

          {this.state.error instanceof ApiError && (
            <p>{this.state.error.getUserMessage()}</p>
          )}

          <div className="actions">
            <Button onClick={() => this.setState({ hasError: false })}>
              Try again
            </Button>
            <Button onClick={() => window.location.href = '/'}>
              Go home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
```

### Layer 2: React Query Error Handling

```typescript
// Global error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Retry transient errors only
        if (error instanceof ApiError && error.retryable) {
          return failureCount < 3;
        }
        return false;
      },
      onError: (error) => {
        console.error('Query error:', error);
      },
    },
    mutations: {
      onError: (error) => {
        if (error instanceof ApiError) {
          toast.error(error.getUserMessage());
        }
      },
    },
  },
});

// Per-query error handling
const { data, error } = useQuery({
  queryKey: ['emails'],
  queryFn: fetchEmails,
  onError: (error) => {
    if (error instanceof AuthenticationError) {
      router.push('/');
    }
  },
});

// Display error in UI
if (error) {
  return <ErrorMessage error={error} />;
}
```

### Layer 3: Try-Catch Blocks

```typescript
// In event handlers
const handleSubmit = async () => {
  try {
    await emailAPI.generateEmail(data);
    toast.success('Email generated successfully');
  } catch (error) {
    if (error instanceof NetworkError) {
      toast.error('Connection lost. Please check your internet.');
    } else if (error instanceof ValidationError) {
      setFormErrors(error.validationErrors);
    } else if (error instanceof ApiError) {
      toast.error(error.getUserMessage());
    } else {
      toast.error('An unexpected error occurred');
    }
  }
};

// In async functions
const fetchData = async () => {
  try {
    setLoading(true);
    const data = await api.getData();
    setData(data);
  } catch (error) {
    setError(error);
  } finally {
    setLoading(false);
  }
};
```

### Error Type Patterns

```typescript
// Type-specific handling
if (error instanceof NetworkError) {
  // Lost connection - show retry
  return <RetryButton onClick={refetch} />;
}

if (error instanceof AuthenticationError) {
  // Invalid auth - redirect to login
  router.push('/');
  return null;
}

if (error instanceof ValidationError) {
  // Bad input - show form errors
  return <FormErrors errors={error.validationErrors} />;
}

if (error instanceof RateLimitError) {
  // Too many requests - show cooldown
  return <RateLimitMessage retryAfter={error.retryAfter} />;
}

if (error instanceof ServerError) {
  // Backend error - show generic message
  return <ErrorMessage message="Server error. Please try again later." />;
}
```

### When to Use

- ✅ Root layout (Error Boundary)
- ✅ React Query setup (global error config)
- ✅ Event handlers (try-catch)
- ✅ Async functions (try-catch-finally)
- ✅ UI components (error state rendering)

### Pitfalls to Avoid

```typescript
// ❌ Don't swallow errors
try {
  await api.call();
} catch (error) {
  // Silent failure!
}

// ✅ Handle or re-throw
try {
  await api.call();
} catch (error) {
  console.error(error);
  throw error;  // Let boundary handle it
}

// ❌ Don't use generic messages
catch (error) {
  toast.error('Something went wrong');  // Not helpful!
}

// ✅ Use specific messages
catch (error) {
  if (error instanceof ApiError) {
    toast.error(error.getUserMessage());  // User-friendly
  }
}
```

---

## Queue Hook Separation Pattern

### Problem

Single monolithic queue hook becomes complex, hard to test, and violates single responsibility principle.

### Solution

Separate queue concerns into three specialized hooks: manager, actions, and state.

**Location:** `/hooks/useQueue*.ts`

### Implementation

```typescript
// /hooks/useQueueManager.ts - Processing logic
export function useQueueManager() {
  // ONLY called in dashboard/layout.tsx
  // Handles: prerequisites, processing, polling, completion
}

// /hooks/useQueueActions.ts - Action dispatchers
export function useQueueActions() {
  // Called in any component that modifies queue
  // Provides: addToQueue, removeItem, clearQueue, etc.
  return {
    addToQueue: useQueueStore.getState().addItems,
    removeItem: useQueueStore.getState().removeItem,
    clearCompleted: useQueueStore.getState().clearCompleted,
    clearAll: useQueueStore.getState().clearAll,
  };
}

// /hooks/useQueueState.ts - State selectors
export function useQueueState() {
  // Called in any component that displays queue
  // Provides: queue, counts, status, etc.
  const queue = useQueueStore((s) => s.queue);
  const isProcessing = useQueueStore((s) => s.isProcessing);
  const processingItemId = useQueueStore((s) => s.processingItemId);
  const currentTaskStatus = useQueueStore((s) => s.currentTaskStatus);

  const pendingCount = useQueueStore((s) => s.getPendingCount());
  const completedCount = useQueueStore((s) => s.getCompletedCount());
  const failedCount = useQueueStore((s) => s.getFailedCount());

  return {
    queue,
    isProcessing,
    processingItemId,
    currentTaskStatus,
    pendingCount,
    completedCount,
    failedCount,
  };
}
```

### Usage

```typescript
// Dashboard layout - Initialize processor
export default function DashboardLayout({ children }) {
  useQueueManager();  // ← Processing logic
  return <>{children}</>;
}

// Generate page - Add to queue
export default function GeneratePage() {
  const { addToQueue } = useQueueActions();  // ← Actions

  const handleGenerate = () => {
    addToQueue(items);
  };

  return <Button onClick={handleGenerate}>Generate</Button>;
}

// Queue status component - Display state
export default function QueueStatus() {
  const { pendingCount, isProcessing } = useQueueState();  // ← State

  return (
    <div>
      {isProcessing && <Spinner />}
      <span>Pending: {pendingCount}</span>
    </div>
  );
}
```

### Benefits

- **Single Responsibility:** Each hook has one job
- **Testing:** Easy to test hooks in isolation
- **Performance:** State hook uses granular selectors
- **Clarity:** Clear which hook to use when

### When to Use

- ✅ Complex feature with multiple concerns
- ✅ State that needs both reading and writing
- ✅ Features requiring background processing

### Hook Selection Guide

```
Need to initialize processing?
  → useQueueManager()
     (ONLY in layout.tsx)

Need to modify queue?
  → useQueueActions()
     (Any component)

Need to display queue state?
  → useQueueState()
     (Any component)
```

### Pitfalls to Avoid

```typescript
// ❌ Don't use manager outside layout
function MyPage() {
  useQueueManager();  // Creates duplicate processor!
}

// ✅ Only in layout
function DashboardLayout({ children }) {
  useQueueManager();  // ← Single instance
  return <>{children}</>;
}

// ❌ Don't combine hooks
function MyComponent() {
  useQueueManager();  // Processing
  const { addToQueue } = useQueueActions();  // Actions
  // Wrong! Manager should be in layout only
}

// ✅ Use appropriate hook
function MyComponent() {
  const { addToQueue } = useQueueActions();  // Just actions
  const { pendingCount } = useQueueState();   // Just state
}
```

---

## Summary

These patterns form the foundation of the Scribe codebase. Consistent application of these patterns ensures:

- **Performance:** Granular selectors, token caching, request deduplication
- **Reliability:** Error handling, retry logic, hydration safety
- **Maintainability:** Clear patterns, type safety, separation of concerns
- **Developer Experience:** Predictable code, easy debugging, fast iteration

When adding new features, refer to these patterns and follow established conventions.

---

**Last updated:** 2025-11-23
