# Scribe - Modern Full-Stack Architecture Guide

> Comprehensive architectural improvements based on production-grade patterns

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Full-Stack Architecture Overview](#full-stack-architecture-overview)
3. [Backend Deep Dive](#backend-deep-dive)
4. [Frontend State Management Migration](#frontend-state-management-migration)
5. [Query Key Hierarchy](#query-key-hierarchy)
6. [Custom Hooks with React Query](#custom-hooks-with-react-query)
7. [API Layer Enhancements](#api-layer-enhancements)
8. [TypeScript Excellence](#typescript-excellence)
9. [Component Architecture](#component-architecture)
10. [Performance Optimizations](#performance-optimizations)
11. [Feature-First Project Structure](#feature-first-project-structure)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

**Project:** Scribe - AI-powered cold email generation platform for research outreach

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS + shadcn/ui
- Zustand 5.0 (installed, not yet utilized)

**Backend:**
- FastAPI (Python 3.13)
- Celery 5.3 + Redis (async task processing)
- PostgreSQL (via Supabase)
- SQLAlchemy 2.0 ORM
- Alembic migrations

**AI Layer:**
- Anthropic Claude Haiku 4.5 (fast operations: parsing, summarization)
- Anthropic Claude Sonnet 4.5 (high-quality: email composition)
- pydantic-ai (structured LLM outputs)
- Google Custom Search API

**Observability:**
- Logfire (LLM call tracking, distributed tracing, cost monitoring)

### Current State Assessment

**Strengths:**
- ✅ Successfully migrated from Firebase to Supabase
- ✅ Backend-first architecture with JWT validation
- ✅ 4-step AI pipeline for email generation
- ✅ Async task processing with Celery
- ✅ Basic type safety with TypeScript
- ✅ Zustand already installed (ready to use)

**Pain Points:**
- ❌ Context API creates unnecessary re-renders
- ❌ No centralized cache management for server state
- ❌ Email history polling every 5 seconds (inefficient)
- ❌ LocalStorage management scattered across components
- ❌ No request cancellation for abandoned operations
- ❌ Missing optimistic updates for instant UX
- ❌ No code splitting - entire app loads at once
- ❌ Types manually maintained (should be generated from Supabase)
- ❌ No proper error boundaries or retry logic

### Modernization Goals

1. **Performance:** 50% faster page loads through code splitting
2. **UX:** Instant feedback with optimistic updates
3. **Efficiency:** Intelligent caching reduces API calls by 70%
4. **Type Safety:** Zero manual type definitions for database models
5. **Scalability:** Feature-first architecture supports rapid growth
6. **Maintainability:** Composite hooks reduce code duplication by 60%

### Success Metrics

**Before Migration:**
- Bundle Size: ~200KB
- Time to Interactive: ~3s
- API calls per hour: ~720 (polling every 5s)
- Re-renders per action: ~15
- Type Coverage: ~70%
- Backend documentation: Partial

**After Migration:**
- Bundle Size: ~80KB (60% ↓)
- Time to Interactive: ~1.2s (60% ↓)
- API calls per hour: ~10 (98.6% ↓)
- Re-renders per action: ~2 (87% ↓)
- Type Coverage: 100%
- Backend documentation: Complete

**Estimated Total Migration Time:** 16-24 hours

---

## Full-Stack Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Scribe Platform                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────┐                                          │
│  │  Frontend            │                                          │
│  │  Next.js 15 + React  │                                          │
│  │                      │                                          │
│  │  - Zustand (client)  │                                          │
│  │  - React Query (server)                                         │
│  │  - Supabase Auth     │                                          │
│  └──────────┬───────────┘                                          │
│             │                                                      │
│             │ JWT Token                                            │
│             │                                                      │
│             ▼                                                      │
│  ┌──────────────────────┐         ┌──────────────────────┐         │
│  │  Backend API         │────────▶│  Supabase PostgreSQL │         │
│  │  FastAPI             │  CRUD   │  Database            │         │
│  │                      │         │                      │         │
│  │  - JWT Validation    │         │  - users table       │         │
│  │  - Request Routing   │         │  - emails table      │         │
│  │  - Celery Tasks      │         │  - JSONB metadata    │         │
│  └──────────┬───────────┘         └──────────────────────┘         │
│             │                                                      │
│             │ Task Queue                                           │
│             │                                                      │
│             ▼                                                      │
│  ┌──────────────────────┐         ┌──────────────────────┐         │
│  │  Celery Worker       │────────▶│  Redis               │         │
│  │                      │  Store  │  Broker + Results    │         │
│  │  4-Step Pipeline:    │         │                      │         │
│  │  1. Template Parser  │         │  - Task queue        │         │
│  │  2. Web Scraper      │         │  - Progress updates  │         │
│  │  3. ArXiv Helper     │         │  - Result caching    │         │
│  │  4. Email Composer   │         └──────────────────────┘         │
│  └──────────┬───────────┘                                          │
│             │                                                      │
│             │ API Calls                                            │
│             │                                                      │
│             ▼                                                      │
│  ┌──────────────────────┐         ┌──────────────────────┐         │
│  │  AI Services         │         │  Web Services        │         │
│  │                      │         │                      │         │
│  │  - Claude Haiku 4.5  │         │  - Google Search API │         │
│  │  - Claude Sonnet 4.5 │         │  - Playwright        │         │
│  │  - pydantic-ai       │         │  - ArXiv API         │         │
│  └──────────────────────┘         └──────────────────────┘         │
│                                                                     │
│  ┌──────────────────────────────────────────────────────┐          │
│  │  Observability: Logfire                             │          │
│  │  - LLM call tracking (tokens, cost, latency)        │          │
│  │  - Distributed tracing across pipeline steps        │          │
│  │  - Chain-of-thought reasoning logs                  │          │
│  └──────────────────────────────────────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Email Generation

```
1. User submits form
   Frontend → POST /api/email/generate

2. Backend creates Celery task
   FastAPI → Celery → Redis (task_id returned)

3. Frontend polls task status
   Frontend → GET /api/email/status/{task_id} (every 3s)

4. Celery worker executes 4-step pipeline
   Step 1: Template Parser (~1.2s)
   Step 2: Web Scraper (~5.3s)
   Step 3: ArXiv Helper (~0.8s)
   Step 4: Email Composer (~3.1s)

5. Worker writes to database
   Email saved to PostgreSQL

6. Frontend fetches completed email
   Frontend → GET /api/email/{email_id}
```

### Responsibilities

**Frontend:**
- UI components and layouts
- Client-side state (UI preferences, forms, temporary data)
- Form validation and user interactions
- Supabase Auth integration (sign-in, sign-out, session management)
- API calls to backend for all data operations
- Caching and optimistic updates (React Query)

**Backend:**
- JWT token validation (Supabase)
- All database operations (CRUD via SQLAlchemy)
- Business logic and validation
- Async task orchestration (Celery)
- AI pipeline execution
- External API integration (Google, ArXiv, Claude)

**Worker:**
- Execute long-running email generation pipeline
- Progress updates via Redis
- Error handling and retry logic
- Write results to database

---

## Backend Deep Dive

### API Endpoints

#### Health & Root

**GET /**
```json
{
  "message": "Scribe API",
  "version": "1.0.0",
  "status": "running"
}
```

**GET /health**
```json
{
  "status": "healthy",
  "service": "scribe-api",
  "database": "connected",
  "environment": "production"
}
```

#### User Management

**POST /api/user/init**
- **Purpose:** Initialize user profile (idempotent)
- **Auth:** Required (JWT)
- **Request:**
  ```json
  {
    "display_name": "John Doe" // Optional
  }
  ```
- **Response:**
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "generation_count": 0,
    "created_at": "2025-01-15T10:30:00Z"
  }
  ```

**GET /api/user/profile**
- **Purpose:** Get current user's profile
- **Auth:** Required (JWT)
- **Response:**
  ```json
  {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "generation_count": 42,
    "created_at": "2025-01-15T10:30:00Z"
  }
  ```

#### Email Generation

**POST /api/email/generate**
- **Purpose:** Start async email generation
- **Auth:** Required (JWT)
- **Queue:** `email_default` (Celery)
- **Request:**
  ```json
  {
    "email_template": "Hi {{name}}, I saw your work on {{research}}...",
    "recipient_name": "Dr. Jane Smith",
    "recipient_interest": "machine learning for healthcare",
    "template_type": "research" // enum: research, book, general
  }
  ```
- **Response:**
  ```json
  {
    "task_id": "abc-123-def-456"
  }
  ```

**GET /api/email/status/{task_id}**
- **Purpose:** Check generation task status
- **Auth:** Required (JWT)
- **States:** PENDING, STARTED, SUCCESS, FAILURE
- **Response (In Progress):**
  ```json
  {
    "task_id": "abc-123",
    "status": "STARTED",
    "result": {
      "current_step": "web_scraper",
      "step_status": "running",
      "step_timings": {
        "template_parser": 1.2,
        "web_scraper": 2.5
      }
    }
  }
  ```
- **Response (Success):**
  ```json
  {
    "task_id": "abc-123",
    "status": "SUCCESS",
    "result": {
      "email_id": "email-uuid",
      "current_step": "completed",
      "step_timings": {
        "template_parser": 1.2,
        "web_scraper": 5.3,
        "arxiv_helper": 0.8,
        "email_composer": 3.1
      }
    }
  }
  ```
- **Response (Failure):**
  ```json
  {
    "task_id": "abc-123",
    "status": "FAILURE",
    "error": {
      "message": "Failed to scrape URLs",
      "type": "ScrapingError",
      "failed_step": "web_scraper"
    }
  }
  ```

**GET /api/email/{email_id}**
- **Purpose:** Retrieve specific email
- **Auth:** Required (JWT)
- **Authorization:** User can only access their own emails
- **Response:**
  ```json
  {
    "id": "email-uuid",
    "user_id": "user-uuid",
    "recipient_name": "Dr. Jane Smith",
    "recipient_interest": "machine learning for healthcare",
    "email_message": "Hi Dr. Smith,\n\nI was impressed by your recent work...",
    "template_type": "research",
    "metadata": {
      "search_terms": ["Dr. Jane Smith machine learning healthcare"],
      "scraped_urls": ["https://university.edu/jsmith"],
      "arxiv_papers": [
        {
          "title": "Neural Networks for Medical Diagnosis",
          "arxiv_url": "https://arxiv.org/abs/1234.5678",
          "year": "2024"
        }
      ],
      "step_timings": {
        "template_parser": 1.2,
        "web_scraper": 5.3,
        "arxiv_helper": 0.8,
        "email_composer": 3.1
      }
    },
    "created_at": "2025-01-15T10:35:00Z"
  }
  ```

**GET /api/email/**
- **Purpose:** List user's email history
- **Auth:** Required (JWT)
- **Query Parameters:**
  - `limit` (default: 20, max: 100)
  - `offset` (default: 0)
- **Response:**
  ```json
  [
    {
      "id": "email-uuid-1",
      "recipient_name": "Dr. Jane Smith",
      "email_message": "Hi Dr. Smith...",
      "created_at": "2025-01-15T10:35:00Z"
    },
    // ... more emails
  ]
  ```

### Database Schema

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,                  -- Supabase auth.users UUID
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  generation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_created_at ON users(created_at);
```

#### Emails Table
```sql
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_interest VARCHAR(500) NOT NULL,
  email_message TEXT NOT NULL,
  template_type template_type_enum NOT NULL,  -- ENUM: research, book, general
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX ix_emails_user_id ON emails(user_id);
CREATE INDEX ix_emails_created_at ON emails(created_at) USING btree;
CREATE INDEX ix_emails_user_created ON emails(user_id, created_at);

-- Enable full-text search on email content (optional)
CREATE INDEX ix_emails_message_fts ON emails USING gin(to_tsvector('english', email_message));
```

#### JSONB Metadata Structure
```json
{
  "search_terms": ["Dr. Jane Smith machine learning healthcare"],
  "template_type": "research",
  "scraped_urls": [
    "https://university.edu/jsmith",
    "https://scholar.google.com/citations?user=abc123"
  ],
  "scraping_metadata": {
    "total_attempts": 5,
    "successful_scrapes": 3,
    "success_rate": 0.6,
    "total_content_length": 15000
  },
  "arxiv_papers": [
    {
      "title": "Neural Networks for Medical Diagnosis",
      "authors": ["Jane Smith", "John Doe"],
      "arxiv_url": "https://arxiv.org/abs/1234.5678",
      "year": "2024",
      "abstract": "We propose a novel approach..."
    }
  ],
  "step_timings": {
    "template_parser": 1.2,
    "web_scraper": 5.3,
    "arxiv_helper": 0.8,
    "email_composer": 3.1
  },
  "generation_metadata": {
    "attempts": 1,
    "model": "anthropic:claude-sonnet-4-5",
    "temperature": 0.7,
    "total_tokens": 2500
  }
}
```
#### Job Status Mapping

| Frontend | Celery State | Description |
|----------|--------------|-------------|
| PENDING | PENDING | Task queued, not started |
| RUNNING | STARTED | Worker executing pipeline |
| COMPLETED | SUCCESS | Email generated and saved |
| FAILED | FAILURE | Error occurred, see error field |

### Authentication Flow

#### 1. Frontend (Supabase Client-Side)
```typescript
// User signs up/logs in via Supabase Auth
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
});
// Receives JWT token from Supabase
```

#### 2. API Request
```http
POST /api/email/generate
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "email_template": "...",
  "recipient_name": "Dr. Jane Smith",
  "recipient_interest": "machine learning",
  "template_type": "research"
}
```

#### 3. Backend JWT Validation

**File:** `/pythonserver/api/dependencies.py`

```python
async def get_supabase_user(
    authorization: str = Header(None)
) -> SupabaseUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")

    token = authorization.split(" ")[1]

    # Validate with Supabase
    supabase = get_supabase_client()
    user = supabase.auth.get_user(token)

    return SupabaseUser(
        id=user.id,
        email=user.email
    )

async def get_current_user(
    supabase_user: SupabaseUser = Depends(get_supabase_user),
    db: Session = Depends(get_db)
) -> User:
    user = db.query(User).filter(User.id == supabase_user.id).first()
    if not user:
        raise HTTPException(status_code=403, detail="User not initialized")
    return user
```

#### 4. Authorization
- **User-scoped access:** Emails filtered by `user_id`
- **No direct database access:** Frontend NEVER queries DB
- **Service role key:** Backend uses Supabase admin permissions

## Frontend State Management Migration

### The Problem

Current implementation uses React Context for ALL state:
- **AuthContext:** User authentication state
- **EmailGenerationContext:** Queue + polling logic

**Issues:**
1. Every context update re-renders ALL consumers
2. No built-in caching or data synchronization
3. Polling logic mixed with UI state
4. LocalStorage management duplicated across components
5. No request cancellation for abandoned operations

**Example of Current Code:**

`/scribe/context/EmailGenerationProvider.tsx` (Lines 62-122):
```typescript
useEffect(() => {
  // 60 lines of imperative polling/generation logic
  // Mixes localStorage, state updates, API calls
  const processNextEmail = async () => {
    setIsGeneratingEmail(true);
    const professorToProcess = emailQueue[0];

    const { task_id } = await api.email.generateEmail({...});

    // Manual polling - no cancellation
    await api.email.pollTaskUntilComplete(task_id, onProgress, 3000);

    setEmailQueue(prevQueue => {
      const newQueue = prevQueue.slice(1);
      localStorage.setItem('emailQueue', JSON.stringify(newQueue));
      return newQueue;
    });
  };

  processNextEmail();
}, [emailQueue, isGeneratingEmail, user]);
```

**Problems:**
- 76 lines of complex useEffect logic
- No cleanup on unmount (memory leak)
- Entire component re-renders on every state change
- Manual localStorage sync
- Polling continues even if user navigates away

### The Solution: Dual-Layer State Management

#### Layer 1: Zustand for Client State

**Use for:** UI state, preferences, temporary data that doesn't need to sync with the server

**Installation:**
```bash
# Already installed in package.json
npm install zustand  # v5.0.8
```

**Example: UI Store**

`stores/ui-store.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TemplateType = 'research' | 'book' | 'general';

interface UIState {
  // Email generation form state
  emailTemplate: string;
  setEmailTemplate: (template: string) => void;

  // Template type preference (persisted)
  defaultTemplateType: TemplateType;
  setDefaultTemplateType: (type: TemplateType) => void;

  // UI preferences
  hoveredEmailId: string | null;
  setHoveredEmailId: (id: string | null) => void;

  copiedEmailId: string | null;
  setCopiedEmailId: (id: string | null) => void;

  // Reset all UI state
  reset: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      emailTemplate: '',
      defaultTemplateType: 'research',
      hoveredEmailId: null,
      copiedEmailId: null,

      // Actions
      setEmailTemplate: (template) => set({ emailTemplate: template }),
      setDefaultTemplateType: (type) => set({ defaultTemplateType: type }),
      setHoveredEmailId: (id) => set({ hoveredEmailId: id }),
      setCopiedEmailId: (id) => set({ copiedEmailId: id }),

      reset: () => set({
        emailTemplate: '',
        defaultTemplateType: 'research',
        hoveredEmailId: null,
        copiedEmailId: null,
      }),
    }),
    {
      name: 'scribe-ui-storage',  // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        emailTemplate: state.emailTemplate,
        defaultTemplateType: state.defaultTemplateType,
      }),
    }
  )
);

// Granular selectors (prevent unnecessary re-renders)
export const useEmailTemplate = () => useUIStore((state) => state.emailTemplate);
export const useSetEmailTemplate = () => useUIStore((state) => state.setEmailTemplate);
export const useHoveredEmailId = () => useUIStore((state) => state.hoveredEmailId);
```

**Example: Queue Store**

`stores/queue-store.ts`:
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QueueItem {
  id: string;
  name: string;
  interest: string;
  template_type: TemplateType;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  taskId?: string;
  error?: string;
}

interface QueueState {
  queue: QueueItem[];

  // Actions
  addToQueue: (items: Omit<QueueItem, 'id' | 'status'>[]) => void;
  updateItemStatus: (id: string, status: QueueItem['status'], taskId?: string, error?: string) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;

  // Selectors
  getNextPending: () => QueueItem | undefined;
  getPendingCount: () => number;
}

export const useQueueStore = create<QueueState>()(
  persist(
    (set, get) => ({
      queue: [],

      addToQueue: (items) => set((state) => ({
        queue: [
          ...state.queue,
          ...items.map(item => ({
            ...item,
            id: `${item.name}-${Date.now()}-${Math.random()}`,
            status: 'pending' as const,
          })),
        ],
      })),

      updateItemStatus: (id, status, taskId, error) => set((state) => ({
        queue: state.queue.map(item =>
          item.id === id
            ? { ...item, status, ...(taskId && { taskId }), ...(error && { error }) }
            : item
        ),
      })),

      removeFromQueue: (id) => set((state) => ({
        queue: state.queue.filter(item => item.id !== id),
      })),

      clearQueue: () => set({ queue: [] }),

      getNextPending: () => get().queue.find(item => item.status === 'pending'),

      getPendingCount: () => get().queue.filter(item => item.status === 'pending').length,
    }),
    {
      name: 'scribe-queue-storage',
    }
  )
);
```

**Usage in Components:**
```typescript
'use client';

import { useEmailTemplate, useSetEmailTemplate } from '@/stores/ui-store';
import { useQueueStore } from '@/stores/queue-store';

export function EmailGeneratorForm() {
  // Only subscribes to emailTemplate - won't re-render for other UI changes
  const template = useEmailTemplate();
  const setTemplate = useSetEmailTemplate();

  // Subscribe to specific queue methods
  const addToQueue = useQueueStore((state) => state.addToQueue);
  const pendingCount = useQueueStore((state) => state.getPendingCount());

  const handleSubmit = () => {
    addToQueue([{
      name: 'Dr. Jane Smith',
      interest: 'machine learning',
      template_type: 'research',
    }]);
  };

  return (
    <div>
      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
      />
      <button onClick={handleSubmit}>
        Add to Queue ({pendingCount})
      </button>
    </div>
  );
}
```

**Benefits:**
- ✅ Minimal re-renders (only components using specific state)
- ✅ Built-in localStorage persistence
- ✅ No Provider wrapping needed
- ✅ TypeScript autocompletion
- ✅ DevTools support

#### Layer 2: React Query for Server State

**Use for:** API data, caching, background updates, polling

**Installation:**
```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**Setup Query Provider**

`providers/QueryProvider.tsx`:
```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data considered fresh for 1 minute
        staleTime: 60 * 1000,

        // Keep in cache for 5 minutes
        gcTime: 5 * 60 * 1000,

        // Retry failed requests once
        retry: 1,

        // Don't refetch on window focus (reduces API calls)
        refetchOnWindowFocus: false,

        // Refetch on reconnect
        refetchOnReconnect: true,
      },
      mutations: {
        // Don't retry mutations (user can retry manually)
        retry: 0,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
    </QueryClientProvider>
  );
}
```

**Add to Root Layout**

`app/layout.tsx`:
```typescript
import { QueryProvider } from '@/providers/QueryProvider';
import { AuthContextProvider } from '@/context/AuthContextProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AuthContextProvider>
            {children}
          </AuthContextProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

**Why This Matters:**

| Feature | React Context | Zustand | React Query |
|---------|---------------|---------|-------------|
| **Purpose** | Share state | Client state | Server state |
| **Re-renders** | All consumers | Only subscribers | Only consumers |
| **Caching** | Manual | Manual | Automatic |
| **Persistence** | Manual | Built-in | Automatic |
| **Request dedup** | ❌ | ❌ | ✅ |
| **Optimistic updates** | Manual | Manual | Built-in |
| **Error handling** | Manual | Manual | Built-in |
| **Loading states** | Manual | Manual | Built-in |
| **Polling** | Manual | Manual | Built-in |
| **DevTools** | ❌ | ✅ | ✅ |

---

## Query Key Hierarchy

### The Problem

Without React Query, we have:
- No cache invalidation strategy
- Dashboard polls every 5 seconds regardless of activity
- No way to update cache after generating an email
- Wasteful API calls (720 per hour for a single user!)

### The Solution: Hierarchical Query Keys

**Centralized Query Key Factory**

`lib/query-keys.ts`:
```typescript
/**
 * Centralized query key factory for type-safe cache management
 *
 * Hierarchy enables surgical cache invalidation:
 * - Invalidate all user data: queryKeys.user.all
 * - Invalidate all emails: queryKeys.user.emails(userId)
 * - Invalidate specific email: queryKeys.email.byId(emailId)
 */

export const queryKeys = {
  // User domain
  user: {
    all: ['user'] as const,
    byId: (userId: string) => ['user', userId] as const,
    profile: (userId: string) => ['user', userId, 'profile'] as const,
    stats: (userId: string) => ['user', userId, 'stats'] as const,

    // Email lists (hierarchical)
    emails: (userId: string) => ['user', userId, 'emails'] as const,
    emailsPaginated: (userId: string, limit: number, offset: number) =>
      ['user', userId, 'emails', { limit, offset }] as const,
  },

  // Email domain
  email: {
    all: ['email'] as const,
    byId: (emailId: string) => ['email', emailId] as const,
  },

  // Task domain (for async generation)
  task: {
    all: ['task'] as const,
    byId: (taskId: string) => ['task', taskId] as const,
  },
} as const;

// Type helper for query key inference
export type QueryKeys = typeof queryKeys;
```

### Surgical Cache Invalidation

**Example 1: After Generating Email**

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

const queryClient = useQueryClient();

// Invalidate all email queries for this user (smart!)
await queryClient.invalidateQueries({
  queryKey: queryKeys.user.emails(userId)
});

// This invalidates:
// - ['user', 'user-123', 'emails']
// - ['user', 'user-123', 'emails', { limit: 20, offset: 0 }]
// - ['user', 'user-123', 'emails', { limit: 50, offset: 0 }]
// - etc.
```

**Example 2: Update User Stats Without Refetching**

```typescript
// After generating email, optimistically update count
queryClient.setQueryData(
  queryKeys.user.stats(userId),
  (old: UserStats) => ({
    ...old,
    emailCount: old.emailCount + 1,
    generationCount: old.generationCount + 1,
  })
);
```

**Example 3: Optimistic Update - Instant UI Feedback**

```typescript
// Before mutation: snapshot current state
const previousEmails = queryClient.getQueryData(
  queryKeys.user.emailsPaginated(userId, 20, 0)
);

// Optimistically add email to cache (instant UI update)
queryClient.setQueryData(
  queryKeys.user.emailsPaginated(userId, 20, 0),
  (old: EmailResponse[]) => [optimisticEmail, ...old]
);

// If mutation fails, rollback
onError: () => {
  queryClient.setQueryData(
    queryKeys.user.emailsPaginated(userId, 20, 0),
    previousEmails
  );
}
```

### Performance Impact

**Before (Polling):**
```typescript
// Dashboard polls every 5 seconds
useEffect(() => {
  const fetchEmailHistory = async () => { /* ... */ };
  fetchEmailHistory();
  const pollInterval = setInterval(fetchEmailHistory, 5000);
  return () => clearInterval(pollInterval);
}, [user]);

// Result: 720 API calls per hour per user
// 100 users = 72,000 API calls/hour
```

**After (React Query):**
```typescript
// Smart caching with staleTime
const { data: emails } = useQuery({
  queryKey: queryKeys.user.emailsPaginated(userId, 20, 0),
  queryFn: () => api.email.getEmailHistory(20, 0),
  staleTime: 2 * 60 * 1000, // 2 minutes - data considered fresh
  refetchOnWindowFocus: true, // Only refetch when user returns
});

// Invalidate only when mutation succeeds
const generateEmail = useMutation({
  mutationFn: api.email.generateEmail,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.user.emails(userId)
    });
  },
});

// Result: ~10 API calls per hour per user (98.6% reduction!)
// 100 users = 1,000 API calls/hour (vs 72,000)
```

---

## Custom Hooks with React Query

### Email History Hook

`hooks/queries/useEmailHistory.ts`:
```typescript
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import type { EmailResponse } from '@/lib/api';

/**
 * Fetch user's email history with pagination
 * Uses React Query for automatic caching and refetching
 */
export function useEmailHistory(limit = 20, offset = 0) {
  const { user } = useAuth();
  const userId = user?.uid;

  return useQuery({
    queryKey: queryKeys.user.emailsPaginated(userId!, limit, offset),
    queryFn: () => api.email.getEmailHistory(limit, offset),
    enabled: !!userId,  // Only run if user is authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes - emails don't change often
    gcTime: 5 * 60 * 1000, // 5 minutes cache

    // Transform data: sort by date
    select: (data) => {
      return [...data].sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
}

/**
 * Infinite scroll version for email history
 */
export function useInfiniteEmailHistory(limit = 20) {
  const { user } = useAuth();
  const userId = user?.uid;

  return useInfiniteQuery({
    queryKey: queryKeys.user.emails(userId!),
    queryFn: ({ pageParam = 0 }) =>
      api.email.getEmailHistory(limit, pageParam),
    enabled: !!userId,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === limit ? allPages.length * limit : undefined,
    staleTime: 2 * 60 * 1000,
  });
}

// Usage in component
function EmailHistoryTable() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteEmailHistory();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  const emails = data?.pages.flat() ?? [];

  return (
    <div>
      {emails.map(email => <EmailRow key={email.id} email={email} />)}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

### Email Generation Hook with Optimistic Updates

`hooks/mutations/useGenerateEmail.ts`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { queryKeys } from '@/lib/query-keys';
import { api, type EmailGenerationData, type EmailResponse } from '@/lib/api';

export function useGenerateEmail() {
  const { user } = useAuth();
  const userId = user?.uid;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: EmailGenerationData) => api.email.generateEmail(data),

    // Before mutation: optimistic update
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.user.emails(userId!),
      });

      // Snapshot current state for rollback
      const previousEmails = queryClient.getQueryData(
        queryKeys.user.emailsPaginated(userId!, 20, 0)
      );

      // Optimistically add to cache (instant UI!)
      const optimisticEmail: EmailResponse = {
        id: 'temp-' + Date.now(),
        user_id: userId!,
        recipient_name: variables.recipient_name,
        recipient_interest: variables.recipient_interest,
        email_message: 'Generating email...',
        template_type: variables.template_type,
        metadata: null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        queryKeys.user.emailsPaginated(userId!, 20, 0),
        (old: EmailResponse[] = []) => [optimisticEmail, ...old]
      );

      // Return context for rollback
      return { previousEmails };
    },

    // On error: rollback optimistic update
    onError: (err, variables, context) => {
      if (context?.previousEmails) {
        queryClient.setQueryData(
          queryKeys.user.emailsPaginated(userId!, 20, 0),
          context.previousEmails
        );
      }

      console.error('Email generation failed:', err);
    },

    // On success: invalidate to fetch real data
    onSuccess: async (data, variables) => {
      // Start polling task status
      // (Will be handled by separate useTaskStatus hook)

      // Invalidate all email queries to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.emails(userId!),
      });

      // Update user stats
      queryClient.setQueryData(
        queryKeys.user.stats(userId!),
        (old: any) => ({
          ...old,
          emailCount: (old?.emailCount || 0) + 1,
        })
      );
    },
  });
}

// Usage in component
function GenerateButton() {
  const generateEmail = useGenerateEmail();
  const { emailTemplate } = useUIStore();

  const handleClick = () => {
    generateEmail.mutate({
      email_template: emailTemplate,
      recipient_name: 'Dr. Jane Smith',
      recipient_interest: 'machine learning',
      template_type: 'research',
    }, {
      // Per-mutation callbacks
      onSuccess: () => {
        toast.success('Email generation started!');
      },
      onError: (error) => {
        toast.error(`Failed: ${error.message}`);
      },
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={generateEmail.isPending}
    >
      {generateEmail.isPending ? 'Generating...' : 'Generate Email'}
    </button>
  );
}
```

### Task Status Polling Hook

`hooks/queries/useTaskStatus.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api, type TaskStatusResponse } from '@/lib/api';

/**
 * Poll task status until completion
 * Automatically stops polling when task succeeds or fails
 */
export function useTaskStatus(taskId: string | null, enabled = true) {
  return useQuery({
    queryKey: queryKeys.task.byId(taskId!),
    queryFn: () => api.email.getTaskStatus(taskId!),
    enabled: enabled && !!taskId,

    // Polling configuration - conditional
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      // Stop polling when complete
      if (status === 'SUCCESS' || status === 'FAILURE') {
        return false;
      }

      // Poll every 3 seconds while pending/started
      return 3000;
    },

    // Don't consider data stale (always use cache)
    staleTime: Infinity,

    // Keep in cache for 1 hour
    gcTime: 60 * 60 * 1000,
  });
}

// Usage in component
function EmailGenerationStatus({ taskId }: { taskId: string }) {
  const { data: status, isLoading, error } = useTaskStatus(taskId);

  if (isLoading) return <div>Checking status...</div>;
  if (error) return <div>Error: {error.message}</div>;

  switch (status?.status) {
    case 'PENDING':
      return <div>Task queued...</div>;

    case 'STARTED':
      return (
        <div>
          <p>Generating email...</p>
          <p>Step: {status.result?.current_step}</p>
          <ProgressBar timings={status.result?.step_timings} />
        </div>
      );

    case 'SUCCESS':
      return <div>Email generated! ✓</div>;

    case 'FAILURE':
      const errorMsg = typeof status.error === 'string'
        ? status.error
        : status.error?.message;
      return <div>Failed: {errorMsg}</div>;

    default:
      return <div>Unknown status</div>;
  }
}
```

### Composite Hook: Email Dashboard

`hooks/useEmailDashboard.ts`:
```typescript
import { useMemo, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useEmailHistory } from './queries/useEmailHistory';
import { useUserStats } from './queries/useUserStats';
import { useEmailStore } from '@/stores/email-store';

/**
 * Composite hook that encapsulates all dashboard logic
 * Components become purely presentational
 */
export function useEmailDashboard() {
  const { user, logout } = useAuth();

  // Server state
  const {
    data: emails,
    isLoading: emailsLoading,
    error: emailsError,
    refetch: refetchEmails,
  } = useEmailHistory(20, 0);

  const {
    data: userStats,
    isLoading: statsLoading,
  } = useUserStats();

  // Client state (Zustand)
  const selectedEmailId = useEmailStore((state) => state.selectedEmailId);
  const setSelectedEmail = useEmailStore((state) => state.setSelectedEmail);
  const filter = useEmailStore((state) => state.filter);

  // Derived state (computed values)
  const emailCount = emails?.length ?? 0;
  const generationCount = userStats?.generationCount ?? 0;
  const isGenerating = userStats?.pendingTasks > 0;

  // Filtered emails based on client-side filter
  const filteredEmails = useMemo(() => {
    if (!emails) return [];

    if (filter === 'all') return emails;
    if (filter === 'research') return emails.filter(e => e.template_type === 'research');
    if (filter === 'book') return emails.filter(e => e.template_type === 'book');
    if (filter === 'general') return emails.filter(e => e.template_type === 'general');

    return emails;
  }, [emails, filter]);

  // Actions
  const handleCopyEmail = useCallback(async (emailId: string, message: string) => {
    await navigator.clipboard.writeText(message);
    toast.success('Email copied to clipboard!');
  }, []);

  const handleDeleteEmail = useCallback(async (emailId: string) => {
    // Implement delete mutation
    console.log('Delete email:', emailId);
  }, []);

  return {
    // User data
    user,
    logout,

    // Email data
    emails: filteredEmails,
    emailCount,
    generationCount,
    selectedEmailId,

    // Loading states
    isLoading: emailsLoading || statsLoading,

    // Error states
    error: emailsError,

    // Flags
    isGenerating,

    // Actions
    setSelectedEmail,
    handleCopyEmail,
    handleDeleteEmail,
    refetchEmails,
  };
}

// Usage in component - clean and simple!
export default function DashboardPage() {
  const {
    user,
    emails,
    emailCount,
    generationCount,
    isLoading,
    isGenerating,
    handleCopyEmail,
  } = useEmailDashboard();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h1>Welcome, {user?.displayName}</h1>

      <StatsCard
        emailCount={emailCount}
        generationCount={generationCount}
        isGenerating={isGenerating}
      />

      <EmailList
        emails={emails}
        onCopy={handleCopyEmail}
      />
    </div>
  );
}
```

### Debounced Search Hook

`hooks/useSearch.ts`:
```typescript
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

/**
 * Debounced search with automatic cancellation
 */
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay = 300
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(handler);
  }, [searchTerm, delay]);

  // Query only runs when debounced term changes
  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedTerm],
    queryFn: () => searchFn(debouncedTerm),
    enabled: debouncedTerm.length > 2,
    staleTime: 5 * 60 * 1000, // Cache search results for 5 minutes
  });

  return {
    searchTerm,
    setSearchTerm,
    results: data ?? [],
    isLoading: isLoading && searchTerm === debouncedTerm,
    isSearching: isLoading,
    error,
  };
}

// Usage
function ProfessorSearch() {
  const {
    searchTerm,
    setSearchTerm,
    results,
    isLoading
  } = useDebouncedSearch(
    (query) => api.searchProfessors(query),
    300
  );

  return (
    <div>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search professors..."
      />

      {isLoading && <Spinner />}

      <div>
        {results.map(prof => (
          <div key={prof.id}>{prof.name}</div>
        ))}
      </div>
    </div>
  );
}
```

**Benefits of Custom Hooks:**
- ✅ Business logic separated from UI
- ✅ Easy to test in isolation
- ✅ Reusable across components
- ✅ Automatic caching and deduplication
- ✅ Built-in loading/error states
- ✅ Type-safe

---

## API Layer Enhancements

### Current State

`lib/api.ts` (Lines 81-108):
```typescript
const authenticatedFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getAuthToken();
  if (!token) throw new Error("No authentication token available");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed: ${response.statusText}`);
  }

  return response;
};
```

**Issues:**
- No request cancellation (memory leaks)
- No retry logic
- No request deduplication
- Manual abort handling

### Improvement 1: AbortController Integration

`lib/api-client.ts`:
```typescript
import { supabase } from '@/config/supabase';
import { API_BASE_URL } from '@/config/api';

export class ApiClient {
  private activeRequests = new Map<string, AbortController>();

  /**
   * Make an authenticated request with automatic cancellation
   * @param key - Optional key to cancel previous request with same key
   */
  async request<T>(
    endpoint: string,
    options: RequestInit & { key?: string } = {}
  ): Promise<T> {
    const { key, ...fetchOptions } = options;

    // Cancel previous request with same key (e.g., for search)
    if (key) {
      this.activeRequests.get(key)?.abort();
      const controller = new AbortController();
      this.activeRequests.set(key, controller);
      fetchOptions.signal = controller.signal;
    }

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      throw new Error('Not authenticated');
    }

    // Make request
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...fetchOptions.headers,
      },
    });

    // Cleanup
    if (key) {
      this.activeRequests.delete(key);
    }

    // Handle errors
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.message || response.statusText, response.status);
    }

    return response.json();
  }

  /**
   * Cancel a specific request by key
   */
  cancelRequest(key: string) {
    this.activeRequests.get(key)?.abort();
    this.activeRequests.delete(key);
  }

  /**
   * Cancel all active requests
   */
  cancelAll() {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiClient = new ApiClient();
```

**Usage:**
```typescript
// Search will cancel previous request
const results = await apiClient.request('/api/search', {
  method: 'GET',
  key: 'professor-search', // Cancels previous search
});

// Cancel all requests on component unmount
useEffect(() => {
  return () => apiClient.cancelAll();
}, []);
```

### Improvement 2: Zod Validation

`lib/schemas.ts`:
```typescript
import { z } from 'zod';

// Email response schema
export const EmailResponseSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  recipient_name: z.string().min(1),
  recipient_interest: z.string().min(1),
  email_message: z.string(),
  template_type: z.enum(['research', 'book', 'general']),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
});

export type EmailResponse = z.infer<typeof EmailResponseSchema>;

// Task status schema
export const TaskStatusResponseSchema = z.object({
  task_id: z.string(),
  status: z.enum(['PENDING', 'STARTED', 'SUCCESS', 'FAILURE']),
  result: z.object({
    email_id: z.string().uuid().optional(),
    current_step: z.string().optional(),
    step_status: z.string().optional(),
    step_timings: z.record(z.number()).optional(),
  }).optional(),
  error: z.union([
    z.string(),
    z.object({
      message: z.string(),
      type: z.string(),
      failed_step: z.string().optional(),
    }),
  ]).optional(),
});

export type TaskStatusResponse = z.infer<typeof TaskStatusResponseSchema>;

// Email generation request
export const EmailGenerationSchema = z.object({
  email_template: z.string().min(10, 'Template too short'),
  recipient_name: z.string().min(2, 'Name required'),
  recipient_interest: z.string().min(3, 'Interest required'),
  template_type: z.enum(['research', 'book', 'general']),
});

export type EmailGenerationData = z.infer<typeof EmailGenerationSchema>;
```

**Enhanced API Client with Validation:**
```typescript
import { z } from 'zod';

class ApiClient {
  // ... previous code ...

  /**
   * Make request with runtime validation
   */
  async requestWithValidation<T>(
    endpoint: string,
    schema: z.ZodSchema<T>,
    options: RequestInit = {}
  ): Promise<T> {
    const data = await this.request<unknown>(endpoint, options);

    // Runtime validation - catches API contract changes
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('API validation error:', error.errors);
        throw new Error('Invalid API response format');
      }
      throw error;
    }
  }
}

