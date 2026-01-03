// src/components/PlanningModeBanner.tsx
import { Info } from 'lucide-react';

interface PlanningModeBannerProps {
  onPublish: () => void;
  onDelete: () => void;
  isPublishing?: boolean;
}

export function PlanningModeBanner({ onPublish, onDelete, isPublishing }: PlanningModeBannerProps) {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700">
          <Info className="h-5 w-5" />
          <span className="font-medium">Planning Mode</span>
          <span className="text-blue-600 text-sm">
            — This event is a draft. Only hosts can see it.
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            Delete Draft
          </button>
          <button
            onClick={onPublish}
            disabled={isPublishing}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
          >
            {isPublishing ? 'Publishing...' : 'Publish Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
