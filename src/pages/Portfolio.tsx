import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, ArrowLeft, TrendingUp, Sliders, Trash2, ExternalLink, BarChart3, FileText, Settings, ChevronDown, Plus, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RoleGuard from '@/components/RoleGuard';
import MasterControls from '@/components/portfolio/MasterControls';
import SiteTable from '@/components/portfolio/SiteTable';
import WaterfallTable from '@/components/portfolio/WaterfallTable';
import ExitAnalysisCard from '@/components/portfolio/ExitAnalysis';
import WaterfallCharts from '@/components/portfolio/WaterfallCharts';
import StallSizer from '@/components/portfolio/StallSizer';
import DocumentsManager from '@/components/portfolio/DocumentsManager';
import { seedPortfolioIfEmpty, forceSeedPortfolio, refreshPartnerSites } from '@/lib/seedPortfolio';
import {
  DEFAULT_CONTROLS,
  computeSite,
  computeWaterfall,
  computeExit,
} from '@/lib/waterfallCalc';
import type { MasterControls as MCType, SiteRow } from '@/lib/waterfallCalc';
import { fetchIncentivePrograms, calculateIncentives, resolveUtilityTerritory, nrelToIncentivePrograms, type IncentiveResult, type IncentiveProgram } from '@/lib/incentiveCalc';
import { fetchStateIncentives } from '@/lib/api/incentives';
import IncentiveBreakdown from '@/components/incentives/IncentiveBreakdown';
import OOPRangeBar from '@/components/incentives/OOPRangeBar';

