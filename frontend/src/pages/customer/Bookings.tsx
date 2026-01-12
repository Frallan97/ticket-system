import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingsApi } from '@/api/bookings';
import { Booking } from '@/types/booking';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await bookingsApi.getMyBookings();
        setBookings(data);
      } catch (err) {
        setError('Failed to load bookings');
        console.error('Failed to fetch bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Bookings</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
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
      <h1 className="text-4xl font-bold mb-8">My Bookings</h1>

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            You don't have any bookings yet
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>
                      Booking #{booking.booking_reference}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(booking.booking_date), 'PPP')}
                    </p>
                  </div>
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
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold">Customer</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.customer_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.customer_email}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Total Amount</p>
                    <p className="text-2xl font-bold">
                      ${booking.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild>
                  <Link to={`/bookings/${booking.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
