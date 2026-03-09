import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, X, Download, Info } from "lucide-react";
import type { SiteRow, MasterControls } from "@/lib/waterfallCalc";
import { computeSite, fmt } from "@/lib/waterfallCalc";

interface Props {
  sites: SiteRow[];
  controls: MasterControls;
  onSitesChange: (sites: SiteRow[]) => void;
}

const TH = ({ children, tip }: { children?: React.ReactNode; tip?: string }) => (
  <TableHead className="text-xs font-medium whitespace-nowrap px-2">
    {children}
    {tip && (
      <Tooltip>
        <TooltipTrigger asChild><Info className="h-3 w-3 inline ml-0.5 text-muted-foreground cursor-help" /></TooltipTrigger>
        <TooltipContent className="max-w-[180px] text-xs">{tip}</TooltipContent>
      </Tooltip>
    )}
  </TableHead>
);

const EditCell = ({ value, onChange, onBlur, type = "text", step, className = "" }: {
  value: string | number; onChange: (v: string) => void; onBlur?: () => void; type?: string; step?: number; className?: string;
}) => (
  <TableCell className="px-1 py-0.5">
    <Input
      type={type}
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      className={`h-7 text-xs font-mono bg-amber/10 text-primary border-transparent focus:border-primary px-1.5 min-w-[60px] ${className}`}
    />
  </TableCell>
);

const FormulaCell = ({ children, negative }: { children: React.ReactNode; negative?: boolean }) => (
  <TableCell className={`px-2 py-1 text-xs font-mono whitespace-nowrap ${negative ? 'text-destructive' : ''}`}>
    {children}
  </TableCell>
);