interface AnalysisRow {
  id: string;
  address: string;
  state: string;
  lat: number;
  lng: number;
  charge_score: number;
  num_stalls: number | null;
  total_parking_spaces: number | null;
  location_type: 'highway' | 'urban_retail' | 'suburban_retail' | 'rural' | null;
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
  annual_insurance: number | null;
  monthly_rent: number | null;
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

const formatCoc = (site: AnalysisRow) => {
  if (site.coc != null && isFinite(site.coc)) return pct(site.coc);
  const oop = site.net_investment;
  const ownerAnnual = site.owner_monthly != null ? site.owner_monthly * 12 : null;
  if (oop != null && Math.abs(oop) < 0.5 && ownerAnnual != null && ownerAnnual > 0) return 'N/A*';
  return '—';
};

const SCENARIO_OPTIONS = [
  { value: '0.50', label: '0.50x (Bear)' },
  { value: '0.75', label: '0.75x (Conservative)' },
  { value: '1.00', label: '1.00x (Base)' },
  { value: '1.25', label: '1.25x (Bull)' },
];

const SITE_COLUMNS = [
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

function analysisToSiteRow(a: AnalysisRow): SiteRow {
  const stalls = a.num_stalls ?? 8;
  const totalCost = a.total_project_cost ?? stalls * 87500;
  const costPerStall = stalls > 0 ? totalCost / stalls : 87500;
  return {
    id: a.id,
    name: a.address.split(',')[0],
    address: a.address,
    stalls,
    baseKwhPerStallPerDay: a.kwh_per_stall_per_day ?? 250,
    customerPrice: a.price_per_kwh ?? 0.45,
    electricityCost: a.electricity_cost ?? 0.223,
    teslaFee: 0.10,
    bomPerStall: 62500,
    installPerStall: Math.round(costPerStall - 62500),
    incentives: a.estimated_incentives ?? 0,
    insurance: a.annual_insurance ?? 5000,
    monthlyRent: a.monthly_rent ?? 0,
  };
}

const Portfolio = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scenario, setScenario] = useState('1.00');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'sites');
  const [controls, setControls] = useState<MCType>(DEFAULT_CONTROLS);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [globalSplit, setGlobalSplit] = useState(70); // Owner % (0-100)
  const [sizerPrefill, setSizerPrefill] = useState<{ address: string; lat: number; lng: number; state: string; id: string; numStalls?: number | null; chargeScore?: number | null; totalParkingSpaces?: number | null; locationType?: 'highway' | 'urban_retail' | 'suburban_retail' | 'rural' | null } | null>(null);
  const [siteIncentives, setSiteIncentives] = useState<Record<string, IncentiveResult>>({});

  const multiplier = parseFloat(scenario);

  // Infer utility territory from address for incentive matching
  const inferUtilityTerritory = (site: AnalysisRow): string | null => {
    const addr = site.address.toLowerCase();
    if (site.state === 'NY') {
      if (addr.includes('brooklyn') || addr.includes('queens') || addr.includes('bronx') || addr.includes('manhattan') || addr.includes('staten island')) return 'Con Edison';
      if (addr.includes('elmont') || addr.includes('hewlett') || addr.includes('merrick') || addr.includes('lindenhurst') || addr.includes('long island')) return 'PSEG LI';
      // Default NYC boroughs to Con Edison
      return 'Con Edison';
    }
    if (site.state === 'FL') return 'Duke Energy FL';
    if (site.state === 'NJ') return 'ACE NJ';
    if (site.state === 'MA') return 'National Grid MA';
    return null;
  };

  // Fetch incentive programs for an expanded site
  // Always re-fetch incentives when expanding to get latest data
  const handleExpandSite = useCallback(async (site: AnalysisRow) => {
    if (expandedSiteId === site.id) {
      setExpandedSiteId(null);
      return;
    }
    setExpandedSiteId(site.id);

    const territory = inferUtilityTerritory(site);
    const programs = await fetchIncentivePrograms(territory, site.state);
    const stalls = site.num_stalls ?? 8;
    const grossCost = site.total_project_cost ?? stalls * 87500;
    const result = calculateIncentives(programs, stalls, grossCost);
    setSiteIncentives(prev => ({ ...prev, [site.id]: result }));
  }, [expandedSiteId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    initPortfolio();
  }, [user, authLoading]);

  const initPortfolio = async () => {
    if (!user) return;
    setLoading(true);
    // Auto-seed on first visit
    await seedPortfolioIfEmpty(user.id);
    await fetchSites();
    setLoading(false);
  };

  const fetchSites = async () => {
    const { data, error } = await supabase
      .from('analyses')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setAnalyses(data as any);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('analyses').delete().eq('id', id);
    setAnalyses(prev => prev.filter(s => s.id !== id));
    setDeleting(null);
    toast.success('Site removed');
  };

  const handleLoadPartnerSites = async () => {
    if (!user) return;
    const success = await forceSeedPortfolio(user.id);
    if (success) await fetchSites();
  };

  const handleRefreshPartnerSites = async () => {
    if (!user) return;
    const success = await refreshPartnerSites(user.id);
    if (success) await fetchSites();
  };

  // --- Sites tab data --- recalculate owner/ms splits live from globalSplit
  const scaled = useMemo(() => analyses.map(s => {
    const noi = s.noi != null ? s.noi * multiplier : null;
    const ownerPct = globalSplit / 100;
    const ownerMonthly = noi != null ? (noi * ownerPct) / 12 : null;
    const msMonthly = noi != null ? (noi * (1 - ownerPct)) / 12 : null;
    const netInv = s.net_investment ?? 0;
    const coc = noi != null && netInv > 0 ? (noi * ownerPct / netInv) * 100 : null;
    return {
      ...s,
      noi,
      owner_monthly: ownerMonthly,
      ms_monthly: msMonthly,
      npv: s.npv != null ? s.npv * multiplier : null,
      coc,
      owner_split_pct: globalSplit,
    };
  }), [analyses, multiplier, globalSplit]);

  const totals = useMemo(() => {
    const sum = (key: keyof AnalysisRow) => scaled.reduce((acc, s) => acc + ((s[key] as number) ?? 0), 0);
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

  const ranked = useMemo(() => {
    if (scaled.length === 0) return [];
    const byNpv = [...scaled].sort((a, b) => (b.npv ?? -Infinity) - (a.npv ?? -Infinity));
    const byCoc = [...scaled].sort((a, b) => (b.coc ?? -Infinity) - (a.coc ?? -Infinity));
    const byScore = [...scaled].sort((a, b) => b.charge_score - a.charge_score);
    return scaled
      .map((s) => {
        const npvRank = byNpv.findIndex((x) => x.id === s.id) + 1;
        const cocRank = byCoc.findIndex((x) => x.id === s.id) + 1;
        const scoreRank = byScore.findIndex((x) => x.id === s.id) + 1;
        return { ...s, compositeRank: (npvRank + cocRank + scoreRank) / 3 };
      })
      .sort((a, b) => a.compositeRank - b.compositeRank);
  }, [scaled]);

  // --- Financials tab data ---
  const siteRows = useMemo(() => analyses.map(analysisToSiteRow), [analyses]);
  const [editableSites, setEditableSites] = useState<SiteRow[]>([]);

  useEffect(() => {
    setEditableSites(siteRows);
  }, [siteRows]);

  const computedSites = useMemo(() => editableSites.map(s => computeSite(s, controls)), [editableSites, controls]);
  const totalOOP = useMemo(() => computedSites.reduce((s, c) => s + c.outOfPocket, 0), [computedSites]);
  const waterfallRows = useMemo(() => computeWaterfall(computedSites, controls), [computedSites, controls]);
  const exitAnalysis = useMemo(() => computeExit(waterfallRows, controls, totalOOP), [waterfallRows, controls, totalOOP]);

  const handleAddFromSizer = useCallback(async (site: Omit<SiteRow, 'id'>) => {
    if (!user) return;
    // Save to DB
    const margin = site.customerPrice - site.electricityCost - site.teslaFee;
    const totalCost = (site.bomPerStall + site.installPerStall) * site.stalls;
    const netInv = Math.max(0, totalCost - site.incentives);
    const annualRev = site.stalls * site.baseKwhPerStallPerDay * margin * 365;
    const noi = annualRev - site.insurance - (site.monthlyRent * 12);

    const { error } = await supabase.from('analyses').insert({
      user_id: user.id,
      address: site.address || site.name,
      lat: 0,
      lng: 0,
      state: 'NY',
      charge_score: 70,
      num_stalls: site.stalls,
      kwh_per_stall_per_day: site.baseKwhPerStallPerDay,
      price_per_kwh: site.customerPrice,
      electricity_cost: site.electricityCost,
      total_project_cost: totalCost,
      estimated_incentives: site.incentives,
      net_investment: netInv,
      noi,
      margin_kwh: margin,
      annual_insurance: site.insurance,
      monthly_rent: site.monthlyRent,
    } as any);

    if (error) {
      toast.error('Failed to add site');
    } else {
      toast.success(`Added "${site.name}" to portfolio`);
      await fetchSites();
      setActiveTab('sites');
    }
  }, [user]);

  const handleUpdateSiteFromSizer = useCallback(async (siteId: string, updates: { stalls: number; kwhPerStallPerDay: number }) => {
    const site = analyses.find(s => s.id === siteId);
    if (!site) return;

    const stalls = updates.stalls;
    const kwhPerStallPerDay = updates.kwhPerStallPerDay;
    const pricePerKwh = site.price_per_kwh ?? 0.45;
    const electricityCost = site.electricity_cost ?? 0.223;
    const teslaFee = 0.10;
    const margin = pricePerKwh - electricityCost - teslaFee;
    const installPerStall = site.total_project_cost && site.num_stalls
      ? Math.round(site.total_project_cost / site.num_stalls - 62500)
      : 25000;
    const totalCost = (62500 + installPerStall) * stalls;
    const incentivesPerStall = site.estimated_incentives && site.num_stalls
      ? site.estimated_incentives / site.num_stalls
      : 35000;
    const incentives = incentivesPerStall * stalls;
    const netInv = Math.max(0, totalCost - incentives);
    const insurance = site.annual_insurance ?? 5000;
    const rent = site.monthly_rent ?? 0;
    const annualRev = stalls * kwhPerStallPerDay * margin * 365;
    const noi = annualRev - insurance - (rent * 12);
    const ownerPct = (site.owner_split_pct ?? 70) / 100;
    const ownerMonthly = (noi * ownerPct) / 12;
    const msMonthly = (noi * (1 - ownerPct)) / 12;
    const coc = netInv > 0 ? (noi * ownerPct / netInv) * 100 : null;

    let npv = -netInv;
    for (let y = 1; y <= 15; y++) {
      const growth = Math.pow(1.07, y - 1);
      const feeEsc = Math.pow(1.03, y - 1);
      const yearKwh = stalls * kwhPerStallPerDay * growth * 365;
      const yearNoi = yearKwh * pricePerKwh - yearKwh * electricityCost - yearKwh * teslaFee * feeEsc - insurance;
      npv += yearNoi / Math.pow(1.08, y);
    }
    npv = Math.round(npv);

    const { error } = await supabase.from('analyses').update({
      num_stalls: stalls,
      kwh_per_stall_per_day: kwhPerStallPerDay,
      total_project_cost: totalCost,
      estimated_incentives: incentives,
      net_investment: netInv,
      noi,
      npv,
      margin_kwh: margin,
      owner_monthly: ownerMonthly,
      ms_monthly: msMonthly,
      coc,
    }).eq('id', siteId);

    if (error) {
      toast.error('Failed to update site');
    } else {
      toast.success('Site stalls updated from Stall Sizer');
      await fetchSites();
      setActiveTab('sites');
    }
  }, [analyses]);

  const handleInlineStallUpdate = useCallback(async (siteId: string, newStalls: number) => {
    const site = analyses.find(s => s.id === siteId);
    if (!site) return;

    const stalls = Math.max(4, Math.ceil(newStalls / 4) * 4);
    const kwhPerStallPerDay = site.kwh_per_stall_per_day ?? 250;
    const pricePerKwh = site.price_per_kwh ?? 0.45;
    const electricityCost = site.electricity_cost ?? 0.223;
    const teslaFee = 0.10;
    const margin = pricePerKwh - electricityCost - teslaFee;
    const installPerStall = site.total_project_cost && site.num_stalls
      ? Math.round(site.total_project_cost / site.num_stalls - 62500)
      : 25000;
    const totalCost = (62500 + installPerStall) * stalls;
    const incentivesPerStall = site.estimated_incentives && site.num_stalls
      ? site.estimated_incentives / site.num_stalls
      : 35000;
    const incentives = incentivesPerStall * stalls;
    const netInv = Math.max(0, totalCost - incentives);
    const insurance = site.annual_insurance ?? 5000;
    const rent = site.monthly_rent ?? 0;
    const annualRev = stalls * kwhPerStallPerDay * margin * 365;
    const noi = annualRev - insurance - (rent * 12);
    const ownerPct = (site.owner_split_pct ?? 70) / 100;
    const ownerMonthly = (noi * ownerPct) / 12;
    const msMonthly = (noi * (1 - ownerPct)) / 12;
    const coc = netInv > 0 ? (noi * ownerPct / netInv) * 100 : null;

    // Compute 15-year NPV (8% discount, 7% growth, 3% fee escalation)
    let npv = -netInv;
    for (let y = 1; y <= 15; y++) {
      const growth = Math.pow(1.07, y - 1);
      const feeEsc = Math.pow(1.03, y - 1);
      const yearKwh = stalls * kwhPerStallPerDay * growth * 365;
      const yearNoi = yearKwh * pricePerKwh - yearKwh * electricityCost - yearKwh * teslaFee * feeEsc - insurance;
      npv += yearNoi / Math.pow(1.08, y);
    }
    npv = Math.round(npv);

    const { error } = await supabase.from('analyses').update({
      num_stalls: stalls,
      total_project_cost: totalCost,
      estimated_incentives: incentives,
      net_investment: netInv,
      noi,
      npv,
      margin_kwh: margin,
      owner_monthly: ownerMonthly,
      ms_monthly: msMonthly,
      coc,
    }).eq('id', siteId);

    if (!error) {
      setAnalyses(prev => prev.map(s => s.id === siteId ? {
        ...s, num_stalls: stalls, total_project_cost: totalCost, estimated_incentives: incentives,
        net_investment: netInv, noi, npv, margin_kwh: margin, owner_monthly: ownerMonthly, ms_monthly: msMonthly, coc,
      } : s));
    }
  }, [analyses]);

  const hasNaCoc = ranked.some((site) => formatCoc(site) === 'N/A*');

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
    <RoleGuard requiredRole="pro">
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-heading text-lg font-bold">ChargeRank Pro — Portfolio</span>
              <span className="text-sm text-muted-foreground ml-2">{analyses.length} sites</span>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'sites' && (
                <>
                  <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleLoadPartnerSites}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Load 16 Partner Sites
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-8" onClick={handleRefreshPartnerSites}>
                    <Settings className="h-3.5 w-3.5 mr-1" /> Refresh Partner Sites
                  </Button>
                  <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground whitespace-nowrap">Split</span>
                    <Slider
                      value={[globalSplit]}
                      onValueChange={([v]) => setGlobalSplit(v)}
                      min={50}
                      max={95}
                      step={5}
                      className="w-24"
                    />
                    <span className="font-mono text-xs font-bold text-foreground whitespace-nowrap">{globalSplit}/{100 - globalSplit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-muted-foreground" />
                    <Select value={scenario} onValueChange={setScenario}>
                      <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SCENARIO_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="sites" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Sites
              </TabsTrigger>
              <TabsTrigger value="financials" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Financials
              </TabsTrigger>
              <TabsTrigger value="sizer" className="gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Stall Sizer
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Documents
              </TabsTrigger>
            </TabsList>

            {/* ═══ SITES TAB ═══ */}
            <TabsContent value="sites">
              {analyses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h2 className="font-heading text-xl font-bold text-foreground">No saved sites</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Save site analyses from the dashboard to compare them here.</p>
                  <Button className="mt-4" onClick={() => navigate('/')}>Analyze a Site</Button>
                </div>
              ) : (
                <>
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

                  <div className="rounded-xl border border-border bg-card overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-3 py-2.5 text-left text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-8">#</th>
                          {SITE_COLUMNS.map(col => (
                            <th key={col.key} className={`px-3 py-2.5 text-${col.align} text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap`}>
                              {col.label}
                            </th>
                          ))}
                          <th className="px-3 py-2.5 text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold w-16">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.map((s, i) => (
                          <React.Fragment key={s.id}>
                          <tr
                            className={`border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer ${expandedSiteId === s.id ? 'bg-muted/10' : ''}`}
                            onClick={() => handleExpandSite(s)}
                          >
                            <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2.5 max-w-[280px]">
                              <div className="flex items-center gap-1.5">
                                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0 ${expandedSiteId === s.id ? 'rotate-180' : ''}`} />
                                <div className="min-w-0 overflow-hidden">
                                  <p className="text-sm font-medium text-foreground truncate max-w-[240px]" title={s.address}>{s.address}</p>
                                  <p className="text-[10px] text-muted-foreground">{s.state} · {s.owner_split_pct ?? 70}/{100 - (s.owner_split_pct ?? 70)} split</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center"><span className={`font-mono text-sm font-bold ${getScoreColor(s.charge_score)}`}>{s.charge_score}</span></td>
                            <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                              <Input
                                type="number"
                                step={4}
                                min={4}
                                value={s.num_stalls ?? ''}
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  if (!isNaN(val) && val > 0) handleInlineStallUpdate(s.id, val);
                                }}
                                className="h-7 w-16 text-center text-sm font-mono bg-muted/30 border-border/50 mx-auto"
                              />
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm">{fmt(s.total_project_cost)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm text-success">{fmt(s.estimated_incentives)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm">{fmt(s.net_investment)}</td>
                            <td className={`px-3 py-2.5 text-right font-mono text-sm font-bold ${(s.noi ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(s.noi)}</td>
                            <td className={`px-3 py-2.5 text-right font-mono text-sm ${(s.owner_monthly ?? 0) >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(s.owner_monthly)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm text-primary">{fmt(s.ms_monthly)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm">{formatCoc(s)}</td>
                            <td className={`px-3 py-2.5 text-right font-mono text-sm font-bold ${(s.npv ?? 0) > 0 ? 'text-success' : 'text-destructive'}`}>{fmt(s.npv)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-sm">{s.margin_kwh != null ? `$${s.margin_kwh.toFixed(2)}` : '—'}</td>
                            <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={() => {
                                        setSizerPrefill({ address: s.address, lat: (s as any).lat, lng: (s as any).lng, state: s.state, id: s.id, numStalls: s.num_stalls, chargeScore: s.charge_score, totalParkingSpaces: s.total_parking_spaces, locationType: s.location_type });
                                        setActiveTab('sizer');
                                      }}>
                                      <Ruler className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs">Size stalls for this site</TooltipContent>
                                </Tooltip>
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
                          {/* Expanded incentive detail row */}
                          {expandedSiteId === s.id && (
                            <tr>
                              <td colSpan={SITE_COLUMNS.length + 2} className="px-6 py-4 bg-muted/5 border-b border-border">
                                {siteIncentives[s.id] ? (
                                  <div className="space-y-3 max-w-3xl">
                                    <IncentiveBreakdown
                                      result={siteIncentives[s.id]}
                                      grossProjectCost={s.total_project_cost ?? (s.num_stalls ?? 8) * 87500}
                                      stallCount={s.num_stalls ?? 8}
                                    />
                                    <OOPRangeBar
                                      grossCost={s.total_project_cost ?? (s.num_stalls ?? 8) * 87500}
                                      confirmedTotal={siteIncentives[s.id].confirmedTotal}
                                      likelyTotal={siteIncentives[s.id].likelyTotal}
                                      uncertainTotal={siteIncentives[s.id].uncertainTotal}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    Loading incentive data…
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        ))}
                      </tbody>
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

                  {hasNaCoc && (
                    <p className="mt-3 text-xs text-muted-foreground text-center">
                      *CoC shown as N/A when out-of-pocket investment is $0.
                    </p>
                  )}
                  {(multiplier !== 1 || globalSplit !== 70) && (
                    <p className="mt-3 text-xs text-muted-foreground text-center">
                      {multiplier !== 1 && `Showing ${scenario}x scenario. `}
                      Owner/MS split: {globalSplit}/{100 - globalSplit} — Owner/mo, MS/mo, and CoC reflect this split applied to NOI.
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            {/* ═══ FINANCIALS TAB ═══ */}
            <TabsContent value="financials">
              <div className="space-y-4">
                <MasterControls controls={controls} onChange={setControls} />
                <SiteTable sites={editableSites} controls={controls} onSitesChange={setEditableSites} />
                <WaterfallTable rows={waterfallRows} />
                <ExitAnalysisCard exit={exitAnalysis} controls={controls} totalOOP={totalOOP} />
                <WaterfallCharts waterfallRows={waterfallRows} exit={exitAnalysis} sites={computedSites} />
              </div>
            </TabsContent>

            {/* ═══ STALL SIZER TAB ═══ */}
            <TabsContent value="sizer">
              <StallSizer
                onAddToPortfolio={handleAddFromSizer}
                onUpdateSite={handleUpdateSiteFromSizer}
                existingSites={analyses.map(a => ({ id: a.id, name: a.address.split(',')[0], address: a.address }))}
                prefillSite={sizerPrefill}
              />
            </TabsContent>

            {/* ═══ DOCUMENTS TAB ═══ */}
            <TabsContent value="documents">
              <DocumentsManager sites={analyses.map(s => ({ name: s.address.split(',')[0], address: s.address }))} />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </RoleGuard>
  );
};

export default Portfolio;
