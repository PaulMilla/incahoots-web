import { Timestamp } from "firebase/firestore";

/**
 * Converts a Firestore timestamp (seconds since epoch) to a human-readable date string.
 * @param {number} seconds - The seconds part of the Firestore timestamp.
 * @returns {string} - The human-readable date string.
 */
export function convertFirestoreTimestampToDateString(seconds: number): string {
    const date = new Date(seconds * 1000); // Convert seconds to milliseconds

    const optionsDate: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
    };

    const optionsTime: Intl.DateTimeFormatOptions = {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    };

    const dateString = date.toLocaleDateString("en-US", optionsDate);
    const timeString = date.toLocaleTimeString("en-US", optionsTime);

    return `${dateString} ${timeString}`;
}

export function convertFirestoreTimestampToIsoString(timestamp: Timestamp): string {
    const date = new Date(timestamp.seconds * 1000);
    return date.toISOString();
}

export function convertDateToFirestoreTimestamp(date: Date): Timestamp {
    return Timestamp.fromDate(date);
}

export function convertDateToLocalString(date: Date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}