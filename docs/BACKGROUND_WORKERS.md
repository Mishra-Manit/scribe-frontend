# Background Worker Implementation Checklist

This guide helps you decide where to place background workers, hooks with side effects, and other continuously-running functionality.

## What is a Background Worker?

A background worker is any hook or component that:
- Runs continuously or on intervals
- Makes API calls or has side effects
- Monitors state changes and reacts to them
- Needs to persist during route navigation
- Examples: Queue processors, notification pollers, WebSocket connections, analytics trackers

## Decision Tree

Use this decision tree when implementing background functionality:

```
Does it run on EVERY page (public + authenticated)?
├─ YES → Root layout (/app/layout.tsx)
└─ NO
   └─ Does it run on ALL authenticated pages?
      ├─ YES → Create/use auth layout (/app/(authenticated)/layout.tsx)
      └─ NO → Use most specific layout that covers all needed routes
         └─ Example: Dashboard-only features → /app/dashboard/layout.tsx
```

## Pre-Implementation Checklist

Before implementing a background worker, answer these questions:

- [ ] Is this functionality needed across multiple pages?
- [ ] Does it need to persist during route changes within a section?
- [ ] Will it make API calls or have side effects?
- [ ] Is it specific to authenticated users only?
- [ ] Is it specific to a section of the app (e.g., dashboard)?

## Implementation Guidelines

### ✅ DO

- **Place in layout components** - Layouts persist during navigation
- **Initialize once** - Background workers should be initialized once at the appropriate layout level
- **Document the decision** - Add a comment explaining why the hook is in that specific layout
- **Use Zustand stores for state** - Allow components to access worker state without passing props
- **Test across routes** - Verify worker stays active during navigation

### ❌ DON'T

- **Don't initialize in page components** - Pages remount on navigation, causing workers to restart
- **Don't initialize in multiple places** - This causes duplicate workers and race conditions
- **Don't guess the location** - Follow the decision tree above
- **Don't skip documentation** - Future developers need to understand why it's there

## Example: Queue Processor

The `useQueueProcessor` hook is placed in `/app/dashboard/layout.tsx` because:

1. ✅ It needs to run on ALL dashboard pages (`/dashboard`, `/dashboard/generate`, `/dashboard/template`)
2. ✅ It must persist during navigation between dashboard pages
3. ✅ It makes API calls and processes items in the background
4. ✅ It's specific to authenticated users
5. ❌ It does NOT need to run on public pages (landing, login, etc.)

**Before the fix:**
```tsx
// ❌ WRONG - In page component
// /app/dashboard/page.tsx
export default function DashboardPage() {
  useQueueProcessor(); // Restarts on navigation, doesn't run on other pages
  // ...
}
```

**After the fix:**
```tsx
// ✅ CORRECT - In dashboard layout
// /app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  useQueueProcessor(); // Runs once, persists across all dashboard pages
  return <>{children}</>;
}
```

## Common Patterns

### Pattern 1: Dashboard-Wide Worker

**Use case:** Feature needed across all dashboard pages

**Location:** `/app/dashboard/layout.tsx`

**Example:**
```tsx
'use client';

import { useQueueProcessor } from '@/hooks/queries/useQueueProcessor';

export default function DashboardLayout({ children }) {
  // Initialize dashboard-wide background workers
  useQueueProcessor();

  return <>{children}</>;
}
```

### Pattern 2: App-Wide Worker (Authenticated Only)

**Use case:** Feature needed on all authenticated pages

**Location:** `/app/(authenticated)/layout.tsx`

**Example:**
```tsx
'use client';

import { useNotificationPoller } from '@/hooks/useNotificationPoller';
import { useSessionKeepalive } from '@/hooks/useSessionKeepalive';

export default function AuthenticatedLayout({ children }) {
  // These run on ALL authenticated pages
  useNotificationPoller();
  useSessionKeepalive();

  return <>{children}</>;
}
```

### Pattern 3: Global Worker

**Use case:** Feature needed on EVERY page (public and private)

**Location:** `/app/layout.tsx`

**Example:**
```tsx
'use client';

import { useAnalytics } from '@/hooks/useAnalytics';

export default function RootLayout({ children }) {
  // This runs on EVERY page
  useAnalytics();

  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

## Testing Checklist

After implementing a background worker, test the following:

- [ ] Worker initializes when entering the section
- [ ] Worker stays active during navigation within the section
- [ ] Worker doesn't run on pages outside its scope
- [ ] No duplicate workers are created
- [ ] No console errors or warnings
- [ ] Side effects (API calls, state updates) work correctly
- [ ] Worker cleans up properly when leaving the section

## ESLint Configuration

To prevent incorrect usage, add rules to restrict where workers can be imported:

```json
{
  "rules": {
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["**/useQueueProcessor"],
            "message": "useQueueProcessor should only be imported in /app/dashboard/layout.tsx. Use queue store selectors for accessing queue state."
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting

### Issue: Worker not running when expected

**Symptoms:** Features don't work on certain pages, API calls not firing

**Solution:**
1. Check if the hook is in a layout or page component
2. If in a page, move to the appropriate layout
3. Verify the layout covers all necessary routes

### Issue: Duplicate workers running

**Symptoms:** Multiple API calls, console warnings about duplicate instances

**Solution:**
1. Search for all imports of the worker hook
2. Remove all except the one in the layout
3. Use Zustand stores or React Query to access worker state elsewhere

### Issue: Worker restarts on navigation

**Symptoms:** Processing interrupted, state reset when changing pages

**Solution:**
1. Verify hook is in a layout, not a page
2. Ensure layout is at the correct level (not too deep in the tree)
3. Check if there's a layout above that might be remounting

## Related Documentation

- [Next.js Layouts Documentation](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- [React Query Background Synchronization](https://tanstack.com/query/latest/docs/framework/react/guides/window-focus-refetching)
- [Zustand Store Patterns](https://docs.pmnd.rs/zustand/getting-started/introduction)

## Questions?

If you're unsure where to place a background worker:

1. Ask yourself: "Which pages need this functionality?"
2. Find the most specific layout that covers all those pages
3. Document your decision with a comment
4. Test thoroughly across all affected routes

When in doubt, consult this checklist or ask a team member for review.
