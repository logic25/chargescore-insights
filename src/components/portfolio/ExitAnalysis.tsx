import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExitAnalysis as ExitAnalysisType, MasterControls } from "@/lib/waterfallCalc";
import { fmt, fmtPct, fmtMult } from "@/lib/waterfallCalc";
import FinancialDisclaimer from "@/components/dashboard/FinancialDisclaimer";

interface Props {
  exit: ExitAnalysisType;
  controls: MasterControls;
  totalOOP: number;
}

const Row = ({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) => (
  <div className={`flex justify-between py-1.5 ${bold ? 'font-semibold border-t border-border pt-2' : ''}`}>
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-mono ${accent ? 'text-success' : ''} ${bold ? 'text-base' : ''}`}>{value}</span>
  </div>
);

export default function ExitAnalysisCard({ exit, controls, totalOOP }: Props) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading">Exit Analysis — Year {controls.holdPeriod} @ {fmtMult(controls.exitMultiple)}</CardTitle>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Proceeds</h4>
          <Row label="Exit Value (NOI × Multiple)" value={fmt(Math.round(exit.exitValue))} />
          <Row label="Disposition Fee (1%)" value={`(${fmt(Math.round(exit.dispositionFee))})`} />
          <Row label="Owner Preferred at Exit" value={fmt(Math.round(exit.ownerPreferredAtExit))} />
          <Row label={`MS Promote (${fmtPct(controls.msPromoteAtExit)})`} value={`(${fmt(Math.round(exit.msPromoteAmount))})`} />
          <Row label="Owner Exit Proceeds" value={fmt(Math.round(exit.ownerExitProceeds))} bold accent />
          <Row label="MS Exit Proceeds" value={fmt(Math.round(exit.msExitProceeds))} bold />
        </div>
        <div>
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Total Returns</h4>
          <Row label="Total Out-of-Pocket" value={fmt(Math.round(totalOOP))} />
          <Row label="Owner Total Return" value={fmt(Math.round(exit.ownerTotalReturn))} bold accent />
          <Row label="MS Total Return" value={fmt(Math.round(exit.msTotalReturn))} bold />
          <Row label="Owner ROI" value={totalOOP > 0 ? fmtPct(exit.ownerTotalReturn / totalOOP - 1) : 'N/A'} />
          <Row label="Owner Multiple" value={totalOOP > 0 ? fmtMult(exit.ownerTotalReturn / totalOOP) : 'N/A'} accent />
        </div>
        <div className="mt-3">
          <FinancialDisclaimer compact />
        </div>
      </CardContent>
    </Card>
  );
}
