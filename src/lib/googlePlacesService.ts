import { ILocationService, LocationPrediction, LocationDetails } from "./locationService";

// Get API key
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  console.warn("VITE_GOOGLE_MAPS_API_KEY not found in environment variables. Location autocomplete will not work.");
}

/**
 * Google Places implementation using the new Places API (2024+)
 * Uses AutocompleteSuggestion and Place instead of deprecated AutocompleteService and PlacesService
 */
class GooglePlacesService implements ILocationService {
  private apiKey: string;
  private placesLibrary: google.maps.PlacesLibrary | null = null;
  private initialized = false;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Initialize Google Places API library
   */
  private async initialize(): Promise<void> {
    if (this.initialized && this.placesLibrary) {
      return; // Already initialized
    }

    try {
      // Dynamically load the Google Maps script with API key
      await this.loadGoogleMapsScript();

      // Import the Places library
      const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
      this.placesLibrary = { Place } as google.maps.PlacesLibrary;
      this.initialized = true;
    } catch (error) {
      console.error("Error initializing Google Places API:", error);
      throw error;
    }
  }

  /**
   * Load the Google Maps JavaScript API script
   */
  private loadGoogleMapsScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded and importLibrary is available
      if (typeof window.google?.maps?.importLibrary === 'function') {
        resolve();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        // Wait for importLibrary to be available
        const checkImportLibrary = () => {
          if (typeof window.google?.maps?.importLibrary === 'function') {
            resolve();
          } else {
            setTimeout(checkImportLibrary, 100);
          }
        };
        existingScript.addEventListener('load', checkImportLibrary);
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps script')));
        return;
      }

      // Create and load script - using v=weekly for the new Places API
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // Wait for importLibrary to be available
        const checkImportLibrary = () => {
          if (typeof window.google?.maps?.importLibrary === 'function') {
            resolve();
          } else {
            setTimeout(checkImportLibrary, 100);
          }
        };
        checkImportLibrary();
      };

      script.onerror = () => reject(new Error('Failed to load Google Maps script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Search for location predictions using the new AutocompleteSuggestion API
   */
  async searchLocations(query: string): Promise<LocationPrediction[]> {
    await this.initialize();

    try {
      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedPrimaryTypes: ["establishment", "geocode"],
      });

      if (!suggestions || suggestions.length === 0) {
        return [];
      }

      const results: LocationPrediction[] = suggestions.map((suggestion) => {
        const placePrediction = suggestion.placePrediction;
        const description = placePrediction?.text?.text || "";
        const mainText = placePrediction?.mainText?.text || "";
        const secondaryText = placePrediction?.secondaryText?.text || "";

        // If structured format is not available, split description
        let finalMainText = mainText;
        let finalSecondaryText = secondaryText;

        if (!mainText && description) {
          // Split on first comma to separate main location from address
          const parts = description.split(',');
          finalMainText = parts[0].trim();
          finalSecondaryText = parts.slice(1).join(',').trim();
        }

        return {
          id: placePrediction?.placeId || "",
          description,
          mainText: finalMainText,
          secondaryText: finalSecondaryText,
        };
      });

      return results;
    } catch (error) {
      console.error("Error fetching autocomplete suggestions:", error);
      throw error;
    }
  }

  /**
   * Get detailed location information using the new Place API
   */
  async getLocationDetails(placeId: string): Promise<LocationDetails> {
    await this.initialize();

    try {
      const place = new google.maps.places.Place({
        id: placeId,
      });

      // Fetch fields we need
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "location"],
      });

      const details: LocationDetails = {
        name: place.displayName || "",
        address: place.formattedAddress || undefined,
        geoPoint: place.location
          ? {
              latitude: place.location.lat(),
              longitude: place.location.lng(),
            }
          : undefined,
      };

      return details;
    } catch (error) {
      console.error("Error fetching place details:", error);
      throw error;
    }
  }
}

// Export a singleton instance
export const locationService: ILocationService = new GooglePlacesService(apiKey || "");
