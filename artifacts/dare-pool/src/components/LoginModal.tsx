import { useState } from "react";
import { Flame } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Tab = "login" | "register";

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const { login, register } = useUser();
  const [tab, setTab] = useState<Tab>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setUsername(""); setEmail(""); setPassword(""); setError(""); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(email.trim(), password);
        toast.success("Welcome back!");
      } else {
        await register(username.trim(), email.trim(), password);
        toast.success("Account created! Welcome to DarePool.");
      }
      reset();
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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
            <button key={t} type="button" onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "login" ? "Log In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 mt-1">
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
            {loading ? (tab === "login" ? "Logging in…" : "Creating account…") :
              (tab === "login" ? "Log In" : "Create Account")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
