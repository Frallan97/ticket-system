import { QRCodeSVG } from 'qrcode.react';
import { Ticket } from '@/types/ticket';

interface TicketQRCodeProps {
  ticket: Ticket;
}

export const TicketQRCode: React.FC<TicketQRCodeProps> = ({ ticket }) => {
  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <QRCodeSVG
        value={ticket.qr_code_data}
        size={256}
        level="H"
        includeMargin={true}
      />
      <p className="text-sm font-mono text-muted-foreground">
        {ticket.ticket_code}
      </p>
    </div>
  );
};
