// src/hooks/useAutoSave.ts
import { useRef, useCallback } from 'react';
import * as api from '../lib/inCahootsApi';
import { EventDetails, UpdateEventBody } from '../types';

type PartialEventUpdate = Partial<Pick<EventDetails, 'name' | 'bodyText' | 'startDate' | 'endDate' | 'location'>>;

interface UseAutoSaveOptions {
  eventId: string;
  debounceMs?: number;
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useAutoSave({
  eventId,
  debounceMs = 500,
  onSaveStart,
  onSaveComplete,
  onSaveError,
}: UseAutoSaveOptions) {
  const pendingChanges = useRef<PartialEventUpdate>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSaving = useRef(false);

  const flushChanges = useCallback(async () => {
    if (Object.keys(pendingChanges.current).length === 0) {
      return;
    }

    const changes = { ...pendingChanges.current };
    pendingChanges.current = {};

    isSaving.current = true;
    onSaveStart?.();

    try {
      // Convert Timestamps to ISO strings for API
      const updateBody: UpdateEventBody = {
        id: eventId,
        name: changes.name || '',
        bodyText: changes.bodyText || '',
        startDate: changes.startDate?.toDate().toISOString() || new Date().toISOString(),
        endDate: changes.endDate?.toDate().toISOString() || new Date().toISOString(),
        location: changes.location || { name: '' },
      };

      await api.updateEvent(updateBody);
      onSaveComplete?.();
    } catch (error) {
      onSaveError?.(error as Error);
    } finally {
      isSaving.current = false;
    }
  }, [eventId, onSaveStart, onSaveComplete, onSaveError]);

  const queueChange = useCallback(
    <K extends keyof PartialEventUpdate>(field: K, value: PartialEventUpdate[K]) => {
      pendingChanges.current[field] = value;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        flushChanges();
      }, debounceMs);
    },
    [debounceMs, flushChanges]
  );

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return flushChanges();
  }, [flushChanges]);

  return {
    queueChange,
    flush,
    isSaving: () => isSaving.current,
  };
}
