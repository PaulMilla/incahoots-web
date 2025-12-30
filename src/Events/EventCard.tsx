import { Attendee, RsvpState, UpdateRsvpBody, UserEvent } from "../types";
import { Link } from "react-router-dom";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Crown, Settings } from "lucide-react";
import * as api from "../lib/inCahootsApi";

function SettingsDropdown() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="size-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => alert("TODO: Popup with 'are you sure?' dialog")}>Delete Event</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RsvpDropdown({ attendeeDetails }: { attendeeDetails: Attendee }) {
  const updateEventRsvp = async (eventId: string, newState: string) => {
    const body: UpdateRsvpBody = {
      eventId: eventId,
      rsvpState: newState,
    };
    await api.updateRsvp(body);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {attendeeDetails.rsvpState}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {[
          'going',
          'notGoing',
          'maybe'
        ].map((state) => (
          <DropdownMenuItem
            key={state}
            disabled={attendeeDetails.rsvpState === state}
            onClick={async () => await updateEventRsvp(attendeeDetails.eventId, state)}
          >
            {state}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EventCard({ event }: { event: UserEvent }) {
  const eventDetails = event.eventDetails;
  const isHost = eventDetails.hostIds?.includes(event.myAttendeeDetails.userId) || false;
  const isPlanning = eventDetails.status === 'planning';
  const isCancelled = eventDetails.status === 'cancelled';

  return (
    <Card className={isCancelled ? 'opacity-50' : ''}>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>
            <Link to={`/events/${eventDetails.id}`}>
              <div className="flex items-center gap-2">
                {isHost && (<Crown />)}
                <h1 className="text-2xl font-medium tracking-tight">
                  {eventDetails.name ?? "TODO: Invalid (empty) event name"}
                </h1>
                {isPlanning && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                    Draft
                  </span>
                )}
                {isCancelled && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                    Cancelled
                  </span>
                )}
              </div>
            </Link>
          </CardTitle>
          <CardDescription>
            {eventDetails.startDate.seconds == eventDetails.endDate.seconds ? (
              <>
                {eventDetails.startDate.toDate().toLocaleString()}
              </>
            ) : (
              <>
                {eventDetails.startDate.toDate().toLocaleString()} &ndash; {eventDetails.endDate.toDate().toLocaleString()}
              </>
            )}
          </CardDescription>
        </div>
        <CardAction>
          <SettingsDropdown />
        </CardAction>
      </CardHeader>
      <CardContent>
        {/* RSVP state */}
        <div className="mb-2 flex items-center gap-2">
          <span className="font-semibold">RSVP:</span>
          <RsvpDropdown attendeeDetails={event.myAttendeeDetails} />
        </div>
        {/* Location info */}
        <div>
          <span className="font-semibold">Location:</span>{" "}
          {eventDetails.location.name ?? "No location specified"}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="link" asChild>
          <Link to={`/events/${event.eventDetails.id}`}>
            View Event
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
