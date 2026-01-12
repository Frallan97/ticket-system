import { useForm } from 'react-hook-form';
import { Event, CreateEventRequest, UpdateEventRequest } from '@/types/event';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

interface EventFormProps {
  event?: Event;
  onSubmit: (data: CreateEventRequest | UpdateEventRequest) => Promise<void>;
  isSubmitting: boolean;
}

export const EventForm: React.FC<EventFormProps> = ({ event, onSubmit, isSubmitting }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: event ? {
      title: event.title,
      description: event.description || '',
      venue_name: event.venue_name,
      venue_address: event.venue_address || '',
      event_date: event.event_date ? new Date(event.event_date).toISOString().slice(0, 16) : '',
      doors_open: event.doors_open ? new Date(event.doors_open).toISOString().slice(0, 16) : '',
      has_seating: event.has_seating,
      max_capacity: event.max_capacity || undefined,
    } : {
      has_seating: false,
    },
  });

  const onSubmitForm = async (data: any) => {
    const formattedData = {
      ...data,
      event_date: new Date(data.event_date).toISOString(),
      doors_open: data.doors_open ? new Date(data.doors_open).toISOString() : undefined,
      max_capacity: data.max_capacity ? parseInt(data.max_capacity) : undefined,
    };
    await onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              {...register('title', { required: 'Title is required' })}
              placeholder="Enter event title"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter event description"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Venue Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="venue_name">Venue Name *</Label>
            <Input
              id="venue_name"
              {...register('venue_name', { required: 'Venue name is required' })}
              placeholder="Enter venue name"
            />
            {errors.venue_name && (
              <p className="text-sm text-destructive mt-1">{errors.venue_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="venue_address">Venue Address</Label>
            <Textarea
              id="venue_address"
              {...register('venue_address')}
              placeholder="Enter venue address"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Date & Time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="event_date">Event Date & Time *</Label>
            <Input
              id="event_date"
              type="datetime-local"
              {...register('event_date', { required: 'Event date is required' })}
            />
            {errors.event_date && (
              <p className="text-sm text-destructive mt-1">{errors.event_date.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="doors_open">Doors Open</Label>
            <Input
              id="doors_open"
              type="datetime-local"
              {...register('doors_open')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity & Seating</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="max_capacity">Maximum Capacity</Label>
            <Input
              id="max_capacity"
              type="number"
              {...register('max_capacity')}
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="has_seating"
              {...register('has_seating')}
            />
            <Label htmlFor="has_seating">Assigned Seating</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
        </Button>
      </div>
    </form>
  );
};
