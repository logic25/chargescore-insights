import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, type UserRole } from '@/hooks/useProfile';

interface Props {
  requiredRole: UserRole;
  children: React.ReactNode;
}

export default function RoleGuard({ requiredRole, children }: Props) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, isAtLeast } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if (!isAtLeast(requiredRole)) {
      navigate('/pricing', { replace: true });
    }
  }, [user, authLoading, profileLoading, profile, requiredRole]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user || !isAtLeast(requiredRole)) return null;

  return <>{children}</>;
}
