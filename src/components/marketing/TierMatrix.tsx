import { motion } from 'framer-motion';
import { Check, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    sub: '5 analyses included',
    cta: 'Start Free',
    ctaVariant: 'outline' as const,
    highlight: false,
    features: [
      { label: 'ChargeRank™ (full)', included: true },
      { label: 'Incentive program count + range', included: true },
      { label: 'Traffic & competition map', included: true },
      { label: 'Incentive confidence tiers', included: false },
      { label: 'OOP range breakdown', included: false },
      { label: 'Revenue & ROI projection', included: false },
      { label: 'PDF site report', included: false },
      { label: 'Portfolio tracker', included: false },
    ],
  },
  {
    name: 'Plus',
    price: '$49',
    sub: 'per month',
    launchPricing: true,
    cta: 'Get Plus',
    ctaVariant: 'default' as const,
    highlight: true,
    badge: 'Most Popular',
    features: [
      { label: 'ChargeRank™ (full)', included: true },
      { label: 'Incentive program count + range', included: true },
      { label: 'Traffic & competition map', included: true },
      { label: 'Incentive confidence tiers', included: true },
      { label: 'OOP range breakdown', included: true },
      { label: 'Revenue & ROI projection', included: true },
      { label: 'PDF site report', included: true },
      { label: 'Portfolio tracker', included: false },
    ],
  },
  {
    name: 'Pro',
    price: '$149',
    sub: 'per month',
    cta: 'Get Pro',
    ctaVariant: 'outline' as const,
    highlight: false,
    features: [
      { label: 'ChargeRank™ (full)', included: true },
      { label: 'Incentive program count + range', included: true },
      { label: 'Traffic & competition map', included: true },
      { label: 'Incentive confidence tiers', included: true },
      { label: 'OOP range breakdown', included: true },
      { label: 'Revenue & ROI projection', included: true },
      { label: 'PDF site report', included: true },
      { label: 'Portfolio tracker', included: true },
    ],
  },
];

const TierMatrix = () => {
  const navigate = useNavigate();

  return (
    <section className="border-t border-border/50 bg-muted/20 py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
            Start free. Upgrade when you're ready to transact.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Free gives you enough to know if a site is worth pursuing. Plus and Pro give you everything you need to execute.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative rounded-xl border p-6 shadow-sm ${
                tier.highlight
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card'
              }`}
            >
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  {tier.badge}
                </div>
              )}
              <div className="mb-5">
                <h3 className="font-heading text-lg font-bold text-foreground">{tier.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-extrabold text-foreground">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{tier.sub}</span>
                </div>
              </div>
              <ul className="mb-6 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f.label} className="flex items-center gap-2.5 text-sm">
                    {f.included ? (
                      <Check className="h-4 w-4 flex-shrink-0 text-success" />
                    ) : (
                      <Minus className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
                    )}
                    <span className={f.included ? 'text-foreground' : 'text-muted-foreground/60'}>{f.label}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={tier.ctaVariant}
                className="w-full"
                onClick={() => navigate('/pricing')}
              >
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TierMatrix;
