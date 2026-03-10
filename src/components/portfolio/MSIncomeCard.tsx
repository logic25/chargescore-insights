import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GPFeeBreakdown, MasterControls } from "@/lib/waterfallCalc";
import { fmt, fmtPct } from "@/lib/waterfallCalc";

interface Props {
  gpFees: GPFeeBreakdown;
  controls: MasterControls;
}

const Row = ({ label, value, note, bold, accent, negative }: {
  label: string; value: string; note?: string; bold?: boolean; accent?: boolean; negative?: boolean;
}) => (
  <div className={`flex justify-between py-1.5 ${bold ? 'font-semibold border-t border-border pt-2' : ''}`}>
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      {note && <span className="text-[10px] text-muted-foreground/60">{note}</span>}
    </div>
    <span className={`text-sm font-mono ${accent ? 'text-success' : ''} ${negative ? 'text-destructive' : ''} ${bold ? 'text-base' : ''}`}>
      {value}
    </span>
  </div>
);

export default function MSIncomeCard({ gpFees, controls }: Props) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading">MS Income — Profit Split + GP Fees</CardTitle>
        <p className="text-[10px] text-muted-foreground">
          How MS makes money: (1) share of NOI from waterfall split + (2) GP management fees
        </p>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Income Sources</h4>
          <Row label="Waterfall Split (Y1)" value={fmt(Math.round(gpFees.msY1SplitIncome))} note="From tiered NOI distribution" />
          <Row label={`Acquisition Fee (${fmtPct(controls.acquisitionFeePct)})`} value={fmt(Math.round(gpFees.acquisitionFee))} note="One-time, % of project cost" />
          <Row label={`CM Fee (${fmtPct(controls.cmFeePct)})`} value={fmt(Math.round(gpFees.cmFee))} note="One-time, % of project cost" />
          <Row label={`Asset Mgmt Fee (${fmtPct(controls.assetMgmtFeePct)})`} value={fmt(Math.round(gpFees.assetMgmtFee))} note="Annual, % of gross revenue" />
        </div>
        <div>
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Costs & Totals</h4>
          <Row label="Scout Commissions" value={`(${fmt(Math.round(gpFees.scoutCommissions))})`} note="One-time" negative />
          <Row label="Incentives Manager" value={`(${fmt(Math.round(gpFees.incentivesMgr))})`} note="Annual salary" negative />
          <Row label="MS Year 1 Total Income" value={fmt(Math.round(gpFees.msY1TotalIncome))} bold accent />
          <Row label="MS Recurring Annual" value={fmt(Math.round(gpFees.msRecurringAnnual))} note="Split + Asset Mgmt − Salary" />
          <Row label="MS Recurring Monthly" value={fmt(Math.round(gpFees.msRecurringMonthly))} bold accent />
        </div>
      </CardContent>
    </Card>
  );
}
