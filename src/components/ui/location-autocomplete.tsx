import { useState, useEffect, useRef } from "react";
import { useDebounce } from "use-debounce";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { locationService } from "@/lib/googlePlacesService";
import { LocationPrediction, LocationDetails } from "@/lib/locationService";

type LocationAutocompleteProps = {
  value: string;
  onChange: (value: string) => void;
  onLocationSelect?: (location: LocationDetails) => void;
  placeholder?: string;
  className?: string;
};

export function LocationAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Event Location",
  className,
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const justSelected = useRef(false);

  // Debounce the input value by 1 seconds
  const [debouncedValue] = useDebounce(value, 1000);

  // Fetch predictions when debounced value changes and has 3+ characters
  useEffect(() => {
    const fetchPredictions = async () => {
      // Skip if we just made a selection
      if (justSelected.current) {
        justSelected.current = false;
        return;
      }

      if (debouncedValue.length < 3) {
        setPredictions([]);
        setOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await locationService.searchLocations(debouncedValue);
        setPredictions(results);
        setOpen(results.length > 0);
      } catch (err) {
        console.error("Error fetching location predictions:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch locations");
        setPredictions([]);
        setOpen(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPredictions();
  }, [debouncedValue]);

  const handleSelect = async (prediction: LocationPrediction) => {
    // Mark that we just made a selection to prevent re-fetching
    justSelected.current = true;

    // Update the input value with the selected location name
    onChange(prediction.mainText);
    setOpen(false);

    // Fetch full location details if callback is provided
    if (onLocationSelect) {
      try {
        const details = await locationService.getLocationDetails(prediction.id);
        onLocationSelect(details);
      } catch (err) {
        console.error("Error fetching location details:", err);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    // Don't close the popover on input change if there are predictions
    // The debounce will handle opening it
  };

  return (
    <div className="flex gap-2 items-center w-full">
      <MapPin />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleInputChange}
            className={className}
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-white"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command className="bg-white">
            <CommandList className="max-h-[300px]">
              {isLoading && (
                <div className="py-6 text-center text-sm text-gray-700">Loading...</div>
              )}
              {error && (
                <div className="py-6 text-center text-sm text-red-500">{error}</div>
              )}
              {!isLoading && !error && predictions.length === 0 && (
                <CommandEmpty className="py-6 text-center text-sm text-gray-700">
                  No locations found.
                </CommandEmpty>
              )}
              {!isLoading && !error && predictions.length > 0 && (
                <CommandGroup>
                  {predictions.map((prediction) => (
                    <CommandItem
                      key={prediction.id}
                      value={prediction.description}
                      onSelect={() => handleSelect(prediction)}
                      className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                      style={{ color: '#111827' }}
                    >
                      <MapPin className="mr-2 h-4 w-4 shrink-0" style={{ color: '#6B7280' }} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span
                          className="font-medium truncate"
                          style={{ color: '#111827', fontSize: '14px' }}
                        >
                          {prediction.mainText}
                        </span>
                        {prediction.secondaryText && (
                          <span
                            className="truncate"
                            style={{ color: '#6B7280', fontSize: '12px' }}
                          >
                            {prediction.secondaryText}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
