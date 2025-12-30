# Planning Mode Frontend Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Planning Mode UI for event creation including instant draft creation, auto-save editing, publish flow, and draft management.

**Architecture:** Simplify NewEventPage to create skeleton event and redirect. Extend EventPage with mode detection (planning/published/cancelled). Add useAutoSave hook for debounced updates. Create new components for Planning Mode banner, CoHostManager, and delete confirmation.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS, RxJS/RxFire, Shadcn/ui components

**Codebase:** `/Users/paulmilla/git/incahoots-web/`

**Depends On:** Backend plan must be deployed first (or run locally via emulator)

---

## Task 1: Update Types with EventStatus and Enhanced RsvpState

**Files:**
- Modify: `src/types.ts`

**Step 1: Read current types.ts**

Read the file to understand current structure.

**Step 2: Add EventStatus type and update RsvpState**

Add new types at the top of the file:

```typescript
export type EventStatus = 'planning' | 'published' | 'cancelled';

export type RsvpState = 'going' | 'notGoing' | 'maybe' | 'unknown' | 'pending';
```

**Step 3: Update EventDetails type**

Add status and hostIds to EventDetails:

```typescript
export type EventDetails = {
  id: string;
  name: string;
  bodyText: string;
  startDate: Timestamp;
  endDate: Timestamp;
  location: Location;
  attendeeIds: string[];
  status: EventStatus;
  hostIds: string[];
};
```

**Step 4: Update Attendee type (remove isHost)**

```typescript
export type Attendee = {
  id: string;
  userId: string;
  eventId: string;
  fullName: string;
  rsvpState: RsvpState;
  // isHost removed - use EventDetails.hostIds
};
```

**Step 5: Verify TypeScript compiles**

Run: `cd /Users/paulmilla/git/incahoots-web && npm run build`
Expected: Compilation errors where isHost was used (expected - we'll fix)

**Step 6: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/types.ts
git commit -m "feat: add EventStatus, pending RsvpState, status/hostIds to EventDetails"
```

---

## Task 2: Update API Client with New Endpoints

**Files:**
- Modify: `src/lib/inCahootsApi.ts`

**Step 1: Read current API client**

Read the file to understand current patterns.

**Step 2: Add new API functions**

Add new endpoint functions following existing patterns:

```typescript
export async function publishEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  return post(`${apiUrl}/publishEvent`, { eventId }, await getToken());
}

export async function cancelEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  return post(`${apiUrl}/cancelEvent`, { eventId }, await getToken());
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
  const token = await getToken();
  const response = await fetch(`${apiUrl}/deleteEvent`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ eventId }),
  });
  return response.json();
}

export async function addCoHost(
  eventId: string,
  userId: string,
  fullName: string
): Promise<{ success: boolean; error?: string }> {
  return post(`${apiUrl}/addCoHost`, { eventId, userId, fullName }, await getToken());
}

export async function removeCoHost(
  eventId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return post(`${apiUrl}/removeCoHost`, { eventId, userId }, await getToken());
}
```

**Step 3: Update CreateEventBody to support status**

```typescript
export type CreateEventBody = {
  name: string;
  bodyText: string;
  startDate: string;
  endDate: string;
  location: {
    name: string;
    address?: string;
    geoPoint?: GeoPoint;
  };
  status?: EventStatus;
};
```

**Step 4: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/lib/inCahootsApi.ts
git commit -m "feat: add publishEvent, cancelEvent, deleteEvent, addCoHost, removeCoHost APIs"
```

---

## Task 3: Create useAutoSave Hook

**Files:**
- Create: `src/hooks/useAutoSave.ts`

**Step 1: Create the hook file**

