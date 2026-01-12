import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        navigate('/login?error=auth_failed');
        return;
      }

      try {
        await login(accessToken, refreshToken);
        navigate('/');
      } catch (error) {
        console.error('Login failed:', error);
        navigate('/login?error=auth_failed');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold">Authenticating...</h1>
      <p className="text-muted-foreground mt-2">Please wait while we log you in.</p>
    </div>
  );
};
