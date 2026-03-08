import { DollarSign } from 'lucide-react';

interface Props {
  programCount: number;
  rangeLow: number;
  rangeHigh: number;
}

const fmt = (n: number) => `$${Math.round(n / 1000).toLocaleString()}K`;

const IncentiveTeaser = ({ programCount, rangeLow, rangeHigh }: Props) => {
  if (programCount <= 0) return null;

  const rangeStr = rangeLow === rangeHigh
    ? fmt(rangeLow)
    : `${fmt(rangeLow)} – ${fmt(rangeHigh)}`;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/5 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/10 flex-shrink-0">
        <DollarSign className="h-4 w-4 text-success" />
      </div>
      <p className="text-sm text-foreground">
        <span className="font-bold text-success">{programCount} program{programCount !== 1 ? 's' : ''}</span> available — est.{' '}
        <span className="font-bold text-success">{rangeStr}</span> in incentives
      </p>
    </div>
  );
};

export default IncentiveTeaser;
