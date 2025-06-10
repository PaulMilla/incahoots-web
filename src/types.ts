/** Some types derived from the Firestore database schema.
 *
 * Aside: Wish there was a way to auto-generate these types from Firestore SDK itself 😪
 */

import { Timestamp } from "firebase/firestore";


type GeoPoint = {
  latitude: number;
  longitude: number;
};

type Location = {
  address: string;
  name: string;
  geoPoint: GeoPoint;
  customLocation?: string;
};

export type UserEventInfo = {
  eventId: string;
  myAttendeeId: string;
};

export type EventDetails = {
  bodyText: string;
  endDate: Timestamp;
  name: string;
  location: Location;
  id: string;
  startDate: Timestamp;
  attendeeIds: string[];
};

export type Attendee = {
  rsvpState: "going" | "notGoing" | "maybe" | "unknown";
  eventId: string;
  isHost: boolean;
  fullName: string;
  id: string;
  userId: string;
};

export type UserEvent = {
  eventDetails: EventDetails;
  myAttendeeDetails: Attendee;
}

export type CreateEventBody = {
    name: string,
    bodyText: string,
    startDate: string,
    endDate: string,
    location: {
        name: string
    },
}

export type UpdateRsvpBody = {
  rsvpState: string,
  eventId: string,
  attendeeId: string
}
