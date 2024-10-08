import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEventAttendeesPublisher, getEventDetailsPublisher, getMyAttendeeId } from "./lib/firestore";
import { filterNullish } from "./lib/rxjs";
import { Attendee, EventDetails, UpdateRsvpBody } from "./types";
import { createGoogleMapsLink } from "./utils/googleMaps";
import { convertFirestoreTimestampToDate } from "./utils/timestamps";
import NavigationBar from "./NavigationBar";
import { map } from 'rxjs'
import * as api from "./lib/inCahootsApi";
import { useAuth } from "./auth/FirebaseAuthContext";

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

function LoadingSpinner() {
  return (
    <div role="status">
      <svg
        aria-hidden="true"
        className="w-8 h-8 text-gray-200 animate-spin  fill-blue-600"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default function EventPage() {
  const [eventDetails, setEventDetails] = useState<EventDetails>();
  const [myAttendeeId, setMyAttendeeId] = useState<string>();
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
      console.log(`eventDetails: ${JSON.stringify(eventDetails)}`);
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


    getMyAttendeeId(user?.uid, eventId)
    .then(setMyAttendeeId);
  }, [eventId, user]);

  // precedence of location label: customLocation > name
  const locationlabel =
    eventDetails?.location.customLocation ||
    eventDetails?.location.name ||
    null;
  const mapsLink = eventDetails?.location.address
    ? createGoogleMapsLink(eventDetails?.location.address)
    : null;

  function RSVPButtonDropdown() {
    // TODO hook up functionality to change RSVP state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    async function onRsvpSelected(rsvpSelected: RsvpState) {
      setIsDropdownOpen(false);

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
      <div className="relative">
        <button
          id="dropdownDefaultButton"
          data-dropdown-toggle="dropdown"
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
          type="button"
          onClick={() => setIsDropdownOpen((isDropdownOpen) => !isDropdownOpen)}
        >
          RSVP
          <svg
            className="w-2.5 h-2.5 ms-3"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 10 6"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 4 4 4-4"
            />
          </svg>
        </button>

        {isDropdownOpen && (
          // TODO improve keyboard support, esc to close, outside click to close, arrow keys, accessibility stuff
          <div
            id="dropdown"
            className="absolute top-11 right-0 z-10 bg-white divide-y divide-gray-100 rounded-lg shadow w-44"
          >
            <ul
              className="py-2 text-sm text-gray-700 "
              aria-labelledby="dropdownDefaultButton"
            >
              <li className="px-4 py-2 hover:bg-gray-100" onClick={() => onRsvpSelected(RsvpState.going)}>Going</li>
              <li className="px-4 py-2 hover:bg-gray-100" onClick={() => onRsvpSelected(RsvpState.notGoing)}>Not going</li>
              <li className="px-4 py-2 hover:bg-gray-100" onClick={() => onRsvpSelected(RsvpState.maybe)}>Maybe</li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <NavigationBar />
      <div className="max-w-screen-xl mx-auto text-gray-700 px-5 mt-8">
        {eventDetails ? (
          <section className="">
            <div className="flex justify-between">
              <h1 className="text-5xl font-medium tracking-tight">
                {eventDetails?.name}
              </h1>
              <RSVPButtonDropdown />
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* details card */}
              <div className="md:col-span-2 flex flex-col gap-2 p-6 bg-white border border-gray-200 rounded-lg shadow ">
                <h3 className="text-lg font-semibold">Details</h3>
                <div className="flex gap-2 items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 512 512"
                    width={16}
                    height={16}
                  >
                    <path d="M464 256A208 208 0 1 1 48 256a208 208 0 1 1 416 0zM0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z" />
                  </svg>
                  {convertFirestoreTimestampToDate(
                    eventDetails?.startDate.seconds
                  )}
                </div>

                {locationlabel && (
                  <div className="flex gap-2 items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 384 512"
                      width={16}
                      height={16}
                    >
                      <path d="M224 208H129.4l241.4-98.7L272 350.6V256c0-26.5-21.5-48-48-48zm-48 48h48v48V432c0 15.3 10.8 28.4 25.8 31.4s30-5.1 35.8-19.3l144-352c4.9-11.9 2.1-25.6-7-34.7s-22.8-11.9-34.7-7l-352 144c-14.2 5.8-22.2 20.8-19.3 35.8s16.1 25.8 31.4 25.8H176z" />
                    </svg>

                    {mapsLink ? (
                      <a href={mapsLink}>{eventDetails?.location.name}</a>
                    ) : (
                      <span>{locationlabel}</span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 448 512"
                    width={16}
                    height={16}
                  >
                    <path d="M304 128a80 80 0 1 0 -160 0 80 80 0 1 0 160 0zM96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM49.3 464H398.7c-8.9-63.3-63.3-112-129-112H178.3c-65.7 0-120.1 48.7-129 112zM0 482.3C0 383.8 79.8 304 178.3 304h91.4C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3z" />
                  </svg>
                  Hosted by{" "}
                  {categorizedAttendees.hosts
                    .map((host) => host.fullName)
                    .join(", ")}
                </div>

                <div>
                  {eventDetails.bodyText && (
                    <div>
                      <p className="mt-3 text-sm max-w-3xl text-gray-600">
                        {eventDetails.bodyText}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* RSVP card */}
              <div className="md:col-span-1 p-6 bg-white border border-gray-200 rounded-lg shadow ">
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
            </div>
          </section>
        ) : (
          <LoadingSpinner />
        )}
      </div>
    </>
  );
}
