import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '@/api/events';
import { Event } from '@/types/event';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Ticket, TrendingUp, Plus } from 'lucide-react';

export const OrganizerDashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventsApi.getAll();
        setEvents(data);
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const publishedEvents = events.filter((e) => e.status === 'published').length;
  const draftEvents = events.filter((e) => e.status === 'draft').length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Organizer Dashboard</h1>
        <Button asChild>
          <Link to="/organizer/events/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">
              {publishedEvents} published, {draftEvents} draft
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Events</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{publishedEvents}</div>
            <p className="text-xs text-muted-foreground">
              Active ticket sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">View Analytics</div>
            <p className="text-xs text-muted-foreground">
              Track your event performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Events</CardTitle>
            <Button variant="outline" asChild>
              <Link to="/organizer/events">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                You haven't created any events yet
              </p>
              <Button asChild>
                <Link to="/organizer/events/new">Create Your First Event</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {events.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-semibold">{event.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {event.venue_name} • {new Date(event.event_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/organizer/events/${event.id}/edit`}>Edit</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/organizer/events/${event.id}/analytics`}>
                        Analytics
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
