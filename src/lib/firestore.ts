import { Attendee, EventDetails, UserEvent, UserEventInfo } from "../types.ts";
import { app } from "./firebaseApp";
import {
  doc,
  getFirestore,
  collection,
  documentId,
  where,
  query,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { map, switchMap, catchError } from 'rxjs/operators';
import { Observable, combineLatest, of } from 'rxjs';

// @ts-expect-error - Unfortunately types seem to be messed up
// There are types at '/node_modules/rxfire/firestore/index.d.ts'
import { docData, collectionData } from 'rxfire/firestore';
import { isLocalhost } from "../utils/isLocalHost.ts";

// Using RxFire:
// https://github.com/FirebaseExtended/rxfire/blob/main/docs/firestore.md
const db = getFirestore(app);

// Only connect to emulator if FIRESTORE_URL is defined and using localhost
const fireStoreUrlString = import.meta.env.VITE_FIRESTORE_URL
if (fireStoreUrlString && isLocalhost(fireStoreUrlString)) {
  const localFireStoreUrl = new URL(fireStoreUrlString)
  // Use 'localhost' instead of '127.0.0.1' to avoid "Offline" errors in some browser environments
  const hostname = localFireStoreUrl.hostname === '127.0.0.1' ? 'localhost' : localFireStoreUrl.hostname;
  connectFirestoreEmulator(db, hostname, parseInt(localFireStoreUrl.port))
}

export function getEventAttendeePublisher(eventId: string, userId: string): Observable<Attendee> {
  const attendeeDocRef = doc(db, `events/${eventId}/eventAttendees/${userId}`);
  return docData(attendeeDocRef, { idField: 'id' }) as Observable<Attendee>;
}

export function getEventDetailsPublisher(eventId: string) {
  const ref = doc(db, "events", eventId);
  const eventDetails$: Observable<unknown> = docData(ref)
  return eventDetails$.pipe(
    map(eventDetails => {
      if (eventDetails == null) {
        return undefined
      }
      const details = eventDetails as EventDetails;
      details.id = eventId;
      return details;
    })
  )
}

export function getEventsDetailsPublisher(eventIds: string[]) {
  // Return an empty observable if no IDs are provided else query() will throw an error
  if (eventIds.length == 0) {
    return new Observable<EventDetails[]>(subscriber => {
      subscriber.next([]);
      subscriber.complete();
    });
  }

  const refQuery = query(
    collection(db, "events"),
    where(documentId(), 'in', eventIds)
  );

  const events$: Observable<EventDetails[]> = collectionData(refQuery, { idField: 'id' })
  return events$
}

export function getEventAttendeesPublisher(eventId: string) {
  const ref = collection(db, "events", eventId, "eventAttendees");
  const eventAttendees$: Observable<Attendee[]> = collectionData(ref, { idField: 'id' })
  return eventAttendees$
}

export function getUserEventsPublisher(userId: string) {
  const ref = collection(db, "users", userId, "events");
  const myEventInfos$: Observable<UserEventInfo[]> = collectionData(ref);

  const userEvents$ = myEventInfos$.pipe(
    switchMap(myEventInfos => {

      if (myEventInfos.length === 0) {
        return of([]);
      }

      // Fetch each event detail individually to avoid one permission error failing the whole batch
      const eventDetailsObservables = myEventInfos.map(info =>
        getEventDetailsPublisher(info.eventId).pipe(
          // If we can't read the event (e.g. permission denied), return undefined
          // We need to import catchError and of from rxjs
          catchError(err => {
            console.error(`Error fetching event details for ${info.eventId}:`, err);
            return of(undefined);
          })
        )
      );

      return combineLatest([
        of(myEventInfos),
        combineLatest(eventDetailsObservables)
      ]);
    }),
    switchMap(result => {
      const [myEventInfos, allEventDetails] = result;
      // allEventDetails may contain undefineds now


      const userAttendees$ = myEventInfos.map(eventInfo =>
        getEventAttendeePublisher(eventInfo.eventId, userId).pipe(
          catchError(err => {
            console.warn(`Error fetching attendee for ${eventInfo.eventId}`, err);
            return of(undefined)
          })
        )
      );

      return combineLatest(userAttendees$).pipe(
        map(userAttendees => {

          return userAttendees
            .map((attendee, index) => {
              if (!attendee) return null;
              const eventDetails = allEventDetails[index];
              if (!eventDetails) return null; // Event not found or permission denied

              return {
                eventDetails: eventDetails!,
                myAttendeeDetails: attendee
              } as UserEvent;
            })
            .filter(item => item !== null) as UserEvent[];
        })
      );
    })
  );

  return userEvents$;
}