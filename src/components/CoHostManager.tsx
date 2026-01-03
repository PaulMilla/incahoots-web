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
  hosts: string[];
  host: string; // Primary host - cannot be removed
  attendees: Attendee[];
  currentUserId: string;
  onCoHostAdded?: () => void;
  onCoHostRemoved?: () => void;
}

export function CoHostManager({
  eventId,
  hosts,
  host,
  attendees,
  currentUserId,
  onCoHostAdded,
  onCoHostRemoved,
}: CoHostManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hostAttendees = attendees.filter(a => hosts.includes(a.userId));
  const nonHostAttendees = attendees.filter(a => !hosts.includes(a.userId));
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
              {hostAttendees.map(hostAttendee => (
                <div
                  key={hostAttendee.userId}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>{hostAttendee.fullName}</span>
                    {hostAttendee.userId === host && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Owner</span>
                    )}
                    {hostAttendee.userId === currentUserId && (
                      <span className="text-xs text-gray-500">(you)</span>
                    )}
                  </div>
                  {/* Only show remove button for cohosts, not the primary host */}
                  {hostAttendee.userId !== host && hostAttendee.userId !== currentUserId && (
                    <button
                      onClick={() => handleRemoveCoHost(hostAttendee.userId)}
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
