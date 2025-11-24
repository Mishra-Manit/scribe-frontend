# Queue Architecture

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Queue State Structure](#queue-state-structure)
4. [The Three-Hook Pattern](#the-three-hook-pattern)
5. [Queue Processor Implementation](#queue-processor-implementation)
6. [Queue Operations Guide](#queue-operations-guide)
7. [Integration Guide](#integration-guide)
8. [Performance & Scalability](#performance--scalability)
9. [Debugging & Troubleshooting](#debugging--troubleshooting)
10. [State Synchronization](#state-synchronization)

---

## Overview

Scribe implements a **client-side queue system** for managing email generation tasks. Unlike traditional server-side queues (Bull, BullMQ, Redis), the queue processor runs entirely in the browser using Zustand for state management and React Query for backend communication.

### Why Client-Side?

**Advantages:**
- ✅ **Simplicity** - No queue infrastructure to maintain (Redis, workers, etc.)
- ✅ **Cost** - No always-on background processes
- ✅ **User Visibility** - Real-time progress tracking in UI
- ✅ **Debugging** - Everything visible in browser DevTools
- ✅ **Development** - Faster iteration without backend dependencies

**Trade-offs:**
- ⚠️ **Single-Device** - Queue only processes in active browser tab
- ⚠️ **Interruption** - Closing tab pauses processing (recovery mechanism handles this)
- ⚠️ **Sequential** - One item at a time (prevents API rate limits)
- ⚠️ **Client Resources** - Limited by browser memory (practical limit: ~100 items)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  QUEUE SYSTEM ARCHITECTURE                       │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                      Browser Tab                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          /app/dashboard/layout.tsx                       │  │
│  │                                                           │  │
│  │          useQueueManager()  ← Initialized ONCE           │  │
│  │                    ↓                                      │  │
│  │          ┌─────────┴──────────┐                          │  │
│  │          │                     │                          │  │
│  │          ▼                     ▼                          │  │
│  │   ┌──────────────┐    ┌───────────────┐                 │  │
│  │   │ Prerequisites│    │  Processing   │                 │  │
│  │   │   Check      │    │    Logic      │                 │  │
│  │   │              │    │               │                 │  │
│  │   │ • user?      │    │ • Get next    │                 │  │
│  │   │ • template?  │    │ • Call API    │                 │  │
│  │   │ • supabase?  │    │ • Poll status │                 │  │
│  │   └──────────────┘    │ • Handle done │                 │  │
│  │                       └───────────────┘                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Zustand Queue Store                         │  │
│  │              (localStorage persisted)                    │  │
│  │                                                           │  │
│  │   queue: [                                               │  │
│  │     { id, name, interest, status, taskId, error }       │  │
│  │   ]                                                       │  │
│  │                                                           │  │
│  │   isProcessing: boolean                                  │  │
│  │   processingItemId: string | null                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           React Query Cache                              │  │
│  │                                                           │  │
│  │   ['task', taskId] → TaskStatus                          │  │
│  │     - status: PENDING | STARTED | SUCCESS | FAILURE      │  │
│  │     - current_step: string                               │  │
│  │     - refetchInterval: 2000ms                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           │                                     │
│                           │ POST /api/email/generate            │
│                           │ GET  /api/email/status/{id}         │
│                           ▼                                     │
└───────────────────────────┼──────────────────────────────────────┘
                            │
                    ┌───────┴────────┐
                    │  FastAPI       │
                    │  Backend       │
                    │                │
                    │  Celery Worker │
                    │  (async jobs)  │
                    └────────────────┘
```

---

## Technology Stack

### Core Technologies

| Technology | Purpose | Why This Choice |
|------------|---------|----------------|
| **Zustand** | Queue state management | Minimal boilerplate, localStorage persistence, granular updates |
| **React Query** | Task status polling | Auto-refetch, caching, request cancellation |
| **localStorage** | Queue persistence | Survives page refresh, simple implementation |
| **Mutex Lock** | Concurrency control | Prevents duplicate processing, race conditions |

### Key Files

```
/hooks/
  ├── useQueueManager.ts      # Master orchestrator (150 lines)
  ├── useQueueActions.ts      # Action dispatchers (50 lines)
  └── useQueueState.ts        # State selectors (40 lines)

/stores/
  └── simple-queue-store.ts   # Queue state (90 lines)

/lib/
  └── email-service.ts        # API wrapper (70 lines)

/components/
  └── QueueStatus.tsx         # UI display (80 lines)

Total: ~480 lines (vs 900+ in old system)
```

---

## Queue State Structure

### QueueItem Schema

```typescript
interface QueueItem {
  id: string;                    // UUID v4
  recipientName: string;          // "Dr. Jane Smith"
  recipientInterest: string;      // "machine learning"
  taskId?: string;                // Celery task ID (after API call)
  status: QueueItemStatus;        // "pending" | "processing" | "completed" | "failed"
  error?: string;                 // Error message if failed
  createdAt: number;              // Timestamp (Date.now())
}

type QueueItemStatus = "pending" | "processing" | "completed" | "failed";
```

### Queue Store State

```typescript
interface QueueStore {
  // State
  queue: QueueItem[];
  isProcessing: boolean;
  processingItemId: string | null;
  currentTaskStatus: TaskStatus | null;

  // Actions
  addItems: (items: Omit<QueueItem, 'id' | 'status' | 'createdAt'>[]) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<QueueItem>) => void;
  clearCompleted: () => void;
  clearAll: () => void;

  // Internal setters
  setIsProcessing: (processing: boolean) => void;
  setProcessingItemId: (id: string | null) => void;
  setCurrentTaskStatus: (status: TaskStatus | null) => void;

  // Getters
  getPendingCount: () => number;
  getProcessingItem: () => QueueItem | null;
  getCompletedCount: () => number;
  getFailedCount: () => number;
}
```

### localStorage Persistence

```typescript
// Automatic persistence via Zustand middleware
const useQueueStore = create(
  persist(
    (set, get) => ({
      queue: [],
      // ... state and actions
    }),
    {
      name: 'scribe-queue-storage',  // localStorage key
      version: 1,                     // Schema version
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Persisted:**
- ✅ Queue items
- ✅ isProcessing flag
- ✅ processingItemId

**Not Persisted:**
- ❌ currentTaskStatus (fetched fresh on mount)

---

## The Three-Hook Pattern

The queue system uses **three specialized hooks** for clear separation of concerns:

### 1. useQueueManager

**Purpose:** Master orchestrator that handles all processing logic

**Location:** `/hooks/useQueueManager.ts`

**Where to Use:** **ONLY** in `/app/dashboard/layout.tsx`

**Responsibilities:**
- Check prerequisites (user, template, Supabase ready)
- Process items sequentially
- Poll backend for task status
- Handle completion/failure
- Auto-recovery from page refresh

**Example:**

```typescript
// /app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  useQueueManager();  // Initialize ONCE for entire dashboard
  return <>{children}</>;
}
```

**Why in Layout?**
- Layouts persist during navigation (pages remount)
- Ensures processor runs on ALL dashboard routes
- Single initialization prevents race conditions
- Items queued on any page process immediately

### 2. useQueueActions

**Purpose:** Action dispatchers for queue manipulation

**Location:** `/hooks/useQueueActions.ts`

**Where to Use:** Any component that needs to modify the queue

**Responsibilities:**
- Add items to queue
- Remove items
- Clear completed items
- Clear all items

**Example:**

```typescript
// /app/dashboard/generate/page.tsx
export default function GeneratePage() {
  const { addToQueue } = useQueueActions();

  const handleGenerate = () => {
    const items = recipientNames.split(',').map(name => ({
      recipientName: name.trim(),
      recipientInterest: interest,
    }));

    addToQueue(items);
  };

  return (
    <Button onClick={handleGenerate}>
      Generate Emails
    </Button>
  );
}
```

### 3. useQueueState

**Purpose:** Read-only state selectors

**Location:** `/hooks/useQueueState.ts`

**Where to Use:** Any component that needs to display queue state

**Responsibilities:**
- Provide queue state
- Provide computed counts (pending, completed, failed)
- Provide processing status

**Example:**

```typescript
// /components/QueueStatus.tsx
export default function QueueStatus() {
  const {
    queue,
    isProcessing,
    pendingCount,
    completedCount,
    failedCount,
    currentTaskStatus,
  } = useQueueState();

  if (pendingCount === 0 && !isProcessing) return null;

  return (
    <Card>
      <CardHeader>Queue Status</CardHeader>
      <CardContent>
        {isProcessing && (
          <div>Processing: {currentTaskStatus?.current_step}</div>
        )}
        <div>Pending: {pendingCount}</div>
        <div>Completed: {completedCount}</div>
        <div>Failed: {failedCount}</div>
      </CardContent>
    </Card>
  );
}
```

### Hook Selection Guide

```
┌─────────────────────────────────────────────────────────┐
│  What do you need to do?                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Initialize queue processor → useQueueManager()         │
│    (dashboard/layout.tsx ONLY)                          │
│                                                          │
│  Add items to queue → useQueueActions()                 │
│    (generate page, etc.)                                │
│                                                          │
│  Display queue status → useQueueState()                 │
│    (status card, dashboard, etc.)                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Queue Processor Implementation

### Processing Flow

```
START
  │
  ▼
Prerequisites Check
  ├─ User authenticated? ───NO──→ Wait
  ├─ Template exists? ──────NO──→ Wait
  └─ Supabase ready? ───────NO──→ Wait
  │
  │ ALL YES
  ▼
Get Next Pending Item
  │
  │ None found
  ├────────────────────────────→ Wait
  │
  │ Found item
  ▼
Acquire Processing Lock (Mutex)
  │
  ▼
Call emailAPI.generateEmail()
  │
  ├─ Error ──→ Mark Failed ──→ Process Next (after 1s delay)
  │
  │ Success
  ▼
Receive task_id from backend
  │
  ▼
Update item: status="processing", taskId=xxx
  │
  ▼
Start Polling (React Query)
  │
  ├─────────────────────┐
  │                     │
  ▼                     │
GET /api/email/status/{task_id}  │
  │                     │
  ├─ PENDING ──────────┘ (2s interval)
  ├─ STARTED ──────────┘ (2s interval)
  │
  ├─ SUCCESS
  │   ├─ Mark item completed
  │   ├─ Invalidate email cache (React Query)
  │   ├─ Remove from queue (after 2s)
  │   └─ Release lock
  │        │
  │        ▼
  │   Process Next Item
  │
  └─ FAILURE
      ├─ Mark item failed with error message
      ├─ Remove from queue (after 3s)
      └─ Release lock
           │
           ▼
      Process Next Item (after 1s delay)
```

### Prerequisites Check

```typescript
// Inside useQueueManager
const { user } = useAuth();
const template = useEmailTemplate();
const { supabaseReady } = useAuth();

useEffect(() => {
  // Don't process if prerequisites not met
  if (!user?.uid || !template || !supabaseReady) {
    return;
  }

  // Prerequisites met, check for pending items
  const nextItem = queue.find(item => item.status === 'pending');
  if (nextItem && !isProcessing) {
    processNextItem();
  }
}, [user, template, supabaseReady, queue, isProcessing]);
```

### Mutex-Protected Processing

```typescript
const processingLockRef = useRef<Promise<void> | null>(null);

const processNextItem = async () => {
  // Prevent concurrent processing
  if (processingLockRef.current) {
    return;
  }

  const lockPromise = (async () => {
    const nextItem = getNextPending();
    if (!nextItem) return;

    setIsProcessing(true);
    setProcessingItemId(nextItem.id);

    try {
      // Call backend API
      const { task_id } = await emailService.generateEmail({
        email_template: template,
        recipient_name: nextItem.recipientName,
        recipient_interest: nextItem.recipientInterest,
        template_type: 'research',
      });

      // Update item with task ID
      updateItem(nextItem.id, {
        status: 'processing',
        taskId: task_id,
      });

      // Polling starts automatically via React Query
      setCurrentTaskId(task_id);

    } catch (error) {
      // Mark as failed
      updateItem(nextItem.id, {
        status: 'failed',
        error: error.message,
      });

      // Try next item after delay
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingItemId(null);
        processNextItem();
      }, 1000);
    }
  })();

  processingLockRef.current = lockPromise;
  await lockPromise;
  processingLockRef.current = null;
};
```

### Status Polling with React Query

```typescript
const { data: taskStatus } = useQuery({
  queryKey: ['task', currentTaskId],
  queryFn: () => emailService.getTaskStatus(currentTaskId!),
  enabled: !!currentTaskId,  // Only run when we have a task ID
  refetchInterval: (query) => {
    const status = query.state.data?.status;

    // Stop polling when done
    if (status === 'SUCCESS' || status === 'FAILURE') {
      return false;
    }

    // Poll every 2 seconds
    return 2000;
  },
  retry: false,  // Let manual error handling deal with failures
});
```

### Completion Handling

```typescript
useEffect(() => {
  if (!taskStatus || !processingItem) return;

  if (taskStatus.status === 'SUCCESS') {
    // Mark completed
    updateItem(processingItem.id, { status: 'completed' });

    // Invalidate email cache to show new email
    queryClient.invalidateQueries({ queryKey: ['emails', user?.uid] });

    // Remove after delay
    setTimeout(() => {
      removeItem(processingItem.id);
      setIsProcessing(false);
      setProcessingItemId(null);
      setCurrentTaskId(null);
      processNextItem();  // Process next
    }, 2000);
  }

  if (taskStatus.status === 'FAILURE') {
    // Mark failed
    updateItem(processingItem.id, {
      status: 'failed',
      error: taskStatus.error || 'Email generation failed',
    });

    // Remove after delay
    setTimeout(() => {
      removeItem(processingItem.id);
      setIsProcessing(false);
      setProcessingItemId(null);
      setCurrentTaskId(null);
      processNextItem();  // Process next
    }, 3000);
  }
}, [taskStatus]);
```

### Recovery from Page Refresh

```typescript
// On mount, check for interrupted processing
useEffect(() => {
  const processingItem = getProcessingItem();

  if (processingItem) {
    if (processingItem.taskId) {
      // Resume polling for existing task
      setCurrentTaskId(processingItem.taskId);
      setIsProcessing(true);
      setProcessingItemId(processingItem.id);
    } else {
      // No task ID = interrupted before API call
      updateItem(processingItem.id, {
        status: 'failed',
        error: 'Process was interrupted. Please try again.',
      });

      // Continue with next item
      setTimeout(() => processNextItem(), 1000);
    }
  }
}, []);  // Only on mount
```

---

## Queue Operations Guide

### Adding Items to Queue

```typescript
// Basic usage
import { useQueueActions } from '@/hooks/useQueueActions';

const { addToQueue } = useQueueActions();

// Single item
addToQueue([{
  recipientName: 'Dr. Jane Smith',
  recipientInterest: 'machine learning',
}]);

// Multiple items
const names = 'Dr. Smith, Dr. Jones, Dr. Lee';
const items = names.split(',').map(name => ({
  recipientName: name.trim(),
  recipientInterest: 'AI research',
}));

addToQueue(items);
```

### Monitoring Queue Status

```typescript
import { useQueueState } from '@/hooks/useQueueState';

const {
  queue,
  isProcessing,
  pendingCount,
  completedCount,
  failedCount,
  currentTaskStatus,
} = useQueueState();

return (
  <div>
    {isProcessing && (
      <div>
        <Spinner />
        <span>Step: {currentTaskStatus?.current_step}</span>
      </div>
    )}

    <div>Pending: {pendingCount}</div>
    <div>Completed: {completedCount}</div>
    {failedCount > 0 && <div>Failed: {failedCount}</div>}
  </div>
);
```

### Manual Queue Control

```typescript
const { clearCompleted, clearAll } = useQueueActions();

// Clear only completed items
<Button onClick={clearCompleted}>Clear Completed</Button>

// Clear entire queue
<Button onClick={clearAll}>Clear All</Button>
```

### Handling Errors

```typescript
const { queue } = useQueueState();

const failedItems = queue.filter(item => item.status === 'failed');

return (
  <div>
    {failedItems.map(item => (
      <div key={item.id} className="error">
        <span>{item.recipientName}</span>
        <span>{item.error}</span>
      </div>
    ))}
  </div>
);
```

---

## Integration Guide

### Adding Queue Support to New Features

**Step 1: Add items to queue**

```typescript
// In your component
const { addToQueue } = useQueueActions();

const handleSubmit = () => {
  const items = /* prepare items */;
  addToQueue(items);

  // Optional: Show toast
  toast.success(`Added ${items.length} items to queue`);
};
```

**Step 2: Display queue status (optional)**

```typescript
import { QueueStatus } from '@/components/QueueStatus';

return (
  <div>
    <QueueStatus />
    {/* Your content */}
  </div>
);
```

**Step 3: That's it!**

The queue processor automatically:
- ✅ Detects new items
- ✅ Processes them sequentially
- ✅ Polls for status
- ✅ Handles completion/failure
- ✅ Updates UI in real-time

### Common Integration Patterns

#### Pattern 1: Bulk Email Generation

```typescript
function BulkGeneratePage() {
  const { addToQueue } = useQueueActions();
  const [csvData, setCsvData] = useState<string[]>([]);

  const handleImportCSV = (file: File) => {
    // Parse CSV
    const rows = parseCSV(file);

    // Convert to queue items
    const items = rows.map(row => ({
      recipientName: row.name,
      recipientInterest: row.interest,
    }));

    // Add all at once
    addToQueue(items);
  };

  return (
    <div>
      <FileUpload onUpload={handleImportCSV} />
      <QueueStatus />
    </div>
  );
}
```

#### Pattern 2: Queue with User Confirmation

```typescript
function GenerateWithPreview() {
  const { addToQueue } = useQueueActions();
  const [previewItems, setPreviewItems] = useState([]);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    addToQueue(previewItems);
    setConfirmed(true);
  };

  return (
    <div>
      {!confirmed ? (
        <>
          <PreviewList items={previewItems} />
          <Button onClick={handleConfirm}>Confirm & Generate</Button>
        </>
      ) : (
        <QueueStatus />
      )}
    </div>
  );
}
```

#### Pattern 3: Queue with Progress Callback

```typescript
function GenerateWithProgress() {
  const { queue, completedCount } = useQueueState();
  const totalItems = queue.length;
  const progress = totalItems > 0 ? (completedCount / totalItems) * 100 : 0;

  return (
    <div>
      <ProgressBar value={progress} max={100} />
      <span>{completedCount} / {totalItems} completed</span>
      <QueueStatus />
    </div>
  );
}
```

---

## Performance & Scalability

### Current Limitations

| Aspect | Limit | Reason |
|--------|-------|--------|
| **Queue Size** | ~100 items | localStorage limit (5-10MB) |
| **Processing Speed** | 1 item / ~10-30s | Sequential + backend processing time |
| **Concurrency** | 1 item at a time | Prevents API rate limits |
| **Persistence** | Single device | localStorage not synced across devices |
| **Memory** | Browser limits | All state in memory |

### Tuning Parameters

```typescript
// In useQueueManager.ts

// Polling interval for task status
refetchInterval: 2000  // 2 seconds (default)
// Faster = more API calls, quicker updates
// Slower = fewer API calls, delayed updates

// Completion delay before removal
setTimeout(() => removeItem(id), 2000)  // 2 seconds
// Shows "completed" state briefly before cleanup

// Failure delay before next item
setTimeout(() => processNextItem(), 1000)  // 1 second
// Prevents rapid retry loops

// Error removal delay
setTimeout(() => removeItem(id), 3000)  // 3 seconds
// Longer delay so user can see error
```

### Performance Metrics

**Before Optimization:**
- API calls per hour: ~720 (5s polling)
- Queue state updates: ~50/s during processing
- Re-renders: ~100/s (whole-store subscriptions)

**After Optimization:**
- API calls per hour: ~1800 (2s polling)
- Queue state updates: ~1/s (granular updates)
- Re-renders: ~5/s (granular selectors)

**Future Improvements:**

1. **WebSocket Connection**
   ```typescript
   // Replace polling with real-time updates
   const ws = new WebSocket(`wss://api.../task/${taskId}`);
   ws.onmessage = (event) => {
     const status = JSON.parse(event.data);
     updateTaskStatus(status);
   };
   ```

2. **Parallel Processing**
   ```typescript
   // Process multiple items concurrently
   const processItems = async (items: QueueItem[], concurrency = 3) => {
     const promises = items.slice(0, concurrency).map(processItem);
     await Promise.all(promises);
   };
   ```

3. **Queue Prioritization**
   ```typescript
   interface QueueItem {
     priority: 'high' | 'normal' | 'low';
   }

   const getNextItem = () => {
     return queue
       .filter(item => item.status === 'pending')
       .sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority])[0];
   };
   ```

4. **Database Persistence**
   ```typescript
   // Sync queue to database for cross-device access
   await supabase.from('queue_items').insert(items);
   ```

---

## Debugging & Troubleshooting

### Common Issues

#### Queue Not Processing

**Symptoms:** Items stuck in "pending" status

**Diagnosis:**

```typescript
// Check prerequisites
const { user, supabaseReady } = useAuth();
const template = useEmailTemplate();

console.log('Prerequisites:', {
  user: !!user,
  template: !!template,
  supabaseReady,
});
```

**Solutions:**
1. Verify user is authenticated
2. Verify email template exists
3. Verify Supabase is ready
4. Check browser console for errors
5. Verify backend is running and accessible

#### Items Disappear on Refresh

**Symptoms:** Queue empty after page reload

**Diagnosis:**

```typescript
// Check localStorage
const stored = localStorage.getItem('scribe-queue-storage');
console.log('Stored queue:', JSON.parse(stored || '{}'));
```

**Solutions:**
1. Verify localStorage is not full
2. Check browser privacy settings (localStorage enabled?)
3. Verify persist middleware is configured

#### Duplicate Processing

**Symptoms:** Same item processed multiple times

**Diagnosis:**

```typescript
// Check for multiple useQueueManager calls
// Should ONLY be in dashboard/layout.tsx
```

**Solutions:**
1. Remove `useQueueManager()` from pages
2. Ensure only one instance in layout
3. Check for multiple tabs (each tab has own processor)

#### Stuck in "Processing"

**Symptoms:** Item never completes or fails

**Diagnosis:**

```typescript
// Check task status manually
const taskId = processingItem?.taskId;
const status = await emailService.getTaskStatus(taskId);
console.log('Task status:', status);
```

**Solutions:**
1. Verify backend is processing the task
2. Check for backend errors in backend logs
3. Manually fail the item and retry:
   ```typescript
   updateItem(id, { status: 'failed', error: 'Timeout' });
   ```

### Debug Tools

#### Browser Console Commands

```typescript
// View queue state
useQueueStore.getState().queue

// View processing item
useQueueStore.getState().getProcessingItem()

// Manually process next
useQueueStore.getState().processNextItem()

// Clear queue
useQueueStore.getState().clearAll()

// View React Query cache
queryClient.getQueryCache().getAll()

// Cancel all queries
queryClient.cancelQueries()
```

#### React Query Devtools

```typescript
// Add to app layout
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function RootLayout({ children }) {
  return (
    <>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}
```

**View:**
- Active queries
- Query status (fetching, success, error)
- Refetch intervals
- Cache data

#### Zustand Devtools

```typescript
// Install devtools middleware
import { devtools } from 'zustand/middleware';

const useQueueStore = create(
  devtools(
    persist(
      (set) => ({ /* ... */ }),
      { name: 'scribe-queue-storage' }
    ),
    { name: 'QueueStore' }
  )
);
```

**View:**
- State history
- Action log
- Time-travel debugging

### Testing Queue Operations

#### Manual Testing Checklist

- [ ] Add single item to queue
- [ ] Add multiple items (5+)
- [ ] Verify sequential processing
- [ ] Check status updates in UI
- [ ] Verify email appears in history after completion
- [ ] Test failure scenario (invalid data)
- [ ] Refresh page during processing
- [ ] Close tab and reopen
- [ ] Test with empty template
- [ ] Test without authentication

#### Automated Testing

```typescript
// Example test
describe('Queue Manager', () => {
  it('processes items sequentially', async () => {
    const { addToQueue } = useQueueActions();

    addToQueue([
      { name: 'Dr. A', interest: 'AI' },
      { name: 'Dr. B', interest: 'ML' },
    ]);

    await waitFor(() => {
      const { completedCount } = useQueueState();
      expect(completedCount).toBe(2);
    });
  });
});
```

---

## State Synchronization

### How Queue State Stays in Sync

```
┌────────────────────────────────────────────────────────┐
│              State Synchronization Flow                 │
└────────────────────────────────────────────────────────┘

User Action (add to queue)
    │
    ▼
Zustand Store Update
    │
    ├──→ localStorage (auto-persist)
    │
    ├──→ Components re-render (granular selectors)
    │
    └──→ useQueueManager detects change
            │
            ▼
        Process item
            │
            ▼
        Call API
            │
            ▼
        Update item with taskId
            │
            ├──→ Zustand store
            ├──→ localStorage
            └──→ Components update
            │
            ▼
        React Query polling
            │
            ├──→ GET /api/email/status
            ├──→ Update cache
            └──→ Components update
            │
            ▼
        Task completes
            │
            ├──→ Update item status
            ├──→ Invalidate email cache
            └──→ Components update
            │
            ▼
        Remove from queue
            │
            ├──→ Zustand store
            ├──→ localStorage
            └──→ Components update
```

### Cross-Component Synchronization

All components using queue hooks see the same state automatically:

```typescript
// Component A
function QueueButton() {
  const { addToQueue } = useQueueActions();
  return <Button onClick={() => addToQueue([item])}>Add</Button>;
}

// Component B (different file, different part of UI)
function QueueStatus() {
  const { pendingCount } = useQueueState();
  return <div>Pending: {pendingCount}</div>;
  // Automatically updates when Component A adds items
}

// Component C (yet another location)
function QueueList() {
  const { queue } = useQueueState();
  return queue.map(item => <QueueItem key={item.id} {...item} />);
  // Automatically updates with real-time status changes
}
```

**How it works:**
1. All components subscribe to same Zustand store
2. Store updates trigger re-renders only for subscribed components
3. Granular selectors ensure minimal re-renders
4. localStorage changes sync across all store instances

### Handling Race Conditions

**Problem:** Multiple actions trying to modify queue simultaneously

**Solution:** Mutex lock prevents concurrent processing

```typescript
const processingLockRef = useRef<Promise<void> | null>(null);

const processNextItem = async () => {
  // Check lock
  if (processingLockRef.current) {
    return;  // Already processing, skip
  }

  // Acquire lock
  const lockPromise = processItemAsync();
  processingLockRef.current = lockPromise;

  // Wait for completion
  await lockPromise;

  // Release lock
  processingLockRef.current = null;
};
```

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Overall system architecture
- **[PATTERNS.md](./PATTERNS.md)** - Code patterns and best practices
- **[MIGRATION_CLEANUP.md](./MIGRATION_CLEANUP.md)** - Migration history

---

**Last updated:** 2025-11-23
