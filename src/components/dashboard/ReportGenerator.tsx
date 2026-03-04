import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { SiteAnalysis, FinancialProjection, Incentive, ParkingAnalysis, DemandChargeAnalysis } from '@/types/chargeScore';
import type { ChargeScoreResult } from '@/lib/scoring';

interface Props {
  site: SiteAnalysis;
  score: ChargeScoreResult;
  financials: FinancialProjection;
  incentives: Incentive[];
  parking: ParkingAnalysis;
  demandCharge: DemandChargeAnalysis;
}

const NAVY = '#1B2A4A';
const TEAL = '#00D4AA';
const DARK_BG = '#0f172a';
const MUTED = '#94a3b8';
const WHITE = '#f8fafc';
const RED = '#ef4444';
const GREEN = '#22c55e';

const fmt = (n: number) => {
  if (!isFinite(n)) return '—';
  return n < 0 ? `-$${Math.abs(Math.round(n)).toLocaleString()}` : `$${Math.round(n).toLocaleString()}`;
};

const PAGE_W = 595.28; // A4 width in pts
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

function addFooter(pdf: jsPDF, pageNum: number, totalPages: number) {
  pdf.setFontSize(7);
  pdf.setTextColor(MUTED);
  pdf.text('Managed Squares LLC  |  managedsquares.com  |  Confidential', PAGE_W / 2, PAGE_H - 20, { align: 'center' });
  pdf.text(`${pageNum} / ${totalPages}`, PAGE_W - MARGIN, PAGE_H - 20, { align: 'right' });
}

function drawLine(pdf: jsPDF, y: number) {
  pdf.setDrawColor(TEAL);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
}

async function captureElement(selector: string): Promise<HTMLCanvasElement | null> {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  return html2canvas(el, { backgroundColor: DARK_BG, scale: 2, useCORS: true });
}

