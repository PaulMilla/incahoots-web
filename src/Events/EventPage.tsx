import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEventAttendeesPublisher, getEventDetailsPublisher, getMyAttendeeId } from "../lib/firestore";
import { filterNullish } from "../lib/rxjs";
import { Attendee, EventDetails, UpdateEventBody, UpdateRsvpBody } from "../types";
import { createGoogleMapsLink } from "../utils/googleMaps";
import { convertDateToFirestoreTimestamp, convertDateToLocalString, convertFirestoreTimestampToDateString, convertFirestoreTimestampToIsoString } from "../utils/timestamps";
import NavigationBar from "../NavigationBar";
import { map } from 'rxjs'
import * as api from "../lib/inCahootsApi";
import { useAuth } from "../auth/FirebaseAuthContext";
import { InviteModal } from "./InviteModal";
import { UploadPhotosModal } from "./UploadPhotosModal";
import { getEventPhotos } from "@/lib/firebaseStorage";
import { DownloadPhotosModal } from "./DownloadPhotosModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CalendarClock, ChevronDown, Crown, Loader2Icon, MapPin, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CategorizedAttendees = {
  hosts: Attendee[];
  goingList: Attendee[];
  notGoingList: Attendee[];
  maybeList: Attendee[];
  unknownList: Attendee[];
};

enum RsvpState {
  going = "going",
  notGoing = "notGoing",
  maybe = "maybe",
  unknown = "unknown"
}

const RSVP_STATES: {
  [key: string]: {
    ariaLabel: string;
    emoji: string;
  };
} = Object.freeze({
  going: { ariaLabel: "going", emoji: "✅" },
  notGoing: { ariaLabel: "not going", emoji: "❌" },
  maybe: { ariaLabel: "maybe", emoji: "❓" },
  unknown: { ariaLabel: "unknown", emoji: "🤷‍♀️" },
});

