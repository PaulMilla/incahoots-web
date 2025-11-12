/**
 * Location service abstraction layer
 *
 * This interface allows swapping location providers (Google Places, Mapbox, etc.)
 * without changing the component code.
 */

export type LocationPrediction = {
  id: string;
  description: string;
  mainText: string;
  secondaryText: string;
};

export type LocationDetails = {
  name: string;
  address?: string;
  geoPoint?: {
    latitude: number;
    longitude: number;
  };
};

export interface ILocationService {
  /**
   * Search for location predictions based on user input
   * @param query - The search query string
   * @returns Promise resolving to array of location predictions
   */
  searchLocations(query: string): Promise<LocationPrediction[]>;

  /**
   * Get detailed location information for a specific prediction
   * @param placeId - The unique identifier for the location
   * @returns Promise resolving to location details
   */
  getLocationDetails(placeId: string): Promise<LocationDetails>;
}
