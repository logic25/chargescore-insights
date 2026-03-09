import { motion } from 'framer-motion';
import { MapPin, BarChart3, DollarSign, FileText } from 'lucide-react';

const steps = [
  {
    icon: MapPin,
    step: '01',
    title: 'Enter Any Address',
    desc: 'We geocode your property and pull traffic patterns, EV adoption rates, parcel data, and nearby charger competition — automatically.',
  },
  {
    icon: BarChart3,
    step: '02',
    title: 'Receive Your ChargeRank™',
    desc: 'Our scoring engine weights 12+ factors across demand, competition, grid capacity, and location quality into a single 0–100 infrastructure score.',
  },
  {
    icon: DollarSign,
    step: '03',
    title: 'Incentive Confidence Engine',
    desc: 'We cross-reference federal 30C, NEVI, and 50+ state/utility programs against your address and classify each as Confirmed, Likely, or Uncertain — never a flat $0 or inflated estimate.',
  },
  {
    icon: FileText,
    step: '04',
    title: 'Get Your OOP Range',
    desc: 'Hardware, installation, load management, and service fees are modeled against your incentive range to produce a realistic out-of-pocket estimate your lender can work with.',
  },
];

const HowItWorks = () => (
  <section className="py-20">
    <div className="container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-14 text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">The Methodology</p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">How ChargeScore works</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Four steps from address to investment decision — each designed to avoid the optimistic guesswork that sinks EV projects.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.step}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="relative rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-mono text-xs font-bold text-muted-foreground">{s.step}</span>
            </div>
            <h3 className="font-heading text-base font-bold text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
            {i < steps.length - 1 && (
              <div className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground lg:flex">
                →
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Credibility callout */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6"
      >
        <p className="mb-3 font-heading text-base font-bold text-foreground">How we avoid unrealistic $0 estimates</p>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            'Every incentive is classified by confidence tier — not treated as guaranteed',
            'OOP ranges use conservative and optimistic scenarios, not midpoints',
            'Hardware costs pulled from real CPO procurement data, not MSRP',
            'Load management and utility demand charges are always included',
            'State program statuses are refreshed quarterly against agency databases',
            'No incentive is shown if eligibility cannot be confirmed for your state/utility',
          ].map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span className="mt-0.5 text-primary">✓</span>
              {point}
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  </section>
);

export default HowItWorks;
