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
import { map, switchMap } from 'rxjs/operators';
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
  connectFirestoreEmulator(db, localFireStoreUrl.hostname, parseInt(localFireStoreUrl.port))
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
      const myEventIds = myEventInfos.map(x => x.eventId);
      return combineLatest([
        of(myEventInfos),
        getEventsDetailsPublisher(myEventIds)
      ]);
    }),
    switchMap(result => {
      if (Array.isArray(result) && result.length === 2) {
        const [myEventInfos, allEventDetails] = result as [UserEventInfo[], EventDetails[]];
        const userAttendees$ = myEventInfos.map(eventInfo =>
          getEventAttendeePublisher(eventInfo.eventId, userId)
        );
        return combineLatest(userAttendees$).pipe(
          map(userAttendees => {
            return userAttendees
              .filter(attendee => !!attendee)
              .map(attendee => {
                const eventDetails = allEventDetails.find(e => e.id === attendee.eventId);
                if (!eventDetails) {
                  console.error(`Couldn't find eventDetail for eventId: ${attendee.eventId}`);
                }
                return {
                  eventDetails: eventDetails!,
                  myAttendeeDetails: attendee
                } as UserEvent;
              });
          })
        );
      }
      return of([]);
    })
  );

  return userEvents$;
}