export default function SiteTable({ sites, controls, onSitesChange }: Props) {
  const computed = sites.map(s => computeSite(s, controls));
  const totals = {
    stalls: computed.reduce((s, c) => s + c.stalls, 0),
    totalProjectCost: computed.reduce((s, c) => s + c.totalProjectCost, 0),
    incentives: computed.reduce((s, c) => s + c.incentives, 0),
    outOfPocket: computed.reduce((s, c) => s + c.outOfPocket, 0),
    annualNOI: computed.reduce((s, c) => s + c.annualNOI, 0),
    ownerMonthly: computed.reduce((s, c) => s + c.ownerAnnualTier1, 0) / 12,
    msMonthly: computed.reduce((s, c) => s + c.msAnnualTier1, 0) / 12,
  };

  const updateSite = (idx: number, key: keyof SiteRow, raw: string) => {
    const updated = [...sites];
    const s = { ...updated[idx] };
    if (key === 'name' || key === 'address') {
      (s as any)[key] = raw;
    } else {
      (s as any)[key] = parseFloat(raw) || 0;
    }
    updated[idx] = s;
    onSitesChange(updated);
  };

  const roundStalls = (idx: number) => {
    const updated = [...sites];
    const s = { ...updated[idx] };
    s.stalls = Math.max(4, Math.ceil(s.stalls / 4) * 4);
    updated[idx] = s;
    onSitesChange(updated);
  };

  const addSite = () => {
    const newSite: SiteRow = {
      id: crypto.randomUUID(),
      name: "New Site",
      address: "",
      stalls: 4,
      baseKwhPerStallPerDay: 200,
      customerPrice: 0.45,
      electricityCost: 0.15,
      teslaFee: 0.10,
      bomPerStall: 62500,
      installPerStall: 25000,
      incentives: 0,
      insurance: 5000,
      monthlyRent: 0,
    };
    onSitesChange([...sites, newSite]);
  };

  const removeSite = (idx: number) => {
    onSitesChange(sites.filter((_, i) => i !== idx));
  };

  const exportCSV = () => {
    const headers = ["Site", "Address", "Stalls", "Base kWh", "Eff kWh", "Price", "Elec", "Tesla", "Margin", "BOM/Stall", "Install/Stall", "Project Cost", "Incentives", "OOP", "Annual NOI", "Owner Mo", "MS Mo", "CoC"];
    const rows = computed.map(c => [
      c.name, c.address, c.stalls, c.baseKwhPerStallPerDay, c.effectiveKwhPerDay.toFixed(0),
      c.customerPrice, c.electricityCost, c.teslaFee, c.marginPerKwh.toFixed(3),
      c.bomPerStall, c.installPerStall, c.totalProjectCost, c.incentives, c.outOfPocket,
      c.annualNOI.toFixed(0), (c.ownerAnnualTier1 / 12).toFixed(0), (c.msAnnualTier1 / 12).toFixed(0),
      c.cocReturn ? (c.cocReturn * 100).toFixed(1) + '%' : 'N/A',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'portfolio_sites.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-heading font-semibold">Site Portfolio ({sites.length} sites)</h3>
        <Button variant="outline" size="sm" className="text-xs h-7" onClick={exportCSV}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>
      <div className="border rounded-lg overflow-auto max-h-[500px]">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              <TH>Site</TH>
              <TH>Address</TH>
              <TH tip="Must be multiples of 4">Stalls</TH>
              <TH tip="Base utilization per stall">Base kWh</TH>
              <TH tip="Base × Scenario Multiplier">Eff kWh</TH>
              <TH tip="What drivers pay">Price</TH>
              <TH tip="Utility rate">Elec</TH>
              <TH>Tesla</TH>
              <TH tip="Price - Electricity - Tesla Fee">Margin</TH>
              <TH tip="Fixed at $62,500">BOM</TH>
              <TH>Install</TH>
              <TH tip="(BOM+Install)×Stalls">Project $</TH>
              <TH>Incentives</TH>
              <TH tip="Project - Incentives">OOP</TH>
              <TH tip="Stalls×kWh×Margin×365 - Insurance - Rent">NOI/yr</TH>
              <TH>Owner/mo</TH>
              <TH>MS/mo</TH>
              <TH tip="Owner Annual / OOP">CoC</TH>
              <TH></TH>
            </TableRow>
          </TableHeader>
          <TableBody>
            {computed.map((c, i) => (
              <TableRow key={c.id} className="hover:bg-muted/30">
                <EditCell value={c.name} onChange={v => updateSite(i, 'name', v)} className="min-w-[100px]" />
                <EditCell value={c.address} onChange={v => updateSite(i, 'address', v)} className="min-w-[100px]" />
                <EditCell value={c.stalls} onChange={v => updateSite(i, 'stalls', v)} type="number" step={4} />
                <EditCell value={c.baseKwhPerStallPerDay} onChange={v => updateSite(i, 'baseKwhPerStallPerDay', v)} type="number" />
                <FormulaCell>{c.effectiveKwhPerDay.toFixed(0)}</FormulaCell>
                <EditCell value={c.customerPrice} onChange={v => updateSite(i, 'customerPrice', v)} type="number" step={0.01} />
                <EditCell value={c.electricityCost} onChange={v => updateSite(i, 'electricityCost', v)} type="number" step={0.01} />
                <FormulaCell>$0.10</FormulaCell>
                <FormulaCell negative={c.marginPerKwh < 0}>${c.marginPerKwh.toFixed(3)}</FormulaCell>
                <FormulaCell>{fmt(c.bomPerStall)}</FormulaCell>
                <EditCell value={c.installPerStall} onChange={v => updateSite(i, 'installPerStall', v)} type="number" step={1000} />
                <FormulaCell>{fmt(c.totalProjectCost)}</FormulaCell>
                <EditCell value={c.incentives} onChange={v => updateSite(i, 'incentives', v)} type="number" step={1000} />
                <FormulaCell>{fmt(c.outOfPocket)}</FormulaCell>
                <FormulaCell negative={c.annualNOI < 0}>{fmt(Math.round(c.annualNOI))}</FormulaCell>
                <FormulaCell>{fmt(Math.round(c.ownerAnnualTier1 / 12))}</FormulaCell>
                <FormulaCell>{fmt(Math.round(c.msAnnualTier1 / 12))}</FormulaCell>
                <FormulaCell>
                  {c.cocReturn !== null ? (
                    <span className={c.cocReturn >= 0.15 ? 'text-success' : c.cocReturn >= 0.10 ? 'text-amber' : 'text-destructive'}>
                      {(c.cocReturn * 100).toFixed(1)}%
                    </span>
                  ) : 'N/A'}
                </FormulaCell>
                <TableCell className="px-1 py-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSite(i)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell colSpan={2} className="text-xs px-2">Portfolio Totals</TableCell>
              <TableCell className="text-xs font-mono px-2">{totals.stalls}</TableCell>
              <TableCell colSpan={8} />
              <TableCell className="text-xs font-mono px-2">{fmt(totals.totalProjectCost)}</TableCell>
              <TableCell className="text-xs font-mono px-2">{fmt(totals.incentives)}</TableCell>
              <TableCell className="text-xs font-mono px-2">{fmt(totals.outOfPocket)}</TableCell>
              <TableCell className="text-xs font-mono px-2">{fmt(Math.round(totals.annualNOI))}</TableCell>
              <TableCell className="text-xs font-mono px-2">{fmt(Math.round(totals.ownerMonthly))}</TableCell>
              <TableCell className="text-xs font-mono px-2">{fmt(Math.round(totals.msMonthly))}</TableCell>
              <TableCell colSpan={2} />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      <Button variant="outline" size="sm" className="text-xs" onClick={addSite}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Add Site
      </Button>
    </div>
  );
}
