# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15.3.2 (App Router) with React 19, TypeScript
- **Backend API**: External API at `scribeserver.onrender.com` (or `localhost:8000` in dev)
- **Authentication**: Supabase Auth SSR
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS with shadcn/ui components

### Core Application Flow

This is an email generation application with a persistent background queue system:

1. **Authentication Flow**:
   - Supabase handles OAuth/email authentication with automatic token refresh
   - JWT tokens are cached in Zustand auth store (stores/auth-store.ts) for synchronous access
   - AuthContextProvider (context/AuthContextProvider.tsx) manages user state, syncs with Zustand, and initializes users via backend API
   - **CRITICAL**: Token refresh is automatic via `createBrowserClient` with `autoRefreshToken: true` (config/supabase.ts) - tokens refresh ~5 minutes before expiry, and `onAuthStateChange` events sync refreshed tokens to Zustand

2. **Email Generation Queue**:
   - Queue is managed by `useQueueManager` hook (hooks/useQueueManager.ts)
   - State persisted in `simple-queue-store.ts` (Zustand with localStorage)
   - **Queue runs in dashboard layout** (app/dashboard/layout.tsx) to persist across all dashboard routes
   - Processing is sequential with mutex locks to prevent duplicate processing
   - Task status is polled every 2 seconds using React Query
   - Queue items auto-start when user, template, and Supabase are ready

3. **API Layer Architecture**:
   ```
   Components → React Query → api (userAPI/emailAPI/templateAPI) → apiClient → Backend API
   ```
   - `apiClient` (lib/api/client.ts): Production-grade client with retry, deduplication, request cancellation
   - `api` (lib/api/index.ts): Unified API with user, email, and template namespaces, includes Zod validation
   - All requests automatically include JWT auth via synchronous `authStore.getToken()`

4. **State Management**:
   - **Zustand stores**:
     - `auth-store.ts`: JWT session cache synced with Supabase
     - `simple-queue-store.ts`: Queue items and processing state
     - `ui-store.ts`: UI state (email template, recipient info, etc.)
   - **React Query**: Server state, automatic caching, and polling
   - **AuthContext**: User authentication state and profile

### Key Technical Details

**Session Management (stores/auth-store.ts)**:
- Zustand store mirrors Supabase auth state for synchronous token access
- `createBrowserClient` with `autoRefreshToken: true` automatically refreshes tokens ~5 minutes before expiry
- When tokens refresh, Supabase triggers `onAuthStateChange` events which sync the new session to Zustand
- AuthContextProvider listens to these events and updates the Zustand store in real-time
- Tokens retrieved synchronously (no async overhead) from Zustand store via `authStore.getToken()`
- **Always use `authStore.getToken()` for auth** - it provides instant access to cached tokens

**Middleware JWT Validation (middleware.ts)**:
- Uses `getClaims()` to validate JWT signatures locally using published public keys
- Does NOT use `getSession()` (insecure - doesn't validate) or `getUser()` (network-dependent)
- Validates on every request without network overhead
- Fail-open strategy: logs errors but doesn't aggressively clear sessions
- Lets AuthContextProvider handle user initialization in backend
- Public keys fetched automatically from `/.well-known/jwks.json` endpoint

**Queue Processing (hooks/useQueueManager.ts)**:
- Uses processing lock (`processingLockRef`) to prevent race conditions
- Auto-starts when prerequisites are met (user, template, Supabase ready)
- Recovery mechanism for interrupted processing on mount
- Task completion triggers next item after 500ms delay to ensure state updates complete
- Items auto-removed after completion (2s) or failure (3s)

**API Client Features (lib/api/client.ts)**:
- Request cancellation via AbortController (auto-wired with React Query)
- Exponential backoff retry with configurable attempts
- Request deduplication for GET requests (100ms TTL)
- Custom error classes: `NetworkError`, `AuthenticationError`, `ValidationError`, `ServerError`, `RateLimitError`, `AbortError`
- Runtime Zod validation with `requestWithValidation()`
- 60-second default timeout

**Environment Configuration**:
- `.env.example` contains template for environment variables
- Key variables:
  - `NEXT_PUBLIC_ENVIRONMENT`: "PRODUCTION" or "DEVELOPMENT"
  - `NEXT_PUBLIC_API_BASE_URL`: Backend API URL
  - `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase anon key

### Important Patterns

**Adding New API Endpoints**:
1. Define Zod schema in `lib/schemas.ts`
2. Add endpoint function to appropriate namespace in `lib/api/index.ts`
3. Use `apiClient.requestWithValidation()` for runtime validation
4. Create React Query hook in component or custom hook file

**Queue Item Processing**:
- Queue state is managed entirely by `useSimpleQueueStore`
- Queue logic (processing, polling) is in `useQueueManager`
- **Never call `processNextItem()` directly** - it's managed by the hook's effects
- To add items: use `useSimpleQueueStore((state) => state.addItems)` or `addToQueue()` from `useQueueManager`

**Component Patterns**:
- All pages are client components (`"use client"`)
- Protected routes wrapped with `<ProtectedRoute>`
- Use `useAuth()` hook to access user state and `supabaseReady` flag
- Wait for Zustand hydration with `useHasHydrated()` before accessing persisted state

**Error Handling**:
- API errors are typed and can be caught specifically (e.g., `catch (error instanceof AuthenticationError)`)
- React Query provides `isError` and `error` states automatically
- Session manager clears cache on auth errors - user will be redirected to login

### Project Structure Notes

- **app/**: Next.js App Router pages and layouts
  - `dashboard/layout.tsx`: Initializes queue manager for all dashboard routes
- **components/**: Reusable React components
  - `ui/`: shadcn/ui components
- **hooks/**: Custom React hooks (auth, queue, state management)
- **lib/**: Core utilities
  - `api/`: API client infrastructure (client, errors, retry, deduplication)
  - `supabase/`: Supabase client and storage utilities
- **stores/**: Zustand state stores
- **context/**: React Context providers
- **types/**: TypeScript type definitions (auto-generated from Supabase)
- **config/**: Configuration files (Supabase client, API config)

### Common Gotchas

1. **Never skip Supabase ready check**: Always wait for `supabaseReady` from `useAuth()` before making authenticated API calls
2. **Queue processor location**: The queue manager MUST be initialized in `app/dashboard/layout.tsx` to persist across navigation
3. **Session token caching**: Token access is synchronous via `authStore.getToken()` - automatic refresh happens via `autoRefreshToken: true` in the browser client, with refreshed tokens synced to Zustand through `onAuthStateChange` events
4. **Zustand hydration**: Check `useHasHydrated()` before accessing persisted state to avoid SSR hydration mismatches
5. **React Query signals**: AbortController signals are automatically passed by React Query - don't override them
6. **Mutex locks**: The queue processing uses mutexes - don't add additional processing calls without understanding the locking mechanism
7. **Middleware JWT validation**: Middleware uses `getClaims()` to validate JWTs locally without clearing sessions - expired tokens are handled gracefully by client-side auth flow
