import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, HelpCircle, TrendingUp } from 'lucide-react';

const scores = [
  { label: 'Traffic Volume', val: 88, color: 'bg-success' },
  { label: 'Competition Gap', val: 74, color: 'bg-primary' },
  { label: 'Grid Capacity', val: 61, color: 'bg-primary' },
  { label: 'EV Adoption Rate', val: 79, color: 'bg-success' },
  { label: 'Parking Demand', val: 55, color: 'bg-accent' },
];

const incentives = [
  { name: 'Federal 30C Tax Credit', tier: 'Confirmed', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', amount: '$30,000' },
  { name: 'CA NEVI State Match', tier: 'Likely', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', amount: '$18,000' },
  { name: 'Utility Rebate (SCE)', tier: 'Uncertain', icon: HelpCircle, color: 'text-accent', bg: 'bg-accent/10', amount: '~$4,000' },
];

const ProductProof = () => (
  <section className="border-y border-border/50 bg-muted/20 py-20">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-12 text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">What You Actually Get</p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
          Not just a score — a finance-ready site brief
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Every analysis delivers structured data your lender, CPO partner, or leasing attorney can use — not a dashboard you'll screenshot once and forget.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ChargeScore panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-foreground">ChargeScore™ Breakdown</h3>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <span className="font-mono text-lg font-extrabold text-primary">76</span>
            </div>
          </div>
          <div className="space-y-3">
            {scores.map((s) => (
              <div key={s.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-foreground">{s.label}</span>
                  <span className="font-mono font-bold text-foreground">{s.val}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-2 rounded-full ${s.color}`} style={{ width: `${s.val}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            * Sample output — scores vary by site location and conditions
          </p>
        </motion.div>

        {/* Incentive panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-heading text-base font-bold text-foreground">Incentive Engine</h3>
            <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">3 programs found</span>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">Estimated range: <span className="font-bold text-foreground">$44K – $60K</span></p>
          <div className="space-y-3">
            {incentives.map((inc) => (
              <div key={inc.name} className={`flex items-center gap-3 rounded-lg px-4 py-3 ${inc.bg}`}>
                <inc.icon className={`h-4 w-4 flex-shrink-0 ${inc.color}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{inc.name}</p>
                  <p className={`text-xs font-semibold ${inc.color}`}>{inc.tier}</p>
                </div>
                <span className="font-mono text-sm font-bold text-foreground">{inc.amount}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-border bg-muted/50 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">Out-of-pocket range:</span> $18K – $34K after incentives
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ProductProof;
