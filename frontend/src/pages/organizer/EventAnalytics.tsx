import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventsApi } from '@/api/events';
import { Event } from '@/types/event';
import { EventAnalytics as AnalyticsData } from '@/types/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, Users, Ticket, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV } from '@/lib/exportUtils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f'];

export const EventAnalytics = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const eventId = parseInt(id || '0');

  const [event, setEvent] = useState<Event | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
  }, [eventId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [eventData, analyticsData] = await Promise.all([
        eventsApi.getById(eventId),
        eventsApi.getAnalytics(eventId),
      ]);
      setEvent(eventData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
      navigate('/organizer/events');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAnalytics = () => {
    if (!analytics || !event) return;

    try {
      // Prepare export data
      const exportData = [
        {
          'Event': event.title,
          'Total Bookings': analytics.total_bookings,
          'Total Tickets Sold': analytics.total_tickets_sold,
          'Total Revenue': `$${analytics.total_revenue.toFixed(2)}`,
          'Checked In': analytics.checked_in_count,
          'Check-in Rate': `${analytics.check_in_rate.toFixed(1)}%`,
        },
        {},
        { 'Ticket Type Breakdown': '' },
        ...analytics.ticket_type_breakdown.map(tt => ({
          'Type': tt.type_name,
          'Sold': tt.sold,
          'Revenue': `$${tt.revenue.toFixed(2)}`,
        })),
        {},
        { 'Sales Over Time': '' },
        ...analytics.sales_over_time.map(sale => ({
          'Date': new Date(sale.date).toLocaleDateString(),
          'Bookings': sale.bookings,
          'Tickets': sale.tickets,
          'Revenue': `$${sale.revenue.toFixed(2)}`,
        })),
      ];

      const filename = `${event.title.replace(/[^a-z0-9]/gi, '_')}_analytics_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(exportData, filename);
      toast.success('Analytics exported successfully');
    } catch (error) {
      console.error('Failed to export analytics:', error);
      toast.error('Failed to export analytics');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!event || !analytics) {
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

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{event.title} - Analytics</h1>
        <p className="text-muted-foreground">
          Event Date: {new Date(event.event_date).toLocaleDateString()} at{' '}
          {new Date(event.event_date).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics.total_revenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {analytics.total_bookings} bookings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_tickets_sold}</div>
            <p className="text-xs text-muted-foreground">
              {event.max_capacity
                ? `${((analytics.total_tickets_sold / event.max_capacity) * 100).toFixed(1)}% of capacity`
                : 'No capacity limit'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_bookings}</div>
            <p className="text-xs text-muted-foreground">
              Avg {analytics.total_bookings > 0 ? (analytics.total_tickets_sold / analytics.total_bookings).toFixed(1) : 0} tickets per booking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-in Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.check_in_rate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.checked_in_count} of {analytics.total_tickets_sold} checked in
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Ticket Type Breakdown - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Type Distribution</CardTitle>
            <CardDescription>Sales breakdown by ticket type</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.ticket_type_breakdown.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No ticket sales yet
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.ticket_type_breakdown}
                      dataKey="sold"
                      nameKey="type_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.type_name}: ${entry.sold}`}
                    >
                      {analytics.ticket_type_breakdown.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {analytics.ticket_type_breakdown.map((breakdown, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                          }}
                        />
                        <span>{breakdown.type_name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium">${breakdown.revenue.toFixed(2)}</span>
                        <span className="text-muted-foreground ml-2">
                          ({breakdown.sold} tickets)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Ticket Type - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Ticket Type</CardTitle>
            <CardDescription>Compare revenue across ticket types</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.ticket_type_breakdown.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sales data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.ticket_type_breakdown}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type_name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="Revenue ($)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Over Time - Line Chart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
          <CardDescription>Revenue and tickets sold over the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.sales_over_time.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sales data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={analytics.sales_over_time
                  .slice()
                  .reverse()
                  .map((sale) => ({
                    ...sale,
                    date: new Date(sale.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    }),
                  }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Revenue ($)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tickets"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  name="Tickets Sold"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link to={`/organizer/events/${eventId}/edit`}>Edit Event</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/organizer/events/${eventId}/checkin`}>Go to Check-in</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/organizer/events/${eventId}/bookings`}>View All Bookings</Link>
        </Button>
        <Button
          variant="outline"
          onClick={() => handleExportAnalytics()}
        >
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>
    </div>
  );
};
