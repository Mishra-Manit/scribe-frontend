# Scribe Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Authentication Architecture](#authentication-architecture)
4. [API Client Architecture](#api-client-architecture)
5. [Queue System Architecture](#queue-system-architecture)
6. [State Management Strategy](#state-management-strategy)
7. [Frontend Patterns & Best Practices](#frontend-patterns--best-practices)
8. [Error Handling Strategy](#error-handling-strategy)
9. [Common Pitfalls & Solutions](#common-pitfalls--solutions)
10. [Development Workflow](#development-workflow)

---

## System Overview

Scribe is a **hybrid architecture** combining a Next.js 15 frontend with an external FastAPI backend. The key architectural decision is using **client-side queue processing** for email generation rather than traditional server-side background workers.

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                           │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Next.js 15 (App Router)                      │ │
│  │                                                            │ │
│  │  React Components → Zustand/React Query → API Client     │ │
│  │         ↓                    ↓                   ↓        │ │
│  │    User Actions          State Mgmt         HTTP Calls    │ │
│  └──────────────────────────────┬─────────────────────────────┘ │
│                                 │                                │
│                                 │ JWT Bearer Token               │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          │                       │                       │
          ▼                       ▼                       ▼
   ┌────────────┐        ┌──────────────┐        ┌──────────────┐
   │  Supabase  │        │   FastAPI    │        │   FastAPI    │
   │            │        │   Backend    │        │   Backend    │
   │ - Auth     │        │              │        │              │
   │ - PostgreSQL│       │ POST /email/ │        │ GET /email/  │
   │ - JWT Mgmt │        │   generate   │        │   history    │
   └────────────┘        └──────┬───────┘        └──────────────┘
                                │
                                ▼
                         ┌─────────────┐
                         │   Celery    │
                         │   + Redis   │
                         │             │
                         │ 1. Scrape   │
                         │ 2. AI Gen   │
                         │ 3. Save     │
                         └─────────────┘
```

### Key Architectural Decisions

1. **External Backend** - FastAPI handles business logic, NOT Next.js API routes
2. **Client-Side Queue** - Browser-based queue processing with Zustand + React Query
3. **Supabase for Auth** - OAuth, JWT tokens, user session management
4. **Separation of Concerns** - Frontend handles UI/state, backend handles processing
5. **Polling over WebSockets** - Simpler implementation, easier debugging

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15.3.2 | Framework with App Router, RSC |
| **React** | 19.0.0 | UI library |
| **TypeScript** | 5.x | Type safety |
| **Zustand** | 5.0.8 | Client state (UI, queue) |
| **TanStack Query** | v5 | Server state, caching, polling |
| **Tailwind CSS** | 3.3.5 | Styling |
| **shadcn/ui** | Latest | Component library (Radix) |
| **Zod** | 4.1.12 | Runtime validation |
| **Supabase JS** | 2.81.0 | Auth client |

### Backend

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Python web framework |
| **Celery** | Async task processing |
| **Redis** | Task queue backend |
| **PostgreSQL** | Database (via Supabase) |

### Infrastructure

- **Vercel** - Frontend deployment
- **Supabase** - Managed auth + database
- **Custom Server** - Backend deployment

---

## Authentication Architecture

### Overview

Authentication uses **Supabase Auth** with Google OAuth, combined with a custom **session manager** for intelligent JWT token caching.

### Authentication Flow

```
User Action: Click "Sign in with Google"
    ↓
Supabase OAuth Redirect
    ↓
Google OAuth Flow
    ↓
/auth/callback (Next.js route)
    ↓
Exchange code for session
    ↓
AuthContext initialization
    ↓
Backend user initialization (POST /api/user/init)
    ↓
Session stored in AuthStore (Zustand)
    ↓
User redirected to /dashboard
```

### Session Manager Pattern

**Location:** `/lib/auth/session-manager.ts`

**Problem Solved:** Calling `supabase.auth.getSession()` repeatedly causes:
- Performance degradation (50-500ms per call)
- Rate limiting from Supabase
- Concurrent request race conditions

**Solution:** In-memory token cache with intelligent expiration:

```typescript
class SessionManager {
  private tokenCache: string | null = null;
  private tokenExpiry: number | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  async getToken(): Promise<string | null> {
    // Fast path - cached token valid
    if (this.tokenCache && this.isTokenValid()) {
      return this.tokenCache;
    }

    // Slow path - fetch new token with mutex
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken();
    }

    const token = await this.refreshPromise;
    this.refreshPromise = null;
    return token;
  }

  private isTokenValid(): boolean {
    if (!this.tokenExpiry) return false;
    // 5-minute buffer before expiration
    return Date.now() < this.tokenExpiry - 5 * 60 * 1000;
  }
}
```

**Key Features:**
- **In-memory cache** - Tokens never stored in localStorage (security)
- **5-minute buffer** - Proactively refresh before expiration
- **Promise mutex** - Prevents concurrent getSession() calls
- **Auto-refresh** - Schedules refresh before token expires

**Critical Pattern:**

```typescript
// ✅ ALWAYS use session manager
const token = await sessionManager.getToken();

// ❌ NEVER bypass cache
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;
```

### Protected Routes

**Pattern:** `/components/ProtectedRoute.tsx`

```typescript
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');  // Redirect to landing
    }
  }, [user, loading, router]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return null;  // Redirecting...
  }

  return <>{children}</>;
}
```

**Usage:**

```typescript
// Any protected page
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
```

### Supabase Ready Flag

**Critical Pattern:** Before making API calls, verify Supabase is initialized:

```typescript
const { user, supabaseReady } = useAuth();

// ✅ Wait for both conditions
if (!user || !supabaseReady) {
  return <Loading />;
}

// Now safe to call API
const emails = await api.email.getEmailHistory();
```

**Why This Matters:**
- Prevents auth errors during app startup
- Avoids race conditions with session initialization
- Ensures token is available before API calls

---

## API Client Architecture

### Design Philosophy

The API client is **production-grade** with comprehensive error handling, retry logic, and request optimization.

**Location:** `/lib/api/client.ts`

### Architecture Layers

```
Component/Hook
    ↓
API Method (lib/api/index.ts)
    ↓
API Client (lib/api/client.ts)
    ↓
HTTP Request (fetch)
    ↓
FastAPI Backend
```

### Core Features

#### 1. Request Factory Pattern

```typescript
// lib/api/index.ts
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
```

#### 2. Retry Logic with Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryable(error) || attempt === options.maxAttempts - 1) {
        throw error;
      }

      const delay = calculateDelay(attempt, options);
      await sleep(delay);
    }
  }
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  const baseDelay = options.baseDelay * Math.pow(2, attempt);
  const jitter = options.jitter ? Math.random() * 0.5 + 0.75 : 1;
  return Math.min(baseDelay * jitter, options.maxDelay);
}
```

**Retryable Errors:**
- Network errors (offline, connection failed)
- Timeout errors
- Server errors (500-599)
- Rate limit errors (429)

**Non-Retryable Errors:**
- Authentication errors (401, 403)
- Validation errors (400)
- Other client errors (400-499)

#### 3. Request Deduplication

**Problem:** Rapid re-renders cause duplicate API calls

**Solution:** 100ms cache for in-flight requests

```typescript
class RequestCache {
  private cache = new Map<string, Promise<any>>();
  private ttl = 100; // milliseconds

  async get<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const promise = factory();
    this.cache.set(key, promise);

    setTimeout(() => this.cache.delete(key), this.ttl);

    return promise;
  }
}
```

#### 4. Custom Error Classes

```typescript
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryable: boolean
  ) {
    super(message);
  }

  getUserMessage(): string {
    // User-friendly error messages
  }
}

class NetworkError extends ApiError { /* retryable */ }
class AuthenticationError extends ApiError { /* non-retryable */ }
class ValidationError extends ApiError { /* non-retryable */ }
class RateLimitError extends ApiError { /* retryable with delay */ }
```

### Best Practices

#### Always Pass Signal for Cancellation

```typescript
// ✅ Good - Request cancels when component unmounts
const { data } = useQuery({
  queryKey: ['emails'],
  queryFn: ({ signal }) => emailAPI.getEmailHistory(20, 0, { signal })
});

// ❌ Bad - Request continues after unmount
queryFn: () => emailAPI.getEmailHistory(20, 0)
```

#### Handle Errors by Type

```typescript
try {
  await emailAPI.generateEmail(data);
} catch (error) {
  if (error instanceof NetworkError) {
    toast.error('Connection lost. Please check your internet.');
  } else if (error instanceof AuthenticationError) {
    router.push('/');
  } else if (error instanceof ValidationError) {
    setFormErrors(error.validationErrors);
  } else if (error instanceof ApiError) {
    toast.error(error.getUserMessage());
  }
}
```

#### Runtime Validation with Zod

```typescript
// All responses validated at runtime
const emails = await apiClient.requestWithValidation(
  '/api/email/history',
  EmailHistorySchema  // Throws ValidationError if schema doesn't match
);

// Type safety + runtime safety
```

---

## Queue System Architecture

### Overview

Scribe uses a **client-side queue** instead of traditional server-side queues (Bull, BullMQ, Redis). The queue processor runs in the browser within the dashboard layout.

**Why Client-Side?**
- ✅ Simplicity - No infrastructure to maintain
- ✅ Cost - No always-on background processes
- ✅ User feedback - Real-time visibility into progress
- ✅ Debugging - Everything in browser DevTools

**Trade-offs:**
- ⚠️ Single-device - Only processes in active tab
- ⚠️ Interruption - Pauses when tab closes
- ⚠️ Sequential - One item at a time

→ See [QUEUE_ARCHITECTURE.md](./QUEUE_ARCHITECTURE.md) for complete details

### Queue Processor Location

**Critical Decision:** Queue processor MUST be in `/app/dashboard/layout.tsx`

**Why not elsewhere?**

| Location | Problem |
|----------|---------|
| Root layout | Wastes resources on public pages, breaks without auth |
| Individual pages | Pages remount on navigation, interrupts processing |
| Per-page initialization | Violates DRY, unclear ownership |
| **Dashboard layout** | ✅ **Correct** - Persists across all dashboard routes |

### Implementation

```typescript
// /app/dashboard/layout.tsx
'use client';

import { useQueueManager } from '@/hooks/useQueueManager';

/**
 * Dashboard Layout
 *
 * Queue processor runs here because:
 * 1. Layouts persist during route changes (pages remount)
 * 2. Covers all dashboard routes (/dashboard, /dashboard/generate, etc.)
 * 3. Single initialization prevents race conditions
 * 4. Items queued on any page process immediately
 */
export default function DashboardLayout({ children }) {
  useQueueManager();  // Runs once, persists across routes

  return (
    <div className="min-h-screen">
      <Navbar />
      {children}
    </div>
  );
}
```

### Processing Flow

```
User adds items to queue (any dashboard page)
    ↓
useQueueManager detects pending items
    ↓
Acquires processing lock (mutex)
    ↓
Calls emailAPI.generateEmail()
    ↓
Backend returns task_id
    ↓
Update queue item: status="processing", taskId=xxx
    ↓
Start polling (React Query, 2s interval)
    ↓
GET /api/email/status/{task_id}
    ↓
Task status: PENDING → STARTED → SUCCESS
    ↓
On SUCCESS: Mark complete, invalidate email cache, remove item
    ↓
Process next pending item
```

### Three-Hook Pattern

**1. useQueueManager** - Master orchestrator (dashboard layout only)
```typescript
// /hooks/useQueueManager.ts
export function useQueueManager() {
  // Prerequisites check
  // Sequential processing logic
  // Status polling
  // Error recovery
}
```

**2. useQueueActions** - Action dispatchers (any component)
```typescript
// /hooks/useQueueActions.ts
export function useQueueActions() {
  return {
    addToQueue: (items) => { /* ... */ },
    clearQueue: () => { /* ... */ },
    retryItem: (id) => { /* ... */ },
  };
}
```

**3. useQueueState** - State selectors (any component)
```typescript
// /hooks/useQueueState.ts
export function useQueueState() {
  return {
    queue: useQueueStore((s) => s.queue),
    pendingCount: useQueueStore((s) => s.getPendingCount()),
    isProcessing: useQueueStore((s) => s.isProcessing),
  };
}
```

---

## State Management Strategy

### Zustand vs React Query

**Zustand** - Client State
- UI forms, user input
- Queue items
- Persisted to localStorage
- Synchronous access

**React Query** - Server State
- API data (emails, tasks)
- Automatic caching (3-5 min)
- Background refetching
- Polling for async operations

### When to Use Which

```typescript
// ✅ Zustand - UI state
const template = useEmailTemplate();
const setTemplate = useSetEmailTemplate();

// ✅ React Query - Server data
const { data: emails } = useQuery({
  queryKey: ['emails'],
  queryFn: () => emailAPI.getEmailHistory()
});

// ✅ Both Together - Queue system
const { addToQueue } = useQueueActions();  // Zustand
const mutation = useMutation({             // React Query
  mutationFn: emailAPI.generateEmail,
  onSuccess: (data) => {
    addToQueue([{ taskId: data.task_id }]);
  }
});
```

### Zustand Store Architecture

#### UI Store (`/stores/ui-store.ts`)

```typescript
interface UIStore {
  // Form state (persisted)
  emailTemplate: string;
  recipientName: string;
  recipientInterest: string;

  // UI state (not persisted)
  hoveredEmailId: string | null;
  copiedEmailId: string | null;

  // Hydration flag
  _hasHydrated: boolean;

  // Actions
  setEmailTemplate: (template: string) => void;
  setRecipientName: (name: string) => void;
  reset: () => void;
}
```

#### Queue Store (`/stores/simple-queue-store.ts`)

```typescript
interface QueueStore {
  queue: QueueItem[];
  isProcessing: boolean;
  processingItemId: string | null;

  // Actions
  addItems: (items: QueueItem[]) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<QueueItem>) => void;

  // Getters
  getPendingCount: () => number;
  getProcessingItem: () => QueueItem | null;
}
```

### Granular Selector Pattern

**Problem:** Subscribing to entire store causes unnecessary re-renders

**Solution:** Export granular selectors

```typescript
// /stores/ui-store.ts
export const useEmailTemplate = () =>
  useUIStore((state) => state.emailTemplate);

export const useSetEmailTemplate = () =>
  useUIStore((state) => state.setEmailTemplate);

// Component usage
function TemplateEditor() {
  const template = useEmailTemplate();      // Only re-renders when template changes
  const setTemplate = useSetEmailTemplate(); // Never re-renders

  return (
    <textarea
      value={template}
      onChange={(e) => setTemplate(e.target.value)}
    />
  );
}
```

**Performance Impact:**
- ✅ Component only re-renders when its specific state slice changes
- ✅ Prevents cascading updates across unrelated components
- ✅ Reduces total renders by 60-80% in typical scenarios

### Query Key Factory Pattern

**Problem:** Hardcoded query keys lead to typos and invalidation bugs

**Solution:** Centralized factory with type safety

```typescript
// /lib/query-keys.ts
export const queryKeys = {
  emails: {
    all: ['emails'] as const,
    lists: () => [...queryKeys.emails.all, 'list'] as const,
    listByUser: (userId: string, limit: number, offset: number) =>
      [...queryKeys.emails.lists(), { userId, limit, offset }] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    status: (taskId: string) =>
      [...queryKeys.tasks.all, 'status', taskId] as const,
  },
};

// Usage
const { data } = useQuery({
  queryKey: queryKeys.emails.listByUser(user.uid, 20, 0),
  queryFn: () => emailAPI.getEmailHistory(20, 0)
});

// Hierarchical invalidation
queryClient.invalidateQueries({
  queryKey: queryKeys.emails.lists()  // Invalidates all email lists
});
```

---

## Frontend Patterns & Best Practices

### Hydration Safety Pattern

**Problem:** Next.js SSR renders without localStorage, client hydrates with localStorage → mismatch error

**Solution:** Wait for hydration before rendering persisted state

```typescript
// /stores/ui-store.ts
const useUIStore = create(
  persist(
    (set) => ({
      emailTemplate: '',
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
    }),
    {
      name: 'scribe-ui',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);  // Mark as hydrated after loading
      },
    }
  )
);

export const useHasHydrated = () => useUIStore((s) => s._hasHydrated);
```

**Component Usage:**

```typescript
export default function GeneratePage() {
  const hasHydrated = useHasHydrated();
  const template = useEmailTemplate();

  // ✅ Wait for hydration
  if (!hasHydrated) {
    return <LoadingSpinner />;
  }

  // Now safe to use persisted state
  return <textarea value={template} />;
}
```

### Component Organization

```
components/
├── ui/                      # Primitive components (shadcn/ui)
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
├── ErrorBoundary.tsx        # Global error boundary
├── Navbar.tsx              # Navigation component
├── ProtectedRoute.tsx      # Auth guard
├── QueueStatus.tsx         # Queue status display
└── PDFProcessor.tsx        # PDF upload/processing
```

**Principles:**
- **ui/** - Pure, reusable, no business logic
- **Feature components** - Business logic via hooks
- **Layouts** - Background workers, shared UI
- **Pages** - Route-specific content

### Performance Optimization

#### 1. Selector Optimization

```typescript
// ❌ Bad - Re-renders on any UI store change
const uiStore = useUIStore();
console.log(uiStore.emailTemplate);

// ✅ Good - Only re-renders when template changes
const template = useEmailTemplate();
```

#### 2. Request Deduplication

```typescript
// Automatic deduplication for GET requests
const data1 = await emailAPI.getEmailHistory(20, 0);
const data2 = await emailAPI.getEmailHistory(20, 0);  // Returns same promise

// Results in single HTTP request
```

#### 3. React Query Stale Times

```typescript
// Global defaults
defaultOptions: {
  queries: {
    staleTime: 3 * 60 * 1000,  // 3 minutes
    gcTime: 5 * 60 * 1000,     // 5 minutes
  }
}

// Override for specific queries
useQuery({
  queryKey: ['emails'],
  queryFn: fetchEmails,
  staleTime: 30 * 1000,  // Fresh for 30 seconds
});
```

---

## Error Handling Strategy

### Error Boundaries

```typescript
// /components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to monitoring service
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          {error instanceof ApiError && (
            <p>{error.getUserMessage()}</p>
          )}
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Usage:**

```typescript
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <QueryProvider>
      <AuthContextProvider>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </AuthContextProvider>
    </QueryProvider>
  );
}
```

### API Error Handling

```typescript
// Type-specific error handling
try {
  await emailAPI.generateEmail(data);
} catch (error) {
  if (error instanceof NetworkError) {
    toast.error('Lost connection. Check your internet.');
  } else if (error instanceof AuthenticationError) {
    router.push('/');  // Redirect to login
  } else if (error instanceof ValidationError) {
    setFormErrors(error.validationErrors);
  } else if (error instanceof ApiError) {
    toast.error(error.getUserMessage());
  } else {
    console.error('Unknown error:', error);
    toast.error('An unexpected error occurred');
  }
}
```

### React Query Error Handling

```typescript
const mutation = useMutation({
  mutationFn: emailAPI.generateEmail,
  onError: (error) => {
    if (error instanceof ApiError) {
      toast.error(error.getUserMessage());
    }
  },
  retry: (failureCount, error) => {
    // Retry transient errors only
    return error instanceof ApiError && error.retryable && failureCount < 3;
  }
});
```

---

## Common Pitfalls & Solutions

### 1. Bypassing Session Manager

```typescript
// ❌ WRONG - Bypasses cache, causes rate limits
const { data } = await supabase.auth.getSession();
const token = data.session?.access_token;

// ✅ CORRECT - Uses cached token
const token = await sessionManager.getToken();
```

### 2. Whole-Store Subscriptions

```typescript
// ❌ WRONG - Re-renders on any store change
const store = useUIStore();
const template = store.emailTemplate;

// ✅ CORRECT - Only re-renders when template changes
const template = useEmailTemplate();
```

### 3. Missing Hydration Check

```typescript
// ❌ WRONG - Hydration mismatch error
export default function Page() {
  const template = useEmailTemplate();  // localStorage value
  return <div>{template}</div>;
}

// ✅ CORRECT - Wait for hydration
export default function Page() {
  const hydrated = useHasHydrated();
  const template = useEmailTemplate();

  if (!hydrated) return <Loading />;
  return <div>{template}</div>;
}
```

### 4. Hardcoded Query Keys

```typescript
// ❌ WRONG - Prone to typos
queryKey: ['email', 'list', userId]

// ✅ CORRECT - Type-safe factory
queryKey: queryKeys.emails.listByUser(userId, 20, 0)
```

### 5. useQueueManager Outside Layout

```typescript
// ❌ WRONG - Creates duplicate processor
function DashboardPage() {
  useQueueManager();  // Page remounts = processor restarts
}

// ✅ CORRECT - Single instance in layout
function DashboardLayout({ children }) {
  useQueueManager();  // Persists across routes
  return <>{children}</>;
}
```

### 6. Missing Signal in Queries

```typescript
// ❌ WRONG - Request continues after component unmounts
queryFn: () => emailAPI.getEmailHistory(20, 0)

// ✅ CORRECT - Auto-cancels on unmount
queryFn: ({ signal }) => emailAPI.getEmailHistory(20, 0, { signal })
```

---

## Development Workflow

### Local Development Setup

1. **Clone repository**
   ```bash
   git clone <repo>
   cd scribe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start backend** (see backend repo)
   ```bash
   # Backend should run on http://localhost:8000
   ```

5. **Start frontend**
   ```bash
   npm run dev
   # Visit http://localhost:3000
   ```

### Development Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run type-check       # TypeScript checking
npm run lint             # ESLint
npm run types:generate   # Generate Supabase types
```

### Debugging Tools

**Browser DevTools:**
- React Query Devtools - Inspect queries/mutations
- Zustand DevTools - View store state
- Network tab - Monitor API calls
- Console - Development logs

**Useful Debug Commands:**

```typescript
// In browser console

// View Zustand stores
window.__ZUSTAND_STORES__

// View React Query cache
queryClient.getQueryCache().getAll()

// Force queue processing
useQueueStore.getState().processNextItem()
```

### Best Practices Checklist

- ✅ Use session manager for all auth tokens
- ✅ Implement granular Zustand selectors
- ✅ Check hydration before rendering persisted state
- ✅ Pass signal to all React Query queries
- ✅ Use query key factory, not hardcoded keys
- ✅ Validate all API responses with Zod
- ✅ Handle errors by type (NetworkError, ValidationError, etc.)
- ✅ Initialize queue processor only in dashboard layout
- ✅ Wrap app in ErrorBoundary
- ✅ Use ProtectedRoute for authenticated pages

---

## Related Documentation

- **[QUEUE_ARCHITECTURE.md](./QUEUE_ARCHITECTURE.md)** - Deep dive into queue system
- **[PATTERNS.md](./PATTERNS.md)** - Code patterns reference
- **[MIGRATION_CLEANUP.md](./MIGRATION_CLEANUP.md)** - Migration history

---

**Last updated:** 2025-11-23
