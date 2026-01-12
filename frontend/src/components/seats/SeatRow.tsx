import { Seat as SeatType } from '@/types/seat';
import { Seat } from './Seat';

interface SeatRowProps {
  seats: SeatType[];
  rowLabel: string;
  y: number;
  selectedSeatIds: number[];
  lockedSeatIds: number[];
  onSeatClick: (seat: SeatType) => void;
}

export const SeatRow: React.FC<SeatRowProps> = ({
  seats,
  rowLabel,
  y,
  selectedSeatIds,
  lockedSeatIds,
  onSeatClick,
}) => {
  const getSeatStatus = (seat: SeatType): 'available' | 'selected' | 'locked' | 'sold' => {
    if (!seat.is_available) return 'sold';
    if (lockedSeatIds.includes(seat.id)) return 'locked';
    if (selectedSeatIds.includes(seat.id)) return 'selected';
    return 'available';
  };

  return (
    <g transform={`translate(0, ${y})`}>
      {/* Row label */}
      <text x="0" y="16" className="text-sm font-semibold fill-current">
        {rowLabel}
      </text>

      {/* Seats */}
      {seats.map((seat, index) => (
        <Seat
          key={seat.id}
          seat={seat}
          status={getSeatStatus(seat)}
          x={index * 32 + 50}
          y={0}
          onClick={() => onSeatClick(seat)}
        />
      ))}
    </g>
  );
};
