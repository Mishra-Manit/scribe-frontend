# Frontend Code Quality Improvements

> Comprehensive review and recommendations for the Scribe codebase

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Issues](#critical-issues)
3. [Folder Structure](#folder-structure)
4. [Type System](#type-system)
5. [State Management](#state-management)
6. [API Layer](#api-layer)
7. [Component Organization](#component-organization)
8. [Error Handling](#error-handling)
9. [Code Quality Issues](#code-quality-issues)
10. [Learning Resources](#learning-resources)
11. [Prioritized Action Plan](#prioritized-action-plan)

---

## Executive Summary

**Project:** Scribe - Cold email generation platform for reaching out to research professors

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Firebase, Framer Motion

**Overall Assessment:** Functional MVP with good foundation, but needs architectural improvements for scalability and maintainability.

**Strengths:**
- Modern tech stack
- TypeScript enabled
- Good use of custom hooks
- Clean UI with shadcn/ui
- Real-time Firebase integration

**Key Areas for Improvement:**
- Security vulnerabilities (exposed API keys)
- Type safety issues (`any` types)
- Scattered code organization
- No centralized API layer
- Missing error boundaries

---

## Critical Issues

### 🚨 1. Security: Exposed Firebase Credentials

**Location:** `config/firebase.ts`

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

**Solution:**

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

3. Add validation:
```typescript
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  // ... others
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

**Priority:** 🔴 CRITICAL - Fix immediately

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

## Folder Structure

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

### Recommended Professional Structure

```
/scribe
├── app/                        # Next.js App Router
│   ├── (auth)/                # Route group for auth pages
│   │   └── page.tsx           # Login page
│   ├── (dashboard)/           # Route group for protected pages
│   │   ├── layout.tsx         # Dashboard layout with ProtectedRoute
│   │   ├── page.tsx           # Main dashboard
│   │   ├── generate/
│   │   ├── template/
│   │   └── swipe/
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
│   ├── useAuth.ts            # Could move from context
│   ├── useProfessors.ts
│   ├── useFirebaseProfessors.ts
│   └── usePersistedAcceptedProfessors.ts
│
├── context/                   # React Context providers
│   ├── AuthContextProvider.tsx
│   ├── EmailGenerationProvider.tsx
│   └── index.ts              # Export all contexts
│
├── stores/                    # Zustand stores (if using)
│   ├── authStore.ts
│   ├── emailQueueStore.ts
│   └── professorStore.ts
│
├── services/                  # API and business logic
│   ├── api/
│   │   ├── email.service.ts
│   │   ├── professor.service.ts
│   │   └── types.ts          # API-specific types
│   ├── firebase/
│   │   ├── firestore.service.ts
│   │   └── auth.service.ts
│   └── index.ts              # Export all services
│
├── lib/                       # Utilities and helpers
│   ├── utils.ts              # General utilities (cn, etc.)
│   ├── firebase.ts           # Firebase utilities
│   ├── validation.ts         # Form validation helpers
│   ├── storage.ts            # localStorage wrapper
│   ├── constants.ts          # App constants
│   └── errors.ts             # Error handling utilities
│
├── types/                     # TypeScript type definitions
│   ├── index.ts              # Re-export all types
│   ├── user.ts               # User-related types
│   ├── professor.ts          # Professor types
│   ├── email.ts              # Email types
│   ├── api.ts                # API request/response types
│   └── firebase.ts           # Firebase document types
│
├── config/                    # Configuration files
│   ├── firebase.ts           # Firebase config (use env vars!)
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

## Type System

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

export type EmailSource = 'swipe' | 'generate';
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
  source: 'swipe' | 'generate';
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

## State Management

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

#### Example: Auth Store with Zustand

**Installation:**
```bash
npm install zustand
```

**Create `stores/authStore.ts`:**
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import type { User } from '@/types';

interface AuthState {
  // State
  user: User | null;
  loading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      // Initial state
      user: null,
      loading: true,

      // Actions
      setUser: (user) => set({ user }, false, 'setUser'),

      setLoading: (loading) => set({ loading }, false, 'setLoading'),

      logout: async () => {
        await signOut(auth);
        set({ user: null }, false, 'logout');
      },

      initializeAuth: () => {
        onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            set({
              user: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              },
              loading: false,
            }, false, 'authStateChanged');
          } else {
            set({ user: null, loading: false }, false, 'authStateChanged');
          }
        });
      },
    }),
    { name: 'AuthStore' }
  )
);
```

**Usage:**
```typescript
// In root layout
"use client";

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function RootLayout({ children }) {
  useEffect(() => {
    useAuthStore.getState().initializeAuth();
  }, []);

  return <html>{children}</html>;
}

// In any component
import { useAuthStore } from '@/stores/authStore';

function Navbar() {
  // Only re-renders when user changes
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);

  return (
    <div>
      {user?.displayName}
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// Access without re-render
const userId = useAuthStore.getState().user?.uid;
```

#### Example: Email Queue Store with Persistence

**Create `stores/emailQueueStore.ts`:**
```typescript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { GenerationQueueItem } from '@/types';

interface EmailQueueState {
  // State
  queue: GenerationQueueItem[];
  isGenerating: boolean;

  // Actions
  addToQueue: (item: Omit<GenerationQueueItem, 'id' | 'status'>) => void;
  removeFromQueue: (id: string) => void;
  updateQueueItemStatus: (id: string, status: GenerationQueueItem['status']) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  clearQueue: () => void;
}

export const useEmailQueueStore = create<EmailQueueState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        queue: [],
        isGenerating: false,

        // Actions
        addToQueue: (item) => set((state) => ({
          queue: [
            ...state.queue,
            {
              ...item,
              id: crypto.randomUUID(),
              status: 'pending' as const,
            }
          ]
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

        clearQueue: () => set({ queue: [] }, false, 'clearQueue'),
      }),
      {
        name: 'email-queue-storage', // localStorage key
        // Only persist queue, not isGenerating
        partialize: (state) => ({ queue: state.queue }),
      }
    ),
    { name: 'EmailQueueStore' }
  )
);
```

**Usage:**
```typescript
import { useEmailQueueStore } from '@/stores/emailQueueStore';

function SwipePage() {
  const addToQueue = useEmailQueueStore(state => state.addToQueue);
  const queue = useEmailQueueStore(state => state.queue);

  const handleAccept = (professor: Professor, interest: string) => {
    addToQueue({
      name: professor.name,
      interest: interest,
    });
  };

  return (
    <div>
      <p>Queue: {queue.length} emails</p>
      {/* ... */}
    </div>
  );
}
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

## API Layer

### Current Issues

1. **Hardcoded URLs** scattered in components:
   - `https://api.manit.codes/call-openai`
   - `https://api.manit.codes/generate-email`

2. **No centralized API logic** - fetch calls in:
   - `app/dashboard/template/page.tsx`
   - `context/EmailGenerationProvider.tsx`

3. **Inconsistent error handling**:
   - Some use try/catch
   - Some use .catch()
   - Some ignore errors

4. **No request/response types** - Using `any` or untyped JSON

5. **No request cancellation** - Can cause memory leaks

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

## Component Organization

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
 * Swipeable professor card component with drag gestures.
 *
 * Supports drag-to-accept (right) and drag-to-reject (left) interactions.
 * Uses Framer Motion for smooth animations and physics-based gestures.
 *
 * @param professor - Professor data to display
 * @param onAccept - Called when user swipes right (>100px)
 * @param onReject - Called when user swipes left (<-100px)
 *
 * @example
 * ```tsx
 * <ProfessorCard
 *   professor={prof}
 *   onAccept={(p) => saveProfessor(p)}
 *   onReject={(p) => skipProfessor(p)}
 * />
 * ```
 */
export function ProfessorCard({
  professor,
  onAccept,
  onReject,
}: ProfessorCardProps) {
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
const SWIPE_THRESHOLD = 100;
const ANIMATION_DURATION = 0.3;

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

## Error Handling

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

## Code Quality Issues

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

// Swipe thresholds
export const SWIPE = {
  threshold: 100,
  rotationMax: 25,
  animationDuration: 0.3,
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
  swipe: '/dashboard/swipe',
  template: '/dashboard/template',
  mentorship: '/mentorship',
} as const;
```

**Usage:**
```typescript
import { BREAKPOINTS, SWIPE } from '@/lib/constants';

const isMobile = window.innerWidth < BREAKPOINTS.tablet;

if (offset.x > SWIPE.threshold) handleAccept();
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

## Learning Resources

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

## Prioritized Action Plan

### Phase 1: Critical Fixes (Do First)

**Priority: 🔴 CRITICAL**

- [ ] **Security: Move Firebase config to environment variables**
  - Create `.env.local`
  - Update `config/firebase.ts`
  - Add `.env.example`
  - Update `.gitignore`

- [ ] **Type Safety: Fix `any` types in AuthContext**
  - Create `types/user.ts`
  - Update `context/AuthContextProvider.tsx`
  - Add proper type guards

- [ ] **Type Safety: Create centralized type definitions**
  - Create `types/professor.ts`
  - Create `types/email.ts`
  - Create `types/api.ts`
  - Create `types/index.ts` for re-exports

**Time Estimate:** 2-3 hours

### Phase 2: Code Organization (Do Second)

**Priority: 🟡 HIGH**

- [ ] **Create API service layer**
  - Create `services/api/client.ts`
  - Create `services/api/email.service.ts`
  - Create `services/api/professor.service.ts`
  - Update components to use services

- [ ] **Reorganize components**
  - Create `components/features/` directory
  - Create `components/layout/` directory
  - Create `components/shared/` directory
  - Move components to appropriate folders

- [ ] **Create utility functions**
  - Create `lib/constants.ts`
  - Create `lib/validation.ts`
  - Create `lib/errors.ts`
  - Create `lib/storage.ts`

**Time Estimate:** 4-5 hours

### Phase 3: Error Handling & UX (Do Third)

**Priority: 🟡 HIGH**

- [ ] **Add error boundaries**
  - Create `components/shared/ErrorBoundary.tsx`
  - Add to root layout
  - Create `app/error.tsx`
  - Create `app/dashboard/error.tsx`

- [ ] **Add loading states**
  - Create `app/loading.tsx`
  - Create `app/dashboard/loading.tsx`
  - Create loading spinner component

- [ ] **Add 404 page**
  - Create `app/not-found.tsx`

- [ ] **Improve error messages**
  - Replace alerts with toast notifications
  - Use error utility functions
  - Show user-friendly messages

**Time Estimate:** 2-3 hours

### Phase 4: State Management (Optional - Educational)

**Priority: 🟢 MEDIUM**

- [ ] **Learn Zustand basics**
  - Read documentation
  - Try simple example

- [ ] **Convert email queue to Zustand**
  - Install zustand
  - Create `stores/emailQueueStore.ts`
  - Update components
  - Test persistence

- [ ] **Consider auth store conversion**
  - Create `stores/authStore.ts`
  - Compare with Context approach
  - Decide which to keep

**Time Estimate:** 3-4 hours

### Phase 5: Code Quality (Do When Time Permits)

**Priority: 🟢 MEDIUM**

- [ ] **Standardize exports**
  - Convert all to named exports
  - Update imports

- [ ] **Add JSDoc comments**
  - Document complex components
  - Document utility functions

- [ ] **Clean up unused files**
  - Remove unused SVGs from public/
  - Organize public directory

- [ ] **Add request cancellation**
  - Update fetch calls with AbortController
  - Clean up in useEffect

**Time Estimate:** 2-3 hours

### Phase 6: Testing (Future)

**Priority: 🔵 LOW**

- [ ] **Set up testing infrastructure**
  - Install Vitest
  - Install Testing Library
  - Configure

- [ ] **Write unit tests**
  - Test custom hooks
  - Test utility functions
  - Test services

- [ ] **Write integration tests**
  - Test user flows
  - Test API calls

**Time Estimate:** 5-10 hours

---

## Summary

Your codebase demonstrates solid fundamentals and modern React patterns. The main areas for improvement are:

1. **Security** - Environment variables for secrets
2. **Type Safety** - Eliminate `any` types, centralize definitions
3. **Organization** - Feature-based structure, service layer
4. **Error Handling** - Boundaries, loading states, user-friendly messages
5. **Code Quality** - DRY, constants, validation

**Next Steps:**
1. Start with Phase 1 (critical fixes)
2. Practice TypeScript and React patterns
3. Consider Zustand for state management education
4. Add testing when comfortable with architecture

**Remember:**
- Don't refactor everything at once
- Make incremental improvements
- Test after each change
- Learn by doing

Good luck with your frontend engineering journey! 🚀