// Usage
const emails = await apiClient.requestWithValidation(
  '/api/email/',
  z.array(EmailResponseSchema)
);
// emails is typed as EmailResponse[] and validated at runtime!
```

### Improvement 3: Server Actions Pattern

**When to use:** Form submissions, server-side mutations

`app/actions/email-actions.ts`:
```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function generateEmailAction(formData: FormData) {
  // Get auth token from cookies (set by Supabase)
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  const response = await fetch(`${process.env.API_BASE_URL}/api/email/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email_template: formData.get('template'),
      recipient_name: formData.get('name'),
      recipient_interest: formData.get('interest'),
      template_type: formData.get('templateType'),
    }),
  });

  if (!response.ok) {
    return { success: false, error: 'Generation failed' };
  }

  const { task_id } = await response.json();

  // Revalidate dashboard to show new email
  revalidatePath('/dashboard');

  return { success: true, taskId: task_id };
}
```

**Usage in component:**
```typescript
'use client';

import { generateEmailAction } from '@/app/actions/email-actions';
import { useTransition } from 'react';

export function EmailForm() {
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await generateEmailAction(formData);

      if (result.success) {
        toast.success('Email generation started!');
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <input name="interest" required />
      <textarea name="template" required />

      <button type="submit" disabled={isPending}>
        {isPending ? 'Generating...' : 'Generate Email'}
      </button>
    </form>
  );
}
```

**Benefits:**
- ✅ Runs on server (can access secrets)
- ✅ Automatic revalidation
- ✅ Works without JavaScript (progressive enhancement)
- ✅ Type-safe with TypeScript

---

## TypeScript Excellence

### Current Issues
- Types manually maintained in `lib/api.ts`
- Types can drift from database schema
- No branded types for IDs (can mix up emailId and userId)
- Some `any` types still present

### Improvement 1: Generated Types from Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Generate types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts
```

**Generated types:**
```typescript
// types/database.types.ts (auto-generated)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          display_name: string | null
          generation_count: number
          created_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          generation_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          generation_count?: number
          created_at?: string
        }
      }
      emails: {
        Row: {
          id: string
          user_id: string
          recipient_name: string
          recipient_interest: string
          email_message: string
          template_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recipient_name: string
          recipient_interest: string
          email_message: string
          template_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          recipient_name?: string
          recipient_interest?: string
          email_message?: string
          template_type?: string
          metadata?: Json | null
          created_at?: string
        }
      }
    }
  }
}

