import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, MapPin, Trash2, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import AddressAutocomplete from '@/components/AddressAutocomplete';

type Analysis = Tables<'analyses'>;

const MyAnalyses = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchAnalyses();
  }, [user, authLoading]);

  const fetchAnalyses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setAnalyses(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('analyses').delete().eq('id', id);
    setAnalyses(prev => prev.filter(a => a.id !== id));
    setDeleting(null);
  };

  const handleOpen = (a: Analysis) => {
    navigate(`/dashboard?address=${encodeURIComponent(a.address)}&lat=${a.lat}&lng=${a.lng}&state=${a.state}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 60) return 'text-amber-500';
    return 'text-destructive';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">My Projects</span>
          </div>
          <span className="text-sm text-muted-foreground">{analyses.length} projects</span>
        </div>
      </header>

      <main className="container max-w-4xl py-8">
        {analyses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="font-heading text-xl font-bold text-foreground">No projects yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Search for an address on the home page to run your first site analysis.
            </p>
            <Button className="mt-6" onClick={() => navigate('/')}>
              Analyze a Site
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Comparison header row */}
            <div className="hidden sm:grid grid-cols-[1fr_80px_80px_80px_80px] gap-3 px-4 text-[10px] uppercase tracking-wider text-muted-foreground/60">
              <span>Address</span>
              <span className="text-center">Score</span>
              <span className="text-center">Grade</span>
              <span className="text-center">Stalls</span>
              <span className="text-center">Actions</span>
            </div>

            {analyses.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleOpen(a)}
              >
                <div className="sm:grid sm:grid-cols-[1fr_80px_80px_80px_80px] sm:gap-3 sm:items-center">
                  {/* Address */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{a.address}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{a.state}</span>
                      <span className="text-[10px] text-muted-foreground/40">•</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-center mt-2 sm:mt-0">
                    <span className={`font-mono text-xl font-bold ${getScoreColor(a.charge_score)}`}>
                      {a.charge_score}
                    </span>
                  </div>

                  {/* Grade */}
                  <div className="text-center mt-1 sm:mt-0">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      a.charge_score >= 80 ? 'bg-primary/10 text-primary' :
                      a.charge_score >= 60 ? 'bg-amber-500/10 text-amber-500' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {getScoreGrade(a.charge_score)}
                    </span>
                  </div>

                  {/* Stalls */}
                  <div className="text-center mt-1 sm:mt-0">
                    <span className="font-mono text-sm text-foreground">{a.num_stalls ?? '—'}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1 mt-2 sm:mt-0" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpen(a)}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(a.id)}
                      disabled={deleting === a.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyAnalyses;
