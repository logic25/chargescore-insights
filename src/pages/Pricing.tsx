import { useNavigate } from 'react-router-dom';
import { Zap, Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    cta: 'Get Started Free',
    ctaAction: '/auth',
    highlight: false,
    features: [
      'Unlimited score previews',
      '5 full site analyses',
      'Save to My Projects',
      'Incentive program names',
      'Basic stall suggestion',
    ],
    excluded: [
      'Revenue projections',
      'Incentive amounts & how-to',
      'Stall Sizer tool',
      'PDF reports',
      'Portfolio builder',
      'Waterfall model',
    ],
  },
  {
    name: 'Plus',
    price: '$49',
    period: '/month',
    cta: 'Upgrade to Plus',
    ctaAction: '/contact',
    highlight: true,
    features: [
      'Unlimited full analyses',
      'Revenue projections (4/8/12/16 stalls)',
      'Full incentive breakdown',
      'Interactive Stall Sizer',
      'Simple ROI calculator',
      'Downloadable PDF reports',
      'Unlimited saved projects',
    ],
    excluded: [
      'Portfolio builder',
      'Waterfall model',
      'LP/GP splits',
      'Exit scenarios',
    ],
  },
  {
    name: 'Pro',
    price: '$299',
    period: '/month',
    cta: 'Contact Us',
    ctaAction: '/contact',
    highlight: false,
    features: [
      'Everything in Plus',
      'Multi-site portfolio builder',
      'Waterfall model with LP/GP splits',
      'Scenario modeling',
      'Exit analysis & valuation',
      'Documents management',
      'Lead inbox (coming soon)',
      'Scout pipeline (coming soon)',
    ],
    excluded: [],
  },
];

export default function Pricing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-heading text-xl font-bold text-foreground">ChargeRank</span>
          </div>
        </div>
      </header>

      <main className="container py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-heading text-4xl font-extrabold text-foreground">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free with 5 site analyses. Upgrade when you need deeper insights or portfolio-level tools.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border p-6 flex flex-col ${
                tier.highlight
                  ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                  : 'border-border bg-card'
              }`}
            >
              {tier.highlight && (
                <span className="inline-flex self-start items-center gap-1 rounded-full bg-primary/10 border border-primary/30 px-3 py-1 text-xs font-medium text-primary mb-3">
                  Most Popular
                </span>
              )}
              <h3 className="font-heading text-xl font-bold text-foreground">{tier.name}</h3>
              <div className="mt-2 mb-4">
                <span className="font-mono text-4xl font-extrabold text-foreground">{tier.price}</span>
                <span className="text-sm text-muted-foreground">{tier.period}</span>
              </div>

              <Button
                className={`w-full mb-6 ${tier.highlight ? '' : 'bg-card text-foreground border border-border hover:bg-muted'}`}
                variant={tier.highlight ? 'default' : 'outline'}
                onClick={() => navigate(tier.ctaAction)}
              >
                {tier.cta}
              </Button>

              <div className="space-y-2 flex-1">
                {tier.features.map(f => (
                  <div key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{f}</span>
                  </div>
                ))}
                {tier.excluded.map(f => (
                  <div key={f} className="flex items-start gap-2 opacity-40">
                    <span className="h-4 w-4 shrink-0 mt-0.5 text-center text-xs text-muted-foreground">—</span>
                    <span className="text-sm text-muted-foreground line-through">{f}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10">
          No credit card required for Free tier. Plus and Pro require a conversation with our team.
        </p>
      </main>

      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container flex items-center justify-center py-6">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ChargeRank — EV Charging Site Intelligence</p>
        </div>
      </footer>
    </div>
  );
}
