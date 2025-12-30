// src/components/CoHostManager.tsx
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Crown, X, UserPlus } from 'lucide-react';
import * as api from '../lib/inCahootsApi';
import { Attendee } from '../types';

interface CoHostManagerProps {
  eventId: string;
  hostIds: string[];
  attendees: Attendee[];
  currentUserId: string;
  onCoHostAdded?: () => void;
  onCoHostRemoved?: () => void;
}

export function CoHostManager({
  eventId,
  hostIds,
  attendees,
  currentUserId,
  onCoHostAdded,
  onCoHostRemoved,
}: CoHostManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hosts = attendees.filter(a => hostIds.includes(a.userId));
  const nonHostAttendees = attendees.filter(a => !hostIds.includes(a.userId));
  const filteredNonHosts = nonHostAttendees.filter(a =>
    a.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleAddCoHost(attendee: Attendee) {
    setIsAdding(true);
    try {
      await api.addCoHost(eventId, attendee.userId, attendee.fullName);
      onCoHostAdded?.();
    } catch (err) {
      console.error('Failed to add co-host:', err);
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveCoHost(userId: string) {
    try {
      await api.removeCoHost(eventId, userId);
      onCoHostRemoved?.();
    } catch (err) {
      console.error('Failed to remove co-host:', err);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Crown className="h-4 w-4 mr-2" />
          Manage Hosts
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Co-Hosts</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current hosts */}
          <div>
            <h4 className="text-sm font-medium mb-2">Current Hosts</h4>
            <div className="space-y-2">
              {hosts.map(host => (
                <div
                  key={host.userId}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>{host.fullName}</span>
                    {host.userId === currentUserId && (
                      <span className="text-xs text-gray-500">(you)</span>
                    )}
                  </div>
                  {host.userId !== currentUserId && hostIds.length > 1 && (
                    <button
                      onClick={() => handleRemoveCoHost(host.userId)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add co-host */}
          {nonHostAttendees.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Add Co-Host from Guests</h4>
              <Input
                placeholder="Search guests..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredNonHosts.map(attendee => (
                  <button
                    key={attendee.userId}
                    onClick={() => handleAddCoHost(attendee)}
                    disabled={isAdding}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded text-left"
                  >
                    <span>{attendee.fullName}</span>
                    <UserPlus className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
