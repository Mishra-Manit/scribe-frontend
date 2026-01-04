# Scribe Documentation

## What is Scribe?

Scribe is a SaaS application designed for academic outreach automation. It helps students generate personalized cold emails to professors and researchers by combining web scraping, AI-powered content generation, and smart template processing.

## Tech Stack

### Frontend
- **Next.js 15.3.2** - React framework with App Router and Server Components
- **React 19.0.0** - UI library
- **TypeScript 5.x** - Type safety
- **Zustand 5.0.8** - Client-side state management (UI state, queue)
- **TanStack Query v5** (React Query) - Server state, caching, data fetching
- **Tailwind CSS 3.3.5** - Styling
- **shadcn/ui** - Component library (Radix UI primitives)
- **Zod 4.1.12** - Runtime validation
- **Framer Motion 12.12.2** - Animations

### Backend
- **FastAPI** (Python) - External backend service
  - Production: `https://api.manit.codes`
  - Development: `http://localhost:8000`
- **Celery** - Asynchronous task processing
- **Redis** - Task queue backend

### Infrastructure
- **Supabase** - Authentication (Google OAuth) and PostgreSQL database
- **Vercel** - Frontend deployment (Next.js)
- **Custom** - Backend deployment

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js 15 Application                        │ │
│  │                                                             │ │
│  │  ┌─────────────────┐      ┌──────────────────┐            │ │
│  │  │  React Components│      │  Queue Processor │            │ │
│  │  │  - Dashboard     │◄────►│  (Layout Hook)   │            │ │
│  │  │  - Email Gen     │      │  - Sequential    │            │ │
│  │  │  - History       │      │  - Polling       │            │ │
│  │  └─────────────────┘      └──────────────────┘            │ │
│  │           ▲                         ▲                       │ │
│  │           │                         │                       │ │
│  │  ┌────────┴────────────┬───────────┴────────┐             │ │
│  │  │  State Management   │                     │             │ │
│  │  ├─────────────────────┤                     │             │ │
│  │  │ Zustand             │  React Query        │             │ │
│  │  │ - UI State          │  - Email History    │             │ │
│  │  │ - Queue State       │  - Task Status      │             │ │
│  │  │ - localStorage      │  - Auto-polling     │             │ │
│  │  └─────────────────────┴─────────────────────┘             │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
│                            │                                      │
│                            │ JWT Token (Supabase)                 │
│                            ▼                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                   ┌─────────┴─────────┐
                   │   API Client      │
                   │  - Retry Logic    │
                   │  - Deduplication  │
                   │  - Error Handling │
                   └─────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │   Supabase   │  │   FastAPI    │  │   FastAPI    │
  │              │  │   Backend    │  │   Backend    │
  │  - Auth      │  │              │  │              │
  │  - Database  │  │  POST /api/  │  │  GET /api/   │
  │  - JWT       │  │  email/      │  │  email/      │
  │              │  │  generate    │  │  status/{id} │
  └──────────────┘  └──────┬───────┘  └──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Celery    │
                    │   Worker    │
                    │             │
                    │  1. Scrape  │
                    │  2. AI Gen  │
                    │  3. Save DB │
                    └─────────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for auth)
- Access to FastAPI backend

### Environment Setup

Create `.env.local` in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000  # Development
# NEXT_PUBLIC_API_BASE_URL=https://api.manit.codes  # Production
```

### Installation

```bash
# Install dependencies
npm install

# Generate Supabase types (optional)
npm run types:generate

# Run development server
npm run dev
```

Visit `http://localhost:3000`

### Running the Backend

```bash
# See backend repository for setup instructions
# Development: http://localhost:8000
# Production: https://api.manit.codes
```

## Documentation Index

### Core Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed system architecture, authentication flow, API client design, state management patterns, and best practices

- **[QUEUE_ARCHITECTURE.md](./QUEUE_ARCHITECTURE.md)** - Deep dive into the client-side queue system, three-hook pattern, sequential processing, polling mechanism, and integration guide

- **[PATTERNS.md](./PATTERNS.md)** - Established code patterns including session manager, granular selectors, hydration safety, query key factory, and error handling

### Historical Documentation

- **[MIGRATION_CLEANUP.md](./MIGRATION_CLEANUP.md)** - Record of queue system migration from complex multi-hook implementation to simplified Zustand + React Query architecture

## Key Concepts

### Client-Side Queue Processing

Unlike traditional server-side queue systems (Bull, BullMQ, Redis), Scribe uses a **client-side queue** implemented with Zustand and React Query. The queue processor runs in the browser within the dashboard layout component, processing email generation tasks sequentially with 2-second polling for status updates.

**Why client-side?**
- Simplicity - No infrastructure to maintain
- Cost-effective - No always-on background processes
- User visibility - Immediate feedback and progress tracking
- Debugging - Everything visible in browser DevTools

**Trade-offs:**
- Single-device processing (only active tab processes queue)
- Interruption on tab close (recovery mechanism handles this)
- Sequential processing (one at a time)

→ See [QUEUE_ARCHITECTURE.md](./QUEUE_ARCHITECTURE.md) for complete details

### Authentication Flow

1. User clicks "Sign in with Google" on landing page
2. Supabase handles OAuth redirect
3. Callback route exchanges code for session
4. AuthContext initializes user in backend database
5. Session manager caches JWT token for subsequent API calls

