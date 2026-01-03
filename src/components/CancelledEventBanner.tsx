// src/components/CancelledEventBanner.tsx
import { XCircle } from 'lucide-react';

export function CancelledEventBanner() {
  return (
    <div className="bg-gray-100 border-b border-gray-300 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center gap-2 text-gray-600">
        <XCircle className="h-5 w-5" />
        <span className="font-medium">This event was cancelled</span>
      </div>
    </div>
  );
}
