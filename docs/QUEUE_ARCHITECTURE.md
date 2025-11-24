# Simple Queue Management System

## Overview

This document describes the new, simplified queue management system for Scribe. The system has been redesigned from scratch to be cleaner, simpler, and more maintainable.

## Architecture

### Core Components

1. **Simple Queue Store** (`/stores/simple-queue-store.ts`)
   - Minimal Zustand store that only manages queue items
   - No complex logic, just state management
   - Persisted to localStorage automatically
   - ~90 lines (down from 230 lines)

2. **Email Service** (`/lib/email-service.ts`)
   - Clean API interface for all email operations
   - Handles authentication tokens automatically
   - Type-safe request/response interfaces
   - ~70 lines of clean code

3. **Queue Manager Hook** (`/hooks/useQueueManager.ts`)
   - Single source of truth for queue management
   - Handles all queue processing logic
   - Manages polling with React Query
   - Recovery from interruptions
   - ~150 lines (down from 476 lines)

4. **Queue Status Component** (`/components/QueueStatus.tsx`)
   - Clean UI component for displaying queue status
   - Shows current step during processing
   - Displays pending, completed, and failed counts
   - ~80 lines

## How It Works

### 1. Adding Items to Queue

```typescript
// In the generate page
const { addToQueue } = useQueueManager();

// User clicks generate
addToQueue([
  { name: "Dr. Smith", interest: "AI" },
  { name: "Dr. Jones", interest: "ML" }
]);
```

### 2. Automatic Processing

The Queue Manager automatically:
1. Detects when items are added to the queue
2. Checks if user is authenticated and template exists
3. Processes items one at a time (sequential)
4. Polls for task status every 2 seconds
5. Updates UI in real-time
6. Removes completed items after a delay

### 3. Status Polling

```typescript
// Inside useQueueManager
const { data: taskStatus } = useQuery({
  queryKey: ['task', currentTaskId],
  queryFn: () => emailService.getTaskStatus(currentTaskId),
  refetchInterval: (query) => {
    const status = query.state.data?.status;
    if (status === "SUCCESS" || status === "FAILURE") {
      return false; // Stop polling
    }
    return 2000; // Poll every 2 seconds
  },
});
```

### 4. Recovery from Page Refresh

On mount, the Queue Manager:
1. Checks for any items that were "processing"
2. If they have a task ID, resumes polling
3. If no task ID, marks as failed and continues

## Benefits Over Previous System

### Simplicity
- **Before**: 6 hooks, 3 stores, 900+ lines of complex logic
- **After**: 1 hook, 1 store, 1 service, ~400 lines total

### Clear Separation of Concerns
- **Store**: Only manages queue items
- **Service**: Only handles API calls
- **Hook**: Only manages queue processing
- **Component**: Only displays status

### Better Developer Experience
- Single `useQueueManager()` hook provides everything
- Clear, predictable behavior
- Easy to debug and understand
- No complex auth checks or grace periods

### Robust Error Handling
- Automatic retry for failed items
- Clear error messages
- Recovery from interruptions

## Usage Examples

### Dashboard Layout
```tsx
// Initialize once for all dashboard pages
export default function DashboardLayout({ children }) {
  useQueueManager(); // That's it!
  return <>{children}</>;
}
```

### Generate Page
```tsx
const { addToQueue } = useQueueManager();

// Add items to queue
addToQueue(items);
```

### Dashboard Page
```tsx
const {
  currentTaskStatus,
  pendingCount,
  isProcessing,
} = useQueueManager();

// Display status
<QueueStatus />
```

## Migration Guide

### Old System → New System

1. **Replace imports**:
   ```typescript
   // Old
   import { useQueueProcessor } from '@/hooks/queries/useQueueProcessor';
   import { useTaskStatus } from '@/hooks/queries/useTaskStatus';
   import { useGenerateEmail } from '@/hooks/mutations/useGenerateEmail';
   
   // New
   import { useQueueManager } from '@/hooks/useQueueManager';
   ```

2. **Use single hook**:
   ```typescript
   // Old
   const { currentTaskStatus } = useQueueProcessor();
   const pendingCount = usePendingCount();
   
   // New
   const { currentTaskStatus, pendingCount } = useQueueManager();
   ```

3. **Add to queue**:
   ```typescript
   // Old
   const addToQueue = useAddToQueue();
   
   // New
   const { addToQueue } = useQueueManager();
   ```

## Testing

The new system is easier to test:

1. **Unit Tests**: Each component can be tested in isolation
2. **Integration Tests**: Simple flow to test end-to-end
3. **Manual Testing**: Clear, predictable behavior

## Future Enhancements

1. **Batch Processing**: Process multiple emails in parallel
2. **Priority Queue**: Add priority levels to queue items
3. **Progress Bar**: Show overall queue progress
4. **Retry Logic**: Configurable retry attempts
5. **Queue Persistence**: Save queue to database for cross-device sync

## Conclusion

The new queue management system is a significant improvement over the previous implementation. It's simpler, cleaner, and more maintainable while providing the same functionality with better reliability.
