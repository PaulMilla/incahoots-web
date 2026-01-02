import { useEffect, useState } from "react";
import { Attendee, EventDetails, NewEventDetails } from "../types";
import { createGoogleMapsLink } from "../utils/googleMaps";
import { convertDateToFirestoreTimestamp, convertDateToLocalString, convertFirestoreTimestampToDateString } from "../utils/timestamps";
import { CalendarClock, Crown, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { LocationDetails } from "@/lib/locationService";

type EventDetailsCardProps = {
  eventDetails: EventDetails | NewEventDetails;
  eventHosts: Attendee[];
  isEditing: boolean | undefined;
  autoSave?: boolean;
  onFieldChange?: (field: string, value: unknown) => void;
};

const EventTime = ({ eventDetails, isEditing, autoSave, onFieldChange }: {
  eventDetails: EventDetails | NewEventDetails;
  isEditing: boolean | undefined;
  autoSave: boolean;
  onFieldChange?: (field: string, value: unknown) => void;
}) => {
  const initialEventStartDateTime = new Date(eventDetails.startDate.seconds * 1000);
  const [newStartTime, setNewEventTime] = useState<Date>(initialEventStartDateTime);
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal state from props if not focused and prop value changes
  useEffect(() => {
    if (!isFocused) {
      const propTimeMs = eventDetails.startDate.seconds * 1000;
      if (newStartTime.getTime() !== propTimeMs) {
        setNewEventTime(new Date(propTimeMs));
      }
    }
  }, [eventDetails.startDate.seconds, isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state to parent via onFieldChange
  useEffect(() => {
    const propTimeMs = eventDetails.startDate.seconds * 1000;
    if (newStartTime.getTime() !== propTimeMs) {
      if (autoSave && onFieldChange) {
        onFieldChange('startDate', convertDateToFirestoreTimestamp(newStartTime));
      }
    }
  }, [newStartTime, autoSave, onFieldChange, eventDetails.startDate.seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  const getTimeString = (eventTime: Date | undefined) => {
    return eventTime ? convertDateToLocalString(eventTime) : "";
  };

  const setNewEventTimeFromInput = (isoString: string) => {
    if (!isoString) return;
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
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
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

const EventLocation = ({ eventDetails, isEditing, autoSave, onFieldChange }: {
  eventDetails: EventDetails | NewEventDetails;
  isEditing: boolean | undefined;
  autoSave: boolean;
  onFieldChange?: (field: string, value: unknown) => void;
}) => {
  const locationlabel =
    eventDetails?.location?.customLocation ||
    eventDetails?.location?.name ||
    null;

  const mapsLink = eventDetails?.location?.address
    ? createGoogleMapsLink(eventDetails?.location.address)
    : null;

  const [newEventLocation, setNewEventLocation] = useState<string>(eventDetails?.location?.name ?? "");
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal state from props if not focused and prop value changes
  useEffect(() => {
    if (!isFocused) {
      const propLocationName = eventDetails?.location?.name ?? "";
      if (propLocationName !== newEventLocation) {
        setNewEventLocation(propLocationName);
      }
    }
  }, [eventDetails?.location?.name, isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state to parent via onFieldChange
  useEffect(() => {
    const propLocationName = eventDetails?.location?.name ?? "";
    if (newEventLocation !== propLocationName) {
      if (autoSave && onFieldChange) {
        // Construct minimal location object or preserve logic?
        // Existing logic:
        const updatedLocation = {
          ...(eventDetails.location || {}),
          name: newEventLocation
        };
        onFieldChange('location', updatedLocation);
      }
    }
  }, [newEventLocation, autoSave, onFieldChange, eventDetails.location]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLocationSelect = (location: LocationDetails) => {
    setNewEventLocation(location.name);
    if (autoSave && onFieldChange) {
      onFieldChange('location', {
        name: location.name,
        address: location.address,
        geoPoint: location.geoPoint,
      });
    }
  };

  return (
    <>
      {isEditing ? (
        <LocationAutocomplete
          value={newEventLocation}
          onChange={setNewEventLocation}
          onLocationSelect={handleLocationSelect}
          placeholder="Event Location"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
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

const EventHosts = ({ eventHosts }: { eventHosts: Attendee[] }) => {
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

const EventDescription = ({ eventDetails, isEditing, autoSave, onFieldChange }: {
  eventDetails: EventDetails | NewEventDetails;
  isEditing: boolean | undefined;
  autoSave: boolean;
  onFieldChange?: (field: string, value: unknown) => void;
}) => {
  const [newEventDescription, setNewEventDescription] = useState<string>(eventDetails.bodyText ?? "");
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal state from props if not focused and prop value changes
  useEffect(() => {
    if (!isFocused && eventDetails.bodyText !== undefined && eventDetails.bodyText !== newEventDescription) {
      setNewEventDescription(eventDetails.bodyText);
    }
  }, [eventDetails.bodyText, isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state to parent via onFieldChange
  useEffect(() => {
    if (eventDetails.bodyText !== newEventDescription) {
      if (autoSave && onFieldChange) {
        onFieldChange('bodyText', newEventDescription);
      }
    }
  }, [newEventDescription, autoSave, onFieldChange, eventDetails.bodyText]); // eslint-disable-line react-hooks/exhaustive-deps

  return isEditing ? (
    <Textarea
      placeholder="Describe your event here"
      value={newEventDescription}
      onChange={e => setNewEventDescription(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
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

export function EditableDetailsCard({ eventDetails, eventHosts, isEditing = false, autoSave = false, onFieldChange }: EventDetailsCardProps) {
  return (
    <div className="md:col-span-2 flex flex-col gap-2 p-6 bg-white border border-gray-200 rounded-lg shadow-sm ">
      <h3 className="text-lg font-semibold">Details</h3>
      <EventTime
        eventDetails={eventDetails}
        isEditing={isEditing}
        autoSave={autoSave}
        onFieldChange={onFieldChange}
      />
      <EventLocation
        eventDetails={eventDetails}
        isEditing={isEditing}
        autoSave={autoSave}
        onFieldChange={onFieldChange}
      />
      <EventHosts eventHosts={eventHosts} />
      <EventDescription
        eventDetails={eventDetails}
        isEditing={isEditing}
        autoSave={autoSave}
        onFieldChange={onFieldChange}
      />
    </div>
  )
}

type EditableEventTitleProps = {
  eventDetails: EventDetails | NewEventDetails;
  isEditing: boolean;
  autoSave?: boolean;
  onFieldChange?: (field: string, value: unknown) => void;
};

const EventTitle = ({ eventDetails, isEditing, autoSave, onFieldChange }: EditableEventTitleProps) => {
  const [newEventName, setNewEventName] = useState<string>(eventDetails.name ?? "");
  const [isFocused, setIsFocused] = useState(false);

  // Sync internal state from props if not focused and prop value changes
  useEffect(() => {
    if (!isFocused && eventDetails.name !== undefined && eventDetails.name !== newEventName) {
      setNewEventName(eventDetails.name);
    }
  }, [eventDetails.name, isFocused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state to parent via onFieldChange
  useEffect(() => {
    if (eventDetails.name !== newEventName) {
      if (autoSave && onFieldChange) {
        onFieldChange('name', newEventName);
      }
    }
  }, [newEventName, autoSave, onFieldChange, eventDetails.name]); // eslint-disable-line react-hooks/exhaustive-deps

  return isEditing ? (
    <Input
      type="text"
      placeholder="Event Title"
      value={newEventName}
      onChange={e => setNewEventName(e.target.value)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      className="text-5xl font-medium tracking-tight px-0 py-0 border-none shadow-none focus:ring-0 focus:border-transparent bg-transparent"
      style={{ lineHeight: "1.2" }}
    />
  ) : (
    <h1 className="text-5xl font-medium tracking-tight">
      {eventDetails.name ?? "TODO: Invalid (empty) event name"}
    </h1>
  )
};

export function EditableEventTitle({ eventDetails, isEditing = false, autoSave = false, onFieldChange }: EditableEventTitleProps) {
  return (
    <EventTitle
      eventDetails={eventDetails}
      isEditing={isEditing}
      autoSave={autoSave}
      onFieldChange={onFieldChange}
    />
  )
}