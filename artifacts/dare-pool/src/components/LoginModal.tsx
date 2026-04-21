import { useState } from "react";
import { Flame, ExternalLink, CheckSquare, Square, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";
import { apiAcceptTerms } from "@/lib/api";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Tab = "login" | "register";
type Step = "form" | "agreement";

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const { login, register } = useUser();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("login");
  const [step, setStep] = useState<Step>("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeGuidelines, setAgreeGuidelines] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeRisk, setAgreeRisk] = useState(false);

  const reset = () => {
    setUsername(""); setEmail(""); setPassword(""); setError("");
    setStep("form"); setAgreeTerms(false); setAgreeGuidelines(false);
    setAgreePrivacy(false); setAgreeRisk(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      toast.success("Welcome back!");
      reset();
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextToAgreement = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || username.trim().length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    if (!email.trim().includes("@")) {
      setError("Please enter a valid email.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setStep("agreement");
  };

  const handleAgreementSubmit = async () => {
    if (!agreeTerms || !agreeGuidelines || !agreePrivacy || !agreeRisk) {
      setError("Please accept all agreements to continue.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      await apiAcceptTerms({ terms: true, guidelines: true, privacy: true, risk: true, policyVersion: "1.0" });
      toast.success("Account created! Welcome to DarePool.");
      reset();
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const openLegal = (path: string) => {
    onClose();
    navigate(path);
  };

  const allAgreed = agreeTerms && agreeGuidelines && agreePrivacy && agreeRisk;

  if (step === "agreement" && tab === "register") {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="sm:max-w-sm bg-card border-card-border max-h-[90vh] overflow-y-auto">
          <DialogHeader className="items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-1 mx-auto">
              <Flame className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-lg font-bold">Review & Agree</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              You must accept all agreements to create your account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <CheckRow
              checked={agreeTerms}
              onChange={setAgreeTerms}
              label="I agree to the"
              linkLabel="Terms of Service"
              onLinkClick={() => openLegal("/legal/terms")}
            />
            <CheckRow
              checked={agreeGuidelines}
              onChange={setAgreeGuidelines}
              label="I agree to the"
              linkLabel="Community Guidelines"
              onLinkClick={() => openLegal("/legal/guidelines")}
            />
            <CheckRow
              checked={agreePrivacy}
              onChange={setAgreePrivacy}
              label="I acknowledge the"
              linkLabel="Privacy Policy"
              onLinkClick={() => openLegal("/legal/privacy")}
            />
            <CheckRow
              checked={agreeRisk}
              onChange={setAgreeRisk}
              label="I acknowledge the"
              linkLabel="Safety & Risk Disclaimer"
              onLinkClick={() => openLegal("/legal/safety")}
            />
          </div>

          {error && <p className="text-xs text-destructive text-center mt-2">{error}</p>}

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => { setStep("form"); setError(""); }}
              disabled={loading}
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
            <Button
              onClick={handleAgreementSubmit}
              disabled={!allAgreed || loading}
              className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm text-xs"
            >
              {loading ? "Creating…" : "Agree & Create Account"}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center mt-1">
            You must be 18 or older to use DarePool.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-card-border">
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-2 mx-auto">
            <Flame className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {tab === "login" ? "Welcome back" : "Join DarePool"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {tab === "login" ? "Log in to compete and vote." : "Create an account to win prizes."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 bg-secondary rounded-xl p-1 mt-1">
          {(["login", "register"] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => { setTab(t); setError(""); setStep("form"); }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={tab === "login" ? handleLogin : handleNextToAgreement} className="space-y-3 mt-1">
          {tab === "register" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Username</label>
              <Input placeholder="e.g. DareDevil42" value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                className="bg-secondary border-input" maxLength={24} autoComplete="username" />
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
            <Input type="email" placeholder="you@example.com" value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              className="bg-secondary border-input" autoComplete="email" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Password</label>
            <Input type="password" placeholder={tab === "register" ? "At least 6 characters" : "••••••••"}
              value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className="bg-secondary border-input"
              autoComplete={tab === "login" ? "current-password" : "new-password"} />
          </div>
          {error && <p className="text-xs text-destructive text-center">{error}</p>}
          <Button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm">
            {loading ? (tab === "login" ? "Logging in…" : "Continuing…") :
              (tab === "login" ? "Log In" : "Continue")}
          </Button>
          {tab === "register" && (
            <p className="text-[10px] text-center text-muted-foreground">
              You'll review and agree to our terms on the next step.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  linkLabel,
  onLinkClick,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  linkLabel: string;
  onLinkClick: () => void;
}) {
  return (
    <div
      className="flex items-start gap-3 bg-secondary/60 rounded-xl px-3 py-2.5 cursor-pointer select-none"
      onClick={() => onChange(!checked)}
    >
      <div className="mt-0.5 flex-shrink-0">
        {checked
          ? <CheckSquare className="w-4.5 h-4.5 text-primary" />
          : <Square className="w-4.5 h-4.5 text-muted-foreground" />
        }
      </div>
      <p className="text-xs text-foreground leading-snug flex-1">
        {label}{" "}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onLinkClick(); }}
          className="text-primary underline underline-offset-2 inline-flex items-center gap-0.5"
        >
          {linkLabel} <ExternalLink className="w-2.5 h-2.5" />
        </button>
      </p>
    </div>
  );
}
