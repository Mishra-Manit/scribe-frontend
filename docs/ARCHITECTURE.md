# Scribe Architecture Documentation

## Overview

This document outlines key architectural decisions and patterns used in the Scribe application.

## Table of Contents

1. [Background Workers and Global Hooks](#background-workers-and-global-hooks)
2. [State Management](#state-management)
3. [Data Fetching](#data-fetching)

---

## Background Workers and Global Hooks

### Queue Processor Pattern

The queue processor (`useQueueProcessor`) is a background worker that automatically processes email generation requests from the queue.

#### Implementation Location

**Location:** `/app/dashboard/layout.tsx`

**Why dashboard layout and not:**

| Option | Why Not |
|--------|---------|
| **Root layout** | Queue processing is dashboard-specific functionality. Running it on public pages (landing, login, signup) would waste resources and could cause errors when user isn't authenticated. |
| **Individual pages** | Pages remount during navigation, causing the processor to restart. This interrupts in-flight requests and creates race conditions. Items queued on one page wouldn't be processed until navigating to the page with the processor. |
| **Per-page initialization** | Would require calling `useQueueProcessor()` in every dashboard page, violating DRY principle. Makes ownership unclear and prone to bugs when adding new pages. |
| **Dashboard layout** | ✅ **CHOSEN** - Runs once when entering dashboard section, persists across all dashboard routes (`/dashboard`, `/dashboard/generate`, `/dashboard/template`), processes items immediately regardless of which page queued them. |

#### Code Example

```tsx
// /app/dashboard/layout.tsx
'use client';

import { useQueueProcessor } from '@/hooks/queries/useQueueProcessor';

/**
 * Dashboard Layout Component
 *
 * This layout wraps all dashboard routes and ensures the queue processor
 * runs consistently across the entire dashboard section.
 *
 * The queue processor is initialized here (not in individual pages) because:
 * 1. It's a background worker that needs to run across all dashboard pages
 * 2. Layout components persist during route changes, preventing processor restarts
 * 3. Ensures items queued on any dashboard page are processed immediately
 *
 * IMPORTANT: Individual pages should NOT call useQueueProcessor()
 */
export default function DashboardLayout({ children }) {
  useQueueProcessor();
  return <>{children}</>;
}
```

#### How It Works

1. **User enters dashboard** → Layout mounts → `useQueueProcessor()` initializes
2. **User navigates** `/dashboard` → `/dashboard/generate` → Layout persists → Processor stays active
3. **User adds items** to queue on any page → Processor immediately picks them up
4. **Processing happens** in background while user continues working
5. **User leaves dashboard** → Layout unmounts → Processor cleans up

#### Historical Context: The Bug We Fixed

**Before (Broken):**
```tsx
// /app/dashboard/page.tsx
export default function DashboardPage() {
  useQueueProcessor(); // ❌ Only ran on main dashboard page
  // ...
}
```

**Problem:**
- User on `/dashboard/generate` clicks "Generate Emails"
- Items added to queue successfully
- Processor NOT running (different page)
- API requests don't fire
- User reloads page or navigates to `/dashboard`
- Dashboard page mounts → Processor starts
- Processor finds pending items → NOW requests fire

**After (Fixed):**
```tsx
// /app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  useQueueProcessor(); // ✅ Runs on ALL dashboard pages
  return <>{children}</>;
}
```

**Result:**
- User on ANY dashboard page clicks "Generate Emails"
- Items added to queue
- Processor ALREADY running (in layout)
- API requests fire immediately
- No navigation required

### Future Background Workers

All dashboard-wide background functionality should follow this pattern:

```tsx
// /app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  // Dashboard-wide background workers
  useQueueProcessor();        // Email generation queue
  useNotificationPoller();    // Future: Real-time notifications
  useDashboardAnalytics();    // Future: Analytics tracking

  return <>{children}</>;
}
```

**Key Principles:**

1. **Scope specificity** - Place workers at the most specific layout covering all needed routes
2. **Single initialization** - Each worker should only be initialized once
3. **Document decisions** - Explain WHY the worker is in that location
4. **Use stores for state** - Zustand/React Query allow components to access worker state without prop drilling

### Related Documentation

For detailed guidance on implementing background workers, see [BACKGROUND_WORKERS.md](./BACKGROUND_WORKERS.md).

---

## State Management

### Zustand Stores

Scribe uses [Zustand](https://docs.pmnd.rs/zustand) for client-side state management.

**Benefits:**
- Minimal boilerplate
- No provider wrapping needed
- Easy to create derived selectors
- Built-in localStorage persistence
- Works seamlessly with React Query

**Key Stores:**

| Store | Purpose | Persistence |
|-------|---------|-------------|
| `queue-store.ts` | Email generation queue state | ✅ localStorage |
| `ui-store.ts` | UI state (modals, hover, copied) | ✅ localStorage |

**Example Pattern:**

```tsx
// Creating selectors for granular subscriptions
export const usePendingCount = () =>
  useQueueStore((state) => state.getPendingCount());

export const useProcessingCount = () =>
  useQueueStore((state) => state.getProcessingCount());

// Components only re-render when their specific slice changes
function QueueStatus() {
  const pending = usePendingCount();    // Only re-renders when pending changes
  const processing = useProcessingCount(); // Only re-renders when processing changes
  // ...
}
```

### When to Use Zustand vs React Query

**Use Zustand for:**
- Client-side only state (UI state, temporary data)
- State that needs localStorage persistence
- State shared across many components
- State that changes frequently from user interactions

**Use React Query for:**
- Server state (fetching, caching, synchronizing)
- Background refetching
- Optimistic updates
- Request deduplication

**Use Both Together:**
```tsx
// Zustand manages the queue (client state with persistence)
const addToQueue = useAddToQueue();

// React Query handles the API call (server state)
const generateEmail = useGenerateEmail({
  onSuccess: (taskId) => {
    // Update Zustand store with server response
    updateQueueItem(itemId, { taskId });
  }
});
```

---

## Data Fetching

### React Query

Scribe uses [TanStack Query](https://tanstack.com/query) (React Query) for server state management.

**Architecture:**

```
hooks/
├── queries/           # Read operations
│   ├── useEmailHistory.ts
│   ├── useTaskStatus.ts
│   └── useQueueProcessor.ts
├── mutations/         # Write operations
│   └── useGenerateEmail.ts
lib/
├── api/              # API client layer
│   ├── index.ts      # Main API methods
│   ├── client.ts     # HTTP client with auth
│   └── errors.ts     # Error handling
└── query-keys.ts     # Centralized query key management
```

**Key Patterns:**

1. **Centralized query keys** - All keys defined in `query-keys.ts` for type safety
2. **Automatic cancellation** - Pass `signal` from query context to API
3. **Optimistic updates** - Update UI before server confirms
4. **Background refetching** - Keep data fresh with window focus refetching

**Example:**

```tsx
// hooks/queries/useEmailHistory.ts
export function useEmailHistory() {
  return useQuery({
    queryKey: queryKeys.emails.lists(),
    queryFn: ({ signal }) => emailAPI.getEmailHistory(20, 0, { signal }),
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider fresh for 30 seconds
  });
}
```

---

## Best Practices

### Layout Hierarchy

```
app/
├── layout.tsx                    # Root: Global workers (analytics)
└── dashboard/
    ├── layout.tsx               # Dashboard: Dashboard-specific workers (queue processor)
    ├── page.tsx                 # Home: Just UI, no workers
    ├── generate/
    │   └── page.tsx            # Generate: Just UI, no workers
    └── template/
        └── page.tsx            # Template: Just UI, no workers
```

### Component Responsibilities

**Layouts:**
- Initialize background workers
- Provide shared UI (nav, footers)
- Handle section-wide concerns

**Pages:**
- Display content
- Handle user interactions
- Trigger actions (add to queue, submit forms)
- Access state through stores/queries

**Components:**
- Reusable UI elements
- Pure presentation when possible
- Access state through props or stores

### Error Handling

**Layers of error handling:**

1. **API Layer** - Transform HTTP errors to typed error classes
2. **React Query** - Retry transient failures, expose error state
3. **UI Layer** - Show user-friendly error messages

---

## Future Considerations

### Potential Improvements

1. **Service Workers** - Move queue processing to service worker for true background operation
2. **WebSockets** - Real-time status updates instead of polling
3. **Queue Priority** - Support for urgent vs normal emails
4. **Batch Processing** - Process multiple emails in parallel
5. **Analytics Dashboard** - Track queue performance metrics

### Scalability

Current architecture supports:
- ✅ Multiple queue items processed sequentially
- ✅ Persistence across page refreshes
- ✅ Automatic retry on failure
- ✅ Real-time status updates via polling

Future needs may require:
- Parallel processing
- Queue prioritization
- Advanced retry strategies
- Performance monitoring

---

## Questions?

For implementation questions about background workers, see [BACKGROUND_WORKERS.md](./BACKGROUND_WORKERS.md).

For API client usage, see [README.md](./README.md).
