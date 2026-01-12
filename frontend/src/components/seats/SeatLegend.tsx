export const SeatLegend = () => {
  const legendItems = [
    { status: 'Available', color: 'bg-green-500' },
    { status: 'Selected', color: 'bg-blue-500' },
    { status: 'Locked', color: 'bg-gray-400' },
    { status: 'Sold', color: 'bg-red-500' },
  ];

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-lg">
      {legendItems.map((item) => (
        <div key={item.status} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded ${item.color}`} />
          <span className="text-sm font-medium">{item.status}</span>
        </div>
      ))}
    </div>
  );
};
