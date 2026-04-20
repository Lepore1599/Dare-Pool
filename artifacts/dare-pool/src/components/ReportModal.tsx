import { useState } from "react";
import { Flag, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  submitReport,
  hasUserReported,
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/reports";
import { useUser } from "@/context/UserContext";
import { LoginModal } from "@/components/LoginModal";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  open: boolean;
  dareId: string;
  onClose: () => void;
}

export function ReportModal({ open, dareId, onClose }: ReportModalProps) {
  const { username } = useUser();
  const [showLogin, setShowLogin] = useState(false);
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const alreadyReported = username ? hasUserReported(dareId, username) : false;

  const handleSubmit = () => {
    if (!username) {
      setShowLogin(true);
      return;
    }
    if (!selected) return;
    submitReport(dareId, selected, username);
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setSelected(null);
    onClose();
  };

  return (
    <>
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={() => {}}
      />
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-sm bg-card border-card-border">
          {submitted || alreadyReported ? (
            <>
              <DialogHeader className="items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center mb-2 mx-auto">
                  <CheckCircle className="w-7 h-7 text-emerald-400" />
                </div>
                <DialogTitle className="text-lg font-bold">
                  {alreadyReported && !submitted ? "Already Reported" : "Report Received"}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                  {alreadyReported && !submitted
                    ? "You've already reported this dare. Our team will review it."
                    : "Thanks for keeping DarePool safe. This dare has been flagged and will be reviewed."}
                </DialogDescription>
              </DialogHeader>
              <Button className="w-full mt-2" variant="outline" onClick={handleClose} data-testid="btn-report-close">
                Close
              </Button>
            </>
          ) : (
            <>
              <DialogHeader className="items-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-2 mx-auto">
                  <Flag className="w-7 h-7 text-destructive" />
                </div>
                <DialogTitle className="text-lg font-bold">Report Dare</DialogTitle>
                <DialogDescription className="text-muted-foreground text-sm">
                  Why are you reporting this dare?
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-2 my-2">
                {(Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]).map(
                  ([reason, label]) => (
                    <button
                      key={reason}
                      onClick={() => setSelected(reason)}
                      className={cn(
                        "text-left px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                        selected === reason
                          ? "bg-destructive/15 border-destructive/40 text-foreground"
                          : "bg-secondary border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                      )}
                      data-testid={`report-reason-${reason}`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>

              <div className="flex gap-2 mt-1">
                <Button variant="outline" className="flex-1" onClick={handleClose} data-testid="btn-report-cancel">
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white font-bold"
                  disabled={!selected}
                  onClick={handleSubmit}
                  data-testid="btn-report-submit"
                >
                  Submit Report
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