// Convenience exports
export type User = Database['public']['Tables']['users']['Row'];
export type Email = Database['public']['Tables']['emails']['Row'];
export type InsertUser = Database['public']['Tables']['users']['Insert'];
export type InsertEmail = Database['public']['Tables']['emails']['Insert'];
```

**Usage:**
```typescript
import type { Email, User } from '@/types/database.types';

// Types are ALWAYS in sync with database!
export async function getEmailHistory(): Promise<Email[]> {
  // TypeScript knows exact shape
}
```

### Improvement 2: Branded Types for ID Safety

```typescript
// types/branded.ts

/**
 * Branded types prevent accidentally mixing different ID types
 */
export type UserId = string & { readonly __brand: 'UserId' };
export type EmailId = string & { readonly __brand: 'EmailId' };
export type TaskId = string & { readonly __brand: 'TaskId' };

// Constructor functions
export const UserId = (id: string): UserId => id as UserId;
export const EmailId = (id: string): EmailId => id as EmailId;
export const TaskId = (id: string): TaskId => id as TaskId;

// Example usage
function getEmail(emailId: EmailId): Promise<Email> {
  // Can only be called with EmailId, not plain string
  return api.email.getEmail(emailId);
}

function getUser(userId: UserId): Promise<User> {
  // Can only be called with UserId
  return api.user.getUserData(userId);
}

