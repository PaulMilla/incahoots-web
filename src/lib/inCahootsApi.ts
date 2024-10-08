import { AuthUser } from "../AuthContext";
import { CreateEventBody, UpdateRsvpBody } from "../types";
import { auth } from "./firebaseApp";

// TODO: Extract into an env variable
const baseUrl = `https://us-central1-in-cahoots-52c24.cloudfunctions.net`
const apiUrl = `${baseUrl}/api`;

// TODO: pick a better library for making HTTP API calls

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function post(url: string, body: any, bearerToken: string | undefined = undefined) {
    let token = bearerToken
    if (!token) {
        if (!auth.currentUser) {
            console.error(`currentUser is nil?`)
            return
        }
        const user = auth.currentUser
        token = await user.getIdToken()
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    return await response.json();
}

export async function registrationComplete(user: AuthUser) {
    const token = await user?.getIdToken();

    const response = await post(`${apiUrl}/registrationComplete`, {
        userId: user.uid,
        displayName: user.displayName
    }, token);

    return response;
}

export async function createEvent(body: CreateEventBody) {
    const response = await post(`${apiUrl}/createEvent`, body) as {eventId: string};
    return response;
}

export async function updateRsvp(body: UpdateRsvpBody) {
    const response = await post(`${apiUrl}/updateRsvp`, body) as {success: boolean};
    return response;
}