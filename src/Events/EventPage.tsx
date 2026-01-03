import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventAttendeesPublisher, getEventDetailsPublisher } from "../lib/firestore";
import { filterNullish } from "../lib/rxjs";
import { Attendee, EventDetails, RsvpState, UpdateEventBody, UpdateRsvpBody } from "../types";
import { convertFirestoreTimestampToIsoString } from "../utils/timestamps";
import NavigationBar from "../NavigationBar";
import { map } from 'rxjs'
import * as api from "../lib/inCahootsApi";
import { useAuth } from "../auth/FirebaseAuthContext";
import { InviteModal } from "./InviteModal";
import { UploadPhotosModal } from "./UploadPhotosModal";
import { getEventPhotos } from "@/lib/firebaseStorage";
import { DownloadPhotosModal } from "./DownloadPhotosModal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Loader2Icon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableDetailsCard, EditableEventTitle } from "./EditableDetailsCard";
import { PlanningModeBanner } from '../components/PlanningModeBanner';
import { DeleteDraftDialog } from '../components/DeleteDraftDialog';
import { CancelledEventBanner } from '../components/CancelledEventBanner';
import { PlanningAccessDenied } from '../components/PlanningAccessDenied';
import { CoHostManager } from '../components/CoHostManager';
import { NotifyGuestsDialog } from '../components/NotifyGuestsDialog';
import { useAutoSave } from '../hooks/useAutoSave';

type CategorizedAttendees = {
  hosts: Attendee[];
  goingList: Attendee[];
  notGoingList: Attendee[];
  maybeList: Attendee[];
  unknownList: Attendee[];
};

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
  pending: { ariaLabel: "pending", emoji: "⏳" },
});