async function generateReport(props: Props): Promise<jsPDF> {
  const { site, score, financials, incentives, parking, demandCharge } = props;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const totalPages = 5;

  // ===== PAGE 1: COVER =====
  pdf.setFillColor(NAVY);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // Accent line
  pdf.setFillColor(TEAL);
  pdf.rect(MARGIN, 180, 60, 4, 'F');

  pdf.setTextColor(TEAL);
  pdf.setFontSize(14);
  pdf.text('CHARGESCORE™', MARGIN, 160);

  pdf.setTextColor(WHITE);
  pdf.setFontSize(32);
  pdf.text('EV Charging', MARGIN, 230);
  pdf.text('Site Analysis', MARGIN, 270);

  pdf.setFontSize(16);
  pdf.setTextColor(MUTED);
  pdf.text(site.address, MARGIN, 320);

  // Score circle
  const cx = PAGE_W - MARGIN - 60;
  const cy = 240;
  pdf.setFillColor(DARK_BG);
  pdf.circle(cx, cy, 50, 'F');
  pdf.setDrawColor(TEAL);
  pdf.setLineWidth(3);
  pdf.circle(cx, cy, 50, 'S');
  pdf.setTextColor(TEAL);
  pdf.setFontSize(36);
  pdf.text(String(score.totalScore), cx, cy + 5, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setTextColor(MUTED);
  pdf.text(`Grade: ${score.grade}`, cx, cy + 22, { align: 'center' });

  // Score verdict
  pdf.setFontSize(11);
  pdf.setTextColor(WHITE);
  const verdictLines = pdf.splitTextToSize(score.recommendation, CONTENT_W);
  pdf.text(verdictLines, MARGIN, 380);

  // Date & branding
  pdf.setFontSize(11);
  pdf.setTextColor(MUTED);
  pdf.text(date, MARGIN, PAGE_H - 120);
  pdf.setTextColor(WHITE);
  pdf.setFontSize(13);
  pdf.text('Prepared by', MARGIN, PAGE_H - 80);
  pdf.setTextColor(TEAL);
  pdf.setFontSize(18);
  pdf.text('Managed Squares LLC', MARGIN, PAGE_H - 55);

  addFooter(pdf, 1, totalPages);

  // ===== PAGE 2: COMPETITION MAP =====
  pdf.addPage();
  pdf.setFillColor(DARK_BG);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  pdf.setTextColor(TEAL);
  pdf.setFontSize(10);
  pdf.text('COMPETITION MAP', MARGIN, 50);
  drawLine(pdf, 58);
  pdf.setTextColor(WHITE);
  pdf.setFontSize(20);
  pdf.text('Nearby EV Charging Stations', MARGIN, 85);

  // Capture map
  const mapCanvas = await captureElement('.leaflet-container');
  if (mapCanvas) {
    const imgData = mapCanvas.toDataURL('image/png');
    const mapH = (CONTENT_W / mapCanvas.width) * mapCanvas.height;
    pdf.addImage(imgData, 'PNG', MARGIN, 100, CONTENT_W, Math.min(mapH, 380));
  } else {
    pdf.setTextColor(MUTED);
    pdf.setFontSize(12);
    pdf.text('Map not available — stations loading', MARGIN, 200);
  }

  // Legend
  const legendY = 510;
  pdf.setFontSize(9);
  pdf.setFillColor('#ef4444'); pdf.circle(MARGIN + 5, legendY, 4, 'F');
  pdf.setTextColor(MUTED); pdf.text('Tesla', MARGIN + 15, legendY + 3);
  pdf.setFillColor('#3b82f6'); pdf.circle(MARGIN + 65, legendY, 4, 'F');
  pdf.text('ChargePoint/Blink', MARGIN + 75, legendY + 3);
  pdf.setFillColor('#22c55e'); pdf.circle(MARGIN + 185, legendY, 4, 'F');
  pdf.text('EVgo/EA', MARGIN + 195, legendY + 3);
  pdf.setFillColor('#888'); pdf.circle(MARGIN + 265, legendY, 4, 'F');
  pdf.text('Other', MARGIN + 275, legendY + 3);

  addFooter(pdf, 2, totalPages);

  // ===== PAGE 3: FINANCIAL SUMMARY =====
  pdf.addPage();
  pdf.setFillColor(DARK_BG);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  pdf.setTextColor(TEAL);
  pdf.setFontSize(10);
  pdf.text('FINANCIAL SUMMARY', MARGIN, 50);
  drawLine(pdf, 58);
  pdf.setTextColor(WHITE);
  pdf.setFontSize(20);
  const modelLabel = financials.chargingModel === 'tesla' ? 'Tesla Supercharger for Business' : 'Owner-Operated Model';
  pdf.text(`${modelLabel} — Projection`, MARGIN, 85);

  // Key metrics boxes
  const metrics = [
    { label: 'Net Investment', value: fmt(financials.netInvestment) },
    { label: 'Annual Net Revenue', value: fmt(financials.annualNetRevenue) },
    { label: 'Payback', value: isFinite(financials.paybackYears) ? `${financials.paybackYears} yr` : 'N/A' },
    { label: '15-Year NPV', value: fmt(financials.npv15Year) },
  ];

  const boxW = (CONTENT_W - 30) / 4;
  metrics.forEach((m, i) => {
    const x = MARGIN + i * (boxW + 10);
    pdf.setFillColor(NAVY);
    pdf.roundedRect(x, 105, boxW, 55, 4, 4, 'F');
    pdf.setTextColor(MUTED);
    pdf.setFontSize(8);
    pdf.text(m.label, x + boxW / 2, 122, { align: 'center' });
    pdf.setTextColor(TEAL);
    pdf.setFontSize(16);
    pdf.text(m.value, x + boxW / 2, 145, { align: 'center' });
  });

  // Investment summary table
  let ty = 190;
  pdf.setFontSize(11);
  pdf.setTextColor(WHITE);
  pdf.text('Investment Summary', MARGIN, ty);
  ty += 20;

  const summaryRows = [
    ['Annual Gross Revenue', fmt(financials.annualRevenue)],
    ['Annual Operating Costs', `-${fmt(financials.totalAnnualOperatingCost)}`],
    ['Annual Net Profit', fmt(financials.annualNetRevenue)],
    ['', ''],
    ['Total Project Cost', fmt(financials.totalProjectCost)],
    ['Estimated Incentives', `-${fmt(financials.estimatedIncentives)}`],
    ['Net Investment', fmt(financials.netInvestment)],
    ['', ''],
    ['5-Year ROI', `${Math.round(financials.fiveYearRoi)}%`],
  ];

  summaryRows.forEach(([label, value]) => {
    if (!label) { ty += 8; return; }
    pdf.setFontSize(9);
    pdf.setTextColor(MUTED);
    pdf.text(label, MARGIN + 10, ty);
    const isNeg = value.startsWith('-');
    pdf.setTextColor(isNeg ? RED : WHITE);
    pdf.text(value, PAGE_W / 2 - 20, ty, { align: 'right' });
    ty += 16;
  });

  // Cash flow chart capture
  const chartCanvas = await captureElement('.recharts-responsive-container');
  if (chartCanvas) {
    const imgData = chartCanvas.toDataURL('image/png');
    const chartW = CONTENT_W;
    const chartH = (chartW / chartCanvas.width) * chartCanvas.height;
    pdf.addImage(imgData, 'PNG', MARGIN, ty + 20, chartW, Math.min(chartH, 250));
  }

  addFooter(pdf, 3, totalPages);

  // ===== PAGE 4: INCENTIVES =====
  pdf.addPage();
  pdf.setFillColor(DARK_BG);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  pdf.setTextColor(TEAL);
  pdf.setFontSize(10);
  pdf.text('INCENTIVES & REBATES', MARGIN, 50);
  drawLine(pdf, 58);
  pdf.setTextColor(WHITE);
  pdf.setFontSize(20);
  pdf.text('Available Incentives', MARGIN, 85);

  let iy = 110;
  incentives.forEach((inc) => {
    if (iy > PAGE_H - 80) return; // safety
    pdf.setFillColor(NAVY);
    const boxH = 50;
    pdf.roundedRect(MARGIN, iy, CONTENT_W, boxH, 4, 4, 'F');

    // Status icon
    pdf.setFontSize(10);
    if (inc.eligible === true) { pdf.setTextColor(GREEN); pdf.text('✓', MARGIN + 10, iy + 18); }
    else if (inc.eligible === false) { pdf.setTextColor(RED); pdf.text('✗', MARGIN + 10, iy + 18); }
    else { pdf.setTextColor(MUTED); pdf.text('?', MARGIN + 10, iy + 18); }

    pdf.setTextColor(WHITE);
    pdf.setFontSize(10);
    pdf.text(inc.name, MARGIN + 25, iy + 18);

    pdf.setTextColor(TEAL);
    pdf.setFontSize(11);
    pdf.text(inc.amount, PAGE_W - MARGIN - 10, iy + 18, { align: 'right' });

    pdf.setTextColor(MUTED);
    pdf.setFontSize(7);
    const descLines = pdf.splitTextToSize(inc.details, CONTENT_W - 40);
    pdf.text(descLines.slice(0, 2), MARGIN + 25, iy + 32);

    iy += boxH + 8;
  });

  addFooter(pdf, 4, totalPages);

  // ===== PAGE 5: DEMAND CHARGE & PARKING =====
  pdf.addPage();
  pdf.setFillColor(DARK_BG);
  pdf.rect(0, 0, PAGE_W, PAGE_H, 'F');

  pdf.setTextColor(TEAL);
  pdf.setFontSize(10);
  pdf.text('OPERATIONAL ANALYSIS', MARGIN, 50);
  drawLine(pdf, 58);

  // Demand charge section
  pdf.setTextColor(WHITE);
  pdf.setFontSize(16);
  pdf.text('Demand Charge Analysis', MARGIN, 90);

  const dcRows = [
    ['Peak Demand', `${Math.round(demandCharge.peakDemandKw)} kW`],
    ['Monthly Demand Charge', fmt(demandCharge.monthlyDemandCharge)],
    ['Monthly Energy Cost', fmt(demandCharge.monthlyEnergyCost)],
    ['Demand Charge % of Total', `${Math.round(demandCharge.demandChargePercent)}%`],
  ];

  let dy = 115;
  dcRows.forEach(([label, value]) => {
    pdf.setFontSize(9);
    pdf.setTextColor(MUTED);
    pdf.text(label, MARGIN + 10, dy);
    pdf.setTextColor(WHITE);
    pdf.text(value, MARGIN + 280, dy, { align: 'right' });
    dy += 18;
  });

  dy += 10;
  pdf.setTextColor(TEAL);
  pdf.setFontSize(9);
  pdf.text('Recommendations:', MARGIN + 10, dy);
  dy += 14;
  demandCharge.recommendations.forEach((rec) => {
    if (dy > 350) return;
    pdf.setTextColor(MUTED);
    pdf.setFontSize(8);
    const lines = pdf.splitTextToSize(`• ${rec}`, CONTENT_W - 20);
    pdf.text(lines, MARGIN + 15, dy);
    dy += lines.length * 12 + 4;
  });

  // Parking section
  const py = Math.max(dy + 30, 340);
  pdf.setTextColor(WHITE);
  pdf.setFontSize(16);
  pdf.text('Parking Impact', MARGIN, py);

  const parkRows = [
    ['Total Spaces', String(parking.totalSpaces)],
    ['Peak Utilization', `${parking.peakUsed} spaces (${Math.round((parking.peakUsed / parking.totalSpaces) * 100)}%)`],
    ['Available Off-Peak', String(parking.available)],
    ['Recommended EV Spots', String(parking.recommendedEv)],
    ['Requested Chargers', String(parking.requestedChargers)],
  ];

  let pry = py + 25;
  parkRows.forEach(([label, value]) => {
    pdf.setFontSize(9);
    pdf.setTextColor(MUTED);
    pdf.text(label, MARGIN + 10, pry);
    pdf.setTextColor(WHITE);
    pdf.text(value, MARGIN + 280, pry, { align: 'right' });
    pry += 18;
  });

  if (parking.exceedsAvailable) {
    pry += 5;
    pdf.setTextColor(RED);
    pdf.setFontSize(8);
    pdf.text('⚠ Requested chargers exceed recommended EV spots based on parking availability.', MARGIN + 10, pry);
  }

  addFooter(pdf, 5, totalPages);

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
