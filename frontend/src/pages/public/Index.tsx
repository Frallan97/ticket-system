import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Event } from '@/types/event';
import { eventsApi } from '@/api/events';
import { EventList } from '@/components/events/EventList';
import { Button } from '@/components/ui/button';
import { Ticket, Calendar, Shield } from 'lucide-react';

export const Index = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventsApi.getAll({ status: 'published' });
        setEvents(data.slice(0, 6)); // Show only 6 featured events
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-4">
            Your Gateway to Amazing Events
          </h1>
          <p className="text-xl mb-8 opacity-90">
            Discover concerts, cinema, and events with seamless ticket booking
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/events">Browse Events</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Ticket className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
              <p className="text-muted-foreground">
                Book tickets in seconds with our streamlined checkout process
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Calendar className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Seat Selection</h3>
              <p className="text-muted-foreground">
                Choose your perfect seats with our interactive seat map
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Secure QR Codes</h3>
              <p className="text-muted-foreground">
                Get instant digital tickets with secure QR codes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">Featured Events</h2>
            <Button variant="outline" asChild>
              <Link to="/events">View All Events</Link>
            </Button>
          </div>

          <EventList events={events} loading={loading} />
        </div>
      </section>
    </div>
  );
};
