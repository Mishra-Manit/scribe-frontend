# Scribe - Code Quality Improvements

> Comprehensive review and recommendations for the Scribe codebase (Frontend & Backend)

---

## Table of Contents

### Overview
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)

### 🎨 Frontend Improvements (Next.js/React)
3. [Frontend: State Management](#frontend-state-management)
4. [Frontend: Custom Hooks](#frontend-custom-hooks)
5. [Frontend: Component Organization](#frontend-component-organization)
6. [Frontend: Error Handling](#frontend-error-handling)
7. [Frontend: Code Quality](#frontend-code-quality)

### ⚙️ Backend Improvements (Python/FastAPI)
8. [Backend: Database Architecture](#backend-database-architecture)
9. [Backend: API Service Layer](#backend-api-service-layer)
10. [Backend: Authentication Service](#backend-authentication-service)
11. [Backend: Data Models & Validation](#backend-data-models-validation)

### 🔗 Shared/Cross-Cutting Concerns
12. [Security & Environment Configuration](#security-environment)
13. [Type System & Shared Types](#type-system)
14. [Project Structure](#project-structure)
15. [Learning Resources](#learning-resources)
16. [Prioritized Action Plan](#prioritized-action-plan)

---

## Executive Summary

**Project:** Scribe - Cold email generation platform for reaching out to research professors

**Tech Stack:**
- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS, Framer Motion, shadcn/ui
- **Backend:** Python, FastAPI (separate directory)
- **Database:** Supabase/PostgreSQL
- **Authentication:** Firebase Auth (migrating to Supabase)

**Overall Assessment:** Functional MVP with good foundation, but needs architectural improvements for scalability and maintainability.

**Strengths:**
- Modern tech stack (frontend and backend)
- TypeScript enabled on frontend
- Good use of custom hooks
- Clean UI with shadcn/ui
- Separation of frontend and backend concerns

**Key Areas for Improvement:**
- **Frontend:** State management, error boundaries, type safety
- **Backend:** Database service layer, API documentation, validation
- **Shared:** Security (exposed API keys), centralized type definitions

---

## Architecture Overview

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Scribe Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐         ┌──────────────────────┐ │
│  │  Frontend (This Dir) │────────▶│  Backend (Separate)  │ │
│  │  Next.js 15 + React  │  HTTP   │  Python + FastAPI    │ │
│  │  TypeScript          │         │                      │ │
│  └──────────────────────┘         └──────────────────────┘ │
│           │                                  │              │
│           │                                  │              │
│           ▼                                  ▼              │
│  ┌──────────────────────┐         ┌──────────────────────┐ │
│  │  State Management    │         │  Database Layer      │ │
│  │  Zustand + Context   │         │  Supabase/PostgreSQL │ │
│  └──────────────────────┘         └──────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Responsibilities

**Frontend (Next.js/React - This Directory):**
- UI components and layouts
- Client-side state management (Zustand, Context API)
- Form validation and user interactions
- API calls to backend
- Real-time UI updates
- Routing and navigation

**Backend (Python/FastAPI - Separate Directory):**
- Database operations (CRUD)
- Business logic and validation
- Authentication and authorization
- API endpoints
- Email generation service
- Professor data management

**Shared Concerns:**
- TypeScript type definitions (generated from backend schemas)
- Environment configuration
- Security best practices
- Error handling strategies

---

---

## 🎨 FRONTEND IMPROVEMENTS

> This section covers improvements specific to the Next.js/React frontend application.
> The frontend handles UI components, client-side state, routing, and API consumption.

---

<a name="frontend-state-management"></a>
## 3. Frontend: State Management

**Overview:** Client-side state management in the React application using Zustand and Context API.

### Current Approach

**Technologies Used:**
- React Context API (AuthContext, EmailGenerationProvider)
- useState for local state
- localStorage for persistence (scattered)

### Current Issues

**Firebase vs Supabase Confusion:**
- Firebase config (`config/firebase.ts`) has been **deleted** but is still imported in code
- Supabase config exists (`config/supabase.ts`) but is **not being used**
- Application is in a **broken state** - imports reference deleted files
- Auth context still uses Firebase authentication
- Dashboard queries still use Firestore

**Why Migrate to Supabase:**
- ✅ Modern PostgreSQL database (better than NoSQL for this use case)
- ✅ Built-in Row Level Security (RLS)
- ✅ Real-time subscriptions
- ✅ Better TypeScript support with generated types
- ✅ RESTful API and real-time out of the box
- ✅ Easier local development

### Migration Steps

#### Phase 1: Database Schema Setup

**Create Supabase Tables:**

```sql
-- Users table
CREATE TABLE users (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  photo_url TEXT,
  student_info TEXT,
  generation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Professors table
CREATE TABLE professors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  university TEXT NOT NULL,
  interests TEXT[] NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accepted professors table (user-specific)
CREATE TABLE accepted_professors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  professor_id UUID REFERENCES professors(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, professor_id)
);

-- Emails table (email history)
CREATE TABLE emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  professor_name TEXT NOT NULL,
  professor_interest TEXT NOT NULL,
  email_message TEXT NOT NULL,
  source TEXT CHECK (source IN ('generate')),
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_emails_user_id ON emails(user_id);
CREATE INDEX idx_emails_created_at ON emails(created_at DESC);
CREATE INDEX idx_accepted_professors_user_id ON accepted_professors(user_id);
CREATE INDEX idx_professors_status ON professors(status);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE accepted_professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own emails" ON emails
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own emails" ON emails
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own accepted professors" ON accepted_professors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own accepted professors" ON accepted_professors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view pending professors" ON professors
  FOR SELECT USING (status = 'pending');
```

#### Phase 2: Supabase Auth Implementation

**Update `config/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

**Create `.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

#### Phase 3: Auth Service Layer

**Create `services/supabase/auth.service.ts`:**
```typescript
import { supabase } from '@/config/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

class AuthService {
  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) throw error;
    return data;
  }

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get current session
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  }

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ?? null);
    });
  }
}

export const authService = new AuthService();
```

#### Phase 4: Database Service Layer

**Create `services/supabase/database.service.ts`:**
```typescript
import { supabase } from '@/config/supabase';
import type { Professor, Email, AcceptedProfessor } from '@/types';

class DatabaseService {
  /**
   * Fetch user's email history
   */
  async getEmailHistory(userId: string) {
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Email[];
  }

  /**
   * Create new email record
   */
  async createEmail(userId: string, email: Omit<Email, 'id' | 'user_id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('emails')
      .insert({
        user_id: userId,
        ...email,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Email;
  }

  /**
   * Get pending professors
   */
  async getPendingProfessors() {
    const { data, error } = await supabase
      .from('professors')
      .select('*')
      .eq('status', 'pending');

    if (error) throw error;
    return data as Professor[];
  }

  /**
   * Accept a professor
   */
  async acceptProfessor(userId: string, professorId: string, interest: string) {
    const { data, error } = await supabase
      .from('accepted_professors')
      .insert({
        user_id: userId,
        professor_id: professorId,
        interest,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get user's accepted professors
   */
  async getAcceptedProfessors(userId: string) {
    const { data, error } = await supabase
      .from('accepted_professors')
      .select(`
        *,
        professors (
          name,
          university,
          image_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Subscribe to email history changes (real-time)
   */
  subscribeToEmailHistory(userId: string, callback: (emails: Email[]) => void) {
    return supabase
      .channel(`emails:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'emails',
          filter: `user_id=eq.${userId}`,
        },
        async () => {
          const emails = await this.getEmailHistory(userId);
          callback(emails);
        }
      )
      .subscribe();
  }
}

export const databaseService = new DatabaseService();
```

#### Phase 5: Generate TypeScript Types

**Install Supabase CLI:**
```bash
npm install -D supabase
```

**Generate types:**
```bash
npx supabase gen types typescript --project-id your-project-id > types/supabase.ts
```

This generates type-safe database schemas automatically!

#### Phase 6: Migration Checklist

- [ ] Create Supabase project and set up database schema
- [ ] Enable Google OAuth in Supabase dashboard
- [ ] Add environment variables to `.env.local`
- [ ] Generate TypeScript types from Supabase schema
- [ ] Create auth service layer
- [ ] Create database service layer
- [ ] Remove all Firebase imports
- [ ] Delete `config/firebase.ts` references
- [ ] Update auth context to use Supabase (or migrate to Zustand)
- [ ] Update all Firestore queries to Supabase queries
- [ ] Test authentication flow
- [ ] Test database operations
- [ ] Migrate existing Firebase data (if needed)

**Priority:** 🔴 CRITICAL - Fix broken imports first, then migrate

---

### 🚨 2. Type Safety: Using `any` Types

**Location:** `context/AuthContextProvider.tsx`

**Issue:**
```typescript
const AuthContext = createContext<any>({})
const [user, setUser] = useState<any>(null)
```

**Why This Is Bad:**
- Defeats the entire purpose of TypeScript
- No autocomplete or IntelliSense
- Can't catch type errors at compile time
- Makes refactoring dangerous

**Solution:**

1. Create proper type definitions:
```typescript
// types/user.ts
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}
```

2. Update AuthContext:
```typescript
import { AuthContextType, User } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthContextProvider');
  }
  return context;
}

export const AuthContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ... rest of implementation
};
```

**Priority:** 🔴 CRITICAL - Fix before adding new features

---

### 🚨 3. No Error Boundaries

**Issue:** Application has no error boundaries to catch rendering errors gracefully.

**Impact:**
- Single component error crashes entire app
- Poor user experience
- No error reporting

**Solution:**

Create `components/shared/ErrorBoundary.tsx`:
```typescript
"use client";

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Use in layout:
```typescript
<ErrorBoundary>
  <AuthContextProvider>
    <EmailGenerationProvider>
      {children}
    </EmailGenerationProvider>
  </AuthContextProvider>
</ErrorBoundary>
```

**Priority:** 🟡 HIGH - Add before production

---

---

## 🔗 SHARED / CROSS-CUTTING CONCERNS

> This section covers improvements that affect both frontend and backend,
> or are general architectural concerns that apply to the entire application.

---

<a name="security-environment"></a>
## 12. Security & Environment Configuration

**Overview:** Critical security issues and environment configuration for both frontend and backend.

### 🚨 CRITICAL: Exposed Credentials

**Issue:**
```typescript
const firebaseConfig = {
  apiKey: "AIzaSyC3kECw6Ka7weVqz8kjzB-DlwWUxrbL3rI",  // EXPOSED!
  authDomain: "coldauth-a5caf.firebaseapp.com",
  projectId: "coldauth-a5caf",
  // ...
};
```

**Why This Is Bad:**
- API keys are committed to source control
- Visible to anyone who clones the repository
- Security risk if repo is public

**Solution for Frontend:**

1. Create `.env.local` file (add to `.gitignore`):
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

2. Update `config/firebase.ts`:
```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID!,
};
```

**Solution for Backend (Python/FastAPI):**

Create `.env` file in backend directory:
```env
DATABASE_URL=your_supabase_connection_string
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
SECRET_KEY=your_secret_key
```

**Priority:** 🔴 CRITICAL - Fix immediately

---

<a name="project-structure"></a>
## 14. Project Structure

**Overview:** Recommended folder structure and organization for the frontend codebase.

### Frontend Folder Structure

### Current Structure

```
/scribe
├── app/                    ✅ Good: Next.js pages
├── components/            ✅ Good: Reusable components
│   ├── ui/               ✅ Good: shadcn components
│   └── [custom]          ⚠️ Mixed organization
├── context/               ✅ Good: React contexts
├── hooks/                 ✅ Good: Custom hooks
├── lib/                   ⚠️ Only has 1 utility
├── types/                 ❌ Empty! Types scattered
├── config/                ✅ Good: Configuration
└── public/                ⚠️ Disorganized
```

### Recommended Professional Structure (Updated for Supabase + Zustand)

```
/scribe
├── app/                        # Next.js App Router
│   ├── (auth)/                # Route group for auth pages
│   │   └── page.tsx           # Login page
│   ├── (dashboard)/           # Route group for protected pages
│   │   ├── layout.tsx         # Dashboard layout with ProtectedRoute
│   │   ├── page.tsx           # Main dashboard
│   │   ├── generate/
│   │   └── template/
│   ├── mentorship/
│   ├── layout.tsx             # Root layout
│   ├── globals.css
│   ├── loading.tsx            # Global loading state
│   ├── error.tsx              # Global error handler
│   └── not-found.tsx          # 404 page
│
├── components/
│   ├── ui/                    # shadcn components (keep as-is)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   │
│   ├── features/              # Feature-specific components
│   │   ├── email/
│   │   │   ├── EmailHistoryList.tsx
│   │   │   └── EmailQueueDisplay.tsx
│   │   ├── professor/
│   │   │   ├── ProfessorCard.tsx
│   │   │   ├── ProfessorList.tsx
│   │   │   └── AcceptedProfessorsList.tsx
│   │   └── auth/
│   │       ├── LoginButton.tsx
│   │       └── UserProfile.tsx
│   │
│   ├── layout/               # Layout components
│   │   ├── Navbar.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   │
│   └── shared/               # Shared/utility components
│       ├── ErrorBoundary.tsx
│       ├── ProtectedRoute.tsx
│       ├── MobileRestriction.tsx
│       └── LoadingSpinner.tsx
│
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts            # ✨ NEW: Auth state from Zustand
│   ├── useEmailQueue.ts      # ✨ NEW: Email queue operations
│   ├── useProfessors.ts      # ✨ NEW: Professor data management
│   ├── useSupabaseQuery.ts   # ✨ NEW: Generic Supabase query hook
│   └── useSupabaseRealtime.ts # ✨ NEW: Realtime subscriptions
│
├── context/                   # React Context providers (DEPRECATED - migrate to Zustand)
│   ├── AuthContextProvider.tsx    # ❌ DELETE after migration
│   ├── EmailGenerationProvider.tsx # ❌ DELETE after migration
│   └── index.ts              # ❌ DELETE after migration
│
├── stores/                    # ✨ NEW: Zustand stores
│   ├── authStore.ts          # Auth state (replaces AuthContext)
│   ├── emailQueueStore.ts    # Email queue state (replaces EmailGenerationContext)
│   ├── professorStore.ts     # Professor data state
│   └── index.ts              # Export all stores
│
├── services/                  # ✨ NEW: API and business logic layer
│   ├── api/                  # External API calls (api.manit.codes)
│   │   ├── client.ts         # Base API client with error handling
│   │   ├── email.service.ts  # Email generation API
│   │   └── types.ts          # API-specific types
│   │
│   ├── supabase/             # ✨ NEW: Supabase operations
│   │   ├── auth.service.ts   # Authentication service
│   │   ├── database.service.ts # Database queries
│   │   └── realtime.service.ts # Real-time subscriptions
│   │
│   └── index.ts              # Export all services
│
├── lib/                       # Utilities and helpers
│   ├── utils.ts              # General utilities (cn, etc.)
│   ├── validation.ts         # Form validation helpers
│   ├── storage.ts            # localStorage wrapper (Zustand middleware)
│   ├── constants.ts          # App constants
│   └── errors.ts             # Error handling utilities
│
├── types/                     # TypeScript type definitions
│   ├── index.ts              # Re-export all types
│   ├── user.ts               # User-related types
│   ├── professor.ts          # Professor types
│   ├── email.ts              # Email types
│   ├── api.ts                # API request/response types
│   ├── supabase.ts           # ✨ NEW: Auto-generated Supabase types
│   └── stores.ts             # ✨ NEW: Zustand store types
│
├── config/                    # Configuration files
│   ├── supabase.ts           # ✨ NEW: Supabase client config
│   ├── constants.ts          # App-wide constants
│   └── routes.ts             # Route definitions
│
├── public/                    # Static assets
│   ├── images/               # Images
│   ├── icons/                # Icons/SVGs
│   └── fonts/                # Fonts (if self-hosted)
│
├── .env.local                 # Environment variables (git-ignored)
├── .env.example               # Example env file (committed)
├── components.json            # shadcn config
├── tailwind.config.js
├── tsconfig.json
├── next.config.ts
└── package.json
```

### Benefits of This Structure

1. **Feature-based Organization**: Components grouped by domain
2. **Clear Separation**: Presentation (components) vs. Logic (services/hooks)
3. **Scalability**: Easy to add new features without confusion
4. **Discoverability**: Intuitive file locations
5. **Testability**: Services and hooks are easy to test in isolation

---

<a name="type-system"></a>
## 13. Type System & Shared Types

**Overview:** TypeScript type definitions shared between frontend and backend (can be generated from backend schemas).

### Current Issues

1. **Empty `/types` directory** - Types defined inline throughout codebase
2. **Type Duplication** - `Professor` interface defined in multiple files
3. **Weak Typing** - `any` types in critical places
4. **No API Types** - Request/response shapes not defined

### Where Types Are Currently Defined

- `hooks/useFirebaseProfessors.ts` → `Professor` interface
- `app/dashboard/page.tsx` → `EmailHistory` interface
- `context/EmailGenerationProvider.tsx` → `GenerationQueueItem` interface
- Inline interfaces throughout components

### Recommended Type Organization

#### `types/user.ts`
```typescript
import { User as FirebaseUser } from 'firebase/auth';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// Convert Firebase user to app user
export function toUser(firebaseUser: FirebaseUser): User {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
  };
}
```

#### `types/professor.ts`
```typescript
export interface Professor {
  id: string;
  name: string;
  university: string;
  interests: string[];
  image?: string;
}

export interface ProfessorQueueItem extends Professor {
  addedAt: number;
}

export interface AcceptedProfessor {
  id: string;
  name: string;
  university: string;
  interest: string;
  created_at: number;
}

export interface ProfessorInteraction {
  professorId: string;
  userId: string;
  action: 'accept' | 'reject';
  timestamp: number;
}
```

#### `types/email.ts`
```typescript
import { Timestamp } from 'firebase/firestore';

export type EmailSource = 'generate';
export type EmailStatus = 'pending' | 'completed' | 'failed';

export interface EmailHistory {
  id: string;
  professor_name: string;
  professor_interest: string;
  email_message: string;
  source: EmailSource;
  created_at: Timestamp;
  status: EmailStatus;
}

export interface GenerationQueueItem {
  id: string;
  name: string;
  interest: string;
  status: EmailStatus;
}

export interface EmailTemplate {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### `types/api.ts`
```typescript
// Request types
export interface GenerateEmailRequest {
  professorName: string;
  professorInterest: string;
  studentInfo: string;
  template: string;
}

export interface OpenAITemplateRequest {
  prompt: string;
}

// Response types
export interface GenerateEmailResponse {
  email: string;
  success: boolean;
  error?: string;
}

export interface OpenAITemplateResponse {
  template: string;
}

// Error types
export interface APIError {
  message: string;
  code?: string;
  status?: number;
}
```

#### `types/firebase.ts`
```typescript
import { Timestamp } from 'firebase/firestore';

// Firestore document types
export interface UserDocument {
  email: string;
  createdAt: Timestamp;
  displayName?: string;
  studentInfo?: string;
  generationCount?: number;
}

export interface ProfessorDocument {
  name: string;
  university: string;
  interests: string[];
  image?: string;
  status: 'pending' | 'reviewed';
}

export interface EmailDocument {
  professor_name: string;
  professor_interest: string;
  email_message: string;
  source: 'generate';
  created_at: Timestamp;
  status: 'pending' | 'completed' | 'failed';
}
```

#### `types/index.ts`
```typescript
// Central export point for all types
export * from './user';
export * from './professor';
export * from './email';
export * from './api';
export * from './firebase';
```

### Type Usage Pattern

**Before:**
```typescript
// Multiple files defining the same type
interface Professor {
  id: string;
  name: string;
  // ...
}
```

**After:**
```typescript
// Single import
import { Professor, EmailHistory, User } from '@/types';

// Use types consistently across the app
function ProfessorCard({ professor }: { professor: Professor }) {
  // ...
}
```

### TypeScript Best Practices

1. **Avoid `any`** - Use `unknown` if type is truly unknown
2. **Use Union Types** - For enums: `'pending' | 'completed' | 'failed'`
3. **Extend Interfaces** - DRY: `interface Extended extends Base {}`
4. **Type vs Interface** - Use `type` for unions, `interface` for objects
5. **Utility Types** - Learn `Partial`, `Pick`, `Omit`, `Record`
6. **Discriminated Unions** - For different states:
```typescript
type Result =
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };
```

---

## 3. Frontend: State Management

**Overview:** Client-side state management using Zustand and Context API for the React frontend.

### Current Approach

**Technologies Used:**
- React Context API (AuthContext, EmailGenerationContext)
- useState for local state
- localStorage for persistence (scattered)

**Issues:**
1. Type safety problems (`any` types)
2. Performance concerns (Context re-renders all consumers)
3. localStorage management scattered across files
4. No devtools for debugging
5. Potential race conditions in queue processing

### Context API - When It's Good

Context is **appropriate** for:
- ✅ Auth state (current user)
- ✅ Theme/preferences
- ✅ Locale/i18n
- ✅ Rarely changing global state

Context is **not ideal** for:
- ❌ Frequently updated state
- ❌ Complex state with many actions
- ❌ State that needs persistence
- ❌ State that needs devtools

### Zustand - Better Alternative for Complex State

**Why Zustand:**
- ✅ Full TypeScript support
- ✅ No Provider wrapper needed
- ✅ Only re-renders components using specific state
- ✅ Built-in middleware (persist, devtools)
- ✅ Simpler API than Redux
- ✅ Better performance than Context

#### Implementation: Auth Store with Zustand + Supabase

**Installation:**
```bash
npm install zustand
```

**Create `stores/authStore.ts`:**
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { supabase } from '@/config/supabase';
import { authService } from '@/services/supabase/auth.service';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  // State
  user: User | null;
  loading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => () => void; // Returns cleanup function
}

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        loading: true,
        error: null,

        // Actions
        setUser: (user) => set({ user, error: null }, false, 'setUser'),

        setLoading: (loading) => set({ loading }, false, 'setLoading'),

        setError: (error) => set({ error }, false, 'setError'),

        signInWithGoogle: async () => {
          try {
            set({ loading: true, error: null }, false, 'signInWithGoogle:start');
            await authService.signInWithGoogle();
            // Auth state will be updated by the listener
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
            set({ error: errorMessage, loading: false }, false, 'signInWithGoogle:error');
            throw error;
          }
        },

        signOut: async () => {
          try {
            set({ loading: true, error: null }, false, 'signOut:start');
            await authService.signOut();
            set({ user: null, loading: false }, false, 'signOut:complete');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to sign out';
            set({ error: errorMessage, loading: false }, false, 'signOut:error');
            throw error;
          }
        },

        initializeAuth: () => {
          // Set up auth state listener
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              const user = session?.user ?? null;
              set({ user, loading: false }, false, `authStateChange:${event}`);
            }
          );

          // Check initial session
          authService.getSession().then(session => {
            set({ user: session?.user ?? null, loading: false }, false, 'initAuth:session');
          });

          // Return cleanup function
          return () => {
            subscription.unsubscribe();
          };
        },
      }),
      {
        name: 'auth-storage',
        // Only persist user data, not loading/error states
        partialize: (state) => ({ user: state.user }),
      }
    ),
    { name: 'AuthStore' }
  )
);

// Selectors for common use cases
export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsLoading = (state: AuthState) => state.loading;
```

**Initialize in `app/layout.tsx`:**
```typescript
"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize auth and get cleanup function
    const cleanup = useAuthStore.getState().initializeAuth();

    // Cleanup on unmount
    return cleanup;
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Usage in components:**
```typescript
import { useAuthStore, selectUser, selectIsAuthenticated } from '@/stores/authStore';

function Navbar() {
  // Only re-renders when user changes (optimized selector)
  const user = useAuthStore(selectUser);
  const signOut = useAuthStore(state => state.signOut);

  return (
    <div>
      {user?.email}
      <button onClick={signOut}>Logout</button>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const loading = useAuthStore(selectIsLoading);

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/" />;

  return <>{children}</>;
}

// Access state without causing re-render
function someUtilFunction() {
  const userId = useAuthStore.getState().user?.id;
  return userId;
}
```

#### Implementation: Email Queue Store with Persistence

**Create `stores/emailQueueStore.ts`:**
```typescript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { emailService } from '@/services/api/email.service';
import { databaseService } from '@/services/supabase/database.service';
import type { GenerationQueueItem } from '@/types';

interface EmailQueueState {
  // State
  queue: GenerationQueueItem[];
  isGenerating: boolean;
  currentlyProcessing: string | null;
  error: string | null;

  // Actions
  addToQueue: (item: Omit<GenerationQueueItem, 'id' | 'status'>) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItemStatus: (id: string, status: GenerationQueueItem['status']) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  clearQueue: () => void;
  processQueue: (userId: string, template: string, studentInfo: string) => Promise<void>;
}

export const useEmailQueueStore = create<EmailQueueState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        queue: [],
        isGenerating: false,
        currentlyProcessing: null,
        error: null,

        // Actions
        addToQueue: (item) => set((state) => ({
          queue: [
            ...state.queue,
            {
              ...item,
              id: crypto.randomUUID(),
              status: 'pending' as const,
            }
          ],
          error: null,
        }), false, 'addToQueue'),

        removeFromQueue: (id) => set((state) => ({
          queue: state.queue.filter(item => item.id !== id)
        }), false, 'removeFromQueue'),

        updateQueueItemStatus: (id, status) => set((state) => ({
          queue: state.queue.map(item =>
            item.id === id ? { ...item, status } : item
          )
        }), false, 'updateQueueItemStatus'),

        setIsGenerating: (isGenerating) =>
          set({ isGenerating }, false, 'setIsGenerating'),

        clearQueue: () => set({
          queue: [],
          error: null
        }, false, 'clearQueue'),

        // Process all pending items in queue
        processQueue: async (userId, template, studentInfo) => {
          const state = get();

          if (state.isGenerating) {
            console.log('Queue is already being processed');
            return;
          }

          const pendingItems = state.queue.filter(item => item.status === 'pending');

          if (pendingItems.length === 0) {
            console.log('No pending items in queue');
            return;
          }

          set({ isGenerating: true, error: null }, false, 'processQueue:start');

          for (const item of pendingItems) {
            try {
              set({ currentlyProcessing: item.id }, false, 'processQueue:processing');

              // Update status to processing
              get().updateQueueItemStatus(item.id, 'pending');

              // Generate email
              const response = await emailService.generateEmail({
                professorName: item.name,
                professorInterest: item.interest,
                studentInfo,
                template,
              });

              if (response.success && response.email) {
                // Save to Supabase
                await databaseService.createEmail(userId, {
                  professor_name: item.name,
                  professor_interest: item.interest,
                  email_message: response.email,
                  source: 'generate',
                  status: 'completed',
                });

                // Update queue item status
                get().updateQueueItemStatus(item.id, 'completed');
              } else {
                throw new Error('Email generation failed');
              }

            } catch (error) {
              console.error(`Failed to generate email for ${item.name}:`, error);
              get().updateQueueItemStatus(item.id, 'failed');
              set({
                error: `Failed to generate email for ${item.name}`
              }, false, 'processQueue:error');
            }
          }

          set({
            isGenerating: false,
            currentlyProcessing: null
          }, false, 'processQueue:complete');

          // Remove completed items after a delay
          setTimeout(() => {
            set((state) => ({
              queue: state.queue.filter(item => item.status !== 'completed')
            }), false, 'processQueue:cleanup');
          }, 3000);
        },
      }),
      {
        name: 'email-queue-storage',
        // Only persist queue, not runtime states
        partialize: (state) => ({ queue: state.queue }),
      }
    ),
    { name: 'EmailQueueStore' }
  )
);

// Selectors
export const selectQueue = (state: EmailQueueState) => state.queue;
export const selectQueueLength = (state: EmailQueueState) => state.queue.length;
export const selectPendingCount = (state: EmailQueueState) =>
  state.queue.filter(item => item.status === 'pending').length;
export const selectIsGenerating = (state: EmailQueueState) => state.isGenerating;
```

**Usage:**
```typescript
import { useEmailQueueStore, selectQueue, selectIsGenerating } from '@/stores/emailQueueStore';
import { useAuthStore } from '@/stores/authStore';

function GeneratePage() {
  const processQueue = useEmailQueueStore(state => state.processQueue);
  const isGenerating = useEmailQueueStore(selectIsGenerating);
  const user = useAuthStore(state => state.user);
  const [template, setTemplate] = useState('');
  const [studentInfo, setStudentInfo] = useState('');

  const handleGenerate = async () => {
    if (!user) return;

    await processQueue(user.id, template, studentInfo);
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate Emails'}
      </button>
    </div>
  );
}
```

#### Implementation: Professor Store

**Create `stores/professorStore.ts`:**
```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { databaseService } from '@/services/supabase/database.service';
import type { Professor, AcceptedProfessor } from '@/types';

interface ProfessorState {
  // State
  professors: Professor[];
  acceptedProfessors: AcceptedProfessor[];
  currentProfessorIndex: number;
  loading: boolean;
  error: string | null;

  // Actions
  fetchProfessors: () => Promise<void>;
  fetchAcceptedProfessors: (userId: string) => Promise<void>;
  acceptProfessor: (userId: string, professor: Professor, interest: string) => Promise<void>;
  rejectProfessor: (professor: Professor) => void;
  nextProfessor: () => void;
  reset: () => void;
}

export const useProfessorStore = create<ProfessorState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        professors: [],
        acceptedProfessors: [],
        currentProfessorIndex: 0,
        loading: false,
        error: null,

        // Actions
        fetchProfessors: async () => {
          set({ loading: true, error: null }, false, 'fetchProfessors:start');

          try {
            const professors = await databaseService.getPendingProfessors();
            set({
              professors,
              loading: false,
              currentProfessorIndex: 0
            }, false, 'fetchProfessors:success');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch professors';
            set({
              error: errorMessage,
              loading: false
            }, false, 'fetchProfessors:error');
          }
        },

        fetchAcceptedProfessors: async (userId) => {
          try {
            const accepted = await databaseService.getAcceptedProfessors(userId);
            set({ acceptedProfessors: accepted }, false, 'fetchAcceptedProfessors:success');
          } catch (error) {
            console.error('Failed to fetch accepted professors:', error);
          }
        },

        acceptProfessor: async (userId, professor, interest) => {
          try {
            await databaseService.acceptProfessor(userId, professor.id, interest);

            // Add to accepted list
            set((state) => ({
              acceptedProfessors: [
                {
                  id: professor.id,
                  user_id: userId,
                  professor_id: professor.id,
                  interest,
                  created_at: new Date().toISOString(),
                  professors: professor,
                },
                ...state.acceptedProfessors,
              ]
            }), false, 'acceptProfessor:success');

            // Move to next professor
            get().nextProfessor();
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to accept professor';
            set({ error: errorMessage }, false, 'acceptProfessor:error');
            throw error;
          }
        },

        rejectProfessor: (professor) => {
          // Just move to next professor
          get().nextProfessor();
        },

        nextProfessor: () => {
          set((state) => ({
            currentProfessorIndex: state.currentProfessorIndex + 1
          }), false, 'nextProfessor');
        },

        reset: () => {
          set({
            professors: [],
            acceptedProfessors: [],
            currentProfessorIndex: 0,
            loading: false,
            error: null,
          }, false, 'reset');
        },
      }),
      {
        name: 'professor-storage',
        // Persist accepted professors and current index
        partialize: (state) => ({
          acceptedProfessors: state.acceptedProfessors,
          currentProfessorIndex: state.currentProfessorIndex,
        }),
      }
    ),
    { name: 'ProfessorStore' }
  )
);

// Selectors
export const selectCurrentProfessor = (state: ProfessorState) =>
  state.professors[state.currentProfessorIndex];
export const selectHasMoreProfessors = (state: ProfessorState) =>
  state.currentProfessorIndex < state.professors.length;
export const selectAcceptedCount = (state: ProfessorState) =>
  state.acceptedProfessors.length;
```

### Migration Strategy

**Option 1: Keep Context for Auth, Use Zustand for Complex State**
- Auth stays as Context (it's simple and rarely changes)
- Email queue moves to Zustand (complex, needs persistence)
- Professor state could use Zustand

**Option 2: Full Zustand Migration**
- Convert everything to Zustand
- More consistent
- Better DX with devtools

### Recommended Approach

For learning purposes, **try both**:
1. Start with Zustand for email queue (easier to see benefits)
2. Then consider migrating auth if you like it
3. Compare performance and DX

---

---

## ⚙️ BACKEND IMPROVEMENTS

> This section covers improvements for the Python/FastAPI backend.
> The backend handles database operations, business logic, API endpoints, and data validation.

---

<a name="backend-api-service-layer"></a>
## 8. Backend: API Service Layer

### Current Issues

**Note:** While the API endpoints are implemented in the Python/FastAPI backend, the frontend needs a proper service layer to consume these APIs.

1. **Hardcoded URLs** scattered in components:
   - `https://api.manit.codes/call-openai`
   - `https://api.manit.codes/generate-email`

2. **No centralized API logic** - fetch calls in:
   - `app/dashboard/template/page.tsx`
   - `context/EmailGenerationProvider.tsx`

3. **Mixed data sources**: Firebase (being removed) + External API (api.manit.codes) + Supabase (new)

4. **Inconsistent error handling**:
   - Some use try/catch
   - Some use .catch()
   - Some ignore errors

5. **No request/response types** - Using `any` or untyped JSON

6. **No request cancellation** - Can cause memory leaks

### New Architecture: Service Layer Pattern

The service layer acts as a **proxy** between your components and external APIs/databases. This provides:
- ✅ Single source of truth for all data operations
- ✅ Type-safe request/response handling
- ✅ Centralized error handling
- ✅ Easy testing with mocks
- ✅ Consistent patterns across the app

### Professional API Service Pattern

#### Step 1: Environment Variables

**Create `.env.local`:**
```env
NEXT_PUBLIC_API_URL=https://api.manit.codes
```

**Create `.env.example`:** (commit this)
```env
NEXT_PUBLIC_API_URL=https://api.manit.codes
```

#### Step 2: Create Base API Client

**Create `services/api/client.ts`:**
```typescript
import type { APIError } from '@/types';

class APIClient {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://api.manit.codes';

    if (!this.baseURL) {
      throw new Error('API URL not configured');
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error: APIError = {
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        };
        throw error;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', signal });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    signal?: AbortSignal
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      signal,
    });
  }
}

export const apiClient = new APIClient();
```

#### Step 3: Create Domain Services

**Create `services/api/email.service.ts`:**
```typescript
import { apiClient } from './client';
import type {
  GenerateEmailRequest,
  GenerateEmailResponse,
  OpenAITemplateRequest,
  OpenAITemplateResponse,
} from '@/types';

class EmailService {
  /**
   * Generate an email using AI
   */
  async generateEmail(
    request: GenerateEmailRequest,
    signal?: AbortSignal
  ): Promise<GenerateEmailResponse> {
    try {
      return await apiClient.post<GenerateEmailResponse>(
        '/generate-email',
        request,
        signal
      );
    } catch (error) {
      console.error('Email generation failed:', error);
      throw new Error('Failed to generate email. Please try again.');
    }
  }

  /**
   * Generate email template using OpenAI
   */
  async generateTemplate(
    prompt: string,
    signal?: AbortSignal
  ): Promise<string> {
    try {
      const response = await apiClient.post<OpenAITemplateResponse>(
        '/call-openai',
        { prompt },
        signal
      );
      return response.template;
    } catch (error) {
      console.error('Template generation failed:', error);
      throw new Error('Failed to generate template. Please try again.');
    }
  }
}

export const emailService = new EmailService();
```

**Create `services/api/professor.service.ts`:**
```typescript
import { db } from '@/config/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import type { Professor, AcceptedProfessor } from '@/types';

class ProfessorService {
  /**
   * Fetch pending professors from Firestore
   */
  async getPendingProfessors(userId: string): Promise<Professor[]> {
    const professorsRef = collection(db, 'professors');
    const q = query(professorsRef, where('status', '==', 'pending'));

    const querySnapshot = await getDocs(q);
    const professors: Professor[] = [];

    querySnapshot.forEach((doc) => {
      professors.push({ id: doc.id, ...doc.data() } as Professor);
    });

    return professors;
  }

  /**
   * Accept a professor
   */
  async acceptProfessor(
    userId: string,
    professor: Professor,
    interest: string
  ): Promise<void> {
    const acceptedRef = doc(
      db,
      'users',
      userId,
      'accepted_professors',
      professor.id
    );

    await setDoc(acceptedRef, {
      name: professor.name,
      university: professor.university,
      interest: interest,
      created_at: Date.now(),
    });
  }
}

export const professorService = new ProfessorService();
```

#### Step 4: Export All Services

**Create `services/index.ts`:**
```typescript
export * from './api/email.service';
export * from './api/professor.service';
```

#### Step 5: Usage in Components

**Before:**
```typescript
// Scattered fetch calls
const response = await fetch("https://api.manit.codes/generate-email", {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody),
});
const data = await response.json();
```

**After:**
```typescript
import { emailService } from '@/services';

// Type-safe, cancellable, centralized
const controller = new AbortController();

try {
  const result = await emailService.generateEmail(
    {
      professorName: name,
      professorInterest: interest,
      studentInfo: userInfo,
      template: template,
    },
    controller.signal
  );

  console.log(result.email);
} catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  }
}

// Cleanup
return () => controller.abort();
```

### Benefits

1. ✅ **Type Safety** - Request/response types enforced
2. ✅ **Single Source of Truth** - API URL in one place
3. ✅ **Easy Mocking** - Simple to mock services for testing
4. ✅ **Consistent Errors** - Centralized error handling
5. ✅ **Request Cancellation** - Prevent memory leaks
6. ✅ **Testability** - Services can be tested in isolation

---

<a name="frontend-custom-hooks"></a>
## 4. Frontend: Custom Hooks & Patterns

### Overview

Custom hooks provide a clean interface between components and your stores/services. They encapsulate complex logic and make components simpler.

**Benefits:**
- ✅ Reusable logic across components
- ✅ Separation of concerns
- ✅ Easier testing
- ✅ Better code organization
- ✅ Cleaner component code

### Hook Architecture

```
hooks/
├── useAuth.ts              # Auth state and operations
├── useEmailQueue.ts        # Email queue management
├── useProfessors.ts        # Professor data fetching
├── useSupabaseQuery.ts     # Generic Supabase query hook
└── useSupabaseRealtime.ts  # Real-time subscriptions
```

### Implementation Examples

#### 1. `hooks/useAuth.ts` - Simple Store Wrapper

This hook wraps the Zustand auth store and provides a clean API for components.

```typescript
import { useAuthStore, selectUser, selectIsAuthenticated, selectIsLoading } from '@/stores/authStore';

/**
 * Hook for authentication state and operations
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, isAuthenticated, signOut } = useAuth();
 *
 *   if (!isAuthenticated) return <Login />;
 *
 *   return <div>Welcome {user.email}</div>;
 * }
 * ```
 */
export function useAuth() {
  const user = useAuthStore(selectUser);
  const loading = useAuthStore(selectIsLoading);
  const error = useAuthStore(state => state.error);
  const signInWithGoogle = useAuthStore(state => state.signInWithGoogle);
  const signOut = useAuthStore(state => state.signOut);

  const isAuthenticated = !!user;

  return {
    user,
    loading,
    error,
    isAuthenticated,
    signInWithGoogle,
    signOut,
  };
}

/**
 * Hook that throws if user is not authenticated
 * Use this in protected components that require auth
 */
export function useRequireAuth() {
  const auth = useAuth();

  if (!auth.loading && !auth.isAuthenticated) {
    throw new Error('User must be authenticated');
  }

  return auth;
}

/**
 * Get user ID or throw error
 */
export function useUserId(): string {
  const { user, loading } = useAuth();

  if (loading) throw new Error('Auth still loading');
  if (!user) throw new Error('User not authenticated');

  return user.id;
}
```

#### 2. `hooks/useEmailQueue.ts` - Queue Management

```typescript
import { useEmailQueueStore, selectQueue, selectIsGenerating, selectPendingCount } from '@/stores/emailQueueStore';
import { useUserId } from './useAuth';

/**
 * Hook for email queue operations
 */
export function useEmailQueue() {
  const queue = useEmailQueueStore(selectQueue);
  const isGenerating = useEmailQueueStore(selectIsGenerating);
  const pendingCount = useEmailQueueStore(selectPendingCount);
  const addToQueue = useEmailQueueStore(state => state.addToQueue);
  const removeFromQueue = useEmailQueueStore(state => state.removeFromQueue);
  const clearQueue = useEmailQueueStore(state => state.clearQueue);
  const processQueue = useEmailQueueStore(state => state.processQueue);

  return {
    queue,
    isGenerating,
    pendingCount,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
  };
}

/**
 * Hook for generating emails from queue
 * Automatically uses current user ID
 */
export function useGenerateEmails() {
  const userId = useUserId();
  const { processQueue, isGenerating } = useEmailQueue();

  const generateEmails = async (template: string, studentInfo: string) => {
    return processQueue(userId, template, studentInfo);
  };

  return {
    generateEmails,
    isGenerating,
  };
}
```

#### 3. `hooks/useProfessors.ts` - Professor Data Management

```typescript
import { useEffect } from 'react';
import { useProfessorStore, selectCurrentProfessor, selectHasMoreProfessors } from '@/stores/professorStore';
import { useUserId } from './useAuth';

/**
 * Hook for managing professor data
 * Automatically fetches professors on mount
 */
export function useProfessors() {
  const userId = useUserId();
  const professors = useProfessorStore(state => state.professors);
  const acceptedProfessors = useProfessorStore(state => state.acceptedProfessors);
  const currentProfessor = useProfessorStore(selectCurrentProfessor);
  const hasMoreProfessors = useProfessorStore(selectHasMoreProfessors);
  const loading = useProfessorStore(state => state.loading);
  const error = useProfessorStore(state => state.error);

  const fetchProfessors = useProfessorStore(state => state.fetchProfessors);
  const fetchAcceptedProfessors = useProfessorStore(state => state.fetchAcceptedProfessors);
  const acceptProfessor = useProfessorStore(state => state.acceptProfessor);
  const rejectProfessor = useProfessorStore(state => state.rejectProfessor);

  // Auto-fetch on mount
  useEffect(() => {
    fetchProfessors();
    fetchAcceptedProfessors(userId);
  }, [fetchProfessors, fetchAcceptedProfessors, userId]);

  const handleAccept = async (interest: string) => {
    if (!currentProfessor) return;
    await acceptProfessor(userId, currentProfessor, interest);
  };

  const handleReject = () => {
    if (!currentProfessor) return;
    rejectProfessor(currentProfessor);
  };

  return {
    professors,
    acceptedProfessors,
    currentProfessor,
    hasMoreProfessors,
    loading,
    error,
    handleAccept,
    handleReject,
    refetch: () => {
      fetchProfessors();
      fetchAcceptedProfessors(userId);
    },
  };
}
```

#### 4. `hooks/useSupabaseQuery.ts` - Generic Supabase Hook

```typescript
import { useState, useEffect } from 'react';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

type QueryBuilder<T> = () => PostgrestFilterBuilder<any, any, T[]>;

interface UseSupabaseQueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Generic hook for Supabase queries
 * Handles loading, error states, and refetching
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useSupabaseQuery(
 *   () => supabase.from('emails').select('*').eq('user_id', userId),
 *   { enabled: !!userId }
 * );
 * ```
 */
export function useSupabaseQuery<T>(
  queryBuilder: QueryBuilder<T>,
  options: UseSupabaseQueryOptions = {}
) {
  const { enabled = true, refetchInterval } = options;

  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const query = queryBuilder();
      const { data: result, error: queryError } = await query;

      if (queryError) throw queryError;

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Query failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up refetch interval if specified
    if (refetchInterval && enabled) {
      const interval = setInterval(fetchData, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [enabled, refetchInterval]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
```

#### 5. `hooks/useSupabaseRealtime.ts` - Real-time Subscriptions

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  filter?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

/**
 * Hook for Supabase real-time subscriptions
 *
 * @example
 * ```tsx
 * const { data, loading } = useSupabaseRealtime({
 *   table: 'emails',
 *   filter: `user_id=eq.${userId}`,
 *   event: '*'
 * });
 * ```
 */
export function useSupabaseRealtime<T>(
  options: UseRealtimeOptions,
  fetchInitialData: () => Promise<T[]>
) {
  const { table, filter, event = '*' } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = async () => {
      try {
        // Fetch initial data
        const initialData = await fetchInitialData();
        setData(initialData);
        setLoading(false);

        // Set up real-time subscription
        channel = supabase
          .channel(`${table}_changes`)
          .on(
            'postgres_changes',
            {
              event,
              schema: 'public',
              table,
              filter,
            },
            async () => {
              // Refetch data on any change
              const newData = await fetchInitialData();
              setData(newData);
            }
          )
          .subscribe();

      } catch (err) {
        setError(err instanceof Error ? err : new Error('Subscription failed'));
        setLoading(false);
      }
    };

    setupSubscription();

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, filter, event]);

  return {
    data,
    loading,
    error,
  };
}

/**
 * Hook for email history with real-time updates
 */
export function useEmailHistoryRealtime(userId: string) {
  const { data, loading, error } = useSupabaseRealtime(
    {
      table: 'emails',
      filter: `user_id=eq.${userId}`,
      event: '*',
    },
    async () => {
      const { data, error } = await supabase
        .from('emails')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  );

  return { emails: data, loading, error };
}
```

### Hook Usage in Components

**Before (Direct store/service access):**
```typescript
function Dashboard() {
  const user = useAuthStore(state => state.user);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchEmails = async () => {
      try {
        const data = await databaseService.getEmailHistory(user.id);
        setEmails(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmails();
  }, [user]);

  if (loading) return <div>Loading...</div>;

  return <div>{emails.length} emails</div>;
}
```

**After (Custom hooks):**
```typescript
function Dashboard() {
  const { user } = useAuth();
  const { emails, loading, error } = useEmailHistoryRealtime(user?.id!);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{emails.length} emails</div>;
}
```

### Hook Best Practices

1. **Name hooks starting with `use`** - React convention
2. **Keep hooks focused** - One responsibility per hook
3. **Document with JSDoc** - Explain parameters and usage
4. **Handle loading/error states** - Always provide these to components
5. **Provide examples** - Show usage in JSDoc comments
6. **Compose hooks** - Build complex hooks from simpler ones
7. **Clean up subscriptions** - Return cleanup functions from useEffect
8. **Type everything** - Full TypeScript support

---

<a name="frontend-component-organization"></a>
## 5. Frontend: Component Organization

**Overview:** Best practices for organizing React components in the frontend application.

### Current Issues

1. **Mixed Export Styles:**
   - Some use default export: `Navbar.tsx`
   - Some use named export: `Header.tsx`, `ProfessorCard.tsx`

2. **Inline Type Definitions:**
   - Props interfaces defined in component files
   - Not reusable

3. **No Component Documentation:**
   - No JSDoc comments
   - Complex logic unexplained

4. **Inconsistent File Naming:**
   - Most use PascalCase (good)
   - UI components use lowercase (shadcn convention)

### Best Practices

#### 1. Named Exports (Preferred)

**Why Named Exports:**
- ✅ Better for tree-shaking
- ✅ Easier refactoring (can't rename on import)
- ✅ Better autocomplete
- ✅ Can export multiple things from one file

**Before (Default Export):**
```typescript
export default function Navbar() {
  // ...
}

// Can be imported as anything
import MyNavbar from '@/components/Navbar';
import Foo from '@/components/Navbar'; // Wrong but allowed
```

**After (Named Export):**
```typescript
export function Navbar() {
  // ...
}

// Must use correct name
import { Navbar } from '@/components/Navbar';
```

#### 2. Separate Type Definitions

**Before:**
```typescript
// In component file
interface HeaderProps {
  acceptedProfessors: AcceptedProfessor[];
}

export function Header({ acceptedProfessors }: HeaderProps) {
  // ...
}
```

**After:**
```typescript
// types/component-props.ts
export interface HeaderProps {
  acceptedProfessors: AcceptedProfessor[];
}

// components/layout/Header.tsx
import type { HeaderProps } from '@/types/component-props';

export function Header({ acceptedProfessors }: HeaderProps) {
  // ...
}
```

Or if props are only used in one component:
```typescript
// components/layout/Header.tsx
import type { AcceptedProfessor } from '@/types';

interface HeaderProps {
  acceptedProfessors: AcceptedProfessor[];
}

export function Header({ acceptedProfessors }: HeaderProps) {
  // ...
}
```

#### 3. Add JSDoc Documentation

**For Complex Components:**
```typescript
/**
 * Email generation component with form validation.
 *
 * Handles user input for email generation with proper validation.
 * Uses React Hook Form for form management.
 *
 * @param template - Email template to use
 * @param onGenerate - Called when user submits the form
 *
 * @example
 * ```tsx
 * <EmailForm
 *   template={template}
 *   onGenerate={(data) => generateEmail(data)}
 * />
 * ```
 */
export function EmailForm({
  template,
  onGenerate,
}: EmailFormProps) {
  // ...
}
```

#### 4. Component Structure Pattern

```typescript
// 1. Imports
import { useState, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import type { Professor } from '@/types';

// 2. Types/Interfaces
interface ProfessorCardProps {
  professor: Professor;
  onAccept: (professor: Professor) => void;
  onReject: (professor: Professor) => void;
}

// 3. Constants
const MAX_EMAIL_LENGTH = 1000;
const VALIDATION_DELAY = 300;

// 4. Component
export function ProfessorCard({
  professor,
  onAccept,
  onReject,
}: ProfessorCardProps) {
  // 4a. Hooks
  const x = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  // 4b. Derived state
  const rotate = useTransform(x, [-200, 200], [-25, 25]);

  // 4c. Effects
  useEffect(() => {
    // ...
  }, []);

  // 4d. Event handlers
  const handleDragEnd = () => {
    // ...
  };

  // 4e. Render helpers
  const renderInterests = () => {
    return professor.interests.map(interest => (
      <span key={interest}>{interest}</span>
    ));
  };

  // 4f. Return JSX
  return (
    <motion.div>
      {/* ... */}
    </motion.div>
  );
}

// 5. Sub-components (if needed)
function InterestBadge({ interest }: { interest: string }) {
  return <span className="badge">{interest}</span>;
}
```

### Component Organization by Feature

**Current:**
```
components/
  ├── Navbar.tsx
  ├── Header.tsx
  ├── ProfessorCard.tsx
  └── MobileRestriction.tsx
```

**Recommended:**
```
components/
  ├── layout/
  │   ├── Navbar.tsx              # Navigation bar
  │   ├── Header.tsx              # Page header
  │   └── Footer.tsx              # Footer
  │
  ├── features/
  │   ├── professor/
  │   │   ├── ProfessorCard.tsx   # Main card component
  │   │   ├── ProfessorList.tsx   # List of professors
  │   │   └── InterestBadge.tsx   # Shared badge component
  │   │
  │   ├── email/
  │   │   ├── EmailHistoryList.tsx
  │   │   ├── EmailQueueDisplay.tsx
  │   │   └── EmailTemplateForm.tsx
  │   │
  │   └── auth/
  │       ├── LoginButton.tsx
  │       └── UserProfile.tsx
  │
  ├── shared/
  │   ├── ErrorBoundary.tsx
  │   ├── LoadingSpinner.tsx
  │   ├── ProtectedRoute.tsx
  │   └── MobileRestriction.tsx
  │
  └── ui/                          # shadcn components
      ├── button.tsx
      ├── card.tsx
      └── ...
```

---

<a name="frontend-error-handling"></a>
## 6. Frontend: Error Handling

**Overview:** Client-side error handling including Error Boundaries, loading states, and user feedback.

### Current Issues

1. **No Error Boundaries** - Component errors crash entire app
2. **No Loading States** - No `loading.tsx` files for routes
3. **No Error Pages** - No `error.tsx` files for routes
4. **Inconsistent Error Handling** - Different patterns across components
5. **No User-Friendly Messages** - Raw errors shown to users

### Solution: Multi-Layer Error Handling

#### Layer 1: Route-Level Error Handling

**Create `app/error.tsx`:**
```typescript
"use client";

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Something went wrong!
            </h2>
            <p className="text-gray-600 mb-6">
              We're sorry for the inconvenience. Please try again.
            </p>
            <Button onClick={reset}>Try again</Button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

**Create `app/dashboard/error.tsx`:**
```typescript
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Dashboard Error</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button onClick={reset} className="btn-primary">
          Reload Dashboard
        </button>
      </div>
    </div>
  );
}
```

#### Layer 2: Loading States

**Create `app/loading.tsx`:**
```typescript
export default function GlobalLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
```

**Create `app/dashboard/loading.tsx`:**
```typescript
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}
```

#### Layer 3: Error Utility Functions

**Create `lib/errors.ts`:**
```typescript
/**
 * Convert unknown error to user-friendly message
 */
export function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Async error handler wrapper
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage = 'Operation failed'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMessage, error);
    throw new Error(errorMessage);
  }
}

/**
 * Firebase error messages
 */
export function getFirebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'Email is already registered',
    'auth/weak-password': 'Password should be at least 6 characters',
    'permission-denied': 'You do not have permission to perform this action',
  };

  return messages[code] || 'An error occurred. Please try again.';
}
```

**Usage:**
```typescript
import { handleError, withErrorHandling } from '@/lib/errors';

// In components
try {
  await emailService.generateEmail(data);
} catch (error) {
  setError(handleError(error));
}

// In async operations
await withErrorHandling(
  () => professorService.acceptProfessor(userId, prof, interest),
  'Failed to accept professor'
);
```

#### Layer 4: Toast Notifications

Consider adding react-hot-toast or sonner for better UX:

```bash
npm install sonner
```

```typescript
import { toast } from 'sonner';

// Success
toast.success('Email generated successfully!');

// Error
toast.error('Failed to generate email');

// Promise
toast.promise(
  emailService.generateEmail(data),
  {
    loading: 'Generating email...',
    success: 'Email ready!',
    error: 'Generation failed',
  }
);
```

---

<a name="frontend-code-quality"></a>
## 7. Frontend: Code Quality Issues

### 1. Hardcoded Values

**Issue:** Magic numbers and strings throughout code

**Examples:**
```typescript
// app/page.tsx
const mobileCheck = window.innerWidth < 768;

// components/ProfessorCard.tsx
if (offset.x > 100) handleAccept();
if (offset.x < -100) handleReject();
```

**Solution - Create Constants:**

**Create `lib/constants.ts`:**
```typescript
// Breakpoints
export const BREAKPOINTS = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  wide: 1280,
} as const;

// Email generation
export const EMAIL = {
  maxQueueSize: 10,
  retryAttempts: 3,
  timeoutMs: 30000,
} as const;

// Routes
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  generate: '/dashboard/generate',
  template: '/dashboard/template',
  mentorship: '/mentorship',
} as const;
```

**Usage:**
```typescript
import { BREAKPOINTS, EMAIL } from '@/lib/constants';

const isMobile = window.innerWidth < BREAKPOINTS.tablet;

if (queue.length >= EMAIL.maxQueueSize) handleQueueFull();
```

### 2. Duplicate Code

**Issue:** Same layout structure repeated across pages

**Examples:**
```typescript
// Repeated in dashboard/page.tsx, dashboard/generate/page.tsx, etc.
<div className="min-h-screen bg-gray-50">
  <Navbar />
  <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    {/* Content */}
  </div>
</div>
```

**Solution - Create Layout Component:**

**Create `components/layout/DashboardLayout.tsx`:**
```typescript
import { Navbar } from './Navbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function DashboardLayout({
  children,
  maxWidth = '4xl',
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className={`max-w-${maxWidth} mx-auto py-6 px-4 sm:px-6 lg:px-8`}>
        {children}
      </div>
    </div>
  );
}
```

**Or use Next.js layout:**
```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}
```

### 3. localStorage Management

**Issue:** Direct localStorage access scattered throughout

**Examples:**
```typescript
// Different files
localStorage.getItem('emailTemplate')
localStorage.setItem('emailTemplate', template)
localStorage.getItem('emailQueue')
localStorage.setItem(`generationCount_${user.uid}`, count)
```

**Solution - Create Storage Utility:**

**Create `lib/storage.ts`:**
```typescript
/**
 * Type-safe localStorage wrapper
 */
class Storage {
  private getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  }

  private removeItem(key: string): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  }

  // Email template
  getEmailTemplate(): string {
    return this.getItem('emailTemplate', '');
  }

  setEmailTemplate(template: string): void {
    this.setItem('emailTemplate', template);
  }

  // Generation count
  getGenerationCount(userId: string): number {
    return this.getItem(`generationCount_${userId}`, 0);
  }

  setGenerationCount(userId: string, count: number): void {
    this.setItem(`generationCount_${userId}`, count);
  }

  incrementGenerationCount(userId: string): number {
    const current = this.getGenerationCount(userId);
    const next = current + 1;
    this.setGenerationCount(userId, next);
    return next;
  }

  // Clear all app data
  clearAppData(): void {
    this.removeItem('emailTemplate');
    // Add other keys as needed
  }
}

export const storage = new Storage();
```

**Usage:**
```typescript
import { storage } from '@/lib/storage';

// Before
const template = localStorage.getItem('emailTemplate') || '';

// After
const template = storage.getEmailTemplate();
```

### 4. Form Validation

**Issue:** Inline validation with alerts

**Example:**
```typescript
if (!names.trim() || !interest.trim() || !template.trim()) {
  alert("Please fill in all fields");
  return;
}
```

**Solution - Create Validation Utilities:**

**Create `lib/validation.ts`:**
```typescript
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateEmailForm(data: {
  names: string;
  interest: string;
  template: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.names.trim()) {
    errors.names = 'Professor names are required';
  }

  if (!data.interest.trim()) {
    errors.interest = 'Research interest is required';
  }

  if (!data.template.trim()) {
    errors.template = 'Email template is required';
  }

  if (data.template.length > 5000) {
    errors.template = 'Template is too long (max 5000 characters)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateTemplate(prompt: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (!prompt.trim()) {
    errors.prompt = 'Prompt is required';
  }

  if (prompt.length < 10) {
    errors.prompt = 'Prompt is too short (min 10 characters)';
  }

  if (prompt.length > 1000) {
    errors.prompt = 'Prompt is too long (max 1000 characters)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

**Usage:**
```typescript
import { validateEmailForm } from '@/lib/validation';

const validation = validateEmailForm({ names, interest, template });

if (!validation.isValid) {
  setErrors(validation.errors);
  return;
}
```

**Or use a library like Zod:**
```typescript
import { z } from 'zod';

const emailFormSchema = z.object({
  names: z.string().min(1, 'Names required').max(500),
  interest: z.string().min(1, 'Interest required'),
  template: z.string().min(10).max(5000),
});

type EmailFormData = z.infer<typeof emailFormSchema>;

// Validate
const result = emailFormSchema.safeParse(formData);
if (!result.success) {
  setErrors(result.error.flatten().fieldErrors);
}
```

### 5. Request Cleanup

**Issue:** useEffect doesn't cancel ongoing requests

**Example:**
```typescript
useEffect(() => {
  fetchData(); // No cleanup
}, [dependency]);
```

**Solution:**
```typescript
useEffect(() => {
  const controller = new AbortController();

  async function fetchData() {
    try {
      const data = await fetch(url, { signal: controller.signal });
      setState(data);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError(error);
      }
    }
  }

  fetchData();

  return () => controller.abort();
}, [dependency]);
```

---

<a name="learning-resources"></a>
## 15. Learning Resources

### TypeScript

**Books:**
- "Effective TypeScript" by Dan Vanderkam
- "Programming TypeScript" by Boris Cherny

**Online:**
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Matt Pocock's TypeScript Tips](https://www.totaltypescript.com/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

**Key Topics to Study:**
- Utility types (Partial, Pick, Omit, Record)
- Generic types
- Discriminated unions
- Type guards and narrowing
- Advanced inference

### React Patterns

**Resources:**
- [React Documentation](https://react.dev/)
- [Patterns.dev](https://www.patterns.dev/)
- Kent C. Dodds' blog
- Josh Comeau's blog

**Key Topics:**
- Composition patterns
- Render props
- Custom hooks
- Performance optimization (memo, useMemo, useCallback)
- Error boundaries
- Suspense and concurrent features

### Next.js

**Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn Course](https://nextjs.org/learn)
- Vercel's guides and examples

**Key Topics:**
- App Router vs Pages Router
- Server vs Client Components
- Data fetching patterns
- Route handlers (API routes)
- Metadata and SEO
- Deployment optimization

### State Management

**Zustand:**
- [Zustand Documentation](https://zustand.surge.sh/)
- Compare with Context API
- Learn middleware (persist, devtools)

**React Query (TanStack Query):**
- Great for server state
- Automatic caching and refetching
- Consider for Firebase queries

### Testing

**Resources:**
- [Testing Library](https://testing-library.com/)
- [Vitest](https://vitest.dev/) - Fast test runner
- [Playwright](https://playwright.dev/) - E2E testing

**What to Test:**
- Custom hooks (useAuth, useProfessors)
- Utility functions (validation, errors)
- API services (with mocks)
- Critical user flows (E2E)

### Architecture

**Concepts to Study:**
- Feature-based folder structure
- Separation of concerns
- SOLID principles
- Design patterns (Factory, Observer, etc.)
- Clean Architecture

**Books:**
- "Clean Code" by Robert Martin
- "Design Patterns" by Gang of Four
- "Refactoring" by Martin Fowler

---

<a name="prioritized-action-plan"></a>
## 16. Prioritized Action Plan

**Overview:** Step-by-step plan for implementing improvements across frontend and backend.

### Phase 0: Supabase Setup (Do First)

**Priority: 🔴 CRITICAL - Prerequisites**

- [ ] **Create Supabase project**
  - Sign up at supabase.com
  - Create new project
  - Copy project URL and anon key

- [ ] **Set up database schema**
  - Run SQL from migration section to create tables
  - Set up Row Level Security (RLS) policies
  - Create indexes for performance

- [ ] **Configure authentication**
  - Enable Google OAuth in Supabase dashboard
  - Add authorized redirect URLs
  - Test auth flow in Supabase dashboard

- [ ] **Environment setup**
  - Create `.env.local` with Supabase credentials
  - Create `.env.example` for repository
  - Update `.gitignore` to exclude `.env.local`

- [ ] **Generate TypeScript types**
  - Install Supabase CLI: `npm install -D supabase`
  - Run type generation command
  - Create `types/supabase.ts`

**Time Estimate:** 1-2 hours

### Phase 1: Fix Broken State & Type Safety

**Priority: 🔴 CRITICAL**

- [ ] **Fix broken Firebase imports**
  - Update `config/supabase.ts` with environment variables
  - Remove or comment out Firebase references temporarily
  - Ensure app can run without errors

- [ ] **Create centralized type definitions**
  - Create `types/user.ts` (Supabase user types)
  - Create `types/professor.ts`
  - Create `types/email.ts`
  - Create `types/api.ts` (for external API)
  - Create `types/stores.ts` (Zustand store types)
  - Create `types/index.ts` for re-exports

- [ ] **Fix `any` types**
  - Remove `any` from AuthContext (or prepare to delete)
  - Add proper TypeScript throughout
  - Enable strict mode in tsconfig.json

**Time Estimate:** 2-3 hours

### Phase 2: Service Layer Implementation

**Priority: 🔴 CRITICAL**

- [ ] **Create Supabase service layer**
  - Create `services/supabase/auth.service.ts`
  - Create `services/supabase/database.service.ts`
  - Create `services/supabase/realtime.service.ts`
  - Test each service independently

- [ ] **Create external API service layer**
  - Create `services/api/client.ts` (base API client)
  - Create `services/api/email.service.ts` (email generation)
  - Add proper error handling and types
  - Test API calls

- [ ] **Create service index**
  - Create `services/index.ts`
  - Export all services for easy imports

**Time Estimate:** 3-4 hours

### Phase 3: Zustand State Management

**Priority: 🟡 HIGH**

- [ ] **Install Zustand**
  - Run `npm install zustand`
  - Read Zustand documentation basics

- [ ] **Create auth store**
  - Create `stores/authStore.ts`
  - Implement with Supabase auth service
  - Add persist middleware
  - Add devtools middleware
  - Test auth flow

- [ ] **Create email queue store**
  - Create `stores/emailQueueStore.ts`
  - Migrate logic from EmailGenerationProvider
  - Add processQueue functionality
  - Add persist middleware
  - Test queue operations

- [ ] **Create professor store**
  - Create `stores/professorStore.ts`
  - Implement fetching and accepting professors
  - Add persist middleware for accepted professors
  - Test professor functionality

- [ ] **Create stores index**
  - Create `stores/index.ts`
  - Export all stores

**Time Estimate:** 4-5 hours

### Phase 4: Custom Hooks Implementation

**Priority: 🟡 HIGH**

- [ ] **Create auth hooks**
  - Create `hooks/useAuth.ts`
  - Create `useRequireAuth` and `useUserId` helpers
  - Test in components

- [ ] **Create email queue hooks**
  - Create `hooks/useEmailQueue.ts`
  - Create `useGenerateEmails` helper
  - Test queue operations

- [ ] **Create professor hooks**
  - Create `hooks/useProfessors.ts`
  - Add auto-fetch on mount
  - Test in generate page

- [ ] **Create generic Supabase hooks**
  - Create `hooks/useSupabaseQuery.ts`
  - Create `hooks/useSupabaseRealtime.ts`
  - Create `useEmailHistoryRealtime` helper
  - Test real-time updates

**Time Estimate:** 3-4 hours

### Phase 5: Migrate Components to New Architecture

**Priority: 🟡 HIGH**

- [ ] **Update auth flow**
  - Update `app/page.tsx` to use auth store
  - Update `app/layout.tsx` to initialize auth
  - Replace AuthContextProvider with store initialization
  - Test login/logout flow

- [ ] **Update dashboard**
  - Update `app/dashboard/page.tsx` to use hooks
  - Use `useEmailHistoryRealtime` for email history
  - Replace Firestore queries with Supabase
  - Test real-time updates

- [ ] **Update generate page**
  - Update `app/dashboard/generate/page.tsx`
  - Use `useGenerateEmails` hook
  - Test email generation
  - Verify Supabase storage

- [ ] **Update template page**
  - Update `app/dashboard/template/page.tsx`
  - Use email service for template generation
  - Test OpenAI integration

**Time Estimate:** 5-6 hours

### Phase 6: Clean Up & Delete Old Code

**Priority: 🟢 MEDIUM**

- [ ] **Remove Context providers**
  - Delete `context/AuthContextProvider.tsx`
  - Delete `context/EmailGenerationProvider.tsx`
  - Delete `context/index.ts`
  - Remove provider wrappers from layout

- [ ] **Remove Firebase completely**
  - Delete all Firebase imports
  - Remove Firebase from package.json
  - Run `npm uninstall firebase firebase-admin`
  - Verify no Firebase references remain

- [ ] **Reorganize components**
  - Create `components/features/` directory
  - Create `components/layout/` directory
  - Create `components/shared/` directory
  - Move components to appropriate folders
  - Update all imports

**Time Estimate:** 2-3 hours

### Phase 7: Error Handling & UX

**Priority: 🟢 MEDIUM**

- [ ] **Add error boundaries**
  - Create `components/shared/ErrorBoundary.tsx`
  - Add to root layout
  - Create `app/error.tsx`
  - Create `app/dashboard/error.tsx`

- [ ] **Add loading states**
  - Create `app/loading.tsx`
  - Create `app/dashboard/loading.tsx`
  - Create loading spinner component
  - Add skeleton screens

- [ ] **Add 404 page**
  - Create `app/not-found.tsx`

- [ ] **Improve error messages**
  - Install sonner: `npm install sonner`
  - Replace alerts with toast notifications
  - Use error utility functions
  - Show user-friendly messages

**Time Estimate:** 2-3 hours

### Phase 8: Code Quality Improvements

**Priority: 🟢 MEDIUM**

- [ ] **Create utility functions**
  - Create `lib/constants.ts`
  - Create `lib/validation.ts`
  - Create `lib/errors.ts`
  - Update components to use utilities

- [ ] **Standardize exports**
  - Convert all to named exports
  - Update imports throughout

- [ ] **Add JSDoc comments**
  - Document complex components
  - Document all utility functions
  - Document all hooks

- [ ] **Clean up unused files**
  - Remove unused SVGs from public/
  - Organize public directory
  - Remove deleted hooks from git

**Time Estimate:** 2-3 hours

### Phase 9: Testing (Future)

**Priority: 🔵 LOW**

- [ ] **Set up testing infrastructure**
  - Install Vitest: `npm install -D vitest`
  - Install Testing Library: `npm install -D @testing-library/react`
  - Configure vitest.config.ts

- [ ] **Write unit tests**
  - Test Zustand stores
  - Test custom hooks
  - Test utility functions
  - Test services with mocks

- [ ] **Write integration tests**
  - Test auth flow
  - Test email generation flow
  - Test professor selection flow

**Time Estimate:** 5-10 hours

---

## Migration Checklist Summary

**Before you start:**
- [ ] Create Supabase project and database
- [ ] Set up environment variables
- [ ] Backup current Firebase data (if needed)

**Core migration (Phases 1-5):**
- [ ] Fix broken imports and type safety
- [ ] Create service layer (Supabase + API)
- [ ] Implement Zustand stores
- [ ] Create custom hooks
- [ ] Migrate all components to new architecture

**After migration:**
- [ ] Delete Context providers and Firebase code
- [ ] Add error handling and loading states
- [ ] Improve code quality
- [ ] Add testing

**Total Estimated Time:** 20-30 hours for complete migration

---

## Summary

Your codebase has a solid foundation with modern technologies (Next.js 15, React 19, TypeScript). This document now provides a complete roadmap for migrating to a professional architecture with:

### Key Changes Documented

1. **Supabase Migration** - Complete migration from Firebase to Supabase
   - PostgreSQL database with Row Level Security
   - Type-safe database queries
   - Real-time subscriptions
   - Modern authentication

2. **Zustand State Management** - Replace React Context with Zustand
   - Better performance and TypeScript support
   - Built-in persistence and DevTools
   - Cleaner API and selective re-renders

3. **API Proxy Layer** - Service layer for all data operations
   - Centralized error handling
   - Type-safe request/response
   - Easy testing and mocking
   - Consistent patterns

4. **Custom Hooks** - Clean interface between components and stores
   - Reusable logic
   - Cleaner components
   - Better separation of concerns

5. **New File Structure** - Professional organization
   - `stores/` - Zustand state stores
   - `services/` - API and database operations
   - `hooks/` - Custom React hooks
   - `types/` - Centralized TypeScript definitions

### Main Areas for Improvement

1. **🔴 CRITICAL: Fix Broken State**
   - Firebase imports broken (files deleted)
   - App won't run until fixed
   - Need immediate Supabase setup or Firebase restoration

2. **🔴 CRITICAL: Type Safety**
   - Eliminate `any` types
   - Centralize type definitions
   - Use auto-generated Supabase types

3. **🟡 HIGH: Architecture Upgrade**
   - Service layer for data operations
   - Zustand for state management
   - Custom hooks for clean component code

4. **🟢 MEDIUM: Code Quality**
   - Error boundaries and loading states
   - Constants and validation utilities
   - JSDoc documentation

### Migration Strategy

**Recommended Approach:**
1. **Phase 0-1** (4-5 hours): Set up Supabase and fix broken state
2. **Phase 2-4** (10-13 hours): Build new architecture (services, stores, hooks)
3. **Phase 5-6** (7-9 hours): Migrate components and delete old code
4. **Phase 7-8** (4-6 hours): Polish with error handling and code quality
5. **Phase 9** (Optional): Add comprehensive testing

**Total Time:** 20-30 hours for complete migration

### Why This Architecture?

**Benefits:**
- ✅ **Type Safety**: TypeScript throughout with auto-generated DB types
- ✅ **Scalability**: Clean separation of concerns
- ✅ **Maintainability**: Easy to find and update code
- ✅ **Performance**: Optimized re-renders with Zustand selectors
- ✅ **Developer Experience**: DevTools, better debugging
- ✅ **Testability**: Services and hooks easy to test in isolation
- ✅ **Modern Best Practices**: Industry-standard patterns

### Learning Outcomes

By completing this migration, you'll gain hands-on experience with:
- PostgreSQL and Supabase
- Advanced state management with Zustand
- Service layer architecture
- Custom React hooks
- TypeScript best practices
- Real-time subscriptions
- Professional code organization

### Next Steps

1. **Immediate** (Today):
   - Create Supabase project
   - Set up database schema
   - Fix broken Firebase imports

2. **This Week**:
   - Complete service layer
   - Implement Zustand stores
   - Create custom hooks

3. **This Month**:
   - Migrate all components
   - Delete old code
   - Add error handling
   - Polish and test

### Remember

- **Don't rush** - Take time to understand each concept
- **Test frequently** - Verify each change works before moving on
- **Learn by doing** - This is hands-on practice with modern patterns
- **Ask for help** - The architecture is well-documented with examples
- **Iterate** - You don't have to do everything perfectly the first time

**This migration will transform your codebase from a working MVP to a professional, scalable application. Good luck with your frontend engineering journey! 🚀**