```typescript
// src/hooks/useAutoSave.ts
import { useRef, useCallback } from 'react';
import * as api from '../lib/inCahootsApi';
import { EventDetails } from '../types';

type PartialEventUpdate = Partial<Pick<EventDetails, 'name' | 'bodyText' | 'startDate' | 'endDate' | 'location'>>;

interface UseAutoSaveOptions {
  eventId: string;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useAutoSave({
  eventId,
  debounceMs = 500,
  onSaveStart,
  onSaveComplete,
  onSaveError,
}: UseAutoSaveOptions) {
  const pendingChanges = useRef<PartialEventUpdate>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSaving = useRef(false);

  const flushChanges = useCallback(async () => {
    if (Object.keys(pendingChanges.current).length === 0) {
      return;
    }

    const changes = { ...pendingChanges.current };
    pendingChanges.current = {};

    isSaving.current = true;
    onSaveStart?.();

    try {
      // Convert Timestamps to ISO strings for API
      const updateBody: api.UpdateEventBody = {
        id: eventId,
        name: changes.name || '',
        bodyText: changes.bodyText || '',
        startDate: changes.startDate?.toDate().toISOString() || new Date().toISOString(),
        endDate: changes.endDate?.toDate().toISOString() || new Date().toISOString(),
        location: changes.location || { name: '' },
      };

      await api.updateEvent(updateBody);
      onSaveComplete?.();
    } catch (error) {
      onSaveError?.(error as Error);
    } finally {
      isSaving.current = false;
    }
  }, [eventId, onSaveStart, onSaveComplete, onSaveError]);

  const queueChange = useCallback(
    <K extends keyof PartialEventUpdate>(field: K, value: PartialEventUpdate[K]) => {
      pendingChanges.current[field] = value;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        flushChanges();
      }, debounceMs);
    },
    [debounceMs, flushChanges]
  );

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return flushChanges();
  }, [flushChanges]);

  return {
    queueChange,
    flush,
    isSaving: () => isSaving.current,
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd /Users/paulmilla/git/incahoots-web && npx tsc --noEmit`

**Step 3: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/hooks/useAutoSave.ts
git commit -m "feat: add useAutoSave hook for planning mode"
```

---

## Task 4: Create Planning Mode Banner Component

**Files:**
- Create: `src/components/PlanningModeBanner.tsx`

**Step 1: Create the banner component**

```typescript
// src/components/PlanningModeBanner.tsx
import { Info } from 'lucide-react';

interface PlanningModeBannerProps {
  onPublish: () => void;
  onDelete: () => void;
  isPublishing?: boolean;
}

