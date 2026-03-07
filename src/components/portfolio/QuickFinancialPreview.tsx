import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmt, fmtPct } from "@/lib/waterfallCalc";

interface Props {
  stalls: number;
  kwhPerStallPerDay: number;
}

export default function QuickFinancialPreview({ stalls, kwhPerStallPerDay }: Props) {
  const equipmentCost = stalls * 62500;
  const installCost = stalls * 25000;
  const totalProject = equipmentCost + installCost;
  const estimatedIncentives = stalls * 35000;
  const outOfPocket = Math.max(0, totalProject - estimatedIncentives);

  const customerPrice = 0.45;
  const electricityCost = 0.15;
  const teslaFee = 0.10;
  const insurance = 5000;
  const rent = 0;

  const annualKwh = stalls * kwhPerStallPerDay * 365;
  const annualRevenue = annualKwh * customerPrice;
  const annualNOI = annualKwh * (customerPrice - electricityCost - teslaFee) - insurance - rent * 12;
  const estimatedCoC = outOfPocket > 0 ? (annualNOI * 0.70) / outOfPocket : null;

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div className={`flex justify-between py-1 ${bold ? 'font-semibold border-t border-border pt-2 mt-1' : ''}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono">{value}</span>
    </div>
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-heading">Quick Financial Preview</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Investment</h4>
          <Row label="Equipment Cost" value={fmt(equipmentCost)} />
          <Row label="Install Cost" value={fmt(installCost)} />
          <Row label="Total Project" value={fmt(totalProject)} bold />
          <Row label="Est. Incentives" value={`(${fmt(estimatedIncentives)})`} />
          <Row label="Out-of-Pocket" value={fmt(outOfPocket)} bold />
        </div>
        <div>
          <h4 className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Annual Operations</h4>
          <Row label="Annual Revenue" value={fmt(Math.round(annualRevenue))} />
          <Row label="Annual NOI" value={fmt(Math.round(annualNOI))} bold />
          <Row label="Est. CoC (at 70% owner)" value={estimatedCoC !== null ? fmtPct(estimatedCoC) : 'N/A'} bold />
        </div>
      </CardContent>
    </Card>
  );
}
