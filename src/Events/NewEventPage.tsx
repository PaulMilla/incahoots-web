import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/inCahootsApi';
import { CreateEventBody } from '../types';
import { useAuth, LoginState } from '../auth/FirebaseAuthContext';

function getDefaultEventDetails(): CreateEventBody {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // 1 week from now
  startDate.setHours(18, 0, 0, 0); // 6 PM

  const endDate = new Date(startDate);
  endDate.setHours(19, 0, 0, 0); // 7 PM (1 hour later)

  return {
    name: 'Untitled Event',
    bodyText: '',
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    location: { name: 'TBD' },
    status: 'planning',
  };
}

export default function NewEventPage() {
  const navigate = useNavigate();
  const { loginState } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasCreatedEvent = useRef(false);

  useEffect(() => {
    async function createDraftEvent() {
      try {
        const defaultEvent = getDefaultEventDetails();
        const response = await api.createEvent(defaultEvent);
        navigate(`/events/${response.eventId}`, { replace: true });
      } catch (err) {
        console.error('Failed to create event:', err);
        setError('Failed to create event. Please try again.');
      }
    }

    if (loginState === LoginState.signedIn && !hasCreatedEvent.current) {
      hasCreatedEvent.current = true;
      createDraftEvent();
    } else if (loginState === LoginState.loggedOut) {
      navigate('/signIn?redirectUrl=/newEvent');
    }
  }, [navigate, loginState]);

  if (loginState === LoginState.uninitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Creating your event...</p>
      </div>
    </div>
  );
}