export function PlanningModeBanner({ onPublish, onDelete, isPublishing }: PlanningModeBannerProps) {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700">
          <Info className="h-5 w-5" />
          <span className="font-medium">Planning Mode</span>
          <span className="text-blue-600 text-sm">
            — This event is a draft. Only hosts can see it.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            Delete Draft
          </button>
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
          >
            {isPublishing ? 'Publishing...' : 'Publish Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/components/PlanningModeBanner.tsx
git commit -m "feat: add PlanningModeBanner component"
```

---

## Task 5: Create Delete Draft Confirmation Dialog

**Files:**
- Create: `src/components/DeleteDraftDialog.tsx`

**Step 1: Create the dialog component**

```typescript
// src/components/DeleteDraftDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface DeleteDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function DeleteDraftDialog({
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: DeleteDraftDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The draft event and all its details will be permanently
            deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete Draft'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 2: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/components/DeleteDraftDialog.tsx
git commit -m "feat: add DeleteDraftDialog component"
```

---

## Task 6: Create Cancelled Event Banner

**Files:**
- Create: `src/components/CancelledEventBanner.tsx`

**Step 1: Create the banner component**

```typescript
// src/components/CancelledEventBanner.tsx
import { XCircle } from 'lucide-react';

export function CancelledEventBanner() {
  return (
    <div className="bg-gray-100 border-b border-gray-300 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-2 text-gray-600">
        <XCircle className="h-5 w-5" />
        <span className="font-medium">This event was cancelled</span>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/components/CancelledEventBanner.tsx
git commit -m "feat: add CancelledEventBanner component"
```

---

## Task 7: Create Planning Access Denied Component

**Files:**
- Create: `src/components/PlanningAccessDenied.tsx`

**Step 1: Create the component**

```typescript
// src/components/PlanningAccessDenied.tsx
import { Clock } from 'lucide-react';

export function PlanningAccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="flex justify-center mb-4">
          <Clock className="h-16 w-16 text-blue-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          This event is still being planned
        </h1>
        <p className="text-gray-600">Check back later!</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/components/PlanningAccessDenied.tsx
git commit -m "feat: add PlanningAccessDenied component"
```

---

## Task 8: Simplify NewEventPage for Instant Draft Creation

**Files:**
- Modify: `src/Events/NewEventPage.tsx`

**Step 1: Read current NewEventPage**

Read the file to understand current structure.

**Step 2: Rewrite for instant creation**

Replace with simplified version that creates skeleton and redirects:

```typescript
// src/Events/NewEventPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import * as api from '../lib/inCahootsApi';

function getDefaultEventDetails(): api.CreateEventBody {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // 1 week from now
  startDate.setHours(18, 0, 0, 0); // 6 PM

  const endDate = new Date(startDate);
  endDate.setHours(19, 0, 0, 0); // 7 PM (1 hour later)

  return {
    name: 'Untitled Event',
    bodyText: '',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    location: { name: 'TBD' },
    status: 'planning',
  };
}

export default function NewEventPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createDraftEvent() {
      try {
        const defaultEvent = getDefaultEventDetails();
        const response = await api.createEvent(defaultEvent);
        navigate(`/events/${response.eventId}`, { replace: true });
      } catch (err) {
        console.error('Failed to create event:', err);
        setError('Failed to create event. Please try again.');
      }
    }

    createDraftEvent();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Creating your event...</p>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/Events/NewEventPage.tsx
git commit -m "refactor: simplify NewEventPage to create draft and redirect"
```

---

## Task 9: Update EditableDetailsCard for Auto-Save Mode

**Files:**
- Modify: `src/Events/EditableDetailsCard.tsx`

**Step 1: Read current EditableDetailsCard**

Read the file to understand current structure.

**Step 2: Add autoSave prop and onFieldChange callback**

Update the component props and behavior:

```typescript
// Add to props interface
interface EditableDetailsCardProps {
  eventDetails: EventDetails | NewEventDetails;
  isEditing: boolean;
  autoSave?: boolean;
  onFieldChange?: (field: string, value: any) => void;
}

// Update each sub-component to call onFieldChange when autoSave is true
// Example for EventTime:
function EventTime({ eventDetails, isEditing, autoSave, onFieldChange }: SubComponentProps) {
  // ... existing state ...

  useEffect(() => {
    if (eventDetails) {
      eventDetails.startDate = Timestamp.fromDate(eventTime);
      if (autoSave && onFieldChange) {
        onFieldChange('startDate', Timestamp.fromDate(eventTime));
      }
    }
  }, [eventTime]);

  // ... rest of component
}
```

**Step 3: Apply same pattern to EventLocation, EventDescription, EditableEventTitle**

Each component should:
1. Accept `autoSave` and `onFieldChange` props
2. Call `onFieldChange` with field name and value when changed (if autoSave is true)

**Step 4: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/Events/EditableDetailsCard.tsx
git commit -m "feat: add autoSave mode to EditableDetailsCard"
```

---

## Task 10: Update EventPage with Mode Detection and Planning UI

**Files:**
- Modify: `src/Events/EventPage.tsx`

**Step 1: Read current EventPage**

Read the file to understand current structure.

**Step 2: Add imports for new components**

```typescript
import { PlanningModeBanner } from '../components/PlanningModeBanner';
import { DeleteDraftDialog } from '../components/DeleteDraftDialog';
import { CancelledEventBanner } from '../components/CancelledEventBanner';
import { PlanningAccessDenied } from '../components/PlanningAccessDenied';
import { useAutoSave } from '../hooks/useAutoSave';
import * as api from '../lib/inCahootsApi';
```

**Step 3: Add mode detection logic**

```typescript
// Inside EventPage component, after eventDetails is loaded:
const { user } = useAuth();
const currentUserId = user?.uid;

const isPlanning = eventDetails?.status === 'planning';
const isCancelled = eventDetails?.status === 'cancelled';
const isHost = eventDetails?.hostIds?.includes(currentUserId || '') || false;

// Check access for planning events
if (isPlanning && !isHost) {
  return <PlanningAccessDenied />;
}
```

**Step 4: Add state for publish/delete dialogs**

```typescript
const [isPublishing, setIsPublishing] = useState(false);
const [isDeleting, setIsDeleting] = useState(false);
const [showDeleteDialog, setShowDeleteDialog] = useState(false);
```

**Step 5: Add publish and delete handlers**

```typescript
async function handlePublish() {
  if (!eventDetails?.id) return;
  setIsPublishing(true);
  try {
    const result = await api.publishEvent(eventDetails.id);
    if (!result.success) {
      alert(result.error || 'Failed to publish');
    }
    // Event will update via subscription
  } catch (err) {
    console.error('Publish failed:', err);
    alert('Failed to publish event');
  } finally {
    setIsPublishing(false);
  }
}

async function handleDelete() {
  if (!eventDetails?.id) return;
  setIsDeleting(true);
  try {
    const result = await api.deleteEvent(eventDetails.id);
    if (result.success) {
      navigate('/events');
    } else {
      alert(result.error || 'Failed to delete');
    }
  } catch (err) {
    console.error('Delete failed:', err);
    alert('Failed to delete event');
  } finally {
    setIsDeleting(false);
    setShowDeleteDialog(false);
  }
}
```

**Step 6: Set up auto-save for planning mode**

```typescript
const { queueChange } = useAutoSave({
  eventId: eventDetails?.id || '',
  debounceMs: 500,
  onSaveError: (err) => console.error('Auto-save failed:', err),
});

function handleFieldChange(field: string, value: any) {
  queueChange(field as any, value);
}
```

**Step 7: Update render to show appropriate UI**

```typescript
return (
  <div>
    {/* Banners */}
    {isPlanning && isHost && (
      <PlanningModeBanner
        onPublish={handlePublish}
        onDelete={() => setShowDeleteDialog(true)}
        isPublishing={isPublishing}
      />
    )}
    {isCancelled && <CancelledEventBanner />}

    {/* Delete confirmation dialog */}
    <DeleteDraftDialog
      open={showDeleteDialog}
      onOpenChange={setShowDeleteDialog}
      onConfirm={handleDelete}
      isDeleting={isDeleting}
    />

    {/* Rest of existing EventPage content */}
    {/* Update EditableDetailsCard usage: */}
    <EditableDetailsCard
      eventDetails={isPlanning ? eventDetails : newEventDetails || eventDetails}
      isEditing={isPlanning || isEditing}
      autoSave={isPlanning}
      onFieldChange={isPlanning ? handleFieldChange : undefined}
    />

    {/* Hide edit button in planning mode (always editing) */}
    {!isPlanning && isHost && (
      <button onClick={() => setIsEditing(true)}>Edit Event</button>
    )}
  </div>
);
```

**Step 8: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/Events/EventPage.tsx
git commit -m "feat: add planning mode UI to EventPage"
```

---

## Task 11: Update Host Detection Throughout App

**Files:**
- Modify: `src/Events/EventPage.tsx` (hosts list)
- Modify any other files using `isHost` from Attendee

**Step 1: Find all usages of attendee.isHost**

Run: `grep -r "isHost" src/`

**Step 2: Update host detection to use eventDetails.hostIds**

Replace patterns like:
```typescript
// Old
const hosts = attendees.filter(a => a.isHost);

// New
const hosts = attendees.filter(a => eventDetails.hostIds.includes(a.userId));
```

**Step 3: Update categorizedAttendees logic**

```typescript
// In EventPage where attendees are categorized
const categorizedAttendees = useMemo(() => {
  if (!attendees || !eventDetails?.hostIds) return null;

  return {
    hosts: attendees.filter(a => eventDetails.hostIds.includes(a.userId)),
    going: attendees.filter(a => a.rsvpState === 'going' && !eventDetails.hostIds.includes(a.userId)),
    maybe: attendees.filter(a => a.rsvpState === 'maybe'),
    notGoing: attendees.filter(a => a.rsvpState === 'notGoing'),
    pending: attendees.filter(a => a.rsvpState === 'pending'),
    unknown: attendees.filter(a => a.rsvpState === 'unknown'),
  };
}, [attendees, eventDetails?.hostIds]);
```

**Step 4: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add -A
git commit -m "refactor: update host detection to use eventDetails.hostIds"
```

---

## Task 12: Add Draft Badge to Events List

**Files:**
- Modify: `src/Events/EventCard.tsx`

**Step 1: Read current EventCard**

Read the file to understand current structure.

**Step 2: Add draft badge**

```typescript
// Add to EventCard props
interface EventCardProps {
  event: EventDetails;
  // ... other props
}

// Add badge in render
export function EventCard({ event }: EventCardProps) {
  const isPlanning = event.status === 'planning';
  const isCancelled = event.status === 'cancelled';

  return (
    <div className={`... ${isCancelled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-2">
        <h3>{event.name}</h3>
        {isPlanning && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
            Draft
          </span>
        )}
        {isCancelled && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
            Cancelled
          </span>
        )}
      </div>
      {/* ... rest of card */}
    </div>
  );
}
```

**Step 3: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/Events/EventCard.tsx
git commit -m "feat: add Draft and Cancelled badges to EventCard"
```

---

## Task 13: Create CoHostManager Component

**Files:**
- Create: `src/components/CoHostManager.tsx`

**Step 1: Create the component**

```typescript
// src/components/CoHostManager.tsx
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Crown, X, UserPlus } from 'lucide-react';
import * as api from '../lib/inCahootsApi';
import { Attendee } from '../types';

interface CoHostManagerProps {
  eventId: string;
  hostIds: string[];
  attendees: Attendee[];
  currentUserId: string;
  onCoHostAdded?: () => void;
  onCoHostRemoved?: () => void;
}

export function CoHostManager({
  eventId,
  hostIds,
  attendees,
  currentUserId,
  onCoHostAdded,
  onCoHostRemoved,
}: CoHostManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hosts = attendees.filter(a => hostIds.includes(a.userId));
  const nonHostAttendees = attendees.filter(a => !hostIds.includes(a.userId));
  const filteredNonHosts = nonHostAttendees.filter(a =>
    a.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleAddCoHost(attendee: Attendee) {
    setIsAdding(true);
    try {
      await api.addCoHost(eventId, attendee.userId, attendee.fullName);
      onCoHostAdded?.();
    } catch (err) {
      console.error('Failed to add co-host:', err);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveCoHost(userId: string) {
    try {
      await api.removeCoHost(eventId, userId);
      onCoHostRemoved?.();
    } catch (err) {
      console.error('Failed to remove co-host:', err);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Crown className="h-4 w-4 mr-2" />
          Manage Hosts
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Co-Hosts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current hosts */}
          <div>
            <h4 className="text-sm font-medium mb-2">Current Hosts</h4>
            <div className="space-y-2">
              {hosts.map(host => (
                <div
                  key={host.userId}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>{host.fullName}</span>
                    {host.userId === currentUserId && (
                      <span className="text-xs text-gray-500">(you)</span>
                    )}
                  </div>
                  {host.userId !== currentUserId && hostIds.length > 1 && (
                    <button
                      onClick={() => handleRemoveCoHost(host.userId)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add co-host */}
          {nonHostAttendees.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Add Co-Host from Guests</h4>
              <Input
                placeholder="Search guests..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredNonHosts.map(attendee => (
                  <button
                    key={attendee.userId}
                    onClick={() => handleAddCoHost(attendee)}
                    disabled={isAdding}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded text-left"
                  >
                    <span>{attendee.fullName}</span>
                    <UserPlus className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/components/CoHostManager.tsx
git commit -m "feat: add CoHostManager component"
```

---

## Task 14: Integrate CoHostManager into EventPage

**Files:**
- Modify: `src/Events/EventPage.tsx`

**Step 1: Import CoHostManager**

```typescript
import { CoHostManager } from '../components/CoHostManager';
```

**Step 2: Add CoHostManager to EventPage UI**

Add in the hosts section or settings area:

```typescript
{isHost && (
  <CoHostManager
    eventId={eventDetails.id}
    hostIds={eventDetails.hostIds}
    attendees={allAttendees}
    currentUserId={currentUserId}
  />
)}
```

**Step 3: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/Events/EventPage.tsx
git commit -m "feat: integrate CoHostManager into EventPage"
```

---

## Task 15: Add Guest Notification Prompt for Published Event Edits

**Files:**
- Create: `src/components/NotifyGuestsDialog.tsx`
- Modify: `src/Events/EventPage.tsx`

**Step 1: Create the dialog component**

```typescript
// src/components/NotifyGuestsDialog.tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface NotifyGuestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notify: boolean) => void;
}

