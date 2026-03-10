import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExitAnalysis as ExitAnalysisType, MasterControls, ComputedSite } from "@/lib/waterfallCalc";
import { fmt, fmtPct, fmtMult } from "@/lib/waterfallCalc";
import FinancialDisclaimer from "@/components/dashboard/FinancialDisclaimer";

interface Props {
  exit: ExitAnalysisType;
  controls: MasterControls;
  totalOOP: number;
  sites: ComputedSite[];
}

const Row = ({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) => (
  <div className={`flex justify-between py-1.5 ${bold ? 'font-semibold border-t border-border pt-2' : ''}`}>
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`text-sm font-mono ${accent ? 'text-success' : ''} ${bold ? 'text-base' : ''}`}>{value}</span>
  </div>
);

export default function ExitAnalysisCard({ exit, controls, totalOOP, sites }: Props) {
  const currentSiteCount = sites.length || 1;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-heading">Exit Analysis — Year {controls.holdPeriod} @ {fmtMult(controls.exitMultiple)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Proceeds</h4>
            <Row label="Exit Value (NOI × Multiple)" value={fmt(Math.round(exit.exitValue))} />
            <Row label={`Disposition Fee (${fmtPct(controls.dispositionFeePct)})`} value={`(${fmt(Math.round(exit.dispositionFee))})`} />
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
        </div>

        {/* Scaling Scenarios */}
        <div>
          <h4 className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">Scaling Scenarios</h4>
          <p className="text-[10px] text-muted-foreground mb-3">Same per-site economics, just more sites</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[25, 50, 75, 100].map(numSites => {
              const scale = numSites / currentSiteCount;
              const baseNOI = exit.exitValue / controls.exitMultiple;
              const scaledExitNOI = baseNOI * scale;
              const scaledEV = scaledExitNOI * controls.exitMultiple;
              const scaledDisposition = scaledEV * controls.dispositionFeePct;
              const scaledNet = scaledEV - scaledDisposition;
              const scaledOOP = totalOOP * scale;
              const scaledOwnerPreferred = Math.max(0, scaledOOP * (1 + controls.hurdleRate * controls.holdPeriod));
              const remainingAfterPref = Math.max(0, scaledNet - scaledOwnerPreferred);
              const msProceeds = remainingAfterPref * controls.msPromoteAtExit + scaledDisposition;
              const ownerProceeds = scaledNet - msProceeds;
              return (
                <div key={numSites} className="rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <p className="text-xs font-semibold text-foreground mb-1">{numSites} Sites</p>
                  <p className="text-[10px] text-muted-foreground">EV: <span className="font-mono">{fmt(Math.round(scaledEV))}</span></p>
                  <p className="text-[10px] text-success">Owner: <span className="font-mono">{fmt(Math.round(ownerProceeds))}</span></p>
                  <p className="text-[10px] text-primary">MS: <span className="font-mono">{fmt(Math.round(msProceeds))}</span></p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-3">
          <FinancialDisclaimer compact />
        </div>
      </CardContent>
    </Card>
  );
}
