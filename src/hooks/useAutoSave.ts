// src/hooks/useAutoSave.ts
import { useRef, useCallback } from 'react';
import { doc, getFirestore, updateDoc, UpdateData } from 'firebase/firestore';
import { app } from '../lib/firebaseApp';
import * as api from '../lib/inCahootsApi';
import { EventDetails, UpdateEventBody } from '../types';

type PartialEventUpdate = Partial<Pick<EventDetails, 'name' | 'bodyText' | 'startDate' | 'endDate' | 'location'>>;

interface UseAutoSaveOptions {
  eventId: string;
  debounceMs?: number;
  useDirect?: boolean; // If true, write directly to Firestore (for planning mode)
  onSaveStart?: () => void;
  onSaveComplete?: () => void;
  onSaveError?: (error: Error) => void;
}

export function useAutoSave({
  eventId,
  debounceMs = 500,
  useDirect = false,
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
      if (useDirect) {
        // Direct Firestore write for planning mode
        const db = getFirestore(app);
        const eventRef = doc(db, 'events', eventId);

        // Build update object, only including changed fields
        const updateData: UpdateData<EventDetails> = {};

        if (changes.name !== undefined) {
          updateData.name = changes.name;
        }
        if (changes.bodyText !== undefined) {
          updateData.bodyText = changes.bodyText;
        }
        if (changes.startDate !== undefined) {
          updateData.startDate = changes.startDate;
        }
        if (changes.endDate !== undefined) {
          updateData.endDate = changes.endDate;
        }
        if (changes.location !== undefined) {
          updateData.location = changes.location;
        }

        await updateDoc(eventRef, updateData);
      } else {
        // Use API for published events
        const updateBody: UpdateEventBody = {
          id: eventId,
          name: changes.name || '',
          bodyText: changes.bodyText || '',
          startDate: changes.startDate?.toDate().toISOString() || new Date().toISOString(),
          endDate: changes.endDate?.toDate().toISOString() || new Date().toISOString(),
          location: changes.location || { name: '' },
        };

        await api.updateEvent(updateBody);
      }

      onSaveComplete?.();
    } catch (error) {
      onSaveError?.(error as Error);
    } finally {
      isSaving.current = false;
    }
  }, [eventId, useDirect, onSaveStart, onSaveComplete, onSaveError]);

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
