/**
 * Generates a Google Maps link for a given address.
 * @param {string} address - The full address as a single string.
 * @returns {string} - The URL to view the address on Google Maps.
 */
export function createGoogleMapsLink(address: string) {
    const baseUrl = "https://www.google.com/maps/search/?api=1";
    const formattedAddress = encodeURIComponent(address);
    return `${baseUrl}&query=${formattedAddress}`;
}
