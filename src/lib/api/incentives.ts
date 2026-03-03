const NREL_API_KEY = 'ttwrfmgTXzqUEZctNUcKtCbN2gnJhnST68fj6Oe9';

export interface NrelIncentive {
  id: number;
  title: string;
  state: string;
  type: string;
  description: string;
  status: string;
  enacted_date: string;
  amended_date?: string;
}

export async function fetchStateIncentives(stateCode: string): Promise<NrelIncentive[]> {
  try {
    const params = new URLSearchParams({
      api_key: NREL_API_KEY,
      jurisdiction: stateCode,
      limit: '200',
    });
    const res = await fetch(`https://developer.nrel.gov/api/transportation-incentives-laws/v1.json?${params}`);
    if (!res.ok) throw new Error(`NREL Incentives API error: ${res.status}`);
    const data = await res.json();
    return (data.result || []).filter((r: any) =>
      r.type === 'State Incentives' || r.type === 'Incentives'
    );
  } catch (err) {
    console.error('Failed to fetch NREL incentives:', err);
    return [];
  }
}
