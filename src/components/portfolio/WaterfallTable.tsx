import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { WaterfallYearRow } from "@/lib/waterfallCalc";
import { fmt } from "@/lib/waterfallCalc";

interface Props {
  rows: WaterfallYearRow[];
}

const R = ({ label, values, className = "" }: { label: string; values: (string | React.ReactNode)[]; className?: string }) => (
  <TableRow className={className}>
    <TableCell className="text-xs font-medium px-2 py-1 whitespace-nowrap sticky left-0 bg-inherit">{label}</TableCell>
    {values.map((v, i) => (
      <TableCell key={i} className="text-xs font-mono px-2 py-1 text-right whitespace-nowrap">{v}</TableCell>
    ))}
  </TableRow>
);

export default function WaterfallTable({ rows }: Props) {
  const totals = {
    portfolioNOI: rows.reduce((s, r) => s + r.portfolioNOI, 0),
    ownerTier1: rows.reduce((s, r) => s + r.ownerTier1, 0),
    msTier1: rows.reduce((s, r) => s + r.msTier1, 0),
    ownerTier2: rows.reduce((s, r) => s + r.ownerTier2, 0),
    msTier2: rows.reduce((s, r) => s + r.msTier2, 0),
    ownerTotal: rows.reduce((s, r) => s + r.ownerTotal, 0),
    msTotal: rows.reduce((s, r) => s + r.msTotal, 0),
  };

  const yrs = rows.map(r => `Year ${r.year}`).concat(['TOTAL']);

  const exportCSV = () => {
    const labels = ['Portfolio NOI', 'Cumulative Target', 'Tier 1 NOI', 'Owner Tier 1', 'MS Tier 1', 'Made Whole?', 'Tier 2 NOI', 'Owner Tier 2', 'MS Tier 2', 'Owner Total', 'MS Total', 'Owner Cumulative', 'MS Cumulative'];
    const dataRows = labels.map((label, li) => {
      const vals = rows.map(r => {
        switch (li) {
          case 0: return r.portfolioNOI;
          case 1: return r.cumulativeOwnerTarget;
          case 2: return r.tier1NOI;
          case 3: return r.ownerTier1;
          case 4: return r.msTier1;
          case 5: return r.ownerMadeWhole ? 'YES' : 'NO';
          case 6: return r.tier2NOI;
          case 7: return r.ownerTier2;
          case 8: return r.msTier2;
          case 9: return r.ownerTotal;
          case 10: return r.msTotal;
          case 11: return r.ownerCumulative;
          case 12: return r.msCumulative;
          default: return 0;
        }
      });
      return [label, ...vals].join(',');
    });
    const csv = [['', ...rows.map(r => `Year ${r.year}`)].join(','), ...dataRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'waterfall.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-semibold">10-Year Waterfall</h3>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs px-2 sticky left-0 bg-card z-10 min-w-[160px]"></TableHead>
              {yrs.map(y => <TableHead key={y} className="text-xs px-2 text-right min-w-[100px]">{y}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            <R label="Portfolio Annual NOI" values={[...rows.map(r => fmt(Math.round(r.portfolioNOI))), fmt(Math.round(totals.portfolioNOI))]} className="bg-muted/30" />
            <R label="Cumulative Owner Target" values={[...rows.map(r => fmt(Math.round(r.cumulativeOwnerTarget))), '—']} />

            <TableRow><TableCell colSpan={yrs.length + 1} className="text-xs font-heading font-semibold px-2 py-1 bg-primary/10">TIER 1: Below Hurdle</TableCell></TableRow>
            <R label="  NOI to Tier 1" values={[...rows.map(r => fmt(Math.round(r.tier1NOI))), fmt(Math.round(rows.reduce((s, r) => s + r.tier1NOI, 0)))]} />
            <R label="  → Owner Gets" values={[...rows.map(r => fmt(Math.round(r.ownerTier1))), fmt(Math.round(totals.ownerTier1))]} className="text-success" />
            <R label="  → MS Gets" values={[...rows.map(r => fmt(Math.round(r.msTier1))), fmt(Math.round(totals.msTier1))]} />
            <R label="  Cumulative Owner Dist" values={[...rows.map(r => fmt(Math.round(r.cumulativeOwnerDist))), '—']} />
            <R label="  Owner Made Whole?" values={[...rows.map(r => (
              <Badge key={r.year} variant={r.ownerMadeWhole ? "default" : "secondary"} className={`text-[10px] px-1.5 ${r.ownerMadeWhole ? 'bg-success text-success-foreground' : ''}`}>
                {r.ownerMadeWhole ? 'YES' : 'NO'}
              </Badge>
            )), '—']} />

            <TableRow><TableCell colSpan={yrs.length + 1} className="text-xs font-heading font-semibold px-2 py-1 bg-accent/10">TIER 2: Above Hurdle</TableCell></TableRow>
            <R label="  NOI to Tier 2" values={[...rows.map(r => fmt(Math.round(r.tier2NOI))), fmt(Math.round(rows.reduce((s, r) => s + r.tier2NOI, 0)))]} />
            <R label="  → Owner Gets" values={[...rows.map(r => fmt(Math.round(r.ownerTier2))), fmt(Math.round(totals.ownerTier2))]} className="text-success" />
            <R label="  → MS Gets" values={[...rows.map(r => fmt(Math.round(r.msTier2))), fmt(Math.round(totals.msTier2))]} />

            <TableRow><TableCell colSpan={yrs.length + 1} className="text-xs font-heading font-semibold px-2 py-1 bg-muted/50">COMBINED</TableCell></TableRow>
            <R label="  Owner Total (Year)" values={[...rows.map(r => fmt(Math.round(r.ownerTotal))), fmt(Math.round(totals.ownerTotal))]} className="font-semibold" />
            <R label="  MS Total (Year)" values={[...rows.map(r => fmt(Math.round(r.msTotal))), fmt(Math.round(totals.msTotal))]} className="font-semibold" />
            <R label="  Owner Cumulative" values={[...rows.map(r => fmt(Math.round(r.ownerCumulative))), '—']} className="bg-muted/30" />
            <R label="  MS Cumulative" values={[...rows.map(r => fmt(Math.round(r.msCumulative))), '—']} className="bg-muted/30" />
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
