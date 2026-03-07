import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowLeft, TrendingUp, Sliders, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PortfolioSite {
  id: string;
  address: string;
  state: string;
  charge_score: number;
  num_stalls: number | null;
  kwh_per_stall_per_day: number | null;
  price_per_kwh: number | null;
  electricity_cost: number | null;
  total_project_cost: number | null;
  estimated_incentives: number | null;
  net_investment: number | null;
  noi: number | null;
  owner_monthly: number | null;
  ms_monthly: number | null;
  coc: number | null;
  npv: number | null;
  margin_kwh: number | null;
  owner_split_pct: number | null;
  created_at: string;
}

const fmt = (n: number | null | undefined) => {
  if (n == null || !isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const pct = (n: number | null | undefined) => {
  if (n == null || !isFinite(n)) return '—';
  return `${n.toFixed(1)}%`;
};

const SCENARIO_OPTIONS = [
  { value: '0.50', label: '0.50x (Bear)' },
  { value: '0.75', label: '0.75x (Conservative)' },
  { value: '1.00', label: '1.00x (Base)' },
  { value: '1.25', label: '1.25x (Bull)' },
];

const COLUMNS = [
  { key: 'address', label: 'Site', align: 'left' as const },
  { key: 'charge_score', label: 'Score', align: 'center' as const },
  { key: 'num_stalls', label: 'Stalls', align: 'center' as const },
  { key: 'total_project_cost', label: 'Project Cost', align: 'right' as const },
  { key: 'estimated_incentives', label: 'Incentives', align: 'right' as const },
  { key: 'net_investment', label: 'OOP', align: 'right' as const },
  { key: 'noi', label: 'NOI/yr', align: 'right' as const },
  { key: 'owner_monthly', label: 'Owner/mo', align: 'right' as const },
  { key: 'ms_monthly', label: 'MS/mo', align: 'right' as const },
  { key: 'coc', label: 'CoC', align: 'right' as const },
  { key: 'npv', label: 'NPV', align: 'right' as const },
  { key: 'margin_kwh', label: '$/kWh', align: 'right' as const },
];

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-primary';
  if (score >= 60) return 'text-amber-500';
  return 'text-destructive';
};

const Portfolio = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState<PortfolioSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState('1.00');
  const [deleting, setDeleting] = useState<string | null>(null);

  const multiplier = parseFloat(scenario);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    fetchSites();
  }, [user, authLoading]);

  const fetchSites = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setSites(data as any);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('analyses').delete().eq('id', id);
    setSites(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
    toast.success('Site removed');
  };

  const scaled = useMemo(() => sites.map(s => ({
    ...s,
    noi: s.noi != null ? s.noi * multiplier : null,
    owner_monthly: s.owner_monthly != null ? s.owner_monthly * multiplier : null,
    ms_monthly: s.ms_monthly != null ? s.ms_monthly * multiplier : null,
    npv: s.npv != null ? s.npv * multiplier : null,
    coc: s.coc != null ? s.coc * multiplier : null,
  })), [sites, multiplier]);

  const totals = useMemo(() => {
    const sum = (key: keyof PortfolioSite) => scaled.reduce((acc, s) => acc + ((s[key] as number) ?? 0), 0);
    return {
      totalProjectCost: sum('total_project_cost'),
      estimatedIncentives: sum('estimated_incentives'),
      netInvestment: sum('net_investment'),
      noi: sum('noi'),
      ownerMonthly: sum('owner_monthly'),
      msMonthly: sum('ms_monthly'),
      npv: sum('npv'),
      stalls: scaled.reduce((acc, s) => acc + (s.num_stalls ?? 0), 0),
    };
  }, [scaled]);

  // Composite ranking: average of NPV rank, CoC rank, Score rank (lower = better)
  const ranked = useMemo(() => {
    if (scaled.length === 0) return [];
    const byNpv = [...scaled].sort((a, b) => (b.npv ?? -Infinity) - (a.npv ?? -Infinity));
    const byCoc = [...scaled].sort((a, b) => (b.coc ?? -Infinity) - (a.coc ?? -Infinity));
    const byScore = [...scaled].sort((a, b) => b.charge_score - a.charge_score);
    return scaled.map(s => {
      const npvRank = byNpv.findIndex(x => x.id === s.id) + 1;
      const cocRank = byCoc.findIndex(x => x.id === s.id) + 1;
      const scoreRank = byScore.findIndex(x => x.id === s.id) + 1;
      return { ...s, compositeRank: (npvRank + cocRank + scoreRank) / 3 };
    }).sort((a, b) => a.compositeRank - b.compositeRank);
  }, [scaled]);

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
      <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading text-lg font-bold">Portfolio</span>
            <span className="text-sm text-muted-foreground ml-2">{sites.length} sites</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-muted-foreground" />
              <Select value={scenario} onValueChange={setScenario}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCENARIO_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/my-analyses')}>
              My Projects
            </Button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="font-heading text-xl font-bold text-foreground">No saved sites</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Save site analyses from the dashboard to compare them here.
            </p>
            <Button className="mt-4" onClick={() => navigate('/')}>Analyze a Site</Button>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <TooltipProvider>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Stalls</p>
                <p className="font-mono text-2xl font-bold text-foreground">{totals.stalls}</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio NOI</p>
                <p className={`font-mono text-2xl font-bold ${totals.noi >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totals.noi)}</p>
                <p className="text-[10px] text-muted-foreground">/yr</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Owner Monthly</p>
                <p className={`font-mono text-2xl font-bold ${totals.ownerMonthly >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totals.ownerMonthly)}</p>
                <p className="text-[10px] text-muted-foreground">/mo total</p>
              </div>
              <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio NPV</p>
                <p className={`font-mono text-2xl font-bold ${totals.npv >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totals.npv)}</p>
              </div>
            </div>
            </TooltipProvider>

            {/* Comparison table */}
            <div className="rounded-xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-8">#</th>
                    {COLUMNS.map(col => (
                      <th key={col.key} className={`px-3 py-2.5 text-${col.align} text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap`}>
                        {col.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-16">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((s, i) => (
                    <tr
                      key={s.id}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/dashboard?address=${encodeURIComponent(s.address)}&lat=${(s as any).lat}&lng=${(s as any).lng}&state=${s.state}`)}
                    >
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5 max-w-[220px]">
                        <p className="text-sm font-medium text-foreground truncate">{s.address}</p>
                        <p className="text-[10px] text-muted-foreground">{s.state} · {s.owner_split_pct ?? 70}/{100 - (s.owner_split_pct ?? 70)} split</p>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`font-mono text-sm font-bold ${getScoreColor(s.charge_score)}`}>{s.charge_score}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-sm">{s.num_stalls ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmt(s.total_project_cost)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-success">{fmt(s.estimated_incentives)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">{fmt(s.net_investment)}</td>
                      <td className={`px-3 py-2.5 text-right font-mono text-sm font-bold ${(s.noi ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {fmt(s.noi)}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-mono text-sm ${(s.owner_monthly ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {fmt(s.owner_monthly)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm text-primary">
                        {fmt(s.ms_monthly)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {(() => {
                          // Recalculate owner CoC from raw data when stored value is null/Infinity
                          const inv = s.net_investment;
                          const ownerAnnual = s.noi != null && s.owner_split_pct != null ? s.noi * (s.owner_split_pct / 100) : null;
                          if (inv != null && inv > 0 && ownerAnnual != null) {
                            return pct((ownerAnnual / inv) * 100);
                          }
                          if (inv === 0 && ownerAnnual != null && ownerAnnual > 0) return 'N/A*';
                          return '—';
                        })()}
                      </td>
                      <td className={`px-3 py-2.5 text-right font-mono text-sm font-bold ${(s.npv ?? 0) > 0 ? 'text-success' : 'text-destructive'}`}>
                        {fmt(s.npv)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {s.margin_kwh != null ? `$${s.margin_kwh.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => navigate(`/dashboard?address=${encodeURIComponent(s.address)}&lat=${(s as any).lat}&lng=${(s as any).lng}&state=${s.state}`)}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(s.id)} disabled={deleting === s.id}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-bold">
                    <td className="px-3 py-2.5"></td>
                    <td className="px-3 py-2.5 text-sm text-foreground">Portfolio Total</td>
                    <td className="px-3 py-2.5"></td>
                    <td className="px-3 py-2.5 text-center font-mono text-sm">{totals.stalls}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmt(totals.totalProjectCost)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-success">{fmt(totals.estimatedIncentives)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm">{fmt(totals.netInvestment)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono text-sm ${totals.noi >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totals.noi)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono text-sm ${totals.ownerMonthly >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totals.ownerMonthly)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sm text-primary">{fmt(totals.msMonthly)}</td>
                    <td className="px-3 py-2.5"></td>
                    <td className={`px-3 py-2.5 text-right font-mono text-sm ${totals.npv >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(totals.npv)}</td>
                    <td className="px-3 py-2.5"></td>
                    <td className="px-3 py-2.5"></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {multiplier !== 1 && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                Showing {scenario}x scenario — NOI, Owner/MS distributions, CoC, and NPV are scaled by {multiplier}×
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Portfolio;