// Compile-time safety!
const userId = UserId('user-123');
const emailId = EmailId('email-456');

getEmail(emailId);  // ✅ OK
getEmail(userId);   // ❌ Compile error! Can't use UserId as EmailId
```

### Improvement 3: Discriminated Unions for Task Status

```typescript
// types/task-status.ts

export type PendingTask = {
  status: 'PENDING';
  task_id: string;
};

export type StartedTask = {
  status: 'STARTED';
  task_id: string;
  current_step: string;
  step_status: string;
  step_timings: Record<string, number>;
};

export type SuccessTask = {
  status: 'SUCCESS';
  task_id: string;
  email_id: string;
  result: {
    step_timings: Record<string, number>;
  };
};

export type FailedTask = {
  status: 'FAILURE';
  task_id: string;
  error: {
    message: string;
    type: string;
    failed_step?: string;
  };
};

export type TaskStatus = PendingTask | StartedTask | SuccessTask | FailedTask;

// Usage with type narrowing
function handleTaskStatus(task: TaskStatus) {
  switch (task.status) {
    case 'PENDING':
      // TypeScript knows: task.task_id exists
      console.log('Waiting...', task.task_id);
      break;

    case 'STARTED':
      // TypeScript knows: task.current_step exists
      console.log(`Progress: ${task.current_step}`);
      break;

    case 'SUCCESS':
      // TypeScript knows: task.email_id exists
      console.log('Success!', task.email_id);
      break;

    case 'FAILURE':
      // TypeScript knows: task.error exists
      console.error('Failed:', task.error.message);
      break;
  }
}
```

### Improvement 4: Zod for Runtime Validation

Already covered in [API Layer Enhancements](#improvement-2-zod-validation).

**Benefits:**
- ✅ Compile-time type safety
- ✅ Runtime validation
- ✅ Single source of truth
- ✅ Automatic TypeScript types from schemas

---

## Component Architecture

### Current State
- All components loaded on initial page load
- No code splitting
- Heavy components (PDF parsing) block rendering

### Improvement 1: Dynamic Imports (Code Splitting)

`app/dashboard/page.tsx`:
```typescript
import dynamic from 'next/dynamic';

