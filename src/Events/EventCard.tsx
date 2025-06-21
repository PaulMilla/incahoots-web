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
  const updateEventRsvp = async (eventId: string, attendeeId: string, newState: string) => {
    const body: UpdateRsvpBody = {
      eventId: eventId,
      rsvpState: newState,
      attendeeId: attendeeId,
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
          RsvpState.going,
          RsvpState.notGoing,
          RsvpState.maybe
        ].map((state) => (
          <DropdownMenuItem
            key={state}
            disabled={attendeeDetails.rsvpState === state}
            onClick={async () => await updateEventRsvp(attendeeDetails.eventId, attendeeDetails.id, state)}
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
  const isHost = event.myAttendeeDetails.isHost;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>
            <Link to={`/events/${eventDetails.id}`}>
              <h1 className="text-2xl font-medium tracking-tight flex items-center gap-2">
                {isHost && (<Crown />)}
                {eventDetails.name ?? "TODO: Invalid (empty) event name"}
              </h1>
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
