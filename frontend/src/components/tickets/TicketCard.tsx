import { Ticket } from '@/types/ticket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketQRCode } from './TicketQRCode';
import { format } from 'date-fns';

interface TicketCardProps {
  ticket: Ticket;
  eventTitle?: string;
  eventDate?: string;
  showQR?: boolean;
}

export const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  eventTitle,
  eventDate,
  showQR = false,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">
              {eventTitle || `Ticket #${ticket.id}`}
            </CardTitle>
            {eventDate && (
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(eventDate), 'PPP p')}
              </p>
            )}
          </div>
          {ticket.is_checked_in && (
            <Badge className="bg-green-500">Checked In</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showQR && <TicketQRCode ticket={ticket} />}

        <div className="space-y-2 mt-4">
          {ticket.seat_id && ticket.seat_details && (
            <div className="text-sm">
              <span className="font-semibold">Seat:</span>{' '}
              {ticket.seat_details.section} - Row {ticket.seat_details.row_label}, Seat {ticket.seat_details.seat_number}
            </div>
          )}

          <div className="text-sm">
            <span className="font-semibold">Price:</span> ${ticket.price_paid.toFixed(2)}
          </div>

          {ticket.attendee_name && (
            <div className="text-sm">
              <span className="font-semibold">Attendee:</span> {ticket.attendee_name}
            </div>
          )}

          {ticket.is_checked_in && ticket.checked_in_at && (
            <div className="text-sm text-muted-foreground">
              Checked in: {format(new Date(ticket.checked_in_at), 'PPP p')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
