import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { migrateGuestCart } = useCart();

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('access_token');
      const state = searchParams.get('state'); // Return URL from OAuth

      if (!accessToken) {
        navigate('/login?error=auth_failed');
        return;
      }

      try {
        await login(accessToken);

        // Migrate guest cart to authenticated user
        await migrateGuestCart();

        // Get return URL from state parameter or localStorage fallback
        const returnUrl = state
          ? decodeURIComponent(state)
          : localStorage.getItem('auth_return_url') || '/';

        localStorage.removeItem('auth_return_url');
        navigate(returnUrl);
      } catch (error) {
        console.error('Login failed:', error);
        navigate('/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate, migrateGuestCart]);

  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold">Authenticating...</h1>
      <p className="text-muted-foreground mt-2">Please wait while we log you in.</p>
    </div>
  );
};
