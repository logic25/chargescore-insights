import { useState } from 'react';
import { Zap, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  chargeScore: number;
  onUnlock: () => void;
}

const LEADS_KEY = 'chargerank_leads';

function storeLead(data: { email: string; name?: string; phone?: string; timestamp: string }) {
  try {
    const existing = JSON.parse(localStorage.getItem(LEADS_KEY) || '[]');
    existing.push(data);
    localStorage.setItem(LEADS_KEY, JSON.stringify(existing));
    console.log('[ChargeRank Lead Captured]', data);
  } catch {
    console.log('[ChargeRank Lead Captured]', data);
  }
}

const ReportGate = ({ chargeScore, onUnlock }: Props) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    storeLead({
      email: trimmedEmail,
      name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      timestamp: new Date().toISOString(),
    });

    setTimeout(() => {
      setSubmitting(false);
      onUnlock();
    }, 600);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 pb-2 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-bold text-foreground">
              Your ChargeRank is ready!
            </h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="font-mono text-4xl font-bold text-primary">{chargeScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>

          {/* Description */}
          <div className="px-6 pb-4">
            <p className="text-center text-sm text-muted-foreground leading-relaxed">
              Enter your email to see your full <strong className="text-foreground">Investment Summary</strong>, incentive breakdown, and <strong className="text-foreground">15-year financial projection</strong>.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 pl-10 text-base"
                required
                autoFocus
              />
            </div>
            <Input
              type="text"
              placeholder="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10"
            />
            <Input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10"
            />

            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold bg-success hover:bg-success/90 text-success-foreground"
              disabled={submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Unlocking…
                </span>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Get My Free Report
                </>
              )}
            </Button>

            <p className="text-center text-[10px] text-muted-foreground/60">
              We'll send you a copy of the report. No spam.
            </p>

            <button
              type="button"
              onClick={onUnlock}
              className="w-full text-center text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors underline"
            >
              Skip for now
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportGate;
