import { useState } from 'react';
import { ArrowLeft, Download, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { getMlReadiness, exportAnalysesCSV, getAnalysisCount } from '@/lib/analytics';

const MlAdmin = () => {
  const navigate = useNavigate();
  const [readiness] = useState(getMlReadiness);
  const count = getAnalysisCount();

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
      <div className="mx-auto max-w-2xl">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>

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
                Each analysis improves the future ML model's accuracy.
              </p>
            )}

            <Button onClick={handleExport} disabled={count === 0} className="w-full">
              <Download className="mr-2 h-4 w-4" /> Export Analyses as CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MlAdmin;
