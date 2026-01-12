import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventsApi } from '@/api/events';
import { ticketTypesApi } from '@/api/ticketTypes';
import { Event, UpdateEventRequest } from '@/types/event';
import { TicketType, CreateTicketTypeRequest, UpdateTicketTypeRequest } from '@/types/ticketType';
import { EventForm } from '@/components/events/EventForm';
import { ImageUpload } from '@/components/events/ImageUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const EditEvent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = parseInt(id || '0');

  const [event, setEvent] = useState<Event | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  // Ticket type dialog state
  const [ticketTypeDialogOpen, setTicketTypeDialogOpen] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(null);

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const [eventData, ticketTypesData] = await Promise.all([
        eventsApi.getById(eventId),
        ticketTypesApi.getByEventId(eventId),
      ]);
      setEvent(eventData);
      setTicketTypes(ticketTypesData);
    } catch (error) {
      console.error('Failed to fetch event:', error);
      toast.error('Failed to load event');
      navigate('/organizer/events');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEvent = async (data: UpdateEventRequest) => {
    setIsSubmitting(true);

    try {
      const updatedEvent = await eventsApi.update(eventId, data);
      setEvent(updatedEvent);
      toast.success('Event updated successfully');
    } catch (error: any) {
      console.error('Failed to update event:', error);
      toast.error(error.response?.data?.error || 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      const response = await eventsApi.uploadImage(eventId, file);
      toast.success('Image uploaded successfully');
      fetchEventData();
      return response;
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      toast.error(error.response?.data?.error || 'Failed to upload image');
      throw error;
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await eventsApi.update(eventId, { status: newStatus });
      setEvent((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success(`Event ${newStatus}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDeleteTicketType = async (ticketTypeId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ticket type "${name}"?`)) {
      return;
    }

    try {
      await ticketTypesApi.delete(ticketTypeId);
      toast.success('Ticket type deleted');
      fetchEventData();
    } catch (error: any) {
      console.error('Failed to delete ticket type:', error);
      toast.error(error.response?.data?.error || 'Failed to delete ticket type');
    }
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
        onClick={() => navigate('/organizer/events')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
          <div className="flex items-center gap-2">
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
            <Button variant="outline" size="sm" asChild>
              <Link to={`/events/${event.id}`}>View Public Page</Link>
            </Button>
          </div>
        </div>

        <Select value={event.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="details">Event Details</TabsTrigger>
          <TabsTrigger value="image">Event Image</TabsTrigger>
          <TabsTrigger value="tickets">Ticket Types</TabsTrigger>
          {event.has_seating && <TabsTrigger value="seats">Seats</TabsTrigger>}
        </TabsList>

        <TabsContent value="details">
          <div className="max-w-3xl">
            <EventForm
              event={event}
              onSubmit={handleUpdateEvent}
              isSubmitting={isSubmitting}
            />
          </div>
        </TabsContent>

        <TabsContent value="image">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle>Event Image</CardTitle>
              <CardDescription>
                Upload a cover image for your event. Recommended size: 1200x630px
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload
                eventId={eventId}
                currentImageUrl={event.image_url || undefined}
                onUpload={handleImageUpload}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <div className="max-w-4xl">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ticket Types</CardTitle>
                    <CardDescription>
                      Create and manage different ticket types for your event
                    </CardDescription>
                  </div>
                  <Dialog open={ticketTypeDialogOpen} onOpenChange={setTicketTypeDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingTicketType(null)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ticket Type
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <TicketTypeForm
                        eventId={eventId}
                        ticketType={editingTicketType}
                        onSuccess={() => {
                          setTicketTypeDialogOpen(false);
                          setEditingTicketType(null);
                          fetchEventData();
                        }}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {ticketTypes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No ticket types created yet
                    </p>
                    <Button onClick={() => setTicketTypeDialogOpen(true)}>
                      Create First Ticket Type
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {ticketTypes.map((ticketType) => (
                      <div
                        key={ticketType.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{ticketType.name}</h3>
                            {!ticketType.is_active && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          {ticketType.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {ticketType.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm">
                            <span className="font-medium">
                              ${ticketType.price.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">
                              {ticketType.quantity_sold} / {ticketType.quantity_available} sold
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTicketType(ticketType);
                              setTicketTypeDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDeleteTicketType(ticketType.id, ticketType.name)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {event.has_seating && (
          <TabsContent value="seats">
            <Card className="max-w-4xl">
              <CardHeader>
                <CardTitle>Seat Management</CardTitle>
                <CardDescription>
                  Manage seats and seating layout for this event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Seat management interface - Coming soon
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the bulk create seats API endpoint to add seats programmatically
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// Ticket Type Form Component
interface TicketTypeFormProps {
  eventId: number;
  ticketType: TicketType | null;
  onSuccess: () => void;
}

const TicketTypeForm: React.FC<TicketTypeFormProps> = ({
  eventId,
  ticketType,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: ticketType?.name || '',
    description: ticketType?.description || '',
    price: ticketType?.price || 0,
    quantity_available: ticketType?.quantity_available || 0,
    is_active: ticketType?.is_active ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (ticketType) {
        await ticketTypesApi.update(ticketType.id, formData as UpdateTicketTypeRequest);
        toast.success('Ticket type updated');
      } else {
        await ticketTypesApi.create(eventId, {
          ...formData,
          event_id: eventId,
        } as CreateTicketTypeRequest);
        toast.success('Ticket type created');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save ticket type:', error);
      toast.error(error.response?.data?.error || 'Failed to save ticket type');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {ticketType ? 'Edit Ticket Type' : 'Create Ticket Type'}
        </DialogTitle>
        <DialogDescription>
          {ticketType
            ? 'Update the ticket type details below'
            : 'Add a new ticket type for your event'}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., General Admission, VIP, Early Bird"
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Optional description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price ($) *</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) =>
                setFormData({ ...formData, price: parseFloat(e.target.value) })
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="quantity">Available Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={formData.quantity_available}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  quantity_available: parseInt(e.target.value),
                })
              }
              required
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={formData.is_active}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, is_active: checked })
            }
          />
          <Label htmlFor="is_active">Active (available for purchase)</Label>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving...' : ticketType ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </>
  );
};
