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
      <section className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6">
              Your Gateway to Amazing Events
            </h1>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-90 px-4">
              Discover concerts, cinema, and events with seamless ticket booking
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
                <Link to="/events">Browse Events</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="w-full sm:w-auto border-primary-foreground/20 hover:bg-primary-foreground/10">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-6 rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-4">
                <Ticket className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Easy Booking</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Book tickets in seconds with our streamlined checkout process
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-4">
                <Calendar className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Seat Selection</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Choose your perfect seats with our interactive seat map
              </p>
            </div>

            <div className="text-center p-6 rounded-lg bg-card hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-4">
                <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-2">Secure QR Codes</h3>
              <p className="text-sm sm:text-base text-muted-foreground">
                Get instant digital tickets with secure QR codes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events Section */}
      <section className="py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">Featured Events</h2>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link to="/events">View All Events</Link>
            </Button>
          </div>

          <EventList events={events} loading={loading} />
        </div>
      </section>
    </div>
  );
};
