import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi } from '@/api/events';
import { Event } from '@/types/event';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/exportUtils';

interface BookingWithTickets {
  id: number;
  booking_reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total_amount: number;
  status: string;
  payment_status: string;
  booking_date: string;
  ticket_count: number;
}

export const EventBookings = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = parseInt(id || '0');

  const [event, setEvent] = useState<Event | null>(null);
  const [bookings, setBookings] = useState<BookingWithTickets[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithTickets[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchQuery]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventData, bookingsData] = await Promise.all([
        eventsApi.getById(eventId),
        eventsApi.getBookings(eventId),
      ]);
      setEvent(eventData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
      navigate('/organizer/events');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    if (!searchQuery) {
      setFilteredBookings(bookings);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = bookings.filter(
      (booking) =>
        booking.booking_reference.toLowerCase().includes(query) ||
        booking.customer_name.toLowerCase().includes(query) ||
        booking.customer_email.toLowerCase().includes(query)
    );
    setFilteredBookings(filtered);
  };

  const handleExportBookings = () => {
    if (filteredBookings.length === 0) {
      toast.error('No bookings to export');
      return;
    }

    try {
      const exportData = filteredBookings.map((booking) => ({
        'Booking Reference': booking.booking_reference,
        'Customer Name': booking.customer_name,
        'Email': booking.customer_email,
        'Phone': booking.customer_phone || '',
        'Tickets': booking.ticket_count,
        'Total Amount': `$${booking.total_amount.toFixed(2)}`,
        'Status': booking.status,
        'Payment Status': booking.payment_status,
        'Booking Date': new Date(booking.booking_date).toLocaleString(),
      }));

      const filename = `${event?.title.replace(/[^a-z0-9]/gi, '_')}_bookings_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(exportData, filename);
      toast.success('Bookings exported successfully');
    } catch (error) {
      console.error('Failed to export bookings:', error);
      toast.error('Failed to export bookings');
    }
  };

  const getTotalRevenue = () => {
    return filteredBookings.reduce((sum, booking) => sum + booking.total_amount, 0);
  };

  const getTotalTickets = () => {
    return filteredBookings.reduce((sum, booking) => sum + booking.ticket_count, 0);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Event not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate(`/organizer/events/${eventId}/analytics`)}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Analytics
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{event.title} - Bookings</h1>
        <p className="text-muted-foreground">
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} • {getTotalTickets()} tickets • ${getTotalRevenue().toFixed(2)} total
        </p>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference, name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={handleExportBookings}>
              <Download className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>
            Complete list of all bookings for this event
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery ? 'No bookings found matching your search' : 'No bookings yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Tickets</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Booking Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">
                        {booking.booking_reference}
                      </TableCell>
                      <TableCell>{booking.customer_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{booking.customer_email}</div>
                          {booking.customer_phone && (
                            <div className="text-muted-foreground">
                              {booking.customer_phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {booking.ticket_count}
                      </TableCell>
                      <TableCell className="text-right">
                        ${booking.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              booking.status === 'confirmed' ? 'default' : 'secondary'
                            }
                          >
                            {booking.status}
                          </Badge>
                          <Badge
                            variant={
                              booking.payment_status === 'paid'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {booking.payment_status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
