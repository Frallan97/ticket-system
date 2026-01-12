import { useState, useEffect, useCallback } from 'react';
import { Seat } from '@/types/seat';
import { seatsApi } from '@/api/seats';
import { bookingsApi } from '@/api/bookings';

interface UseSeatsOptions {
  eventId: number;
  enabled: boolean;
}

export const useSeats = ({ eventId, enabled }: UseSeatsOptions) => {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [lockedSeatIds, setLockedSeatIds] = useState<number[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [lockExpiration, setLockExpiration] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch seats
  const fetchSeats = useCallback(async () => {
    if (!enabled) return;

    try {
      const data = await seatsApi.getSeats(eventId);
      setSeats(data);

      // Update locked seats (exclude seats locked by this session)
      const locked = data
        .filter((seat) => !seat.is_available && !selectedSeatIds.includes(seat.id))
        .map((seat) => seat.id);
      setLockedSeatIds(locked);
    } catch (err) {
      console.error('Failed to fetch seats:', err);
    }
  }, [eventId, enabled, selectedSeatIds]);

  // Initial fetch
  useEffect(() => {
    fetchSeats();
  }, [fetchSeats]);

  // Poll seat availability every 10 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      fetchSeats();
    }, 10000);

    return () => clearInterval(interval);
  }, [enabled, fetchSeats]);

  // Lock seats on backend
  const lockSeats = useCallback(async (seatIds: number[]) => {
    if (seatIds.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await bookingsApi.lockSeats({
        event_id: eventId,
        seat_ids: seatIds,
        session_id: sessionId,
      });

      setLockExpiration(new Date(response.expires_at));
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to lock seats');
      return false;
    } finally {
      setLoading(false);
    }
  }, [eventId, sessionId]);

  // Toggle seat selection
  const toggleSeat = useCallback(async (seat: Seat) => {
    if (!seat.is_available) return;

    const isSelected = selectedSeatIds.includes(seat.id);

    if (isSelected) {
      // Deselect seat
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.id));
    } else {
      // Select seat
      const newSelectedIds = [...selectedSeatIds, seat.id];
      setSelectedSeatIds(newSelectedIds);

      // Lock seats immediately
      await lockSeats(newSelectedIds);
    }
  }, [selectedSeatIds, lockSeats]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedSeatIds([]);
    setLockExpiration(null);
  }, []);

  // Get selected seats
  const selectedSeats = seats.filter((seat) => selectedSeatIds.includes(seat.id));

  // Calculate time remaining
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!lockExpiration) {
      setTimeRemaining(0);
      return;
    }

    const updateTimeRemaining = () => {
      const now = new Date();
      const diff = lockExpiration.getTime() - now.getTime();

      if (diff <= 0) {
        // Lock expired
        setTimeRemaining(0);
        clearSelection();
        return;
      }

      setTimeRemaining(Math.floor(diff / 1000)); // seconds
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [lockExpiration, clearSelection]);

  return {
    seats,
    selectedSeats,
    selectedSeatIds,
    lockedSeatIds,
    sessionId,
    lockExpiration,
    timeRemaining,
    loading,
    error,
    toggleSeat,
    clearSelection,
    refetch: fetchSeats,
  };
};
