import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Event } from '@/types/event';
import { TicketType } from '@/types/ticketType';
import { eventsApi } from '@/api/events';
import { ticketTypesApi } from '@/api/ticketTypes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, MapPin, Clock, Ticket, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        const [eventData, ticketTypesData] = await Promise.all([
          eventsApi.getById(parseInt(id)),
          ticketTypesApi.getByEventId(parseInt(id)),
        ]);

        setEvent(eventData);
        setTicketTypes(ticketTypesData);
      } catch (err) {
        setError('Failed to load event details. Please try again later.');
        console.error('Failed to fetch event:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Event not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-500',
    published: 'bg-green-500',
    cancelled: 'bg-red-500',
    completed: 'bg-blue-500',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Event Image */}
      {event.image_url && (
        <div className="aspect-video w-full overflow-hidden rounded-lg mb-8">
          <img
            src={event.image_url}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Event Info */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-4xl font-bold">{event.title}</h1>
              <Badge className={statusColors[event.status]}>
                {event.status}
              </Badge>
            </div>

            {event.description && (
              <p className="text-lg text-muted-foreground">
                {event.description}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">
                  {format(new Date(event.event_date), 'PPPP')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.event_date), 'p')}
                </p>
              </div>
            </div>

            {event.doors_open && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-semibold">
                    Doors open at {format(new Date(event.doors_open), 'p')}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-semibold">{event.venue_name}</p>
                {event.venue_address && (
                  <p className="text-sm text-muted-foreground">
                    {event.venue_address}
                  </p>
                )}
              </div>
            </div>

            {event.has_seating && (
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-muted-foreground" />
                <p className="font-semibold">Assigned Seating Available</p>
              </div>
            )}
          </div>
        </div>

        {/* Ticket Types */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticketTypes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No tickets available yet
                </p>
              ) : (
                ticketTypes.map((ticketType) => (
                  <div
                    key={ticketType.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{ticketType.name}</h3>
                        {ticketType.description && (
                          <p className="text-sm text-muted-foreground">
                            {ticketType.description}
                          </p>
                        )}
                      </div>
                      <p className="text-lg font-bold">
                        ${ticketType.price.toFixed(2)}
                      </p>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {ticketType.quantity_available - ticketType.quantity_sold} / {ticketType.quantity_available} available
                    </div>

                    {!ticketType.is_active && (
                      <Badge variant="secondary">Not Available</Badge>
                    )}
                  </div>
                ))
              )}

              {event.status === 'published' && ticketTypes.length > 0 && (
                <Button asChild className="w-full" size="lg">
                  <Link to={`/checkout/${event.id}`}>Book Tickets</Link>
                </Button>
              )}

              {event.status !== 'published' && (
                <Alert>
                  <AlertDescription>
                    Tickets are not available for this event
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
