# Scribe Frontend

Scribe is a cold email generation platform for academic outreach. This repository contains the Next.js frontend that handles authentication, queue management, and real-time status updates while communicating with the FastAPI backend.

## Tech Stack

- Next.js (App Router), React, TypeScript
- Supabase Auth (JWT-based session handling)
- Zustand for client state management
- TanStack Query for API data fetching and polling
- Tailwind CSS + shadcn/ui for UI components

## Features

- Google/email authentication with Supabase
- Persistent background queue for email generation requests
- Real-time queue status updates and email history
- Export generated emails to Excel
- Template-driven generation flow with backend validation

## Architecture (Frontend)

The frontend follows a simple layered flow:

`UI Components -> React Query Hooks -> API Client -> FastAPI Backend`

- Queue state is persisted in local storage through Zustand
- Auth token access is synchronous from the auth store
- Dashboard-level queue manager keeps processing active across route changes

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env.local` with:

```env
NEXT_PUBLIC_ENVIRONMENT=DEVELOPMENT
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 3) Run development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` - start local dev server
- `npm run build` - create production build
- `npm run start` - start production server
- `npm run lint` - run ESLint
- `npm run types:generate` - regenerate Supabase TypeScript types

## Related Repositories

- Backend API: `pythonserver` (FastAPI + PostgreSQL + Celery)

## Deployment Notes

- Frontend can be deployed on Vercel or any Node-compatible host
- Ensure backend API and Supabase env vars are configured per environment
