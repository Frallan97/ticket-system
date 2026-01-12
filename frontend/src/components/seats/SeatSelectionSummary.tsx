import { Seat } from '@/types/seat';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface SeatSelectionSummaryProps {
  selectedSeats: Seat[];
  onRemoveSeat: (seatId: number) => void;
  onContinue: () => void;
  totalPrice: number;
}

export const SeatSelectionSummary: React.FC<SeatSelectionSummaryProps> = ({
  selectedSeats,
  onRemoveSeat,
  onContinue,
  totalPrice,
}) => {
  if (selectedSeats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Selected Seats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No seats selected yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selected Seats ({selectedSeats.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {selectedSeats.map((seat) => (
          <div
            key={seat.id}
            className="flex items-center justify-between p-2 bg-muted rounded"
          >
            <span className="font-medium">
              {seat.section} - Row {seat.row_label}, Seat {seat.seat_number}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemoveSeat(seat.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-lg font-bold">
            <span>Total:</span>
            <span>${totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onContinue} className="w-full" size="lg">
          Continue to Checkout
        </Button>
      </CardFooter>
    </Card>
  );
};
