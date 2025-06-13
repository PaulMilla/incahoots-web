import { Attendee, EventDetails, UserEvent, UserEventInfo } from "../types.ts";
import { app } from "./firebaseApp";
import {
  doc,
  getFirestore,
  collection,
  documentId,
  where,
  query,
  collectionGroup,
  getDoc,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { map, switchMap } from 'rxjs/operators';
import { Observable } from 'rxjs';

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

export async function getMyAttendeeId(userId: string | undefined, eventId: string) {
  if (!userId) {
    return undefined
  }

  const ref = doc(db, "users", userId, "events", eventId);
  const docSnap = await getDoc(ref);

  if (docSnap.exists()) {
    const userEventInfo = docSnap.data() as UserEventInfo;
    return userEventInfo.myAttendeeId;
  } else {
    console.error("No such document!");
    return undefined
  }
}

export function getEventDetailsPublisher(eventId: string) {
  const ref = doc(db, "events", eventId);
  const eventDetails$: Observable<unknown> = docData(ref)
  return eventDetails$.pipe(
    map(eventDetails => {
      if (eventDetails == null) {
        return undefined
      }
      return eventDetails as EventDetails
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

export function getUserAttendeesPublisher(attendeeIds: string[]) {
  // Return an empty observable if no IDs are provided else query() will throw an error
  if (attendeeIds.length == 0) {
    return new Observable<EventDetails[]>(subscriber => {
      subscriber.next([]);
      subscriber.complete();
    });
  }
  const refQuery = query(
    collectionGroup(db, "eventAttendees"),
    where('id', 'in', attendeeIds)
  )
  const userAttendees$: Observable<Attendee[]> = collectionData(refQuery, { idField: 'id'})
  return userAttendees$
}

export function getUserEventsPublisher(userId: string) {
  const ref = collection(db, "users", userId, "events");
  const myEventInfos$: Observable<UserEventInfo[]> = collectionData(ref);

  // Intermediary type
  type UserEventDetails = {
    eventDetails: EventDetails;
    myAttendeeId: string;
  };

  const userEvents$ = myEventInfos$.pipe(
    switchMap(myEventInfos => {
      const myEventIds = myEventInfos.map(x => x.eventId);
      const myUserEventsDetails$ = getEventsDetailsPublisher(myEventIds)
        .pipe(
          map(myEventDetails => {
            const myUserEventDetails = myEventDetails.map(myEventDetail => {
              const myEventInfosFiltered = myEventInfos.filter(x => x.eventId == myEventDetail.id)
              if (myEventInfosFiltered.length == 0) {
                console.error(`Couldn't find myEventInfo for EventDetail.id: ${myEventDetail.id}`);
              }
              const myAttendeeId = myEventInfosFiltered[0].myAttendeeId;
              return {
                eventDetails: myEventDetail,
                myAttendeeId: myAttendeeId
              } as UserEventDetails
            })
            return myUserEventDetails;
          })
        )
      return myUserEventsDetails$;
    }),

    // TODO: Might have to do a combine latest instead of switchMap()
    // TODO: Test if we auto-update the page when we select a new RSVP status
    switchMap(myUserEventsDetails => {
      const myAttendeeIds = myUserEventsDetails.map(x => x.myAttendeeId);
      const myUserEvents$ = getUserAttendeesPublisher(myAttendeeIds)
        .pipe(
          map(myAttendees => {
            const myUserEvents = myAttendees.map(myAttendee => {
              const myEventDetailsFiltered = myUserEventsDetails.filter(x => x.eventDetails.id == myAttendee.eventId)
              if (myEventDetailsFiltered.length == 0) {
                console.error(`Couldn't find eventDetail for myAttendeeId: ${myAttendee.id}`)
              }
              const eventDetails = myEventDetailsFiltered[0].eventDetails;
              return {
                eventDetails: eventDetails,
                myAttendeeDetails: myAttendee
              } as UserEvent
            })
            return myUserEvents
          })
        )
      return myUserEvents$;
    }),
  )

  return userEvents$;
}