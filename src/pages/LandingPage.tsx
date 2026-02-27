import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, DollarSign, BarChart3, Building2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

const LandingPage = () => {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!address.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`
      );
      const data = await res.json();
      if (data.length > 0) {
        const { lat, lon, address: addr } = data[0];
        const state = addr?.state || '';
        const zip = addr?.postcode || '';
        const stateCode = getStateCode(state);
        navigate(`/dashboard?address=${encodeURIComponent(address)}&lat=${lat}&lng=${lon}&state=${stateCode}&zip=${zip}`);
      } else {
        // Fallback: navigate with just address
        navigate(`/dashboard?address=${encodeURIComponent(address)}&lat=40.7128&lng=-74.006&state=NY&zip=10001`);
      }
    } catch {
      navigate(`/dashboard?address=${encodeURIComponent(address)}&lat=40.7128&lng=-74.006&state=NY&zip=10001`);
    }
    setLoading(false);
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
          <Button variant="outline" size="sm" className="hidden sm:flex">
            Sign In
          </Button>
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
            <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-6xl">
              Is your parking lot leaving{' '}
              <span className="text-primary">money on the table?</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl">
              Get your free EV charging site analysis in 60 seconds. See your ChargeScore, financial projection, and every available incentive.
            </p>

            <div className="mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-14 pl-10 text-base"
                  placeholder="Enter your property address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Button
                className="h-14 px-8 text-base font-semibold"
                onClick={handleSearch}
                disabled={loading || !address.trim()}
              >
                {loading ? 'Analyzing...' : 'Analyze Site'}
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
                title: 'Site Score in 60 Seconds',
                desc: 'Our ChargeScore algorithm analyzes competition, traffic, electrical feasibility, and incentives to rate your site instantly.',
              },
              {
                icon: DollarSign,
                title: 'Find Every Incentive',
                desc: 'Federal, state, and utility programs can cover 50-100% of your project cost. We surface every dollar available to you.',
              },
              {
                icon: BarChart3,
                title: 'Full Revenue Projection',
                desc: 'See your 5-year ROI with detailed cost breakdowns, demand charge analysis, and parking impact — all in real-time.',
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
              { value: '500+', label: 'Sites Analyzed' },
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
            Ready to unlock your property's EV potential?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Join hundreds of property owners who've discovered hidden revenue opportunities with ChargeScore.
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

function getStateCode(stateName: string): string {
  const map: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    'District of Columbia': 'DC',
  };
  if (stateName.length === 2) return stateName.toUpperCase();
  return map[stateName] || 'NY';
}

export default LandingPage;
