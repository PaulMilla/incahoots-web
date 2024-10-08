import { useState } from "react";
import { createEvent } from "./lib/inCahootsApi"
import { CreateEventBody } from "./types";
import { useNavigate } from "react-router-dom";
import NavigationBar from "./NavigationBar";

export default function NewEventPage() {
    const navigate = useNavigate();
    const [eventName, setEventName] = useState<string>("Paul's Event!");
    const [bodyText, setBodyText] = useState<string>("description goes here...");
    const [startTime, setStartTime] = useState<string>(Date());
    const [endTime, setEndTime] = useState<string>(Date());
    const [locationName, setLocationName] = useState<string>("Mi casa");

    async function onCreateNewEvent() {
        const body: CreateEventBody = {
            name: eventName,
            bodyText: bodyText,
            startDate: startTime,
            endDate: endTime,
            location: {
                name: locationName
            }
        };
        const response = await createEvent(body);
        console.info(response)
        navigate(`/events/${response.eventId}`)
    }

    const buttonClassName = "outline outline-offset-2 outline-1"
    return (
        <div>
            <NavigationBar />
            <form>
                <label>eventName: </label>
                <input
                value={eventName}
                onChange={x => setEventName(x.target.value)}
                className={buttonClassName} />
                <br /> <br />
                <label>bodyText: </label>
                <input
                value={bodyText}
                onChange={x => setBodyText(x.target.value)}
                className={buttonClassName} />
                <br /> <br />
                <label>startTime: </label>
                <input
                value={startTime}
                onChange={x => setStartTime(x.target.value)}
                className={buttonClassName} />
                <br /> <br />
                <label>endTime: </label>
                <input
                value={endTime}
                onChange={x => setEndTime(x.target.value)}
                className={buttonClassName} />
                <br /> <br />
                <label>location: </label>
                <input
                value={locationName}
                onChange={x => setLocationName(x.target.value)}
                className={buttonClassName} />
                <br /> <br />
                <button onClick={onCreateNewEvent}
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center "
                    type="button"
                >Create</button>
            </form>
        </div>
    )
}