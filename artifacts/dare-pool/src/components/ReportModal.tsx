import { useState } from "react";
import { Flag, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiReport } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { LoginModal } from "@/components/LoginModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const REASONS: Record<string, string> = {
  dangerous: "Dangerous / self-harm",
  illegal: "Illegal activity",
  harassment: "Harassment / bullying",
  hate_speech: "Hate speech / racism",
  sexual: "Sexual / inappropriate",
  offensive: "Offensive language",
  spam: "Spam / fake",
  other: "Other",
};

interface ReportModalProps {
  open: boolean;
  dareId?: number;
  entryId?: number;
  onClose: () => void;
}

export function ReportModal({ open, dareId, entryId, onClose }: ReportModalProps) {
  const { user } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleClose = () => { setSubmitted(false); setSelected(null); setDetails(""); onClose(); };

  const handleSubmit = async () => {
    if (!user) { setShowLogin(true); return; }
    if (!selected) return;
    setLoading(true);
    try {
      await apiReport({ dareId, entryId, reason: selected, details: details || undefined });
      setSubmitted(true);
      toast.success("Report submitted. Thank you for keeping DarePool safe.");
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("already reported")) {
        setSubmitted(true);
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to submit report.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={() => {}} />
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-sm bg-card border-card-border">
          {submitted ? (
            <>
              <DialogHeader className="items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center mb-2 mx-auto">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <DialogTitle className="text-lg font-bold">Report Received</DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  Thanks for keeping DarePool safe. This content has been flagged for review.
                </DialogDescription>
              </DialogHeader>
              <Button className="w-full mt-2" variant="outline" onClick={handleClose}>Close</Button>
            </>
          ) : (
            <>
              <DialogHeader className="items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-2 mx-auto">
                  <Flag className="w-7 h-7 text-destructive" />
                </div>
                <DialogTitle className="text-lg font-bold">Report Content</DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  Why are you reporting this {entryId ? "entry" : "dare"}?
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-1.5 my-2">
                {Object.entries(REASONS).map(([reason, label]) => (
                  <button key={reason} onClick={() => setSelected(reason)}
                    className={cn(
                      "text-left px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                      selected === reason
                        ? "bg-destructive/15 border-destructive/40 text-foreground"
                        : "bg-secondary border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    )} data-testid={`report-reason-${reason}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Additional details (optional)</label>
                <Textarea placeholder="Describe what's wrong…" value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="bg-secondary border-input text-sm resize-none min-h-[60px]" maxLength={500} />
              </div>

              <div className="flex gap-2 mt-1">
                <Button variant="outline" className="flex-1" onClick={handleClose}>Cancel</Button>
                <Button className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold"
                  disabled={!selected || loading} onClick={handleSubmit}>
                  {loading ? "Submitting…" : "Submit Report"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
