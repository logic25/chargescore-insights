import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, BarChart3, Ticket, Plus, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { getMlReadiness, exportAnalysesCSV, getAnalysisCount } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InviteCode {
  id: string;
  code: string;
  max_uses: number;
  use_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const MlAdmin = () => {
  const navigate = useNavigate();
  const [readiness] = useState(getMlReadiness);
  const count = getAnalysisCount();

  // Invite codes state
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newMaxUses, setNewMaxUses] = useState(10);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchCodes = useCallback(async () => {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setCodes(data as unknown as InviteCode[]);
    setLoadingCodes(false);
  }, []);

  useEffect(() => { fetchCodes(); }, [fetchCodes]);

  const handleCreateCode = async () => {
    if (!newCode.trim()) return;
    setCreating(true);
    const { error } = await supabase
      .from('invite_codes')
      .insert({ code: newCode.trim().toUpperCase(), max_uses: newMaxUses } as any);
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Code already exists' : error.message);
    } else {
      toast.success(`Code ${newCode.toUpperCase()} created`);
      setNewCode('');
      setNewMaxUses(10);
      fetchCodes();
    }
    setCreating(false);
  };

  const toggleActive = async (code: InviteCode) => {
    const { error } = await supabase
      .from('invite_codes')
      .update({ is_active: !code.is_active } as any)
      .eq('id', code.id);
    if (error) toast.error(error.message);
    else fetchCodes();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Copied to clipboard');
  };

  const handleExport = () => {
    const csv = exportAnalysesCSV();
    if (!csv) return;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chargerank_analyses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <Button variant="ghost" onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

        {/* ML Readiness Card */}
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-2xl font-bold text-foreground">ML Readiness</h1>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {count} / {readiness.threshold} analyses
                </span>
                <span className="font-mono text-sm font-bold text-primary">{readiness.percentage}%</span>
              </div>
              <Progress value={readiness.percentage} />
            </div>
            {readiness.ready ? (
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-4">
                <p className="font-semibold text-primary">✓ Ready for regression model training!</p>
                <p className="mt-1 text-sm text-muted-foreground">Export data below to begin XGBoost model training.</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Need {readiness.threshold - count} more site analyses to train the utilization prediction model.
              </p>
            )}
            <Button onClick={handleExport} disabled={count === 0} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Export Analyses as CSV
            </Button>
          </div>
        </div>

        {/* Invite Codes Card */}
        <div className="rounded-xl border border-border bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <Ticket className="h-6 w-6 text-primary" />
            <h2 className="font-heading text-2xl font-bold text-foreground">Beta Invite Codes</h2>
          </div>

          {/* Create new code */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="CODE-NAME"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.toUpperCase())}
              className="font-mono uppercase tracking-wider"
            />
            <Input
              type="number"
              min={1}
              value={newMaxUses}
              onChange={(e) => setNewMaxUses(Number(e.target.value))}
              className="w-24"
              title="Max uses"
            />
            <Button onClick={handleCreateCode} disabled={creating || !newCode.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Create
            </Button>
          </div>

          {/* Code list */}
          {loadingCodes ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : codes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invite codes yet.</p>
          ) : (
            <div className="space-y-3">
              {codes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => copyCode(c.code)} title="Copy code" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                      <Copy className="h-4 w-4" />
                    </button>
                    <span className="font-mono font-semibold text-foreground tracking-wider truncate">{c.code}</span>
                    <Badge variant={c.is_active ? 'default' : 'secondary'} className="shrink-0">
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 ml-4">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {c.use_count} / {c.max_uses} used
                    </span>
                    <button onClick={() => toggleActive(c)} title={c.is_active ? 'Deactivate' : 'Activate'} className="text-muted-foreground hover:text-foreground transition-colors">
                      {c.is_active ? <ToggleRight className="h-5 w-5 text-primary" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MlAdmin;
