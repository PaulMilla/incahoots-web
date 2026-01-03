# Design Doc: Redesign "Create New Event" Experience (Planning Mode)

## Objective
Redesign the event creation flow to introduce a **Planning Mode**. In this mode, events are created immediately as drafts, visible only to hosts, and allow for collaborative editing with real-time sync. A distinct **Publish** action transitions the event to a live state and sends invitations.

## Overview
Currently, the "Create Event" flow requires users to fill out details upfront. The new flow will create a shell event immediately, dropping the user into a "Planning Mode" version of the Event Page. This allows for an iterative, saving-as-you-go experience that closely mirrors the final event view.

---

## Functional Requirements

### 1. Immediate Creation & Planning Mode
- **Action**: Clicking "+ New Event" instantly creates a new event with placeholder values.
- **Default Values**:
  - `name`: "Untitled Event"
  - `startDate`: 1 week from now
  - `endDate`: 1 hour after startDate
  - `bodyText`: "" (empty)
  - `location.name`: "TBD"
- **State**: The event is created with a status of `planning`.
- **Visibility**: Only **Hosts** (and Co-hosts) can view or edit events in `planning` status.
- **UI**: The Event Page UI is reused with Planning Mode indicators:
  - Top persistent banner in blue/info tone indicating "Planning Mode"
  - All fields (Title, Time, Location, Description) are always editable (no edit button needed)
  - Guest list can be managed (adding/removing people)

### 2. Real-Time Sync (Auto-Save)
- **Behavior**: Edits to any field are automatically saved without requiring a manual "Save" button.
- **Latency**: Updates should be synced to other co-hosts within a ~1 second window.
- **Debounce Strategy**: Hybrid approach
  - Track changes per-field
  - Single unified debounce timer (500ms-1000ms) for API calls
  - After debounce period, send one API call with all changed fields batched together
- **Mechanism**:
  - Frontend collects field changes and debounces
  - Calls `updateEvent` API with batched partial updates
  - Other clients receive updates via existing Firestore subscriptions (RxJS)
- **Conflict Resolution**: Last-write-wins for MVP. May revisit with conflict detection if user feedback warrants it.

### 3. Guest List Management (Silent)
- **Behavior**: Hosts can add guests to the list while in Planning Mode.
- **RSVP State**: Guests added during Planning Mode have `rsvpState: 'pending'` (new state indicating "not yet invited").
- **Notification**: **NO** invites (SMS/Email) are sent while in Planning Mode. Invites are queued as attendees with `pending` status.

### 4. Co-Host Management
- **UI**: Dedicated co-host management UI, separate from guest invite flow.
- **Notification**: Co-hosts are notified **immediately** when added (even in Planning Mode) so they can collaborate on the draft.
- **Access**: Co-hosts have full edit access to the planning event.

### 5. Publishing
- **Action**: A prominent "Publish" button is available to hosts.
- **Validation**: Clicking "Publish" triggers validation:
  - Title must be non-empty (placeholder "Untitled Event" is acceptable)
  - Date can be any value (including past dates)
  - Location name must exist ("TBD" is acceptable)
- **Two-Phase Process**:
  1. Validate synchronously; block publish if validation fails
  2. Update event status to `published`
  3. Return success to user immediately
  4. Queue invites for async delivery via background task
- **Outcome**:
  - Event status updates to `published`
  - Invites are sent asynchronously to all guests with `pending` RSVP state
  - `pending` RSVP states transition to `unknown` when invite is sent
  - Event becomes visible to all invitees

### 6. Discarding Drafts
- **Action**: "Delete Draft" button available to hosts in Planning Mode.
- **Confirmation**: Requires confirmation dialog before deletion.
- **Outcome**: Event is permanently deleted.

### 7. Draft Discovery
- **Location**: Draft events appear in the main events list alongside published events.
- **Indicator**: "Draft" badge displayed on draft events in the list.

### 8. Unauthorized Access to Drafts
- **Behavior**: Non-hosts visiting a planning event URL see: "This event is still being planned. Check back later!"
- **No 404**: The message acknowledges the event exists but isn't ready.

---

## Published Event Behavior

### Editing Published Events
- **Mode**: Published events retain the current explicit "Edit Mode" with Save/Discard buttons.
- **No Auto-Save**: Changes are not auto-saved for published events (prevents accidental live updates).
- **Guest Notification**: After saving changes, host is prompted: "Notify guests of this change?" with option to send or skip notification.

### Unpublishing
- **Not Supported**: Once published, an event cannot be reverted to Planning Mode.
- **Rationale**: Guests have already received invites; unpublishing creates confusing UX.

