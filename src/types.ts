/** Some types derived from the Firestore database schema.
 *
 * Aside: Wish there was a way to auto-generate these types from Firestore SDK itself 😪
 */

import { Timestamp } from "firebase/firestore";

export type EventStatus = 'planning' | 'published' | 'cancelled';

export type RsvpState = 'going' | 'notGoing' | 'maybe' | 'unknown' | 'pending';

type GeoPoint = {
  latitude: number;
  longitude: number;
};

type Location = {
  address?: string;
  name: string;
  geoPoint?: GeoPoint;
  customLocation?: string;
};

export type UserEventInfo = {
  eventId: string;
};

export type NewEventDetails = {
  name?: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  bodyText?: string;
  location?: Location;
  attendeeIds?: string[];
};

export type EventDetails = {
  id: string;
  name: string;
  bodyText: string;
  startDate: Timestamp;
  endDate: Timestamp;
  location: Location;
  attendeeIds: string[];
  status: EventStatus;
  // Primary host - the original event creator
  host: string;
  // Co-hosts - users invited to have editing permissions
  cohosts: string[];
  // Computed convenience field: [host, ...cohosts]
  hosts: string[];
  // DEPRECATED: Kept for backward compatibility during migration
  hostIds: string[];
};

export type Attendee = {
  id: string;
  userId: string;
  eventId: string;
  fullName: string;
  rsvpState: RsvpState;
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
    name: string,
    address?: string,
    geoPoint?: GeoPoint,
  },
  status?: EventStatus,
}

export type UpdateEventBody = CreateEventBody & { id: string }

export type UpdateRsvpBody = {
  rsvpState: string,
  eventId: string,
}

export type EventInvitesBody = {
  eventId: string;
  newAttendees: AttendeeInvite[];
}

export type AttendeeInvite = {
  isHost: boolean;
  fullName: string;
  phoneNumber: string;
  email: string;
}