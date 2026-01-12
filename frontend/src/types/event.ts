// Event types matching backend models

export interface Event {
  id: number;
  organizer_id: string;
  title: string;
  description: string | null;
  venue_name: string;
  venue_address: string | null;
  event_date: string;
  doors_open: string | null;
  has_seating: boolean;
  image_url: string | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  max_capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  venue_name: string;
  venue_address?: string;
  event_date: string;
  doors_open?: string;
  has_seating: boolean;
  max_capacity?: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  venue_name?: string;
  venue_address?: string;
  event_date?: string;
  doors_open?: string;
  has_seating?: boolean;
  status?: 'draft' | 'published' | 'cancelled' | 'completed';
  max_capacity?: number;
}
