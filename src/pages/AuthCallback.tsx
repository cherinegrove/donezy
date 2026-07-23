import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          navigate('/login', { replace: true });
          return;
        }

        if (data?.session) {
          console.log('OAuth login successful');
          navigate('/', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('Unexpected error in auth callback:', error);
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Signing you in...</h2>
        <p className="text-muted-foreground">Please wait while we authenticate your Google account.</p>
      </div>
    </div>
  );
}