### Event Cancellation
- **Action**: Hosts can cancel a published event.
- **Status**: New `cancelled` status (not deletion).
- **Guest Notification**: All guests receive "Event cancelled" notification.
- **Visibility**:
  - Hosts: Event visible but greyed out
  - Guests: See "This event was cancelled" if they visit the link

---

## Technical Design

### 1. Data Model Changes (Firestore & Types)

**Event Document (`events/{eventId}`)**
- Add `status`: `'planning' | 'published' | 'cancelled'`
  - Default to `published` for backwards compatibility (missing status = published in security rules)
- Add `hostIds`: `string[]` (Denormalized list of host User IDs)
  - **Single source of truth** for host status
  - Remove `isHost` from Attendee model

**Attendee Document (`events/{eventId}/eventAttendees/{odcuserId}`)**
- Update `rsvpState` enum: `'going' | 'notGoing' | 'maybe' | 'unknown' | 'pending'`
  - `pending`: Added during Planning Mode, not yet invited
  - Transitions to `unknown` when invite is sent on publish
- Remove `isHost` field (use `hostIds` on Event instead)

**Types (`src/types.ts`)**
```typescript
export type EventStatus = 'planning' | 'published' | 'cancelled';
export type RsvpState = 'going' | 'notGoing' | 'maybe' | 'unknown' | 'pending';

export type EventDetails = {
  // ... existing fields
  status: EventStatus;
  hostIds: string[]; // Source of truth for host access
};

export type Attendee = {
  rsvpState: RsvpState;
  eventId: string;
  fullName: string;
  id: string;
  userId: string;
  // isHost: boolean; // REMOVED - use EventDetails.hostIds instead
};
```

### 2. Backend APIs (Service Changes)

**`createEvent` (Modification)**
- Support creating skeleton event with placeholder values
- Accept optional `status` parameter (default: `planning`)
- Initialize `hostIds` with `[creatorId]`
- Return `eventId` immediately

**`updateEvent` (Modification)**
- Ensure support for partial updates (PATCH style)
- Handle batched field updates efficiently
- No change to published event update logic

**`inviteContacts` (Modification)**
- Logic check: If event `status === 'planning'`:
  - Add attendees with `rsvpState: 'pending'`
  - **DO NOT** trigger SMS/Email dispatch
- If event `status === 'published'`:
  - Current behavior (send invites immediately)

**`addCoHost` (New Endpoint)**
- **Endpoint**: `POST /api/addCoHost`
- **Body**: `{ eventId: string, userId: string }` or `{ eventId: string, contact: ContactInfo }`
- **Logic**:
  1. Add userId to `hostIds` array on event
  2. Create attendee record if not exists
  3. Send notification immediately (even in Planning Mode)

**`removeCoHost` (New Endpoint)**
- **Endpoint**: `POST /api/removeCoHost`
- **Body**: `{ eventId: string, userId: string }`
- **Logic**:
  1. Remove userId from `hostIds` array
  2. Optionally remove from attendees or keep as guest

**`publishEvent` (New Endpoint)**
- **Endpoint**: `POST /api/publishEvent`
- **Body**: `{ eventId: string }`
- **Logic**:
  1. Validate event completeness:
     - `name` is non-empty
     - `startDate` exists
     - `location.name` exists
  2. Update `status = 'published'`
  3. Return success immediately
  4. Queue background task to:
     - Fetch all attendees with `rsvpState: 'pending'`
     - Send invites (SMS/Email)
     - Update `rsvpState` to `'unknown'`

**`cancelEvent` (New Endpoint)**
- **Endpoint**: `POST /api/cancelEvent`
- **Body**: `{ eventId: string }`
- **Logic**:
  1. Validate caller is in `hostIds`
  2. Update `status = 'cancelled'`
  3. Queue background task to send cancellation notifications to all attendees

**`deleteEvent` (New Endpoint)**
- **Endpoint**: `DELETE /api/deleteEvent`
- **Body**: `{ eventId: string }`
- **Logic**:
  1. Validate caller is in `hostIds`
  2. Validate `status === 'planning'` (only drafts can be deleted)
  3. Delete event document and subcollections

### 3. Frontend Architecture

**`NewEventPage.tsx` (Simplification)**
- On mount (or button click):
  - Call `api.createEvent({ status: 'planning' })` with placeholder values
  - Redirect immediately to `/events/{newEventId}`

**`EventPage.tsx` (Mode Detection)**
```typescript
const isPlanning = eventDetails.status === 'planning';
const isCancelled = eventDetails.status === 'cancelled';
const isHost = eventDetails.hostIds.includes(currentUser.uid);
```

**UI Logic by State:**
- If `isPlanning && isHost`:
  - Show blue "Planning Mode" banner at top
  - Show "Publish" button prominently
  - Show "Delete Draft" button (with confirmation)
  - Enable `EditableDetailsCard` in **Auto-Save** mode
  - All fields always editable (no edit toggle)
