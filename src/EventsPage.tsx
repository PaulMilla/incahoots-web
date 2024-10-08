import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import NavigationBar from "./NavigationBar";
import { getUserEventsPublisher } from "./lib/firestore";
import { UserEvent } from "./types";
import { useNavigate } from "react-router-dom";

export default function EventsPage() {
    const { user } = useAuth()
    const userId = user?.uid
    const navigate = useNavigate();
    const [userEvents, setUserEvents] = useState<UserEvent[]>();

    async function onCreateNewEvent() {
        navigate('/newEvent')
    }

    useEffect(() => {
        if (userId == null) {
            return
        }

        getUserEventsPublisher(userId ?? "")
            .subscribe(x => setUserEvents(x))
    }, [userId, navigate])

    return (
        <div>
            <NavigationBar />
            <button onClick={onCreateNewEvent}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
                type="button"
            >Create New Event</button>
            <br /><br />
            <h1>Your Events:</h1>
            {
                userEvents?.map(event => {
                    return (
                        <div>
                            <p>event.name: <a href={`events/${event.eventDetails.id}`}>{event.eventDetails.name}</a></p>
                            <p>event.id: {event.eventDetails.id}</p>
                            <p>event.isHost: {event.myAttendeeDetails.isHost ? "true" : "false"}</p>
                            <p>event.startTime: {event.eventDetails.startDate.toDate().toString()}</p>
                            <p>event.endTime: {event.eventDetails.endDate.toDate().toString()}</p>
                            <p>event.attendee.rsvp: {event.myAttendeeDetails.rsvpState}</p>
                            <br /><br />
                        </div>
                    )
                })
            }
        </div>
    )
}
