import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingsApi } from '@/api/bookings';
import { BookingDetailResponse } from '@/types/booking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TicketCard } from '@/components/tickets/TicketCard';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export const BookingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<BookingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!id) return;

      try {
        const data = await bookingsApi.getById(parseInt(id));
        setBooking(data);
      } catch (err) {
        setError('Failed to load booking');
        console.error('Failed to fetch booking:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Booking not found'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-green-500',
    cancelled: 'bg-red-500',
    refunded: 'bg-gray-500',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        asChild
        className="mb-4"
      >
        <Link to="/bookings">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bookings
        </Link>
      </Button>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Info */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>
                  Booking #{booking.booking_reference}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge className={statusColors[booking.status]}>
                    {booking.status}
                  </Badge>
                  <Badge variant="outline">
                    {booking.payment_status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Customer Details</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Name:</strong> {booking.customer_name}</p>
                  <p><strong>Email:</strong> {booking.customer_email}</p>
                  {booking.customer_phone && (
                    <p><strong>Phone:</strong> {booking.customer_phone}</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Booking Date</h3>
                <p className="text-sm">
                  {format(new Date(booking.booking_date), 'PPP p')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tickets */}
          <div>
            <h2 className="text-2xl font-bold mb-4">
              Tickets ({booking.tickets.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {booking.tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  showQR={true}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tickets:</span>
                  <span>{booking.tickets.length}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${booking.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <Button asChild className="w-full">
                <Link to="/my-tickets">View All Tickets</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
