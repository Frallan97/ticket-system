import { useEffect, useState } from 'react';
import { Event } from '@/types/event';
import { eventsApi } from '@/api/events';
import { EventList } from '@/components/events/EventList';
import { EventFilters } from '@/components/events/EventFilters';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const Events = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEvents();
  }, [searchQuery]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = searchQuery ? { search: searchQuery } : {};
      const data = await eventsApi.getAll(params);
      setEvents(data);
    } catch (err) {
      setError('Failed to load events. Please try again later.');
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">All Events</h1>
        <p className="text-muted-foreground">
          Discover upcoming concerts, cinema screenings, and events
        </p>
      </div>

      <div className="mb-8">
        <EventFilters onSearch={handleSearch} />
      </div>

      {error && (
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <EventList events={events} loading={loading} />
    </div>
  );
};
