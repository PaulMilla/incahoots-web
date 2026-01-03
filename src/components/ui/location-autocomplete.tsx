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
} & Omit<React.ComponentProps<"input">, "value" | "onChange" | "onSelect">;

export function LocationAutocomplete({
  value,
  onChange,
  onLocationSelect,
  placeholder = "Event Location",
  className,
  ...props
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [predictions, setPredictions] = useState<LocationPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<string>("");
  const justSelected = useRef(false);

  // Debounce the input value to limit API calls and wait for user to stop typing
  const [debouncedValue] = useDebounce(value, 300);

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

  // Reset selected value when predictions change
  useEffect(() => {
    setSelectedValue("");
  }, [predictions]);

  const handleSelect = async (prediction: LocationPrediction) => {
    // Mark that we just made a selection to prevent re-fetching
    justSelected.current = true;

    // Update the input value with the selected location name
    onChange(prediction.mainText);
    setOpen(false);

    // Fetch full location details if callback is provided
    if (onLocationSelect) {
      try {
        console.debug(`Fetching details for location '${prediction.id}':`, prediction);
        const details = await locationService.getLocationDetails(prediction.id);
        console.info("Fetched location details:", details);
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

  // TODO: Look into cmdk's built-in keyboard navigation support rather than manually handling key events
  // Used ClaudeAI to get this working
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || predictions.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      // Find current index and move to next
      const currentIndex = predictions.findIndex((p) => p.description === selectedValue);
      const nextIndex = currentIndex < predictions.length - 1 ? currentIndex + 1 : currentIndex;
      setSelectedValue(predictions[nextIndex].description);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      // Find current index and move to previous
      const currentIndex = predictions.findIndex((p) => p.description === selectedValue);
      if (currentIndex > 0) {
        setSelectedValue(predictions[currentIndex - 1].description);
      } else {
        setSelectedValue(""); // Clear selection if at the top
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Find the prediction that matches the selected value from cmdk
      const prediction = predictions.find((p) => p.description === selectedValue);
      if (prediction) {
        handleSelect(prediction);
      } else if (predictions.length > 0) {
        // If no value is selected by cmdk, select the first item
        handleSelect(predictions[0]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
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
            onKeyDown={handleKeyDown}
            className={className}
            {...props}
          />
        </PopoverAnchor>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 bg-white"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command
            className="bg-white"
            value={selectedValue}
            onValueChange={setSelectedValue}
          >
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
                      className="cursor-pointer px-4 py-2"
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
