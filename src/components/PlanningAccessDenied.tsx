// src/components/PlanningAccessDenied.tsx
import { Clock } from 'lucide-react';

export function PlanningAccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <div className="flex justify-center mb-4">
          <Clock className="h-16 w-16 text-blue-500" />
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          This event is still being planned
        </h1>
        <p className="text-gray-600">Check back later!</p>
      </div>
    </div>
  );
}
