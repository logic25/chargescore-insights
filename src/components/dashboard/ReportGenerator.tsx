import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import type { SiteAnalysis, FinancialProjection, Incentive, ParkingAnalysis, DemandChargeAnalysis } from '@/types/chargeRank';
import type { ChargeRankResult } from '@/lib/scoring';
import { calculateFinancials, getIncentives } from '@/lib/calculations';
import { getSatelliteImageUrl } from '@/lib/api/googleMaps';

interface Props {
  site: SiteAnalysis;
  score: ChargeRankResult;
  financials: FinancialProjection;
  incentives: Incentive[];
  parking: ParkingAnalysis;
  demandCharge: DemandChargeAnalysis;
}

// Colors — white background, professional palette
const NAVY = '#1B2A4A';
const TEAL = '#00997A';
const LIGHT_GRAY = '#f1f5f9';
const MUTED = '#64748b';
const BLACK = '#0f172a';
const RED = '#dc2626';
const GREEN = '#16a34a';
const AMBER = '#d97706';
const WHITE = '#ffffff';

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 45;
const CONTENT_W = PAGE_W - MARGIN * 2;

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

function addFooter(pdf: jsPDF, pageNum: number, totalPages: number) {
  pdf.setDrawColor('#e2e8f0');
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, PAGE_H - 35, PAGE_W - MARGIN, PAGE_H - 35);
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED);
  pdf.text('Managed Squares LLC  |  managedsquares.com  |  Confidential', MARGIN, PAGE_H - 22);
  pdf.text(`Page ${pageNum} of ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 22, { align: 'right' });
}

function sectionHeader(pdf: jsPDF, label: string, y: number): number {
  pdf.setFontSize(8);
  pdf.setTextColor(TEAL);
  pdf.text(label.toUpperCase(), MARGIN, y);
  pdf.setDrawColor(TEAL);
  pdf.setLineWidth(1);
  pdf.line(MARGIN, y + 4, MARGIN + 50, y + 4);
  return y + 20;
}

function tableRow(pdf: jsPDF, y: number, label: string, value: string, opts?: { bold?: boolean; valueColor?: string; indent?: number }) {
  const indent = opts?.indent || 0;
  pdf.setFontSize(9);
  pdf.setTextColor(MUTED);
  if (opts?.bold) pdf.setTextColor(BLACK);
  pdf.text(label, MARGIN + 10 + indent, y);
  pdf.setTextColor(opts?.valueColor || BLACK);
  if (opts?.bold) {
    pdf.setFont('helvetica', 'bold');
  }
  pdf.text(value, PAGE_W - MARGIN - 10, y, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  return y + 16;
}

async function loadImage(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    return new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } catch {
    return null;
  }
}

async function generateReport(props: Props): Promise<jsPDF> {
  const { site, score, financials, incentives, parking } = props;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalPages = 6;
  const stalls = site.chargingModel === 'tesla' ? site.teslaStalls : site.l2Chargers + site.dcfcChargers;
  const sets = Math.ceil(stalls / 4);

  // ===== PAGE 1: COVER =====
  pdf.setFillColor(NAVY);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  pdf.setFillColor(TEAL);
  pdf.rect(MARGIN, 200, 60, 3, 'F');

  pdf.setTextColor(TEAL);
  pdf.setFontSize(12);
  pdf.text('CHARGESCORE™', MARGIN, 190);

  pdf.setTextColor(WHITE);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('EV Charging', MARGIN, 250);
  pdf.text('Site Analysis', MARGIN, 295);
  pdf.setFont('helvetica', 'normal');

  pdf.setFontSize(14);
  pdf.setTextColor('#94a3b8');
  const addrLines = pdf.splitTextToSize(site.address, CONTENT_W * 0.65);
  pdf.text(addrLines, MARGIN, 340);

  // Score circle
  const cx = PAGE_W - MARGIN - 55;
  const cy = 260;
  pdf.setFillColor('#0f172a');
  pdf.circle(cx, cy, 48, 'F');
  pdf.setDrawColor(TEAL);
  pdf.setLineWidth(3);
  pdf.circle(cx, cy, 48, 'S');
  pdf.setTextColor(TEAL);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(38);
  pdf.text(String(score.totalScore), cx, cy + 6, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor('#94a3b8');
  pdf.text(`Grade: ${score.grade}`, cx, cy + 22, { align: 'center' });

  // Verdict
  pdf.setFontSize(10);
  pdf.setTextColor('#cbd5e1');
  const verdictLines = pdf.splitTextToSize(score.recommendation, CONTENT_W);
  pdf.text(verdictLines, MARGIN, 400);

  // Date & branding
  pdf.setFontSize(10);
  pdf.setTextColor('#94a3b8');
  pdf.text(date, MARGIN, PAGE_H - 110);

  pdf.setTextColor(WHITE);
  pdf.setFontSize(11);
  pdf.text('Prepared by', MARGIN, PAGE_H - 80);
  pdf.setTextColor(TEAL);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text('Managed Squares LLC', MARGIN, PAGE_H - 55);
  pdf.setFont('helvetica', 'normal');

  addFooter(pdf, 1, totalPages);

  // ===== PAGE 2: SITE OVERVIEW =====
  pdf.addPage();
  let y = sectionHeader(pdf, 'Site Overview', 50);

  pdf.setTextColor(BLACK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Property Details', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  y += 25;

  // Satellite image
  const satUrl = getSatelliteImageUrl(site.lat, site.lng, 19);
  const satImg = await loadImage(satUrl);
  if (satImg) {
    const imgW = CONTENT_W;
    const imgH = imgW * 0.6;
    pdf.addImage(satImg, 'JPEG', MARGIN, y, imgW, imgH);
    y += imgH + 15;
  }

  // Property details
  const propDetails = [
    ['Address', site.address],
    ['Property Type', site.propertyType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())],
    ['Total Parking Spaces', String(parking.totalSpaces)],
    ['Available for Chargers', String(parking.recommendedEv)],
    ['Electrical Service', site.electricalService === 'unknown' ? 'Unknown' : site.electricalService],
    ['State', site.state],
  ];
  propDetails.forEach(([label, value]) => {
    y = tableRow(pdf, y, label, value);
  });

  addFooter(pdf, 2, totalPages);

  // ===== PAGE 3: INVESTMENT SUMMARY =====
  pdf.addPage();
  y = sectionHeader(pdf, 'Investment Summary', 50);

  pdf.setTextColor(BLACK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Cost & Incentive Breakdown', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  y += 30;

  // Cost breakdown
  y = tableRow(pdf, y, 'Total Project Cost', fmt(financials.totalProjectCost), { bold: true });
  if (site.chargingModel === 'tesla') {
    y = tableRow(pdf, y, `Hardware (${sets} set${sets > 1 ? 's' : ''} of 4 × $250,000)`, fmt(financials.totalHardwareCost), { indent: 15 });
    y = tableRow(pdf, y, `Installation (${stalls} stalls × $15,000)`, fmt(financials.totalInstallationCost), { indent: 15 });
  } else {
    y = tableRow(pdf, y, 'Hardware', fmt(financials.totalHardwareCost), { indent: 15 });
    y = tableRow(pdf, y, 'Installation', fmt(financials.totalInstallationCost), { indent: 15 });
  }
  y += 8;

  // Incentives by layer
  pdf.setFontSize(10);
  pdf.setTextColor(GREEN);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Less: Incentives', MARGIN + 10, y);
  pdf.text(`(${fmt(financials.estimatedIncentives)})`, PAGE_W - MARGIN - 10, y, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  y += 18;

  const layers = ['federal', 'state', 'utility'] as const;
  const layerLabels = { federal: 'Federal', state: 'State', utility: 'Utility' };
  layers.forEach((layer) => {
    const layerIncentives = incentives.filter(i => i.category === layer);
    if (layerIncentives.length === 0) return;
    pdf.setFontSize(7);
    pdf.setTextColor(MUTED);
    pdf.text(layerLabels[layer].toUpperCase(), MARGIN + 25, y);
    y += 12;
    layerIncentives.forEach((inc) => {
      pdf.setFontSize(8);
      pdf.setTextColor('#475569');
      pdf.text(`├─ ${inc.name}`, MARGIN + 30, y);
      pdf.setTextColor(GREEN);
      pdf.text(inc.amount, PAGE_W - MARGIN - 10, y, { align: 'right' });
      y += 13;
    });
    y += 4;
  });

  // Divider
  pdf.setDrawColor('#e2e8f0');
  pdf.setLineWidth(1.5);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 20;

  // Out-of-pocket — HERO
  const oop = financials.netInvestment;
  const oopColor = oop <= 0 ? GREEN : oop <= 50000 ? GREEN : oop <= 150000 ? AMBER : RED;
  pdf.setFontSize(11);
  pdf.setTextColor(MUTED);
  pdf.text('YOUR OUT-OF-POCKET', PAGE_W / 2, y, { align: 'center' });
  y += 25;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(32);
  pdf.setTextColor(oopColor);
  pdf.text(fmt(oop), PAGE_W / 2, y, { align: 'center' });
  pdf.setFont('helvetica', 'normal');

  if (oop <= 0) {
    y += 16;
    pdf.setFontSize(9);
    pdf.setTextColor(GREEN);
    pdf.text('Incentives cover 100% of your project cost.', PAGE_W / 2, y, { align: 'center' });
  }

  y += 35;

  // Bottom metrics
  pdf.setFillColor(LIGHT_GRAY);
  pdf.roundedRect(MARGIN, y, CONTENT_W / 2 - 5, 50, 4, 4, 'F');
  pdf.roundedRect(MARGIN + CONTENT_W / 2 + 5, y, CONTENT_W / 2 - 5, 50, 4, 4, 'F');

  pdf.setFontSize(8);
  pdf.setTextColor(MUTED);
  pdf.text('Payback Period', MARGIN + 15, y + 18);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(BLACK);
  pdf.text(
    isFinite(financials.paybackYears) && financials.paybackYears < 100
      ? `${financials.paybackYears} years`
      : 'N/A',
    MARGIN + 15, y + 38
  );
  pdf.setFont('helvetica', 'normal');

  pdf.setFontSize(8);
  pdf.setTextColor(MUTED);
  pdf.text('15-Year NPV (8%)', MARGIN + CONTENT_W / 2 + 20, y + 18);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.setTextColor(financials.npv15Year > 0 ? GREEN : RED);
  pdf.text(fmt(financials.npv15Year), MARGIN + CONTENT_W / 2 + 20, y + 38);
  pdf.setFont('helvetica', 'normal');

  addFooter(pdf, 3, totalPages);

  // ===== PAGE 4: REVENUE PROJECTION =====
  pdf.addPage();
  y = sectionHeader(pdf, 'Revenue Projection', 50);

  pdf.setTextColor(BLACK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Year 1 Revenue & Costs', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  y += 30;

  y = tableRow(pdf, y, 'Charging Revenue', `${fmt(financials.annualRevenue)}/yr`, { bold: true, valueColor: GREEN });
  y = tableRow(pdf, y, 'Less: Electricity (levelized)', `(${fmt(financials.monthlyElectricityCost * 12)})/yr`, { valueColor: RED });
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED);
  pdf.text('Includes demand charges, TOU pricing, and surcharges', MARGIN + 25, y - 6);

  if (financials.chargingModel === 'tesla' && financials.teslaServiceFeeAnnual > 0) {
    y = tableRow(pdf, y, 'Less: Tesla Service Fee', `(${fmt(financials.teslaServiceFeeAnnual)})/yr`, { valueColor: RED });
  }

  y += 5;
  pdf.setDrawColor('#e2e8f0');
  pdf.setLineWidth(1);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 20;

  const netProfit = financials.annualNetRevenue;
  pdf.setFontSize(10);
  pdf.setTextColor(MUTED);
  pdf.text('NET PROFIT', PAGE_W / 2, y, { align: 'center' });
  y += 22;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(26);
  pdf.setTextColor(netProfit >= 0 ? GREEN : RED);
  pdf.text(`${fmt(netProfit)}/yr`, PAGE_W / 2, y, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  y += 18;
  pdf.setFontSize(10);
  pdf.setTextColor(MUTED);
  pdf.text(`Monthly to You: ${fmt(netProfit / 12)}/mo`, PAGE_W / 2, y, { align: 'center' });
  y += 35;

  // 15-year cash flow table
  pdf.setFontSize(12);
  pdf.setTextColor(BLACK);
  pdf.setFont('helvetica', 'bold');
  pdf.text('15-Year Cumulative Cash Flow', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  y += 20;

  // Simple bar representation via colored rectangles
  const maxAbs = Math.max(...financials.cumulativeCashFlow.map(Math.abs), 1);
  const barAreaW = CONTENT_W - 40;
  const barH = 14;
  financials.cumulativeCashFlow.forEach((val, i) => {
    const barW = Math.abs(val / maxAbs) * (barAreaW / 2);
    const isPos = val >= 0;
    const barX = isPos ? MARGIN + 30 + barAreaW / 2 : MARGIN + 30 + barAreaW / 2 - barW;

    pdf.setFontSize(7);
    pdf.setTextColor(MUTED);
    pdf.text(`Y${i + 1}`, MARGIN + 10, y + barH / 2 + 3);

    pdf.setFillColor(isPos ? GREEN : RED);
    pdf.rect(barX, y, barW, barH, 'F');

    pdf.setFontSize(7);
    pdf.setTextColor(BLACK);
    pdf.text(fmt(val), PAGE_W - MARGIN - 10, y + barH / 2 + 3, { align: 'right' });

    y += barH + 3;
  });

  y += 15;
  // Key assumptions
  pdf.setFontSize(8);
  pdf.setTextColor(MUTED);
  pdf.text('Key Assumptions:', MARGIN, y);
  y += 12;
  const assumptions = [
    `${stalls} stalls at 250 kWh/stall/day (medium utilization)`,
    '7% annual utilization growth',
    `Retail price: $${site.pricePerKwh}/kWh | Electricity cost: $${site.electricityCostPerKwh}/kWh (levelized)`,
    'Tesla service fee: $0.10/kWh with 3% annual escalation',
    '8% discount rate for NPV',
  ];
  assumptions.forEach((a) => {
    pdf.setFontSize(7);
    pdf.text(`• ${a}`, MARGIN + 10, y);
    y += 11;
  });

  addFooter(pdf, 4, totalPages);

  // ===== PAGE 5: NETWORK COMPARISON =====
  pdf.addPage();
  y = sectionHeader(pdf, 'Network Options', 50);

  pdf.setTextColor(BLACK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Tesla vs ChargePoint vs Turnkey', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  y += 25;

  // Table headers
  const col1 = MARGIN;
  const col2 = MARGIN + 155;
  const col3 = MARGIN + 305;
  const col4 = MARGIN + 420;

  pdf.setFillColor(LIGHT_GRAY);
  pdf.rect(MARGIN, y - 12, CONTENT_W, 18, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BLACK);
  pdf.text('Metric', col1 + 5, y);
  pdf.text('Tesla Supercharger', col2, y);
  pdf.text('Owner-Operated', col3, y);
  pdf.text('Turnkey', col4, y);
  pdf.setFont('helvetica', 'normal');
  y += 15;

  const compRows = [
    ['Hardware/Stall', '$62,500 (sets of 4)', '$85,000–$100,000', '$0 (operator)'],
    ['Install/Stall', '$15,000', '$40,000–$150,000', '$0 (operator)'],
    ['Who Owns It', 'You', 'You', 'Operator'],
    ['Revenue', 'You keep minus $0.10/kWh', '100% yours', 'Fixed lease $500–1K/mo'],
    ['Maintenance', 'Tesla ($0 to you)', 'You (~$1,500/yr)', 'Operator'],
    ['Control Pricing?', 'Yes', 'Yes — full', 'No'],
    ['Contract', '10 years', 'No lock-in', '10–15 years'],
    ['Utilization', '18–30%', '8–20%', '15–25%'],
    ['Incentive Eligible?', 'Yes', 'Yes', 'Usually no'],
    ['Best For', 'Passive, low risk', 'Max revenue', 'Zero investment'],
  ];

  compRows.forEach(([metric, tesla, owner, turnkey], i) => {
    if (i % 2 === 0) {
      pdf.setFillColor('#f8fafc');
      pdf.rect(MARGIN, y - 10, CONTENT_W, 15, 'F');
    }
    pdf.setFontSize(7);
    pdf.setTextColor(MUTED);
    pdf.text(metric, col1 + 5, y);
    pdf.setTextColor(BLACK);
    pdf.text(tesla, col2, y);
    pdf.text(owner, col3, y);
    pdf.text(turnkey, col4, y);
    y += 15;
  });

  addFooter(pdf, 5, totalPages);

  // ===== PAGE 6: INCENTIVES DETAIL =====
  pdf.addPage();
  y = sectionHeader(pdf, 'Incentives Detail', 50);

  pdf.setTextColor(BLACK);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Available Programs', MARGIN, y);
  pdf.setFont('helvetica', 'normal');
  y += 25;

  incentives.forEach((inc) => {
    if (y > PAGE_H - 100) return;

    // Status + Name + Amount
    pdf.setFillColor(LIGHT_GRAY);
    pdf.roundedRect(MARGIN, y - 10, CONTENT_W, 48, 3, 3, 'F');

    const statusIcon = inc.eligible === true ? '✓' : inc.eligible === false ? '✗' : '?';
    const statusColor = inc.eligible === true ? GREEN : inc.eligible === false ? RED : MUTED;
    pdf.setFontSize(10);
    pdf.setTextColor(statusColor);
    pdf.text(statusIcon, MARGIN + 10, y + 4);

    // Category badge
    const catLabel = (inc.category || 'other').toUpperCase();
    pdf.setFontSize(6);
    pdf.setTextColor(TEAL);
    pdf.text(catLabel, MARGIN + 22, y - 2);

    pdf.setFontSize(10);
    pdf.setTextColor(BLACK);
    pdf.setFont('helvetica', 'bold');
    pdf.text(inc.name, MARGIN + 22, y + 5);
    pdf.setFont('helvetica', 'normal');

    pdf.setTextColor(TEAL);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(inc.amount, PAGE_W - MARGIN - 10, y + 5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');

    // Details
    pdf.setFontSize(7);
    pdf.setTextColor(MUTED);
    const detailLines = pdf.splitTextToSize(inc.details, CONTENT_W - 45);
    pdf.text(detailLines.slice(0, 3), MARGIN + 22, y + 18);

    y += 55;
  });

  addFooter(pdf, 6, totalPages);

  return pdf;
}

const ReportGenerator = (props: Props) => {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const pdf = await generateReport(props);
      const filename = `ChargeScore_${props.site.address.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}_${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={handleGenerate} disabled={generating}>
      {generating ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-1 h-4 w-4" />
      )}
      {generating ? 'Generating…' : 'Download Report'}
    </Button>
  );
};

export default ReportGenerator;