→ See [ARCHITECTURE.md](./ARCHITECTURE.md#authentication-architecture) for details

### State Management Strategy

**Zustand** - Client state (UI forms, queue items)
- Persisted to localStorage
- Survives page refreshes
- Granular selectors for performance

**React Query** - Server state (emails, task status)
- Automatic caching (3-5 minute retention)
- Background refetching
- Polling for async operations

→ See [ARCHITECTURE.md](./ARCHITECTURE.md#state-management-strategy) for patterns

### API Client Architecture

Production-grade HTTP client with:
- Exponential backoff retry for transient failures
- Request deduplication (100ms window)
- Custom error classes for granular handling
- AbortController integration with React Query
- Automatic JWT injection via session manager

→ See [ARCHITECTURE.md](./ARCHITECTURE.md#api-client-architecture) for implementation

## Common Tasks

### Adding a New Feature

1. **Plan state requirements**
   - Client state (UI forms, user input) → Zustand
   - Server state (API data) → React Query

2. **Create API endpoint wrapper** (if needed)
   ```typescript
   // lib/api/index.ts
   export const myFeatureAPI = {
     getData: async (options?: ApiRequestOptions) => {
       return apiClient.requestWithValidation(
         '/api/my-feature',
         MyDataSchema,
         options
       );
     }
   };
   ```

3. **Add query key** (if needed)
   ```typescript
   // lib/query-keys.ts
   export const queryKeys = {
     myFeature: {
       all: ['myFeature'] as const,
       data: () => [...queryKeys.myFeature.all, 'data'] as const,
     }
   };
   ```

4. **Create React Query hook**
   ```typescript
   // hooks/useMyFeature.ts
   export function useMyFeature() {
     return useQuery({
       queryKey: queryKeys.myFeature.data(),
       queryFn: ({ signal }) => myFeatureAPI.getData({ signal })
     });
   }
   ```

5. **Build UI component** with protected route if needed

### Debugging Queue Issues

1. **Check queue state**
   ```typescript
   // In browser console
   window.__ZUSTAND_STORES__ // View all Zustand stores
   ```

2. **Inspect React Query cache**
   ```typescript
   // Add React Query Devtools
   import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
   ```

3. **Check task status polling**
   - Open Network tab in DevTools
   - Look for `/api/email/status/{task_id}` requests every 2 seconds
   - Verify task progresses: PENDING → STARTED → SUCCESS

4. **Verify queue processor is running**
   - Should be initialized in `/app/dashboard/layout.tsx`
   - Check console for processing logs (dev mode)

### Running Tests

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Type checking
npm run type-check

# Linting
npm run lint
```

### Generating Supabase Types

```bash
# Auto-generate TypeScript types from Supabase schema
npm run types:generate
```

## Development Workflow

### Local Development

1. Start backend service (see backend repo)
2. Run `npm run dev`
3. Open `http://localhost:3000`
4. Sign in with Google OAuth
5. Test email generation flow

### Best Practices

- **Always use session manager** - Never bypass `sessionManager.getToken()`
- **Use granular selectors** - Don't subscribe to entire Zustand store
- **Check hydration** - Use `useHasHydrated()` before rendering persisted state
- **Pass signals to queries** - Enable automatic request cancellation
- **Use query key factory** - Don't hardcode query keys
- **Validate with Zod** - Runtime validation for all API responses

→ See [PATTERNS.md](./PATTERNS.md) for comprehensive pattern guide

## Project Structure

```
scribe/
├── app/                    # Next.js App Router
│   ├── dashboard/          # Protected dashboard routes
│   │   └── layout.tsx      # Queue processor initialization
│   ├── auth/               # OAuth callback
│   └── page.tsx            # Landing page
├── components/             # React components
│   ├── ui/                 # shadcn/ui primitives
│   └── ...                 # Feature components
├── hooks/                  # Custom React hooks
│   ├── useQueueManager.ts  # Queue processor
│   ├── useQueueActions.ts  # Queue actions
│   ├── useQueueState.ts    # Queue state selectors
│   └── ...
├── lib/                    # Core utilities
│   ├── api/                # API client
│   ├── auth/               # Session management
│   ├── schemas.ts          # Zod schemas
│   └── query-keys.ts       # React Query keys
├── stores/                 # Zustand state stores
│   ├── simple-queue-store.ts
│   └── ui-store.ts
├── context/                # React Context
│   └── AuthContextProvider.tsx
├── types/                  # TypeScript definitions
│   └── database.types.ts   # Supabase types
└── docs/                   # Documentation (you are here)
```

## Contributing

1. Follow established patterns documented in [PATTERNS.md](./PATTERNS.md)
2. Write type-safe code with Zod validation
3. Add tests for new features
4. Update documentation for architectural changes
5. Use conventional commit messages

## Troubleshooting

### Authentication Issues

**Problem:** Getting 401 errors despite being logged in

**Solution:** Check Supabase session
```typescript
const { supabaseReady } = useAuth();
if (!supabaseReady) {
  // Wait for Supabase to initialize
}
```

### Queue Not Processing

**Problem:** Queue items stuck in "pending" status

**Solutions:**
1. Verify `useQueueManager` is initialized in dashboard layout
2. Check prerequisites: user authenticated, template provided, Supabase ready
3. Inspect browser console for errors
4. Verify backend is running and accessible

### Hydration Errors

**Problem:** "Text content does not match server-rendered HTML"

**Solution:** Use hydration safety pattern
```typescript
const hasHydrated = useHasHydrated();
if (!hasHydrated) return <LoadingSpinner />;
// Now safe to render persisted state
```

### Performance Issues

**Problem:** Too many re-renders

**Solution:** Use granular Zustand selectors
```typescript
// ✅ Good - Only re-renders when template changes
const template = useEmailTemplate();

// ❌ Bad - Re-renders on any UI store change
const { emailTemplate } = useUIStore();
```

## Support

For questions or issues:
1. Check this documentation first
2. Review specific documentation files for deep dives
3. Check browser console and Network tab for debugging
4. Review code examples in [PATTERNS.md](./PATTERNS.md)

---

**Documentation maintained for Scribe v1.0**

Last updated: 2025-11-23
