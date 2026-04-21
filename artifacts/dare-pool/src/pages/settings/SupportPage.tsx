import { useState } from "react";
import { ArrowLeft, Bug, CreditCard, AlertTriangle, MessageSquare, HelpCircle, FileText, Shield, Users, ChevronDown, ChevronUp, Send, Check } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiSubmitSupportTicket } from "@/lib/api";
import { toast } from "sonner";
import { SettingsSection, SettingsRow } from "./SettingsRow";

const CATEGORIES = [
  { value: "bug", label: "App Bug", icon: Bug },
  { value: "payment", label: "Payment Issue", icon: CreditCard },
  { value: "withdrawal", label: "Withdrawal Issue", icon: CreditCard },
  { value: "harassment", label: "Harassment / Abuse", icon: AlertTriangle },
  { value: "moderation", label: "Content Moderation Issue", icon: Shield },
  { value: "account", label: "Account Issue", icon: Users },
  { value: "other", label: "Other", icon: MessageSquare },
];

const FAQS = [
  { q: "How do dares work?", a: "You create a dare and set a prize pool from your wallet. Other users can fund the pool. When the dare expires, the community votes on entries and the winner gets 80% of the pool." },
  { q: "How do I withdraw my earnings?", a: "Go to Wallet → Withdraw. Payouts are processed via Stripe and may take 2-5 business days." },
  { q: "Can I get a refund on funding or boosts?", a: "Transactions are generally final. See our Terms of Service for exceptions." },
  { q: "How do I report a user or content?", a: "Tap the Report button on any dare or submission. Our moderation team will review it." },
  { q: "What happens if my dare gets no entries?", a: "The pool may be transferred to another active dare according to app rules." },
];

export function SupportPage() {
  const [, navigate] = useLocation();
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!category || !subject.trim() || !details.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    setSubmitting(true);
    try {
      await apiSubmitSupportTicket({ category, subject: subject.trim(), details: details.trim() });
      setSubmitted(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-black">Help & Support</h1>
      </div>

      <div className="space-y-4">
        <SettingsSection title="Get Help">
          <SettingsRow icon={Bug} iconColor="text-orange-400" label="Report a Problem" onClick={() => setShowTicketForm(true)} />
          <SettingsRow icon={FileText} iconColor="text-blue-400" label="Terms of Service" onClick={() => navigate("/legal/terms")} />
          <SettingsRow icon={Users} iconColor="text-emerald-400" label="Community Guidelines" onClick={() => navigate("/legal/guidelines")} />
          <SettingsRow icon={Shield} iconColor="text-purple-400" label="Privacy Policy" onClick={() => navigate("/legal/privacy")} />
          <SettingsRow icon={AlertTriangle} iconColor="text-amber-400" label="Safety & Risk Disclaimer" onClick={() => navigate("/legal/safety")} noBorder />
        </SettingsSection>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 mb-1">FAQ</p>
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
            {FAQS.map((faq, i) => (
              <div key={i} className="border-b border-white/5 last:border-0">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="text-sm font-medium text-foreground pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                      <p className="px-4 pb-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTicketForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
              className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">

              {submitted ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1">Ticket Submitted</h3>
                  <p className="text-sm text-muted-foreground mb-4">Our team will review your report and get back to you.</p>
                  <Button size="sm" onClick={() => { setShowTicketForm(false); setSubmitted(false); setCategory(""); setSubject(""); setDetails(""); }}>
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-4">
                    <HelpCircle className="w-5 h-5 text-primary" />
                    <h3 className="font-bold text-foreground">Report a Problem</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-secondary border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground outline-none">
                        <option value="">Select a category…</option>
                        {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Subject</label>
                      <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description…" className="bg-secondary border-input" maxLength={200} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Details</label>
                      <textarea value={details} onChange={(e) => setDetails(e.target.value)}
                        rows={4} maxLength={2000} placeholder="Describe the issue in detail…"
                        className="w-full bg-secondary border border-input rounded-xl px-3 py-2.5 text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowTicketForm(false)}>Cancel</Button>
                    <Button size="sm" className="flex-1 bg-primary" onClick={handleSubmit} disabled={submitting}>
                      <Send className="w-3.5 h-3.5 mr-1" />{submitting ? "Sending…" : "Submit"}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
