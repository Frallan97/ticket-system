import { Seat as SeatType } from '@/types/seat';

interface SeatProps {
  seat: SeatType;
  status: 'available' | 'selected' | 'locked' | 'sold';
  x: number;
  y: number;
  onClick: () => void;
}

export const Seat: React.FC<SeatProps> = ({ seat, status, x, y, onClick }) => {
  const statusColors = {
    available: 'fill-green-500 hover:fill-green-600 cursor-pointer',
    selected: 'fill-blue-500 cursor-pointer',
    locked: 'fill-gray-400 cursor-not-allowed',
    sold: 'fill-red-500 cursor-not-allowed',
  };

  const isClickable = status === 'available' || status === 'selected';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={isClickable ? onClick : undefined}
      className={statusColors[status]}
    >
      <rect
        width="24"
        height="24"
        rx="4"
        className="transition-colors"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        className="text-[10px] fill-white pointer-events-none select-none"
      >
        {seat.seat_number}
      </text>
    </g>
  );
};
