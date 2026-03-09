import { supabase } from '@/integrations/supabase/client';

const ANALYSIS_COUNT_KEY = 'chargerank_analysis_count';
const ML_READINESS_THRESHOLD = 500;

export async function logAnalysis(data: {
  address: string;
  lat: number;
  lng: number;
  state: string;
  chargeScore: number;
  factors: Record<string, number>;
  numStalls: number;
  predictedUtilization: number;
  timestamp: string;
}) {
  // Always store locally
  try {
    const existing = JSON.parse(localStorage.getItem('chargerank_analyses') || '[]');
    existing.push(data);
    localStorage.setItem('chargescore_analyses', JSON.stringify(existing));
    localStorage.setItem(ANALYSIS_COUNT_KEY, existing.length.toString());
  } catch {
    // ignore
  }

  // Database persistence is handled by the explicit "Save Project" action
  // to avoid creating duplicate entries on every dashboard view.
}

export function getAnalysisCount(): number {
  return parseInt(localStorage.getItem(ANALYSIS_COUNT_KEY) || '0', 10);
}

export function getMlReadiness() {
  const count = getAnalysisCount();
  return {
    count,
    threshold: ML_READINESS_THRESHOLD,
    percentage: Math.min(100, Math.round((count / ML_READINESS_THRESHOLD) * 100)),
    ready: count >= ML_READINESS_THRESHOLD,
  };
}

export function exportAnalysesCSV(): string {
  const data = JSON.parse(localStorage.getItem('chargescore_analyses') || '[]');
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map((row: any) => headers.map(h => {
    const val = row[h];
    return typeof val === 'object' ? JSON.stringify(val) : val;
  }).join(','));
  return [headers.join(','), ...rows].join('\n');
}