- If `isPlanning && !isHost`:
  - Show "This event is still being planned. Check back later!" message
- If `isCancelled`:
  - Show "This event was cancelled" message
  - Greyed-out display for hosts
- If `published && isHost`:
  - Standard view with "Edit Event" button
  - Edit Mode uses explicit Save/Discard (current behavior)
  - After save, prompt for guest notification preference
- If `published && !isHost`:
  - Standard guest view (current behavior)

**`EditableDetailsCard.tsx` (Refactor)**
- **Props**: Add `autoSave: boolean` and `onFieldChange: (field: string, value: any) => void`
- **Behavior**:
  - If `autoSave` is true:
    - Call `onFieldChange` on each field edit
    - Parent handles debouncing and API calls
  - If `autoSave` is false:
    - Current behavior (mutations held until explicit save)

**New Component: `useAutoSave` Hook**
```typescript
function useAutoSave(eventId: string, debounceMs: number = 500) {
  const pendingChanges = useRef<Partial<EventDetails>>({});
  const timeoutRef = useRef<NodeJS.Timeout>();

  const queueChange = (field: string, value: any) => {
    pendingChanges.current[field] = value;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      api.updateEvent({ id: eventId, ...pendingChanges.current });
      pendingChanges.current = {};
    }, debounceMs);
  };

  return { queueChange };
}
```

**New Component: `CoHostManager.tsx`**
- Dedicated UI for managing co-hosts
- Search/add contacts as co-hosts
- List current co-hosts with remove option
- Calls `addCoHost` / `removeCoHost` APIs

**Events List Updates**
- Show "Draft" badge on events where `status === 'planning'`
- Show visual indicator for cancelled events

### 4. Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /events/{eventId} {
      // Read: published/cancelled events OR planning events if user is host
      allow read: if resource.data.status == 'published'
                  || resource.data.status == 'cancelled'
                  || !('status' in resource.data)  // backwards compat: missing = published
                  || (resource.data.status == 'planning'
                      && request.auth != null
                      && request.auth.uid in resource.data.hostIds);

      // Write: via Backend API only (Admin SDK bypasses rules)
      allow write: if false;

      match /eventAttendees/{odcuserId} {
        // Same read rules as parent event
        allow read: if get(/databases/$(database)/documents/events/$(eventId)).data.status == 'published'
                    || get(/databases/$(database)/documents/events/$(eventId)).data.status == 'cancelled'
                    || !('status' in get(/databases/$(database)/documents/events/$(eventId)).data)
                    || (get(/databases/$(database)/documents/events/$(eventId)).data.status == 'planning'
                        && request.auth != null
                        && request.auth.uid in get(/databases/$(database)/documents/events/$(eventId)).data.hostIds);

        // Users can update their own RSVP
        allow update: if request.auth != null && request.auth.uid == userId;
      }
    }

    // ... other rules unchanged
  }
}
```

### 5. Background Task Infrastructure

For async invite sending on publish:
- Use Firebase Cloud Tasks or Cloud Functions with Pub/Sub
- Task payload: `{ eventId: string, action: 'send_invites' | 'send_cancellation' }`
- Retry logic for failed SMS/email sends
- Update attendee `rsvpState` from `pending` to `unknown` after successful send

---

## Migration Strategy

1. **Deploy Backend Service** with new endpoints (`publishEvent`, `cancelEvent`, `addCoHost`, etc.) and field support (`status`, `hostIds`)
2. **Deploy Firestore Rules** update (backwards compatible - missing status treated as published)
3. **Deploy Frontend** with new Planning Mode flow
4. **No data migration required** - existing events work as-is due to backwards-compatible rules

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| Skeleton event defaults | Placeholder text ("Untitled Event", "TBD", etc.) |
| Host tracking | `hostIds` on Event is source of truth; remove `isHost` from Attendee |
| Publish validation | Non-empty title, any date, location name required |
| Auto-save debounce | Hybrid: per-field tracking, unified API calls |
| Guest RSVP in planning | New `pending` state |
| Co-host management | Dedicated UI separate from guest invites |
| Co-host notification | Immediate notification |
| Concurrent editing | Last-write-wins for MVP |
| Invite delivery | Background queue (async) |
| Firestore migration | Backwards compatible (missing status = published) |
| Planning UI | Top blue banner, all fields always editable |
| Discarding drafts | Explicit delete with confirmation |
| Accessing drafts | In main events list with "Draft" badge |
| Unpublishing | Not allowed |
| Event cancellation | New `cancelled` status with notifications |
| Editing published events | Keep explicit Save/Discard |
| Guest change notifications | Host chooses after saving |
| Unauthorized draft access | "Still being planned" message |
| Publish error handling | Two-phase: validate sync, queue invites async |