function AttendeeList({ attendees }: { attendees: Attendee[] }) {
  return (
    <ol className="flex flex-col gap-1 mt-2">
      {attendees.map((attendee) => {
        const { ariaLabel, emoji } = RSVP_STATES[attendee.rsvpState];
        return (
          <li
            className="min-w-fit"
            key={attendee.id}
            aria-label={`${attendee.fullName} is ${ariaLabel}`}
          >
            <span>{emoji}</span>
            <span className="ml-1">{attendee.fullName}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function EventPage() {
  const [eventDetails, setEventDetails] = useState<EventDetails>();
  const [newEventDetails, setNewEventDetails] = useState<EventDetails>();
  const [myAttendeeId, setMyAttendeeId] = useState<string>();
  const [eventPhotos, setEventPhotos] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [categorizedAttendees, setCategorizedAttendees] =
    useState<CategorizedAttendees>({
      hosts: [],
      goingList: [],
      notGoingList: [],
      maybeList: [],
      unknownList: [],
    });

  // pull eventId from URL params
  const { eventId } = useParams();
  const { user } = useAuth();

  // fetch event details and attendees by eventId
  useEffect(() => {
    if (!eventId) {
      console.error("Event id not found in query params");
      return;
    }

    getEventDetailsPublisher(eventId)
    .subscribe(eventDetails => {
      console.log(`eventDetails:`, eventDetails);
      setEventDetails(eventDetails)
      document.title = `${
        eventDetails?.name || "Event Details"
      } | InCahoots`;
    })

    /** TODO investigate if there's a way to cascade fetch,
     * cause in theory we can grab the attendee details info
     * inline in one network request, not have to do two
     */
    getEventAttendeesPublisher(eventId)
    .pipe(
      filterNullish(),
      map(eventAttendees => {
        const initialValue: CategorizedAttendees = {
            hosts: [],
            goingList: [],
            notGoingList: [],
            maybeList: [],
            unknownList: [],
          }
        const categorizedAttendees = eventAttendees.reduce((acc, attendee) => {
            if (attendee.isHost) {
              acc.hosts.push(attendee);
            }

            if (attendee.rsvpState === "going") {
              acc.goingList.push(attendee);
            } else if (attendee.rsvpState === "notGoing") {
              acc.notGoingList.push(attendee);
            } else if (attendee.rsvpState === "maybe") {
              acc.maybeList.push(attendee);
            } else {
              acc.unknownList.push(attendee);
            }
            return acc;
          },
          initialValue
        )
        return categorizedAttendees
      })
    )
    .subscribe(categorizedAttendees => {
      setCategorizedAttendees(categorizedAttendees);
    })

    getEventPhotos(eventId)
    .then(setEventPhotos)

    getMyAttendeeId(user?.uid, eventId)
    .then(setMyAttendeeId);
  }, [eventId, user]);

  const EventTitle = () => {
    const [newEventTitle, setNewEventTitle] = useState<string>(newEventDetails?.name ?? "");

    useEffect(() => {
      if (newEventDetails) {
        newEventDetails.name = newEventTitle;
        setNewEventDetails(newEventDetails);
      }
    }, [newEventTitle]);

    return (
      <>
      {isEditing ? (
        <Input type="text" placeholder="Event Title" value={newEventTitle} size={3} onChange={e => setNewEventTitle(e.target.value)} />
      ) : (
        <h1 className="text-5xl font-medium tracking-tight">
          {eventDetails?.name}
        </h1>
      )}
      </>
    )
  };

  const RSVPDropdown = () => {
   const onRsvpSelected = async (rsvpSelected: RsvpState) => {
      if (!eventId) {
        console.log(`eventId is undefined`);
        return;
      }

      if (!myAttendeeId) {
        console.log(`myAttendeeId is undefined`);
        return;
      }

      const body: UpdateRsvpBody = {
        eventId: eventId,
        rsvpState: rsvpSelected,
        attendeeId: myAttendeeId,
      };
      await api.updateRsvp(body)
    } 

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center">
            RSVP <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => onRsvpSelected(RsvpState.going)}>Going</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRsvpSelected(RsvpState.notGoing)}>Not Going</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRsvpSelected(RsvpState.maybe)}>Maybe</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  };

  const DetailsCard = () => {

    const EventTime = () => {
      const eventStartDateTime = newEventDetails ? new Date(newEventDetails.startDate.seconds * 1000) : undefined;
      const [newStartTime, setNewEventTime] = useState<Date | undefined>(eventStartDateTime);

      useEffect(() => {
        if (newEventDetails && newStartTime) {
          newEventDetails.startDate = convertDateToFirestoreTimestamp(newStartTime);
          setNewEventDetails(newEventDetails);
        }
      }, [newStartTime]);

      const getTimeString = (eventTime: Date | undefined) => {
        return eventTime ? convertDateToLocalString(eventTime) : "";
      };

      const setNewEventTimeFromInput = (isoString: string) => {
        console.log(`InputString: ${isoString}`);
        setNewEventTime(new Date(isoString));
      };

      return (
        <>
          {isEditing ? (
            <>
              <div className="flex gap-2 items-center">
                <Label htmlFor="start-date-picker" className="px-1"><CalendarClock /></Label>
                <Input
                  type="datetime-local"
                  id="start-date-picker"
                  value={getTimeString(newStartTime)}
                  onChange={e => setNewEventTimeFromInput(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="flex gap-2 items-center">
              <CalendarClock />
              {convertFirestoreTimestampToDateString(eventDetails?.startDate.seconds ?? 0)}
            </div>
          )}
        </>
      )
    };

    const EventLocation = () => {
      // precedence of location label: customLocation > name
      const locationlabel =
        eventDetails?.location.customLocation ||
        eventDetails?.location.name ||
        null;

      const mapsLink = eventDetails?.location.address
        ? createGoogleMapsLink(eventDetails?.location.address)
        : null;

      const [newEventLocation, setNewEventLocation] = useState<string>(newEventDetails?.location.name ?? "");

      useEffect(() => {
        if (newEventDetails) {
          newEventDetails.location.name = newEventLocation;
          setNewEventDetails(newEventDetails);
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
                <a href={mapsLink}>{eventDetails?.location.name}</a>
              ) : (
                <span>{locationlabel}</span>
              )}
            </div>
          )}
        </>
      )
    };

    const EventHosts = () => {
      return (
        <div className="flex gap-2 items-center">
          <Crown />
          Hosted by{" "}
          {categorizedAttendees.hosts
            .map((host) => host.fullName)
            .join(", ")}
        </div>
      )
    };

    const EventDescription = () => {
      const [newEventDescription, setNewEventDescription] = useState<string>(newEventDetails?.bodyText ?? "");

      useEffect(() => {
        if (newEventDetails) {
          newEventDetails.bodyText = newEventDescription;
          setNewEventDetails(newEventDetails);
        }
      }, [newEventDescription]);

      return (
        <>
        {isEditing ? (
          <Textarea value={newEventDescription} onChange={e => setNewEventDescription(e.target.value)} />
        ) : (
          <div>
            {eventDetails && eventDetails.bodyText && (
              <div>
                <p className="mt-3 text-sm max-w-3xl text-gray-600">
                  {eventDetails.bodyText}
                </p>
              </div>
            )}
          </div>
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
  };

  const SettingsDropdown = () => {
    const onClickEdit = () => {
      if (isEditing) {
        console.log("TODO: Check if anything has changed between newEventDetails and eventDetails")
        console.log("TODO: Check if all new changes are valid (e.g. new title can't be empty)")

        // setEventDetails(newEventDetails)
        if (newEventDetails) {
          const updateEventBody = {
            id: newEventDetails.id,
            name: newEventDetails.name,
            bodyText: newEventDetails.bodyText,
            startDate: convertFirestoreTimestampToIsoString(newEventDetails.startDate),
            endDate: convertFirestoreTimestampToIsoString(newEventDetails.endDate),
            location: {
              name: newEventDetails.location.name,
              address: newEventDetails.location.address,
              geoPoint: newEventDetails.location.geoPoint,
            }, 
          } as UpdateEventBody;

          console.debug("Sending updateEventBody", updateEventBody);

          api.updateEvent(updateEventBody);
        }
        setIsEditing(false);
      } else {
        console.log(`Setting new event details`, eventDetails);
        setNewEventDetails(eventDetails);
        setIsEditing(true);
      }
    };

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={onClickEdit}>Edit</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  };

  return (
    <>
      <NavigationBar />
      <div className="max-w-(--breakpoint-xl) mx-auto text-gray-700 px-5 mt-8">
        {eventDetails ? (
          <section>
            <div className="flex justify-between">
              <EventTitle />
              <div className="flex justify-right">
                <InviteModal eventId={eventId} />
                <RSVPDropdown />
                <SettingsDropdown />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <DetailsCard />
              {/* RSVP card */}
              <div className="md:col-span-1 p-6 bg-white border border-gray-200 rounded-lg shadow-sm ">
                <h3 className="text-lg font-semibold">Guests</h3>
                <div className="mt-2 flex gap-2 items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 384 512"
                    width={16}
                    height={16}
                  >
                    <path d="M320 64H280h-9.6C263 27.5 230.7 0 192 0s-71 27.5-78.4 64H104 64C28.7 64 0 92.7 0 128V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64zM80 112v24c0 13.3 10.7 24 24 24h88 88c13.3 0 24-10.7 24-24V112h16c8.8 0 16 7.2 16 16V448c0 8.8-7.2 16-16 16H64c-8.8 0-16-7.2-16-16V128c0-8.8 7.2-16 16-16H80zm88-32a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zm3.3 155.3c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0L112 249.4 99.3 236.7c-6.2-6.2-16.4-6.2-22.6 0s-6.2 16.4 0 22.6l24 24c6.2 6.2 16.4 6.2 22.6 0l48-48zM192 272c0 8.8 7.2 16 16 16h64c8.8 0 16-7.2 16-16s-7.2-16-16-16H208c-8.8 0-16 7.2-16 16zm-32 96c0 8.8 7.2 16 16 16h96c8.8 0 16-7.2 16-16s-7.2-16-16-16H176c-8.8 0-16 7.2-16 16zm-48 24a24 24 0 1 0 0-48 24 24 0 1 0 0 48z" />
                  </svg>
                  {categorizedAttendees.goingList.length} going,{" "}
                  {categorizedAttendees.notGoingList.length} not going,{" "}
                  {categorizedAttendees.maybeList.length} maybe,{" "}
                  {categorizedAttendees.unknownList.length} unknown
                </div>
                <div className="flex flex-wrap gap-1">
                  <AttendeeList attendees={categorizedAttendees.goingList} />
                  <AttendeeList attendees={categorizedAttendees.notGoingList} />
                  <AttendeeList attendees={categorizedAttendees.maybeList} />
                  <AttendeeList attendees={categorizedAttendees.unknownList} />
                </div>
              </div>
              {/* Photos card */}
              <div className="md:col-span-1 p-6 bg-white border border-gray-200 rounded-lg shadow-sm ">
                <h3 className="text-lg font-semibold">Photos</h3>
                <UploadPhotosModal eventId={eventId!} />
                <DownloadPhotosModal eventId={eventId!} />
                {eventPhotos.length > 0 ? (
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {eventPhotos.map((photoUrl, index) => (
                      <img
                        key={index}
                        src={photoUrl}
                        alt={`Event photo ${index + 1}`}
                        className="w-full h-auto rounded-md object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-600">
                    No photos uploaded yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <Loader2Icon className="animate-spin" />
        )}
      </div>
    </>
  );
}
