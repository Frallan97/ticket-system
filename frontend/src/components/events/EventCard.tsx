import { Link } from 'react-router-dom';
import { Event } from '@/types/event';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Ticket } from 'lucide-react';
import { format } from 'date-fns';

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const statusColors = {
    draft: 'bg-gray-500',
    published: 'bg-green-500',
    cancelled: 'bg-red-500',
    completed: 'bg-blue-500',
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <Link to={`/events/${event.id}`}>
        {event.image_url && (
          <div className="aspect-video w-full overflow-hidden">
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
      </Link>

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <Link to={`/events/${event.id}`} className="flex-1">
            <h3 className="text-xl font-bold hover:text-primary transition-colors">
              {event.title}
            </h3>
          </Link>
          <Badge className={statusColors[event.status]}>
            {event.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(event.event_date), 'PPP p')}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{event.venue_name}</span>
        </div>

        {event.has_seating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Ticket className="h-4 w-4" />
            <span>Assigned Seating</span>
          </div>
        )}

        {event.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {event.description}
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button asChild className="w-full">
          <Link to={`/events/${event.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};
