import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ticket, User } from 'lucide-react';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold">
          <Ticket className="h-6 w-6" />
          <span>Ticket System</span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/events" className="hover:text-primary">
            Events
          </Link>

          {isAuthenticated ? (
            <>
              <Link to="/bookings" className="hover:text-primary">
                My Bookings
              </Link>
              <Link to="/my-tickets" className="hover:text-primary">
                My Tickets
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user?.name || user?.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/organizer">Organizer Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild>
              <Link to="/login">Login</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};
