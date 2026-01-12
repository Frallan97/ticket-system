import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi } from '@/api/events';
import { ticketsApi } from '@/api/tickets';
import { Event } from '@/types/event';
import { QRScanner } from '@/components/checkin/QRScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Users, UserCheck, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CheckinStatus {
  event_id: number;
  total_tickets: number;
  checked_in_count: number;
  pending_count: number;
  check_in_rate: number;
  recent_check_ins: RecentCheckIn[];
}

interface RecentCheckIn {
  ticket_code: string;
  checked_in_at: string;
  attendee_name: string;
}

export const Checkin = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = parseInt(id || '0');

  const [event, setEvent] = useState<Event | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<CheckinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [ticketCode, setTicketCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventData, statusData] = await Promise.all([
        eventsApi.getById(eventId),
        eventsApi.getCheckinStatus(eventId),
      ]);
      setEvent(eventData);
      setCheckinStatus(statusData);
    } catch (error) {
      console.error('Failed to fetch check-in data:', error);
      toast.error('Failed to load check-in data');
      navigate('/organizer/events');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!ticketCode.trim()) {
      toast.error('Please enter a ticket code');
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      // First validate the ticket
      const validateResponse = await ticketsApi.validate({ ticket_code: ticketCode.trim() });

      if (!validateResponse.valid) {
        setValidationResult({
          success: false,
          message: validateResponse.message || 'Invalid ticket',
          type: 'error',
        });
        toast.error(validateResponse.message || 'Invalid ticket');
        setValidating(false);
        return;
      }

      // If valid, check in
      const checkinResponse = await ticketsApi.checkin({ ticket_code: ticketCode.trim() });

      setValidationResult({
        success: true,
        message: checkinResponse.message || 'Ticket checked in successfully',
        type: 'success',
      });

      toast.success('Ticket checked in successfully!');

      // Refresh check-in status
      fetchData();

      // Clear the input
      setTicketCode('');

      // Clear validation result after 3 seconds
      setTimeout(() => {
        setValidationResult(null);
      }, 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to check in ticket';
      setValidationResult({
        success: false,
        message: errorMessage,
        type: error.response?.status === 409 ? 'warning' : 'error',
      });
      toast.error(errorMessage);
    } finally {
      setValidating(false);
    }
  };

  const handleQRScan = (scannedCode: string) => {
    setTicketCode(scannedCode);
    // Trigger check-in immediately after scan
    setTimeout(() => {
      handleCheckin();
    }, 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!event || !checkinStatus) {
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
        onClick={() => navigate('/organizer/events')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{event.title} - Check-in</h1>
        <p className="text-muted-foreground">
          Event Date: {new Date(event.event_date).toLocaleDateString()} at{' '}
          {new Date(event.event_date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{checkinStatus.total_tickets}</div>
            <p className="text-xs text-muted-foreground">Tickets sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {checkinStatus.checked_in_count}
            </div>
            <p className="text-xs text-muted-foreground">
              {checkinStatus.check_in_rate.toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {checkinStatus.pending_count}
            </div>
            <p className="text-xs text-muted-foreground">Not checked in yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-in Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {checkinStatus.check_in_rate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Attendance rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Check-in Methods */}
        <div className="space-y-6">
          <Tabs defaultValue="qr" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr">QR Scanner</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-4">
              <QRScanner onScan={handleQRScan} isProcessing={validating} />
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Check-in</CardTitle>
                  <CardDescription>
                    Enter ticket code to check in an attendee
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCheckin} className="space-y-4">
                    <div>
                      <Label htmlFor="ticketCode">Ticket Code</Label>
                      <Input
                        id="ticketCode"
                        value={ticketCode}
                        onChange={(e) => setTicketCode(e.target.value)}
                        placeholder="Enter ticket code (e.g., TKT-ABC123)"
                        autoFocus
                        disabled={validating}
                      />
                    </div>

                    <Button type="submit" disabled={validating} className="w-full">
                      {validating ? 'Checking in...' : 'Check In Ticket'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Validation Result */}
          {validationResult && (
            <Alert
              variant={
                validationResult.type === 'success'
                  ? 'default'
                  : validationResult.type === 'warning'
                  ? 'default'
                  : 'destructive'
              }
            >
              {validationResult.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : validationResult.type === 'warning' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{validationResult.message}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
            <CardDescription>Last 10 attendees checked in</CardDescription>
          </CardHeader>
          <CardContent>
            {checkinStatus.recent_check_ins.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No check-ins yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {checkinStatus.recent_check_ins.map((checkIn, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{checkIn.attendee_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {checkIn.ticket_code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {new Date(checkIn.checked_in_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <Badge variant="outline" className="text-green-600 mt-1">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Checked In
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
