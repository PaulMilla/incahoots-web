/**
 * Converts a Firestore timestamp (seconds since epoch) to a human-readable date string.
 * @param {number} seconds - The seconds part of the Firestore timestamp.
 * @returns {string} - The human-readable date string.
 */
export function convertFirestoreTimestampToDate(seconds: number) {
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
