import { useEffect, useState } from 'react';
import { bookingsApi } from '@/api/bookings';
import { Booking } from '@/types/booking';
import { Ticket } from '@/types/ticket';
import { TicketCard } from '@/components/tickets/TicketCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const MyTickets = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets, setTickets] = useState<Record<number, Ticket[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const bookingsData = await bookingsApi.getMyBookings();
        setBookings(bookingsData);

        // Fetch tickets for each booking
        const ticketsData: Record<number, Ticket[]> = {};
        await Promise.all(
          bookingsData.map(async (booking) => {
            const bookingTickets = await bookingsApi.getTickets(booking.id);
            ticketsData[booking.id] = bookingTickets;
          })
        );

        setTickets(ticketsData);
      } catch (err) {
        setError('Failed to load tickets');
        console.error('Failed to fetch tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Tickets</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-96" />
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

  const allTickets = bookings.flatMap((booking) =>
    (tickets[booking.id] || []).map((ticket) => ({
      ...ticket,
      booking,
    }))
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">My Tickets</h1>

      {allTickets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            You don't have any tickets yet
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              eventTitle={`Event #${ticket.event_id}`}
              showQR={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
