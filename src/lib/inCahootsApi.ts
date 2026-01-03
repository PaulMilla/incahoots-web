import { AuthUser } from "../auth/FirebaseAuthContext";
import { CreateEventBody, EventInvitesBody, UpdateEventBody, UpdateRsvpBody } from "../types";
import { auth } from "./firebaseApp";

// TODO: Should we throw error instead?
const baseUrl = import.meta.env.VITE_API_URL ?? "https://us-central1-in-cahoots-52c24.cloudfunctions.net"
const apiUrl = `${baseUrl}/api`;

// TODO: pick a better library for making HTTP API calls

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function post(url: string, body: any, bearerToken: string | undefined = undefined) {
    let token = bearerToken
    if (!token) {
        // Wait for auth.currentUser to be available (handles race condition with auth state)
        await auth.authStateReady();

        if (!auth.currentUser) {
            console.error(`currentUser is nil after waiting for auth state readiness`);
            throw new Error('User not authenticated');
        }
        const user = auth.currentUser
        token = await user.getIdToken()
        console.debug('Got auth token for user:', user.uid);
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

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error ${response.status} for ${url}:`, errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
    }

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
    const response = await post(`${apiUrl}/createEvent`, body) as { eventId: string };
    return response;
}

export async function updateEvent(body: UpdateEventBody) {
    const response = await post(`${apiUrl}/updateEvent`, body) as { success: boolean };
    return response;
}

export async function updateRsvp(body: UpdateRsvpBody) {
    const response = await post(`${apiUrl}/updateRsvp`, body) as { success: boolean };
    return response;
}

export async function inviteContacts(body: EventInvitesBody) {
    const response = await post(`${apiUrl}/inviteContacts`, body) as { success: boolean };
    return response;
}

export async function getDownloadAllUrl(eventId: string) {
    const response = await post(`${apiUrl}/events/${eventId}/media/downloadAll`, { eventId }) as { success: boolean, downloadURL: string };
    console.log("Download all URL response:", response);
    return response.downloadURL;
}

export async function publishEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    return post(`${apiUrl}/publishEvent`, { eventId });
}

export async function cancelEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    return post(`${apiUrl}/cancelEvent`, { eventId });
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(`${apiUrl}/deleteEvent`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ eventId }),
    });
    return response.json();
}

export async function addCoHost(
    eventId: string,
    userId: string,
    fullName: string
): Promise<{ success: boolean; error?: string }> {
    return post(`${apiUrl}/addCoHost`, { eventId, userId, fullName });
}

export async function removeCoHost(
    eventId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    return post(`${apiUrl}/removeCoHost`, { eventId, userId });
}