// Load heavy email viewer only when needed
const EmailViewer = dynamic(() => import('@/components/EmailViewer'), {
  loading: () => <EmailViewerSkeleton />,
  ssr: false, // Don't render on server (client-only)
});

// Load PDF parser only when user uploads
const PDFParser = dynamic(() => import('@/components/PDFParser'), {
  loading: () => <div>Loading PDF parser...</div>,
  ssr: false,
});

export default function Dashboard() {
  const [showViewer, setShowViewer] = useState(false);
  const [showPDFParser, setShowPDFParser] = useState(false);

  return (
    <div>
      <button onClick={() => setShowViewer(true)}>View Email</button>

      {/* Only downloads EmailViewer code when showViewer is true */}
      {showViewer && <EmailViewer />}

      {/* PDF parser loaded on demand */}
      {showPDFParser && <PDFParser />}
    </div>
  );
}
```

**Impact:**
- Initial bundle: 200KB → 80KB (60% reduction)
- Time to Interactive: 3s → 1.2s

### Improvement 2: Virtualized Lists

```bash
npm install @tanstack/react-virtual
```

`components/EmailHistoryVirtualized.tsx`:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { useEmailHistory } from '@/hooks/queries/useEmailHistory';

export function EmailHistoryVirtualized() {
  const { data: emails = [] } = useEmailHistory();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // Estimated row height in pixels
    overscan: 5, // Render 5 extra rows above/below viewport
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const email = emails[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <EmailRow email={email} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Impact:**
- Before: Rendering 1000 emails = 3s lag, 60fps drops
- After: Only renders ~20 visible rows = 60ms, smooth 60fps

### Improvement 3: Composition Pattern

`components/email/EmailCard.tsx`:
```typescript
interface EmailCardProps {
  children: React.ReactNode;
  className?: string;
}

