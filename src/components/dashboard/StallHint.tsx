import { Zap, ArrowRight, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { UserRole } from '@/hooks/useProfile';

interface Props {
  recommendedStalls: number;
  userRole: UserRole | null;
}

export default function StallHint({ recommendedStalls, userRole }: Props) {
  const navigate = useNavigate();

  return (
    <div className="glass-card px-5 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Suggested: <span className="font-mono font-bold text-primary">{recommendedStalls}</span> stalls
          </span>
        </div>
        {userRole === 'pro' && (
          <button
            onClick={() => navigate('/portfolio?tab=sizer')}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open Stall Sizer <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {userRole === 'plus' && (
          <button
            onClick={() => navigate('/stall-sizer')}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open Stall Sizer <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {(userRole === 'free' || !userRole) && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" /> Upgrade to Plus for full Stall Sizer
          </span>
        )}
      </div>
    </div>
  );
}
