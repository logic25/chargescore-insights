import { AlertTriangle } from 'lucide-react';

const FinancialDisclaimer = ({ compact = false }: { compact?: boolean }) => (
  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
    <div className="flex items-start gap-2">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/70" />
      <div>
        {compact ? (
          <p>
            <strong>Disclaimer:</strong> These projections are estimates only and do not constitute investment, financial, or legal advice. Actual results may vary materially. Consult qualified professionals before making investment decisions.
          </p>
        ) : (
          <>
            <p className="font-medium text-foreground/80 mb-1">Important Disclaimer</p>
            <p>
              All financial projections, including ROI, NPV, cash-on-cash return, and payback estimates, are for informational purposes only and do not constitute investment, financial, tax, or legal advice. Projections are based on assumptions and publicly available data that may not reflect actual site conditions, utility rates, or market dynamics. Actual results may vary materially from estimates shown. Managed Squares LLC is not a registered investment advisor. Consult qualified financial, legal, and engineering professionals before making any investment decisions.
            </p>
          </>
        )}
      </div>
    </div>
  </div>
);

export default FinancialDisclaimer;