function EmailCard({ children, className }: EmailCardProps) {
  return (
    <div className={cn("border rounded-lg p-4 bg-white shadow", className)}>
      {children}
    </div>
  );
}

// Sub-components for flexible composition
EmailCard.Header = function EmailCardHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-between items-center mb-2">{children}</div>;
};

EmailCard.Title = function EmailCardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
};

EmailCard.Body = function EmailCardBody({ children }: { children: React.ReactNode }) {
  return <div className="text-gray-700 whitespace-pre-wrap">{children}</div>;
};

EmailCard.Actions = function EmailCardActions({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 mt-4">{children}</div>;
};

// Usage - flexible and composable
function EmailDisplay({ email }: { email: Email }) {
  return (
    <EmailCard>
      <EmailCard.Header>
        <EmailCard.Title>{email.recipient_name}</EmailCard.Title>
        <span className="text-sm text-gray-500">{email.template_type}</span>
      </EmailCard.Header>

      <EmailCard.Body>
        {email.email_message}
      </EmailCard.Body>

      <EmailCard.Actions>
        <button>Copy</button>
        <button>Edit</button>
        <button>Delete</button>
      </EmailCard.Actions>
    </EmailCard>
  );
}
```

**Benefits:**
- ✅ Flexible composition
- ✅ Clear component hierarchy
- ✅ Easy to extend
- ✅ Type-safe

---

## Performance Optimizations

### 1. React.memo for Expensive Components

```typescript
// components/EmailRow.tsx
import { memo } from 'react';

interface EmailRowProps {
  email: Email;
  onCopy: (id: string, message: string) => void;
}

export const EmailRow = memo<EmailRowProps>(({ email, onCopy }) => {
  return (
    <tr>
      <td>{email.recipient_name}</td>
      <td>{email.recipient_interest}</td>
      <td className="truncate">{email.email_message.slice(0, 50)}...</td>
      <td>
        <button onClick={() => onCopy(email.id, email.email_message)}>
          Copy
        </button>
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if email ID changes
  return prevProps.email.id === nextProps.email.id &&
         prevProps.onCopy === nextProps.onCopy;
});
```

### 2. useCallback for Stable Function References

```typescript
function EmailList() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Stable function reference - doesn't change on every render
  const handleCopy = useCallback((id: string, message: string) => {
    navigator.clipboard.writeText(message);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []); // Empty deps = never recreated

  return emails.map(email => (
    <EmailRow key={email.id} email={email} onCopy={handleCopy} />
  ));
}
```

### 3. Lazy Loading Images

```typescript
// components/UserAvatar.tsx
import Image from 'next/image';

export function UserAvatar({ src, name }: { src: string; name: string }) {
  return (
    <Image
      src={src}
      alt={name}
      width={40}
      height={40}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      className="rounded-full"
    />
  );
}
```

### 4. Prefetching for Anticipated Navigation

```typescript
// components/EmailCard.tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { api } from '@/lib/api';
import Link from 'next/link';

function EmailCard({ email }: { email: Email }) {
  const queryClient = useQueryClient();

  // Prefetch detailed email view on hover
  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.email.byId(email.id),
      queryFn: () => api.email.getEmail(email.id),
    });
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      {/* When user clicks, data is already cached! Instant load. */}
      <Link href={`/email/${email.id}`}>
        {email.recipient_name}
      </Link>
    </div>
  );
}
```

### 5. Request Batching

```typescript
// lib/request-batcher.ts
class RequestBatcher {
  private batch: Array<{ id: string; resolve: Function }> = [];
  private timeout: NodeJS.Timeout | null = null;

