import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RoleGuard from '@/components/RoleGuard';
import StallSizer from '@/components/portfolio/StallSizer';
import { toast } from 'sonner';
import type { SiteRow } from '@/lib/waterfallCalc';

export default function StallSizerPage() {
  const navigate = useNavigate();

  const handleAddToPortfolio = (_site: Omit<SiteRow, 'id'>) => {
    toast.info('Portfolio builder is available on ChargeScore Pro');
    navigate('/pricing');
  };

  return (
    <RoleGuard requiredRole="plus">
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex h-14 items-center gap-3 px-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">Stall Sizer</span>
          </div>
        </header>
        <main className="container max-w-5xl py-6">
          <StallSizer onAddToPortfolio={handleAddToPortfolio} />
        </main>
      </div>
    </RoleGuard>
  );
}
