import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/** Local-first: no login required — redirect to dashboard */
const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    navigate(user ? '/dashboard' : '/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="font-mono-stat text-sm text-muted-foreground animate-pulse">◈ Entering Founder OS...</p>
    </div>
  );
};

export default Auth;
