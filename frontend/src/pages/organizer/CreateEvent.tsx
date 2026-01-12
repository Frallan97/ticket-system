import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '@/api/events';
import { CreateEventRequest } from '@/types/event';
import { EventForm } from '@/components/events/EventForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export const CreateEvent = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: CreateEventRequest) => {
    setIsSubmitting(true);

    try {
      const event = await eventsApi.create(data);
      toast.success('Event created successfully');
      navigate(`/organizer/events/${event.id}/edit`);
    } catch (error: any) {
      console.error('Failed to create event:', error);
      toast.error(error.response?.data?.error || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold mb-2">Create New Event</h1>
        <p className="text-muted-foreground mb-8">
          Fill in the details below to create a new event. You can add ticket types and seats after creation.
        </p>

        <EventForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
};
