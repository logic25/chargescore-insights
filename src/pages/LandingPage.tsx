import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, DollarSign, BarChart3, ChevronRight, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { getAnalysisCount } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import ProductProof from '@/components/marketing/ProductProof';
import HowItWorks from '@/components/marketing/HowItWorks';
import TierMatrix from '@/components/marketing/TierMatrix';
import FAQSection from '@/components/marketing/FAQSection';

const LandingPage = () => {
  const [selectedAddress, setSelectedAddress] = useState<{ formatted: string; lat: number; lng: number; stateCode: string } | null>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, isAtLeast } = useProfile();

  const handleAddressSelect = (result: { formatted: string; lat: number; lng: number; stateCode: string }) => {
    setSelectedAddress(result);
  };

  const handleAnalyze = () => {
    if (selectedAddress) {
      navigate(`/dashboard?address=${encodeURIComponent(selectedAddress.formatted)}&lat=${selectedAddress.lat}&lng=${selectedAddress.lng}&state=${selectedAddress.stateCode}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navy Nav */}
      <header className="border-b border-navy-muted bg-navy text-navy-foreground">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-heading text-xl font-bold">ChargeRank</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/pricing')} className="hidden text-navy-foreground hover:bg-navy-card hover:text-navy-foreground sm:flex">
              Pricing
            </Button>
            {user ? (
              <>
                {isAtLeast('pro') && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/portfolio')} className="hidden text-navy-foreground hover:bg-navy-card hover:text-navy-foreground sm:flex">
                    Portfolio
                  </Button>
                )}
                {isAtLeast('plus') && !isAtLeast('pro') && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/stall-sizer')} className="hidden text-navy-foreground hover:bg-navy-card hover:text-navy-foreground sm:flex">
                    Stall Sizer
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => navigate('/my-analyses')} className="hidden text-navy-foreground hover:bg-navy-card hover:text-navy-foreground sm:flex">
                  My Projects
                </Button>
                <Button variant="outline" size="sm" onClick={signOut} className="hidden border-navy-muted bg-transparent text-navy-foreground hover:bg-navy-card sm:flex">
                  <LogOut className="mr-1.5 h-4 w-4" /> Sign Out
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="hidden border-navy-muted bg-transparent text-navy-foreground hover:bg-navy-card sm:flex">
                <LogIn className="mr-1.5 h-4 w-4" /> Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-navy-foreground">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/30 to-transparent" />
        <div className="container relative py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              ⚡ EV Charging Site Intelligence
            </div>
            <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              See your property's{' '}
              <span className="text-primary">EV charging potential</span>
            </h1>
            <p className="mt-6 text-lg text-navy-foreground/80 md:text-xl">
              Search any address to get a free site analysis. ChargeRank evaluates traffic, competition, incentives, and revenue potential — in 60 seconds.
            </p>
            <p className="mt-2 text-sm text-navy-foreground/60">
              5 free analyses. No credit card required.
            </p>

            <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
              <AddressAutocomplete onSelect={handleAddressSelect} />
              <Button
                className="h-14 px-8 text-base font-semibold"
                onClick={handleAnalyze}
                disabled={!selectedAddress}
                title={!selectedAddress ? 'Type an address and select from suggestions' : ''}
              >
                Analyze Site
                <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </div>
            {!selectedAddress && (
              <p className="mt-2 text-xs text-navy-foreground/50">
                Type an address above, then select from the dropdown to continue
              </p>
            )}
          </motion.div>
        </div>
      </section>

      {/* Product Proof */}
      <ProductProof />

      {/* Value Props */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="container py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid gap-8 md:grid-cols-3"
          >
            {[
              {
                icon: Zap,
                title: 'Instant Site Score',
                desc: 'Our ChargeRank™ algorithm evaluates your property for EV charger viability — competition, traffic, electrical capacity, and more.',
              },
              {
                icon: DollarSign,
                title: 'Find Every Incentive',
                desc: 'NEVI funding, state rebates, and utility programs can cover 30-80% of your investment. We find every dollar.',
              },
              {
                icon: BarChart3,
                title: 'Full Revenue Projection',
                desc: 'See your 5-year ROI with hardware costs, load management, and service fees all calculated.',
              },
            ].map((prop, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="rounded-xl border border-border bg-card p-8 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <prop.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-heading text-lg font-bold text-foreground">{prop.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{prop.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Tier Matrix */}
      <TierMatrix />

      {/* FAQ */}
      <FAQSection />

      {/* Social Proof */}
      <section className="container py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Trusted by property owners managing
          </p>
          <p className="mt-2 font-heading text-4xl font-extrabold text-foreground md:text-5xl">
            2M+ <span className="text-primary">sq ft</span>
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-10">
            {[
              { value: `${Math.max(getAnalysisCount(), 0)}`, label: 'Sites Analyzed' },
              { value: '$12M', label: 'Incentives Found' },
              { value: '73', label: 'Avg ChargeRank' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-mono text-3xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/50 bg-primary/5">
        <div className="container py-20 text-center">
          <h2 className="font-heading text-3xl font-bold text-foreground">
            Ready to explore EV charging?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Join property owners discovering how EV chargers can turn idle parking spaces into consistent revenue.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              className="h-14 px-10 text-base font-semibold"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Analyze Your Site — Free
            </Button>
            <Button
              variant="outline"
              className="h-14 px-10 text-base"
              onClick={() => navigate('/contact')}
            >
              Get a Free Consultation
            </Button>
          </div>
        </div>
      </section>

      {/* Navy Footer */}
      <footer className="border-t border-navy-muted bg-navy text-navy-foreground">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-navy-foreground/70">ChargeRank — EV Charging Site Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/pricing')} className="text-xs text-navy-foreground/70 transition-colors hover:text-navy-foreground">Pricing</button>
            <button onClick={() => navigate('/contact')} className="text-xs text-navy-foreground/70 transition-colors hover:text-navy-foreground">Contact</button>
          </div>
          <p className="text-xs text-navy-foreground/50">© {new Date().getFullYear()} ChargeRank. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
