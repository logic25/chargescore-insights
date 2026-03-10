import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { MasterControls as MasterControlsType } from "@/lib/waterfallCalc";

interface Props {
  controls: MasterControlsType;
  onChange: (c: MasterControlsType) => void;
}

const TIP = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground inline ml-1 cursor-help" /></TooltipTrigger>
    <TooltipContent className="max-w-[200px] text-xs">{text}</TooltipContent>
  </Tooltip>
);

const PctInput = ({ label, tip, value, onChange }: { label: string; tip: string; value: number; onChange: (v: number) => void }) => (
  <div className="space-y-1">
    <Label className="text-xs font-medium">{label}<TIP text={tip} /></Label>
    <div className="relative">
      <Input
        type="number"
        step={1}
        value={(value * 100).toFixed(0)}
        onChange={e => onChange(parseFloat(e.target.value) / 100 || 0)}
        className="bg-amber/10 text-primary font-mono text-sm pr-6 h-8"
      />
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
    </div>
  </div>
);

export default function MasterControls({ controls, onChange }: Props) {
  const set = (key: keyof MasterControlsType, v: number) => onChange({ ...controls, [key]: v });

  const presets = [
    { label: "Bear (0.50x)", value: 0.50 },
    { label: "Conservative (0.75x)", value: 0.75 },
    { label: "Base Case (1.0x)", value: 1.00 },
    { label: "Bull (1.25x)", value: 1.25 },
  ];

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-heading font-semibold">Master Controls</h3>
          <div className="flex gap-1.5">
            {presets.map(p => (
              <Button
                key={p.value}
                size="sm"
                variant={controls.kwhMultiplier === p.value ? "default" : "outline"}
                className="text-xs h-7 px-2"
                onClick={() => set('kwhMultiplier', p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <PctInput label="Hurdle Rate" tip="Minimum cumulative return to Owner before Tier 2 kicks in" value={controls.hurdleRate} onChange={v => set('hurdleRate', v)} />
          <PctInput label="Tier 1: Owner" tip="Owner gets this % of NOI while below hurdle" value={controls.tier1OwnerSplit} onChange={v => set('tier1OwnerSplit', v)} />
          <div className="space-y-1">
            <Label className="text-xs font-medium">Tier 1: MS</Label>
            <Input disabled value={`${((1 - controls.tier1OwnerSplit) * 100).toFixed(0)}%`} className="h-8 text-sm font-mono bg-muted" />
          </div>
          <PctInput label="Tier 2: Owner" tip="Owner gets this % of NOI above hurdle" value={controls.tier2OwnerSplit} onChange={v => set('tier2OwnerSplit', v)} />
          <div className="space-y-1">
            <Label className="text-xs font-medium">Tier 2: MS</Label>
            <Input disabled value={`${((1 - controls.tier2OwnerSplit) * 100).toFixed(0)}%`} className="h-8 text-sm font-mono bg-muted" />
          </div>
          <PctInput label="NOI Growth" tip="Annual growth applied to portfolio NOI" value={controls.noiGrowthRate} onChange={v => set('noiGrowthRate', v)} />
          <div className="space-y-1">
            <Label className="text-xs font-medium">Hold Period<TIP text="Years before exit" /></Label>
            <div className="relative">
              <Input type="number" value={controls.holdPeriod} onChange={e => set('holdPeriod', parseInt(e.target.value) || 5)} className="bg-amber/10 text-primary font-mono text-sm pr-6 h-8" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">yr</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-medium">Exit Multiple<TIP text="EBITDA multiple at exit" /></Label>
            <div className="relative">
              <Input type="number" step={0.5} value={controls.exitMultiple} onChange={e => set('exitMultiple', parseFloat(e.target.value) || 10)} className="bg-amber/10 text-primary font-mono text-sm pr-6 h-8" />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">x</span>
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <PctInput label="MS Promote at Exit" tip="MS share of exit proceeds after Owner preferred return" value={controls.msPromoteAtExit} onChange={v => set('msPromoteAtExit', v)} />
          <div className="space-y-1">
            <Label className="text-xs font-medium">kWh Multiplier<TIP text="Scales all sites' kWh/day. 1.0 = base" /></Label>
            <Input type="number" step={0.05} value={controls.kwhMultiplier} onChange={e => set('kwhMultiplier', parseFloat(e.target.value) || 1)} className="bg-amber/10 text-primary font-mono text-sm h-8" />
          </div>
        </div>

        {/* GP Fee Structure */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <h4 className="text-xs font-heading font-semibold mb-2 text-muted-foreground uppercase tracking-wide">GP Fee Structure</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <PctInput label="Acquisition Fee" tip="One-time fee on total project cost at acquisition" value={controls.acquisitionFeePct} onChange={v => set('acquisitionFeePct', v)} />
            <PctInput label="CM Fee" tip="Construction management fee on total project cost" value={controls.cmFeePct} onChange={v => set('cmFeePct', v)} />
            <PctInput label="Asset Mgmt Fee" tip="Annual fee on gross revenue" value={controls.assetMgmtFeePct} onChange={v => set('assetMgmtFeePct', v)} />
            <PctInput label="Disposition Fee" tip="Fee on exit value at sale" value={controls.dispositionFeePct} onChange={v => set('dispositionFeePct', v)} />
            <div className="space-y-1">
              <Label className="text-xs font-medium">Scout $/Site<TIP text="Commission per site to scout" /></Label>
              <div className="relative">
                <Input type="number" value={controls.scoutCommissionPerSite} onChange={e => set('scoutCommissionPerSite', parseFloat(e.target.value) || 0)} className="bg-amber/10 text-primary font-mono text-sm h-8 pr-1" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Incentives Mgr<TIP text="Annual salary for incentives manager" /></Label>
              <div className="relative">
                <Input type="number" value={controls.incentivesMgrSalary} onChange={e => set('incentivesMgrSalary', parseFloat(e.target.value) || 0)} className="bg-amber/10 text-primary font-mono text-sm h-8 pr-1" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
