import { useState } from "react";
import { createEvent } from "../lib/inCahootsApi"
import { CreateEventBody, NewEventDetails } from "../types";
import { useNavigate } from "react-router-dom";
import NavigationBar from "../NavigationBar";
import { convertDateToFirestoreTimestamp, convertFirestoreTimestampToIsoString } from "@/utils/timestamps";
import { Button } from "@/components/ui/button";
import { EditableDetailsCard, EditableEventTitle } from "./EditableDetailsCard";

export default function NewEventPage() {
    const navigate = useNavigate();
    const [newEventDetails] = useState<NewEventDetails>(
        {
            // TODO: Use momentJS to default to the weekend
            startDate: convertDateToFirestoreTimestamp(new Date())
        }
    );

    async function onCreateNewEvent() {
        const validateNewEvent = (event: NewEventDetails) => {
            if (!(event.location?.name || event.location?.customLocation)) {
                console.error(`validation failed: event location is invalid`);
                return false;
            }

            return event;
        };

        try {
            if (!validateNewEvent(newEventDetails)) {
                console.debug(`TODO: react to invalid fields in new event`);
                return;
            }

            const body: CreateEventBody = {
                name: newEventDetails.name!,
                bodyText: newEventDetails.bodyText!,
                startDate: convertFirestoreTimestampToIsoString(newEventDetails.startDate),
                endDate: convertFirestoreTimestampToIsoString(newEventDetails.endDate ?? newEventDetails.startDate),
                location: {
                    name: newEventDetails.location?.name ?? newEventDetails.location?.customLocation ?? "oops, try again"
                }
            };
            const response = await createEvent(body);
            console.info(response);
            navigate(`/events/${response.eventId}`);
        } catch (error) {
            console.error(`Error after trying to create new event`, error);
        }
    }

    return (
        <>
            <NavigationBar />
            <div className="py-8 px-4 mx-auto max-w-(--breakpoint-xl) text-left lg:py-16">
                <EditableEventTitle
                    eventDetails={newEventDetails}
                    isEditing={true}
                />
                <EditableDetailsCard eventDetails={newEventDetails} eventHosts={[]} isEditing={true} />
                <Button onClick={onCreateNewEvent}>Create event</Button>
            </div>
        </>
    )
}