  add(id: string): Promise<Email> {
    return new Promise((resolve) => {
      this.batch.push({ id, resolve });

      if (this.timeout) clearTimeout(this.timeout);

      // Batch requests within 50ms window
      this.timeout = setTimeout(() => {
        this.flush();
      }, 50);
    });
  }

  private async flush() {
    const requests = this.batch.splice(0);
    const ids = requests.map(r => r.id);

    // Single API call for multiple IDs
    const results = await api.email.getBatch(ids);

    requests.forEach((req, index) => {
      req.resolve(results[index]);
    });
  }
}

export const emailBatcher = new RequestBatcher();

// Usage
const email1 = await emailBatcher.add('id1'); // \
const email2 = await emailBatcher.add('id2'); //  } Batched into single request
const email3 = await emailBatcher.add('id3'); // /
```

**Performance Gains:**
- React.memo: 50% fewer component renders
- Lazy images: 30% faster initial load
- Prefetching: Instant navigation (0ms perceived latency)
- Batching: 80% fewer API requests for bulk operations

---

## Feature-First Project Structure

### Current Structure (Route-based)

```
scribe/
├── app/
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── generate/
│   │   │   └── page.tsx
│   │   └── template/
│   │       └── page.tsx
│   ├── mentorship/
│   │   └── page.tsx
│   └── page.tsx
├── context/
│   ├── AuthContextProvider.tsx
│   └── EmailGenerationProvider.tsx
├── components/
│   ├── ui/
│   ├── ProtectedRoute.tsx
│   └── MobileRestriction.tsx
├── config/
│   ├── api.ts
│   └── supabase.ts
├── lib/
│   ├── api.ts
│   └── utils.ts
└── types/
    └── (empty)
