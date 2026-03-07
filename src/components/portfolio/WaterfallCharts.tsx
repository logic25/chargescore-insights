import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { WaterfallYearRow, ExitAnalysis, ComputedSite } from "@/lib/waterfallCalc";
import { fmt } from "@/lib/waterfallCalc";

const COLORS = {
  ownerTier1: "#2E7D32",
  ownerTier2: "#66BB6A",
  msTier1: "#E65100",
  msTier2: "#FF9800",
  target: "#B71C1C",
  ownerCum: "#2E7D32",
};

const fmtTick = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

interface Props {
  waterfallRows: WaterfallYearRow[];
  exit: ExitAnalysis;
  sites: ComputedSite[];
}

export default function WaterfallCharts({ waterfallRows, exit, sites }: Props) {
  // 1. Stacked bar: Owner vs MS distributions
  const distData = waterfallRows.map(r => ({
    year: `Y${r.year}`,
    'Owner T1': Math.round(r.ownerTier1),
    'Owner T2': Math.round(r.ownerTier2),
    'MS T1': Math.round(r.msTier1),
    'MS T2': Math.round(r.msTier2),
  }));

  // 2. Cumulative line
  const cumData = waterfallRows.map(r => ({
    year: `Y${r.year}`,
    'Owner Cumulative': Math.round(r.ownerCumulative),
    'Target': Math.round(r.cumulativeOwnerTarget),
  }));

  // 3. Exit pie
  const pieData = [
    { name: 'Owner Total', value: Math.round(exit.ownerTotalReturn) },
    { name: 'MS Total', value: Math.round(exit.msTotalReturn) },
  ];

  // 4. CoC bar
  const cocData = sites
    .filter(s => s.cocReturn !== null)
    .sort((a, b) => (b.cocReturn ?? 0) - (a.cocReturn ?? 0))
    .map(s => ({ name: s.name, CoC: parseFloat(((s.cocReturn ?? 0) * 100).toFixed(1)) }));

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="border-border/50">
        <CardHeader className="pb-1"><CardTitle className="text-xs font-heading">Annual Distributions by Tier</CardTitle></CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Owner T1" stackId="a" fill={COLORS.ownerTier1} />
              <Bar dataKey="Owner T2" stackId="a" fill={COLORS.ownerTier2} />
              <Bar dataKey="MS T1" stackId="b" fill={COLORS.msTier1} />
              <Bar dataKey="MS T2" stackId="b" fill={COLORS.msTier2} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-1"><CardTitle className="text-xs font-heading">Cumulative Owner vs Target</CardTitle></CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={cumData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={fmtTick} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line type="monotone" dataKey="Owner Cumulative" stroke={COLORS.ownerCum} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Target" stroke={COLORS.target} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-1"><CardTitle className="text-xs font-heading">Exit Split: Owner vs MS</CardTitle></CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${fmt(value)}`} labelLine={false}>
                <Cell fill={COLORS.ownerTier1} />
                <Cell fill={COLORS.msTier1} />
              </Pie>
              <Tooltip formatter={(v: number) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-1"><CardTitle className="text-xs font-heading">Per-Site CoC Return (Ranked)</CardTitle></CardHeader>
        <CardContent className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cocData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="CoC" fill={COLORS.ownerTier1} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
