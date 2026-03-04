import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, DollarSign, BarChart3, Building2, ChevronRight, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { getAnalysisCount } from '@/lib/analytics';
import { useAuth } from '@/hooks/useAuth';

const LandingPage = () => {
  const [selectedAddress, setSelectedAddress] = useState<{ formatted: string; lat: number; lng: number; stateCode: string } | null>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

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
      {/* Nav */}
      <header className="border-b border-border/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-heading text-xl font-bold text-foreground">ChargeScore</span>
          </div>
          {user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-analyses')} className="hidden sm:flex">
                My Analyses
              </Button>
              <Button variant="outline" size="sm" onClick={signOut} className="hidden sm:flex">
                <LogOut className="mr-1.5 h-4 w-4" /> Sign Out
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')} className="hidden sm:flex">
              <LogIn className="mr-1.5 h-4 w-4" /> Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container relative py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-3xl text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              ⚡ Tesla Supercharger for Business
            </div>
            <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
              Turn your parking lot into a{' '}
              <span className="text-primary">revenue engine</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              See if your property qualifies for a Tesla Supercharger installation. Get your ChargeScore, full revenue projection, and every available incentive — in 60 seconds.
            </p>

            <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
              <AddressAutocomplete onSelect={handleAddressSelect} />
              <Button
                className="h-14 px-8 text-base font-semibold"
                onClick={handleAnalyze}
                disabled={!selectedAddress}
              >
                Analyze Site
                <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

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
                title: 'Tesla-Ready Site Score',
                desc: 'Our ChargeScore algorithm evaluates your property for Tesla Supercharger viability — competition, traffic, electrical capacity, and more.',
              },
              {
                icon: DollarSign,
                title: 'Find Every Incentive',
                desc: 'Federal 30C tax credits, NEVI funding, and state programs can cover 30-80% of your Supercharger investment. We find every dollar.',
              },
              {
                icon: BarChart3,
                title: 'Full Revenue Projection',
                desc: 'See your 5-year ROI with Tesla\'s pricing model — hardware costs, built-in load management, and service fees all calculated.',
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
              { value: '73', label: 'Avg ChargeScore' },
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
            Ready to host Tesla Superchargers?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Join property owners discovering how Tesla's Supercharger for Business program can turn idle parking spaces into consistent revenue.
          </p>
          <Button
            className="mt-8 h-14 px-10 text-base font-semibold"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Analyze Your Site — Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Powered by Managed Squares LLC</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2025 ChargeScore. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
