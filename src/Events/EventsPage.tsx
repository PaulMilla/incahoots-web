import { useEffect, useState } from "react";
import { useAuth } from "../auth/FirebaseAuthContext";
import NavigationBar from "../NavigationBar";
import { getUserEventsPublisher } from "../lib/firestore";
import { UserEvent } from "../types";
import { EventCard } from "./EventCard";

export default function EventsPage() {
    const { user } = useAuth()
    const userId = user?.uid
    const [userEvents, setUserEvents] = useState<UserEvent[]>();

    useEffect(() => {
        if (userId == null) {
            return
        }

        getUserEventsPublisher(userId ?? "")
            .subscribe(x => setUserEvents(x))
    }, [userId])

    return (
        <>
            <NavigationBar />
            <div className="max-w-(--breakpoint-xl) mx-auto text-gray-700 px-5 mt-8">
                <div className="px-4 mx-auto max-w-(--breakpoint-xl) text-left">
                    <div className="flex flex-col gap-6">
                        <h1 className="text-5xl font-medium tracking-tight flex items-center gap-2">
                            Your Events
                        </h1>
                        {userEvents?.map(event =>
                            <EventCard key={event.eventDetails.id} event={event} />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
