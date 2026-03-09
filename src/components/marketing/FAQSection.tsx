import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const faqs = [
  {
    q: 'How accurate are the incentive estimates?',
    a: 'We cross-reference your address against federal (30C, NEVI), state, and utility program databases quarterly. Each program is labeled Confirmed (eligibility clear), Likely (meets most criteria), or Uncertain (possible, unverified). We never show a flat number — you get a conservative-to-optimistic range so you can plan responsibly. Expect ±15% accuracy on Confirmed programs.',
  },
  {
    q: 'Why do you show ranges instead of a single number?',
    a: 'Because single numbers are fiction. EV charging project costs vary dramatically by utility rate structure, interconnection queue, parking lot configuration, and CPO negotiation leverage. Ranges force honest planning. A $40K–$80K range is more useful than a confident "$58,000" that leads to a blown budget.',
  },
  {
    q: 'What changes after I sign up?',
    a: 'The free tier shows your ChargeRank and total incentive count. Signing up and upgrading to Plus unlocks confidence tiers (Confirmed / Likely / Uncertain), your full OOP range, and a 5-year revenue model. Pro adds the portfolio tracker for multi-site operators.',
  },
  {
    q: 'How is this different from just calling an EV installer?',
    a: 'Installers quote based on what they sell. ChargeRank is hardware-agnostic — it evaluates your site objectively and shows you what to expect before any vendor conversation. Use it to negotiate from a position of knowledge, not dependency.',
  },
  {
    q: 'Is my data shared with third parties?',
    a: 'No. Addresses you analyze are used only to generate your report. We do not sell leads or share your site data with CPOs, utilities, or contractors without your explicit consent.',
  },
];

const FAQSection = () => (
  <section className="py-20">
    <div className="container max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Common Questions</p>
        <h2 className="mt-2 font-heading text-3xl font-bold text-foreground md:text-4xl">
          Straight answers to hard questions
        </h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-border bg-card px-5 shadow-sm"
            >
              <AccordionTrigger className="text-left font-heading text-base font-semibold text-foreground hover:no-underline">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </div>
  </section>
);

export default FAQSection;
