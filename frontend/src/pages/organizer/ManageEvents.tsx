import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventsApi } from '@/api/events';
import { Event } from '@/types/event';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Edit, BarChart3, Ticket, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

export const ManageEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, statusFilter]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await eventsApi.getAll();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.venue_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((event) => event.status === statusFilter);
    }

    setFilteredEvents(filtered);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) {
      return;
    }

    try {
      await eventsApi.delete(id);
      toast.success('Event deleted successfully');
      fetchEvents();
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Manage Events</h1>
        <Button asChild>
          <Link to="/organizer/events/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events by title or venue..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'No events found matching your criteria'
                : 'You haven\'t created any events yet'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button asChild>
                <Link to="/organizer/events/new">Create Your First Event</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-1">{event.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge
                            variant={
                              event.status === 'published'
                                ? 'default'
                                : event.status === 'draft'
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {event.status}
                          </Badge>
                          <span>•</span>
                          <span>{event.venue_name}</span>
                          <span>•</span>
                          <span>{new Date(event.event_date).toLocaleDateString()}</span>
                          <span>{new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/organizer/events/${event.id}/edit`}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/organizer/events/${event.id}/analytics`}>
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Analytics
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/organizer/events/${event.id}/checkin`}>
                          <Ticket className="h-4 w-4 mr-1" />
                          Check-in
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/events/${event.id}`}>View Public Page</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(event.id, event.title)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Event
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