```

**Problems:**
- Related code scattered across folders
- Hard to find all code for a feature
- Difficult to delete features cleanly
- No clear ownership boundaries

### Proposed Structure (Feature-based)

```
scribe/
├── app/                          # Next.js App Router (routes only)
│   ├── (auth)/
│   │   └── page.tsx              # Landing/login page
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard layout
│   │   ├── page.tsx              # Main dashboard
│   │   ├── generate/
│   │   │   └── page.tsx          # Email generation form
│   │   └── history/
│   │       └── page.tsx          # Email history page
│   ├── layout.tsx                # Root layout
│   ├── providers.tsx             # Query/Theme providers
│   └── actions/                  # Server Actions
│       └── email-actions.ts
│
├── features/                     # Feature-first organization
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginButton.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   └── use-auth-store.ts
│   │   ├── stores/
│   │   │   └── auth-store.ts     # Zustand store
│   │   ├── types.ts
│   │   └── index.ts              # Public exports
│   │
│   ├── email-generation/
│   │   ├── components/
│   │   │   ├── EmailForm.tsx
│   │   │   ├── TemplateSelector.tsx
│   │   │   ├── GenerationQueue.tsx
│   │   │   └── TaskProgressBar.tsx
│   │   ├── hooks/
│   │   │   ├── use-generate-email.ts
│   │   │   └── use-task-status.ts
│   │   ├── stores/
│   │   │   ├── queue-store.ts
│   │   │   └── ui-store.ts
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── email-history/
│   │   ├── components/
│   │   │   ├── EmailTable.tsx
│   │   │   ├── EmailRow.tsx
│   │   │   ├── EmailFilters.tsx
│   │   │   └── EmailCard.tsx
│   │   ├── hooks/
│   │   │   ├── use-email-history.ts
│   │   │   └── use-email-dashboard.ts
│   │   └── index.ts
│   │
│   └── user-profile/
│       ├── components/
│       │   ├── UserStats.tsx
│       │   └── ProfileSettings.tsx
│       ├── hooks/
│       │   └── use-user-stats.ts
│       └── index.ts
│
├── shared/                       # Shared across features
│   ├── components/
│   │   ├── ui/                   # shadcn components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   └── Header.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorMessage.tsx
│   ├── hooks/
│   │   ├── use-debounce.ts
│   │   ├── use-clipboard.ts
│   │   └── use-toast.ts
│   └── lib/
│       ├── cn.ts                 # Class name utilities
│       └── format.ts             # Date/time formatting
│
├── lib/                          # Core infrastructure
│   ├── api/
│   │   ├── client.ts             # API client
│   │   ├── query-keys.ts         # React Query keys
│   │   └── schemas.ts            # Zod schemas
│   ├── utils/
│   │   ├── error-handling.ts
│   │   └── validation.ts
│   └── constants.ts
│
├── types/                        # Global types
│   ├── database.types.ts         # Generated from Supabase
│   ├── branded.ts                # Branded types (IDs)
│   └── index.ts
│
├── config/                       # Configuration
│   ├── supabase.ts               # Supabase client
│   └── api.ts                    # API config
│
└── providers/                    # Top-level providers
    ├── QueryProvider.tsx
    └── ThemeProvider.tsx
```

### Benefits

1. **Colocation:** Everything for a feature in one place
2. **Discoverability:** Easy to find all code for email generation
3. **Maintainability:** Delete a folder to remove a feature
4. **Scalability:** Add new features without restructuring
5. **Team Velocity:** Multiple developers can work on different features
6. **Clear Ownership:** Each feature is self-contained

### Import Examples

```typescript
// Before (route-based) - messy relative imports
import { useAuth } from '../../../context/AuthContextProvider';
import { EmailRow } from '../../../components/EmailRow';
import { api } from '../../../lib/api';

// After (feature-based) - clean absolute imports
import { useAuth } from '@/features/auth';
import { EmailRow } from '@/features/email-history';
import { api } from '@/lib/api';
```

### Migration Path

**Phase 1:** Create new structure, copy files
**Phase 2:** Update imports (use Find & Replace)
**Phase 3:** Delete old folders
**Time:** 2-3 hours

---

## Implementation Roadmap

### Phase 1: Foundation (4-6 hours)

**Goal:** Set up new state management infrastructure

**Tasks:**
- [ ] Install dependencies
  ```bash
  npm install @tanstack/react-query @tanstack/react-query-devtools
  npm install zod @hookform/resolvers/zod
  npm install @tanstack/react-virtual
  ```
- [ ] Create `providers/QueryProvider.tsx`
- [ ] Add QueryProvider to `app/layout.tsx`
- [ ] Generate database types from Supabase
  ```bash
  npx supabase gen types typescript > types/database.types.ts
  ```
- [ ] Create `lib/query-keys.ts` with hierarchical structure
- [ ] Create `lib/schemas.ts` with Zod validation
- [ ] Create `stores/ui-store.ts` (Zustand)
- [ ] Create `stores/queue-store.ts` (Zustand)

**Acceptance Criteria:**
- ✅ React Query DevTools visible in development
- ✅ Database types auto-generated
- ✅ Zustand stores working alongside existing Context

---

### Phase 2: Core Hooks Migration (3-4 hours)

**Goal:** Replace Context API with React Query hooks

**Tasks:**
- [ ] Create `hooks/queries/useEmailHistory.ts`
- [ ] Create `hooks/mutations/useGenerateEmail.ts` with optimistic updates
- [ ] Create `hooks/queries/useTaskStatus.ts` with auto-polling
- [ ] Create `hooks/use-auth.ts` (keep AuthContext initially, gradually replace)
- [ ] Update `app/dashboard/page.tsx` to use new hooks
- [ ] Replace polling interval with React Query caching

**Before (Lines 71-76 in dashboard/page.tsx):**
```typescript
const pollInterval = setInterval(fetchEmailHistory, 5000);
return () => clearInterval(pollInterval);
```

**After:**
```typescript
const { data: emails } = useEmailHistory();
// No polling! React Query handles caching intelligently
```

**Acceptance Criteria:**
- ✅ Dashboard uses `useEmailHistory` instead of polling
- ✅ Email generation shows optimistic updates
- ✅ Task polling stops automatically when complete
- ✅ API calls reduced by >90%

---

### Phase 3: API Layer Enhancements (2-3 hours)

**Goal:** Add AbortController and better error handling

**Tasks:**
- [ ] Refactor `lib/api.ts` into `lib/api/client.ts` with AbortController
- [ ] Add request cancellation to search features
- [ ] Implement retry logic with exponential backoff
- [ ] Add request deduplication
- [ ] Enhance API client with Zod validation
- [ ] Create `lib/api/schemas.ts` for all API responses

**Acceptance Criteria:**
- ✅ Abandoned requests are cancelled (no memory leaks)
- ✅ Better error messages for users
- ✅ Runtime validation catches bad API data

---

### Phase 4: Performance Optimizations (2-3 hours)

**Goal:** Code splitting and rendering improvements

**Tasks:**
- [ ] Add dynamic imports to heavy components (EmailViewer, PDFParser)
- [ ] Implement virtualized email history table
- [ ] Add React.memo to EmailRow components
- [ ] Add useCallback for stable function references
- [ ] Implement image lazy loading with Next.js Image
- [ ] Add prefetching on hover for email details

**Acceptance Criteria:**
- ✅ Initial bundle size < 100KB
- ✅ Email history scrolling is smooth with 1000+ rows
- ✅ Lighthouse performance score > 90

---

### Phase 5: TypeScript Improvements (2-3 hours)

**Goal:** Better type safety and validation

**Tasks:**
- [ ] Create branded types for IDs (`types/branded.ts`)
- [ ] Implement discriminated unions for task status
- [ ] Add Zod validation to all forms
- [ ] Remove all `any` types from codebase
- [ ] Add strict TypeScript config

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Acceptance Criteria:**
- ✅ Zero TypeScript compilation errors
- ✅ No `any` types in codebase
- ✅ All forms have runtime validation
- ✅ Database types auto-generated

---

### Phase 6: Feature-First Structure (3-4 hours)

**Goal:** Reorganize codebase by features

**Tasks:**
- [ ] Create `features/` directory structure
- [ ] Move auth code to `features/auth/`
- [ ] Move email generation code to `features/email-generation/`
- [ ] Move email history code to `features/email-history/`
- [ ] Move user profile code to `features/user-profile/`
- [ ] Create barrel exports (`index.ts`) for each feature
- [ ] Update all imports to use new paths
- [ ] Delete old directories (`context/`, scattered `components/`)
