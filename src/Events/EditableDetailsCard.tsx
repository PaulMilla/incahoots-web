import { useEffect, useState } from "react";
import { Attendee, EventDetails, NewEventDetails } from "../types";
import { createGoogleMapsLink } from "../utils/googleMaps";
import { convertDateToFirestoreTimestamp, convertDateToLocalString, convertFirestoreTimestampToDateString } from "../utils/timestamps";
import { CalendarClock, Crown, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type EventDetailsCardProps = {
  eventDetails: EventDetails | NewEventDetails;
  eventHosts: Attendee[];
  isEditing: boolean | undefined;
};

export function EditableDetailsCard({ eventDetails, eventHosts, isEditing = false }: EventDetailsCardProps) {
  const EventTime = () => {
    const eventStartDateTime = new Date(eventDetails.startDate.seconds * 1000);
    const [newStartTime, setNewEventTime] = useState<Date>(eventStartDateTime);

    useEffect(() => {
      eventDetails.startDate = convertDateToFirestoreTimestamp(newStartTime);
    }, [newStartTime]);

    const getTimeString = (eventTime: Date | undefined) => {
      return eventTime ? convertDateToLocalString(eventTime) : "";
    };

    const setNewEventTimeFromInput = (isoString: string) => {
      setNewEventTime(new Date(isoString));
    };

    return (
      <>
        {isEditing ? (
          <div className="flex gap-2 items-center">
            <Label htmlFor="start-date-picker" className="px-1"><CalendarClock /></Label>
            <Input
              type="datetime-local"
              id="start-date-picker"
              value={getTimeString(newStartTime)}
              onChange={e => setNewEventTimeFromInput(e.target.value)}
            />
          </div>
        ) : (
          <div className="flex gap-2 items-center">
            <CalendarClock />
            {convertFirestoreTimestampToDateString(eventDetails?.startDate?.seconds ?? 0)}
          </div>
        )}
      </>
    )
  };

  const EventLocation = () => {
    // precedence of location label: customLocation > name
    const locationlabel =
      eventDetails?.location?.customLocation ||
      eventDetails?.location?.name ||
      null;

    const mapsLink = eventDetails?.location?.address
      ? createGoogleMapsLink(eventDetails?.location.address)
      : null;

    const [newEventLocation, setNewEventLocation] = useState<string>(eventDetails?.location?.name ?? "");

    useEffect(() => {
      if (eventDetails) {
        if (eventDetails.location) {
          eventDetails.location.name = newEventLocation;
        } else {
          eventDetails.location = {
            name: newEventLocation
          }
        }
      }
    }, [newEventLocation]);

    return (
      <>
        {isEditing ? (
          <div className="flex gap-2 items-center">
            <MapPin />
            <Input type="text" placeholder="Event Location" value={newEventLocation} size={3} onChange={e => setNewEventLocation(e.target.value)} />
          </div>
        ) : locationlabel && (
          <div className="flex gap-2 items-center">
            <MapPin />

            {mapsLink ? (
              <a href={mapsLink}>{eventDetails?.location?.name ?? "TODO: Location Name?"}</a>
            ) : (
              <span>{locationlabel}</span>
            )}
          </div>
        )}
      </>
    )
  };

  const EventHosts = () => {
    return eventHosts.length > 0 && (
      <div className="flex gap-2 items-center">
        <Crown />
        Hosted by{" "}
        {eventHosts
          .map((host) => host.fullName)
          .join(", ")}
      </div>
    )
  };

  const EventDescription = () => {
    const [newEventDescription, setNewEventDescription] = useState<string>(eventDetails.bodyText ?? "");

    useEffect(() => {
      eventDetails.bodyText = newEventDescription;
    }, [newEventDescription]);

    return isEditing ? (
      <Textarea placeholder="Describe your event here" value={newEventDescription} onChange={e => setNewEventDescription(e.target.value)} />
    ) : (
      <>
        {(eventDetails && eventDetails.bodyText) ? (
          <div>
            <p className="mt-3 text-sm max-w-3xl text-gray-600">
              {eventDetails.bodyText}
            </p>
          </div>
        ) : (
          <p>Somebody messed up...</p>
        )}
      </>
    )
  };

  return (
    <div className="md:col-span-2 flex flex-col gap-2 p-6 bg-white border border-gray-200 rounded-lg shadow-sm ">
      <h3 className="text-lg font-semibold">Details</h3>
      <EventTime />
      <EventLocation />
      <EventHosts />
      <EventDescription />
    </div>
  )
}

type EditableEventTitleProps = {
  eventDetails: EventDetails | NewEventDetails;
  isEditing: boolean;
};

export function EditableEventTitle({ eventDetails, isEditing = false }: EditableEventTitleProps) {
  const EventTitle = () => {
    const [newEventName, setNewEventName] = useState<string>(eventDetails.name ?? "");

    useEffect(() => {
      eventDetails.name = newEventName;
    }, [newEventName]);

    return isEditing ? (
      <Input
        type="text"
        placeholder="Event Title"
        value={newEventName}
        onChange={e => setNewEventName(e.target.value)}
        className="text-5xl font-medium tracking-tight px-0 py-0 border-none shadow-none focus:ring-0 focus:border-transparent bg-transparent"
        style={{ lineHeight: "1.2" }}
      />
    ) : (
      <h1 className="text-5xl font-medium tracking-tight">
        {eventDetails.name ?? "TODO: Invalid (empty) event name"}
      </h1>
    )
  };

  // TODO: For some reason inlining <EventTitle /> causes the 'Discard Changes' & 'Edit' buttons to be weird
  return (
    <EventTitle />
  )
}