function AttendeeList({ attendees }: { attendees: Attendee[] }) {
  return (
    <ol className="flex flex-col gap-1 mt-2">
      {attendees.map((attendee) => {
        // Defensive fallback for unknown rsvpState values
        const rsvpInfo = RSVP_STATES[attendee.rsvpState] || RSVP_STATES.unknown;
        const { ariaLabel, emoji } = rsvpInfo;
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

function MediaCard({ eventId, eventPhotos }: { eventId: string, eventPhotos: string[] }) {
  return (
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
  );
}

function RSVPDropdown({ eventId }: { eventId: string }) {
  const onRsvpSelected = async (rsvpSelected: RsvpState) => {
    if (!eventId) {
      console.log(`eventId is undefined`);
      return;
    }

    const body: UpdateRsvpBody = {
      eventId: eventId,
      rsvpState: rsvpSelected,
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
        <DropdownMenuItem onClick={() => onRsvpSelected('going')}>Going</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRsvpSelected('notGoing')}>Not Going</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRsvpSelected('maybe')}>Maybe</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
};

type RsvpCardProps = {
  eventId: string,
  categorizedAttendees: CategorizedAttendees
}
function RsvpCard({ eventId, categorizedAttendees }: RsvpCardProps) {
  return (
    <div className="md:col-span-1 p-6 bg-white border border-gray-200 rounded-lg shadow-sm ">

      <div className="flex justify-between">
        <h3 className="text-lg font-semibold">Guests</h3>
        <div className="flex justify-right">
          <InviteModal eventId={eventId} />
          {eventId && (
            <RSVPDropdown eventId={eventId} />
          )}
        </div>
      </div>

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
  );
}

function SettingsDropdown({ isEditing, onEditEventClicked: onEditEventClicked }: { isEditing: boolean, onEditEventClicked: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {!isEditing && (
          <DropdownMenuItem onClick={onEditEventClicked}>Edit Event</DropdownMenuItem>
        )}
        {isEditing && (
          <DropdownMenuItem onClick={() => alert("TODO: Popup with 'are you sure?' dialog")}>Delete Event</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
};

export default function EventPage() {
  const [eventDetails, setEventDetails] = useState<EventDetails>();
  const [newEventDetails, setNewEventDetails] = useState<EventDetails>();
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

  // Planning mode state
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [pendingEventUpdate, setPendingEventUpdate] = useState<UpdateEventBody | null>(null);

  // pull eventId from URL params
  const { eventId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mode detection
  const currentUserId = user?.uid;
  const isPlanning = eventDetails?.status === 'planning';
  const isCancelled = eventDetails?.status === 'cancelled';
  const isHost = eventDetails?.hosts?.includes(currentUserId || '') || false;

  // fetch event details and attendees by eventId
  useEffect(() => {
    if (!eventId) {
      console.error("Event id not found in query params");
      return;
    }

    const eventDetailsSubscription = getEventDetailsPublisher(eventId)
      .subscribe(eventDetails => {
        setEventDetails(eventDetails)
        document.title = `${eventDetails?.name || "Event Details"} | InCahoots`;
      })

    /** TODO investigate if there's a way to cascade fetch,
     * cause in theory we can grab the attendee details info
     * inline in one network request, not have to do two
     */
    const attendeesSubscription = getEventAttendeesPublisher(eventId)
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
            // Check if attendee is a host using eventDetails.hosts
            // Note: eventDetails might be stale here if this stream emits first.
            const isAttendeeHost = eventDetails?.hosts?.includes(attendee.userId) || false;
            if (isAttendeeHost) {
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

    // Cleanup subscriptions on unmount or when dependencies change
    return () => {
      eventDetailsSubscription.unsubscribe();
      attendeesSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, user?.uid]); // Note: eventDetails dependency removed to avoid weird loops, but might cause stale host check in reducer

  const toggleEditMode = () => {
    if (!isEditing) {
      const deepCopy = JSON.parse(JSON.stringify(eventDetails));
      console.log(`Setting new event details`, deepCopy);
      setNewEventDetails(deepCopy);
      setIsEditing(true);
    } else {
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

        // For published events, show notification dialog
        if (eventDetails?.status === 'published') {
          setPendingEventUpdate(updateEventBody);
          setShowNotifyDialog(true);
        } else {
          api.updateEvent(updateEventBody);
        }
      }
      setIsEditing(false);
    }
  };

  const handleNotifyGuests = async (notify: boolean) => {
    setShowNotifyDialog(false);
    if (pendingEventUpdate) {
      await api.updateEvent(pendingEventUpdate);
      // TODO: Implement actual notification logic when notify is true
      if (notify) {
        console.log('TODO: Send notifications to guests');
      }
      setPendingEventUpdate(null);
    }
  };

  const discardEditChanges = () => {
    console.debug("Discarding newEventDetails changes: ", newEventDetails);
    console.debug("eventDetails: ", eventDetails);
    setNewEventDetails(undefined);
    setIsEditing(false);
  };

  // Planning mode handlers
  async function handlePublish() {
    if (!eventDetails?.id) return;
    setIsPublishing(true);
    try {
      const result = await api.publishEvent(eventDetails.id);
      if (!result.success) {
        alert(result.error || 'Failed to publish');
      }
      // Event will update via subscription
    } catch (err) {
      console.error('Publish failed:', err);
      alert('Failed to publish event');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleDelete() {
    if (!eventDetails?.id) return;
    setIsDeleting(true);
    try {
      const result = await api.deleteEvent(eventDetails.id);
      if (result.success) {
        navigate('/events');
      } else {
        alert(result.error || 'Failed to delete');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete event');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }

  // Auto-save for planning mode (uses direct Firestore writes) or published events (uses API)
  const { queueChange } = useAutoSave({
    eventId: eventDetails?.id || '',
    debounceMs: 500,
    useDirect: isPlanning, // Direct Firestore writes for planning mode, API for published events
    onSaveError: (err) => console.error('Auto-save failed:', err),
  });

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queueChange(field as any, value);
  }, [queueChange]);

  const handleManualFieldChange = useCallback((field: string, value: unknown) => {
    setNewEventDetails(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [field]: value
      };
    });
  }, []);

  // Check access for planning events
  if (isPlanning && !isHost) {
    return <PlanningAccessDenied />;
  }

  return (
    <>
      {/* Banners */}
      {isPlanning && isHost && (
        <PlanningModeBanner
          onPublish={handlePublish}
          onDelete={() => setShowDeleteDialog(true)}
          isPublishing={isPublishing}
        />
      )}
      {isCancelled && <CancelledEventBanner />}

      {/* Delete confirmation dialog */}
      <DeleteDraftDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />

      {/* Notify guests dialog */}
      <NotifyGuestsDialog
        open={showNotifyDialog}
        onOpenChange={setShowNotifyDialog}
        onConfirm={handleNotifyGuests}
      />

      <NavigationBar />
      <div className="max-w-(--breakpoint-xl) mx-auto text-gray-700 px-5 mt-8">
        {eventDetails ? (
          <section>
            <div className="flex justify-between">
              <EditableEventTitle
                eventDetails={(isEditing && newEventDetails) ? newEventDetails : eventDetails}
                isEditing={isPlanning || isEditing}
                autoSave={isPlanning}
                onFieldChange={isPlanning ? handleFieldChange : handleManualFieldChange}
              />
              <div className="flex justify-right gap-2">
                {isEditing && !isPlanning && (
                  <>
                    <Button onClick={toggleEditMode}>Save Changes</Button>
                    <Button variant="destructive" onClick={discardEditChanges}>Discard Changes</Button>
                  </>
                )}
                {isHost && eventId && (
                  <CoHostManager
                    eventId={eventId}
                    hosts={eventDetails.hosts}
                    host={eventDetails.host}
                    attendees={[...categorizedAttendees.hosts, ...categorizedAttendees.goingList, ...categorizedAttendees.notGoingList, ...categorizedAttendees.maybeList, ...categorizedAttendees.unknownList]}
                    currentUserId={currentUserId || ''}
                  />
                )}
                {!isPlanning && <SettingsDropdown isEditing={isEditing} onEditEventClicked={toggleEditMode} />}
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              <EditableDetailsCard
                eventDetails={(isEditing && newEventDetails) ? newEventDetails : eventDetails}
                eventHosts={categorizedAttendees.hosts}
                isEditing={isPlanning || isEditing}
                autoSave={isPlanning}
                onFieldChange={isPlanning ? handleFieldChange : handleManualFieldChange}
              />
              {eventId && (
                <RsvpCard
                  eventId={eventId}
                  categorizedAttendees={categorizedAttendees}
                />
              )}
              {eventId && (
                <MediaCard eventId={eventId} eventPhotos={eventPhotos} />
              )}
            </div>
          </section>
        ) : (
          <Loader2Icon className="animate-spin" />
        )}
      </div>
    </>
  );
}