export function NotifyGuestsDialog({ open, onOpenChange, onConfirm }: NotifyGuestsDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Notify guests of changes?</AlertDialogTitle>
          <AlertDialogDescription>
            Would you like to send a notification to all guests about the event changes?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConfirm(false)}>
            Don't Notify
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(true)}>
            Notify Guests
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

**Step 2: Integrate into EventPage save flow**

After saving changes to a published event, show the dialog.

**Step 3: Commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add src/components/NotifyGuestsDialog.tsx src/Events/EventPage.tsx
git commit -m "feat: add guest notification prompt for published event edits"
```

---

## Task 16: Final Build and Lint Check

**Step 1: Run lint**

Run: `cd /Users/paulmilla/git/incahoots-web && npm run lint`
Expected: No errors (fix any that appear)

**Step 2: Run build**

Run: `cd /Users/paulmilla/git/incahoots-web && npm run build`
Expected: Compilation succeeds

**Step 3: Test locally**

Run: `cd /Users/paulmilla/git/incahoots-web && npm run dev`
Expected: App starts without errors

**Step 4: Manual testing checklist**

- [ ] Click "+ New Event" creates draft and redirects
- [ ] Draft event shows blue Planning Mode banner
- [ ] All fields are editable in planning mode
- [ ] Changes auto-save (check network tab)
- [ ] Publish button works
- [ ] Delete Draft button shows confirmation
- [ ] Delete removes event and redirects to events list
- [ ] Non-host sees "still being planned" message for draft URLs
- [ ] Published events have explicit Edit/Save/Discard
- [ ] Events list shows Draft badge on planning events
- [ ] Cancelled events show cancelled banner

**Step 5: Final commit**

```bash
cd /Users/paulmilla/git/incahoots-web
git add -A
git commit -m "chore: fix any remaining lint/build issues"
```

---

## Summary

This plan implements:

1. **Type Updates**: EventStatus, pending RsvpState, status/hostIds on EventDetails
2. **API Client**: New endpoints for publish, cancel, delete, addCoHost, removeCoHost
3. **useAutoSave Hook**: Debounced auto-save for planning mode
4. **UI Components**: PlanningModeBanner, DeleteDraftDialog, CancelledEventBanner, PlanningAccessDenied, CoHostManager, NotifyGuestsDialog
5. **NewEventPage**: Simplified to instant draft creation
6. **EventPage**: Mode detection, planning mode UI, auto-save integration
7. **EventCard**: Draft and Cancelled badges

**Testing Note:** Requires backend to be running (either deployed or via Firebase emulator) for full functionality testing.
