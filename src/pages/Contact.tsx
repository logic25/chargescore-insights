import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, ArrowLeft, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ROLES = [
  { value: 'owner', label: 'Property Owner' },
  { value: 'manager', label: 'Property Manager' },
  { value: 'developer', label: 'Developer' },
  { value: 'broker', label: 'Broker' },
  { value: 'consultant', label: 'Consultant' },
  { value: 'other', label: 'Other' },
];

export default function Contact() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: searchParams.get('address') || '',
    property_role: '',
    message: '',
    chargescore: searchParams.get('score') ? parseFloat(searchParams.get('score')!) : null,
    lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null,
    lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null,
  });

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.contact_name || !form.contact_email) {
      toast.error('Name and email are required');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('leads').insert({
        address: form.address || 'Not provided',
        lat: form.lat,
        lng: form.lng,
        chargescore: form.chargescore,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        property_role: form.property_role || null,
        message: form.message || null,
        source: 'inbound',
      } as any);
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-bold text-foreground">Thanks!</h2>
          <p className="mt-2 text-muted-foreground">
            A ChargeRank specialist will reach out within 24 hours.
          </p>
          <Button className="mt-6" onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="container flex h-16 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-heading text-lg font-bold">ChargeRank</span>
        </div>
      </header>

      <main className="container max-w-lg py-12">
        <h1 className="font-heading text-3xl font-bold text-foreground text-center">Get in Touch</h1>
        <p className="mt-2 text-center text-muted-foreground">
          Interested in EV charging for your property? We'll help you evaluate the opportunity.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Name *</Label>
              <Input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Email *</Label>
              <Input type="email" value={form.contact_email} onChange={e => set('contact_email', e.target.value)} required />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Phone (optional)</Label>
              <Input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Your Role</Label>
              <Select value={form.property_role} onValueChange={v => set('property_role', v)}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Property Address (optional)</Label>
            <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="e.g. 123 Main St, Brooklyn, NY" />
          </div>
          <div className="space-y-1">
            <Label className="text-sm">Message</Label>
            <Textarea value={form.message} onChange={e => set('message', e.target.value)} rows={4} placeholder="Tell us about your property or what you're looking for…" />
          </div>
          <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Submitting…' : 'Send Message'}
          </Button>
        </form>
      </main>

      <footer className="border-t border-border/50 bg-muted/30 mt-auto">
        <div className="container flex items-center justify-center py-6">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ChargeScore — EV Charging Site Intelligence</p>
        </div>
      </footer>
    </div>
  );
}
