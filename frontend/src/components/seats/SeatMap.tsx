import { useMemo } from 'react';
import { Seat as SeatType } from '@/types/seat';
import { SeatSection } from './SeatSection';
import { SeatLegend } from './SeatLegend';

interface SeatMapProps {
  seats: SeatType[];
  selectedSeatIds: number[];
  lockedSeatIds: number[];
  onSeatClick: (seat: SeatType) => void;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  selectedSeatIds,
  lockedSeatIds,
  onSeatClick,
}) => {
  // Group seats by section
  const seatsBySection = useMemo(() => {
    return seats.reduce((acc, seat) => {
      if (!acc[seat.section]) {
        acc[seat.section] = [];
      }
      acc[seat.section].push(seat);
      return acc;
    }, {} as Record<string, SeatType[]>);
  }, [seats]);

  const sections = Object.entries(seatsBySection);

  if (seats.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No seats available for this event</p>
      </div>
    );
  }

  // Calculate viewBox dimensions based on sections and seats
  const viewBoxWidth = 1200;
  const viewBoxHeight = Math.max(600, sections.length * 300);

  return (
    <div className="space-y-4">
      <SeatLegend />

      <div className="border rounded-lg p-4 bg-white overflow-x-auto">
        {/* Stage indicator */}
        <div className="mb-8 text-center">
          <div className="inline-block px-8 py-2 bg-gray-200 rounded">
            <span className="font-semibold">STAGE</span>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-auto"
          style={{ minHeight: '400px' }}
        >
          {sections.map(([sectionName, sectionSeats], index) => (
            <SeatSection
              key={sectionName}
              sectionName={sectionName}
              seats={sectionSeats}
              x={50}
              y={index * 300 + 50}
              selectedSeatIds={selectedSeatIds}
              lockedSeatIds={lockedSeatIds}
              onSeatClick={onSeatClick}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};
