# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InCahoots is a React-based web application for event management with photo sharing capabilities. The frontend is built with React 19, TypeScript, Vite, and Tailwind CSS v4, and integrates with Firebase for authentication, Firestore for data storage, and Cloud Storage for media files.

## Development Commands

### Running the Application

```bash
# Development mode - requires incahoots-service running locally on localhost
# Uses .env.development with Firebase emulator URLs
npm run dev

# Staging mode - points to live production Firebase services
# Uses .env.production
npm run stage

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

### Code Quality

```bash
# Run ESLint
npm run lint
```

## Architecture

### Firebase Integration

The application uses Firebase with conditional emulator connections based on environment variables:

- **Development**: Connects to local Firebase emulators (Auth, Firestore, Storage, Functions)
- **Production/Staging**: Connects to live Firebase services

All Firebase service initialization checks if the URL is localhost using `isLocalhost()` utility before connecting to emulators.

### State Management with RxJS

The application uses RxJS Observables with the `rxfire` library for reactive Firebase data subscriptions:

- `authState()` - Observable for authentication state
- `docData()` - Observable for Firestore document changes
- `collectionData()` - Observable for Firestore collection changes

Key patterns:
- Complex data flows use `switchMap()` to chain dependent Firebase queries
- User events are derived by combining data from multiple Firestore collections using RxJS operators

### Authentication Flow

Authentication is managed through `AuthContext` which provides:

- `loginState`: Tracks authentication status (uninitialized, loggedOut, authenticatedWithIncompleteProfile, signedIn)
- `user`: Current Firebase user object

Profile completion requires: displayName, phoneNumber, and email.

### API Communication

Backend API calls go through `src/lib/inCahootsApi.ts` which:
- Uses Firebase Auth tokens for authorization
- Defaults to production Cloud Functions URL if `VITE_API_URL` is not set
- Provides functions for: registration, event CRUD, RSVP updates, invitations, and media downloads

**Important: Read vs Write Operations**

- **Read operations**: Can be performed directly from Firestore using the client SDK (see `src/lib/firestore.ts`)
- **Write operations**: Must go through backend API endpoints in the incahoots-service repository

This pattern ensures data validation, business logic, and security rules are enforced server-side. When adding new write functionality, you must create a corresponding API endpoint in the backend service.

### Data Model

Core types in `src/types.ts`:

- **EventDetails**: Event metadata (name, dates, location, bodyText, attendeeIds)
- **Attendee**: Attendee information with RSVP state (going, notGoing, maybe, unknown)
- **UserEvent**: Combines EventDetails with user's own Attendee details
- **UserEventInfo**: Maps user to their attendeeId for an event

### Routing Structure

Routes defined in `src/main.tsx`:

- `/` - Landing page
- `/signIn` - Authentication page
- `/events` - User's events dashboard
- `/events/:eventId` - Individual event view
- `/newEvent` - Create new event

### Component Organization

- `src/components/ui/` - Reusable UI components built on Radix UI primitives with Tailwind styling
- `src/Events/` - Event-related page components and modals (EventPage, EventsPage, NewEventPage, InviteModal, UploadPhotosModal, DownloadPhotosModal)
- `src/SignIn/` - Authentication flow components
- `src/auth/` - Authentication context and Firebase auth setup
- `src/lib/` - Firebase SDK wrappers and API client
- `src/utils/` - Utility functions (timestamps, Google Maps, user helpers)

### Path Aliases

The project uses `@/` as an alias for `src/`:

```typescript
import { Button } from "@/components/ui/button"
```

### Firestore Data Access Patterns

Key functions in `src/lib/firestore.ts`:

- `getEventDetailsPublisher(eventId)` - Observable for event details
- `getEventAttendeesPublisher(eventId)` - Observable for event attendees
- `getUserEventsPublisher(userId)` - Observable that combines user's events with their attendee details across multiple collections
- `getMyAttendeeId(userId, eventId)` - Async lookup of user's attendee ID for an event

### Firebase Storage

Media uploads in `src/lib/firebaseStorage.ts`:

- Photos stored at: `events/{eventId}/photos/{filename}`
- Media with progress tracking at: `events/{eventId}/media/{filename}`
- Custom metadata includes eventId, fileModified timestamp, and SHA-256 checksum

## Environment Variables

Required in `.env.development` and `.env.production`:

- `VITE_API_URL` - Backend API base URL
- `VITE_AUTH_URL` - Firebase Auth URL (emulator or production)
- `VITE_FIRESTORE_URL` - Firestore URL (emulator or production)
- `VITE_STORAGE_URL` - Cloud Storage URL (emulator or production)

## Key Dependencies

- **React 19** with React Router for navigation
- **Firebase SDK v10** (firestore, auth, storage, analytics)
- **RxFire v6** for reactive Firebase bindings
- **Radix UI** for accessible component primitives
- **Tailwind CSS v4** with `@tailwindcss/vite` plugin
- **Vite v5** with SWC for fast builds
- **react-toastify** for notifications
- **date-fns** for date manipulation
- **libphonenumber-js** for phone number handling

## Related Repository

The backend service (Cloud Functions) is maintained separately at: https://github.com/PaulMilla/incahoots-service

When running in development mode, this service must be running locally for full functionality.
