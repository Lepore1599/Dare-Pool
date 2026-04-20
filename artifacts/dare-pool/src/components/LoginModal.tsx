import { useState } from "react";
import { Flame } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/context/UserContext";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ open, onClose, onSuccess }: LoginModalProps) {
  const { login } = useUser();
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a username.");
      return;
    }
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters.");
      return;
    }
    if (trimmed.length > 24) {
      setError("Username can't exceed 24 characters.");
      return;
    }
    login(trimmed);
    onClose();
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-card-border">
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-2 mx-auto">
            <Flame className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">Join DarePool</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Pick a username to post dares, submit entries, and vote.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <Input
              autoFocus
              placeholder="e.g. DareDevil42"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              className="text-center text-base font-semibold bg-secondary border-input"
              maxLength={24}
              data-testid="input-username"
            />
            {error && (
              <p className="text-xs text-destructive text-center mt-1" data-testid="login-error">
                {error}
              </p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm"
            data-testid="btn-join"
          >
            Let's go
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
