import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Event } from '@/types/event';
import { TicketType } from '@/types/ticketType';
import { eventsApi } from '@/api/events';
import { ticketTypesApi } from '@/api/ticketTypes';
import { bookingsApi } from '@/api/bookings';
import { useSeats } from '@/hooks/useSeats';
import { useAuth } from '@/contexts/AuthContext';
import { SeatMap } from '@/components/seats/SeatMap';
import { SeatSelectionSummary } from '@/components/seats/SeatSelectionSummary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const Checkout = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'selection' | 'details' | 'review'>('selection');

  // Customer details
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState('');

  // Ticket type selection (for general admission)
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<Record<number, number>>({});

  // Seat selection hook
  const {
    seats,
    selectedSeats,
    selectedSeatIds,
    lockedSeatIds,
    sessionId,
    timeRemaining,
    loading: seatsLoading,
    error: seatsError,
    toggleSeat,
    clearSelection,
  } = useSeats({
    eventId: parseInt(eventId || '0'),
    enabled: !!eventId,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;

      try {
        const [eventData, ticketTypesData] = await Promise.all([
          eventsApi.getById(parseInt(eventId)),
          ticketTypesApi.getByEventId(parseInt(eventId)),
        ]);

        setEvent(eventData);
        setTicketTypes(ticketTypesData);
      } catch (error) {
        console.error('Failed to fetch event:', error);
        toast.error('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId]);

  const handleTicketTypeChange = (ticketTypeId: number, quantity: number) => {
    setSelectedTicketTypes((prev) => ({
      ...prev,
      [ticketTypeId]: quantity,
    }));
  };

  const calculateTotal = () => {
    if (event?.has_seating) {
      // For assigned seating, calculate from selected seats
      return selectedSeats.reduce((sum, seat) => {
        const ticketType = ticketTypes.find((tt) => tt.id === seat.ticket_type_id);
        return sum + (ticketType?.price || 0);
      }, 0);
    } else {
      // For general admission, calculate from ticket type selection
      return Object.entries(selectedTicketTypes).reduce((sum, [ticketTypeId, quantity]) => {
        const ticketType = ticketTypes.find((tt) => tt.id === parseInt(ticketTypeId));
        return sum + (ticketType?.price || 0) * quantity;
      }, 0);
    }
  };

  const handleSubmit = async () => {
    if (!event || !eventId) return;

    setSubmitting(true);

    try {
      const items = event.has_seating
        ? selectedSeats.map((seat) => ({
            ticket_type_id: seat.ticket_type_id!,
            quantity: 1,
            seat_ids: [seat.id],
          }))
        : Object.entries(selectedTicketTypes)
            .filter(([_, quantity]) => quantity > 0)
            .map(([ticketTypeId, quantity]) => ({
              ticket_type_id: parseInt(ticketTypeId),
              quantity,
            }));

      const booking = await bookingsApi.create({
        event_id: parseInt(eventId),
        session_id: sessionId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone || undefined,
        items,
      });

      toast.success('Booking confirmed!');
      navigate(`/bookings/${booking.id}`);
    } catch (error: any) {
      console.error('Booking failed:', error);
      toast.error(error.response?.data?.error || 'Failed to complete booking');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Event not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalPrice = calculateTotal();
  const hasSelection = event.has_seating
    ? selectedSeats.length > 0
    : Object.values(selectedTicketTypes).some((q) => q > 0);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/events/${eventId}`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Button>

        <h1 className="text-4xl font-bold mb-2">Checkout</h1>
        <p className="text-lg text-muted-foreground">{event.title}</p>
      </div>

      {/* Timer for seat locks */}
      {event.has_seating && timeRemaining > 0 && (
        <Alert className="mb-6">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Seats reserved for: <strong>{formatTimeRemaining(timeRemaining)}</strong>
          </AlertDescription>
        </Alert>
      )}

      {seatsError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{seatsError}</AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* Step 1: Seat/Ticket Selection */}
          {step === 'selection' && (
            <div className="space-y-6">
              {event.has_seating ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Your Seats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <SeatMap
                        seats={seats}
                        selectedSeatIds={selectedSeatIds}
                        lockedSeatIds={lockedSeatIds}
                        onSeatClick={toggleSeat}
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Select Tickets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {ticketTypes.map((ticketType) => (
                      <div
                        key={ticketType.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold">{ticketType.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            ${ticketType.price.toFixed(2)}
                          </p>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max={ticketType.quantity_available - ticketType.quantity_sold}
                          value={selectedTicketTypes[ticketType.id] || 0}
                          onChange={(e) =>
                            handleTicketTypeChange(
                              ticketType.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 2: Customer Details */}
          {step === 'details' && (
            <Card>
              <CardHeader>
                <CardTitle>Your Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setStep('selection')}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep('review')}
                    disabled={!customerName || !customerEmail}
                    className="flex-1"
                  >
                    Review Booking
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle>Review Your Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Customer Details</h3>
                  <div className="space-y-1 text-sm">
                    <p>Name: {customerName}</p>
                    <p>Email: {customerEmail}</p>
                    {customerPhone && <p>Phone: {customerPhone}</p>}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">
                    {event.has_seating ? 'Selected Seats' : 'Selected Tickets'}
                  </h3>
                  {event.has_seating ? (
                    <div className="space-y-1 text-sm">
                      {selectedSeats.map((seat) => (
                        <p key={seat.id}>
                          {seat.section} - Row {seat.row_label}, Seat {seat.seat_number}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1 text-sm">
                      {Object.entries(selectedTicketTypes)
                        .filter(([_, quantity]) => quantity > 0)
                        .map(([ticketTypeId, quantity]) => {
                          const ticketType = ticketTypes.find(
                            (tt) => tt.id === parseInt(ticketTypeId)
                          );
                          return (
                            <p key={ticketTypeId}>
                              {quantity}x {ticketType?.name} - $
                              {((ticketType?.price || 0) * quantity).toFixed(2)}
                            </p>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setStep('details')}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Processing...' : 'Confirm Booking'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Summary */}
        <div>
          {step === 'selection' && event.has_seating ? (
            <SeatSelectionSummary
              selectedSeats={selectedSeats}
              onRemoveSeat={(seatId) => {
                const seat = seats.find((s) => s.id === seatId);
                if (seat) toggleSeat(seat);
              }}
              onContinue={() => setStep('details')}
              totalPrice={totalPrice}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Items:</span>
                    <span>
                      {event.has_seating
                        ? selectedSeats.length
                        : Object.values(selectedTicketTypes).reduce((a, b) => a + b, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {step === 'selection' && !event.has_seating && (
                  <Button
                    onClick={() => setStep('details')}
                    disabled={!hasSelection}
                    className="w-full"
                  >
                    Continue
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
