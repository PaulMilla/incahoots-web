import { RsvpState, UpdateRsvpBody, UserEvent } from "../types";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Crown, Settings } from "lucide-react";
import * as api from "../lib/inCahootsApi";

export function EventCard({ event }: { event: UserEvent }) {
    const navigate = useNavigate();

    const SettingsDropdown = () => {
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
    };

  const RsvpDropdown = () => {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {event.myAttendeeDetails.rsvpState}
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
              disabled={event.myAttendeeDetails.rsvpState === state}
              onClick={async () => await updateEventRsvp(eventDetails.id, event.myAttendeeDetails.id, state)}
            >
              {state}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const onViewEvent = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const updateEventRsvp = async (eventId: string, attendeeId: string, newState: string) => {
    const body: UpdateRsvpBody = {
      eventId: eventId,
      rsvpState: newState,
      attendeeId: attendeeId,
    };
    await api.updateRsvp(body);
  };

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
        <div className="mb-2 flex items-center gap-2">
          <span className="font-semibold">RSVP:</span>
          <RsvpDropdown />
        </div>
        <div>
          <span className="font-semibold">Location:</span>{" "}
          {eventDetails.location.name ?? "No location specified"}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="link" onClick={() => onViewEvent(event.eventDetails.id)}>
          View Event
        </Button>
      </CardFooter>
    </Card>
  );
}
