import { Seat as SeatType } from '@/types/seat';
import { SeatRow } from './SeatRow';

interface SeatSectionProps {
  sectionName: string;
  seats: SeatType[];
  x: number;
  y: number;
  selectedSeatIds: number[];
  lockedSeatIds: number[];
  onSeatClick: (seat: SeatType) => void;
}

export const SeatSection: React.FC<SeatSectionProps> = ({
  sectionName,
  seats,
  x,
  y,
  selectedSeatIds,
  lockedSeatIds,
  onSeatClick,
}) => {
  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    if (!acc[seat.row_label]) {
      acc[seat.row_label] = [];
    }
    acc[seat.row_label].push(seat);
    return acc;
  }, {} as Record<string, SeatType[]>);

  const rows = Object.entries(seatsByRow).sort(([a], [b]) => a.localeCompare(b));

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Section title */}
      <text x="100" y="0" className="text-lg font-bold fill-current">
        {sectionName}
      </text>

      {/* Rows */}
      {rows.map(([rowLabel, rowSeats], index) => (
        <SeatRow
          key={rowLabel}
          seats={rowSeats}
          rowLabel={rowLabel}
          y={index * 40 + 30}
          selectedSeatIds={selectedSeatIds}
          lockedSeatIds={lockedSeatIds}
          onSeatClick={onSeatClick}
        />
      ))}
    </g>
  );
};
