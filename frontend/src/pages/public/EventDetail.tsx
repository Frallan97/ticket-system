import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Event } from '@/types/event';
import { TicketType } from '@/types/ticketType';
import { eventsApi } from '@/api/events';
import { ticketTypesApi } from '@/api/ticketTypes';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Calendar, MapPin, Clock, Ticket, AlertCircle, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<number, number>>({});

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

  const hasSelectedTickets = () => {
    return Object.values(selectedQuantities).some(qty => qty > 0);
  };

  const handleAddToCart = async () => {
    if (!event) return;

    try {
      // Add each selected ticket type to cart
      for (const [ticketTypeIdStr, quantity] of Object.entries(selectedQuantities)) {
        if (quantity > 0) {
          await addToCart({
            event_id: event.id,
            ticket_type_id: parseInt(ticketTypeIdStr),
            quantity: quantity,
          });
        }
      }

      toast.success('Tickets added to cart!', {
        description: `${Object.values(selectedQuantities).reduce((a, b) => a + b, 0)} ticket(s) added`,
        action: {
          label: 'View Cart',
          onClick: () => navigate('/cart'),
        },
      });

      // Reset quantities
      setSelectedQuantities({});
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

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
                <div className="space-y-2">
                  {/* For assigned seating events, go directly to checkout */}
                  {event.has_seating ? (
                    <Button asChild className="w-full" size="lg">
                      <Link to={`/checkout/${event.id}`}>Select Seats & Book</Link>
                    </Button>
                  ) : (
                    <>
                      {/* For general admission, show quantity selectors */}
                      <div className="space-y-3 mb-4">
                        {ticketTypes.filter(tt => tt.is_active).map((ticketType) => (
                          <div key={ticketType.id} className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max={ticketType.quantity_available - ticketType.quantity_sold}
                              value={selectedQuantities[ticketType.id] || 0}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setSelectedQuantities(prev => ({
                                  ...prev,
                                  [ticketType.id]: value
                                }));
                              }}
                              className="w-20"
                            />
                            <span className="text-sm flex-1">{ticketType.name}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="w-full"
                        size="lg"
                        variant="outline"
                        onClick={handleAddToCart}
                        disabled={!hasSelectedTickets()}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>

                      <Button asChild className="w-full" size="lg">
                        <Link to={`/checkout/${event.id}`}>Book Now</Link>
                      </Button>
                    </>
                  )}
                </div>
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
