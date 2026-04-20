import { ShieldX, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Hard Block Dialog ────────────────────────────────────────────────────────

interface HardBlockDialogProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

export function HardBlockDialog({ open, message, onClose }: HardBlockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm bg-card border-card-border">
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/15 border border-destructive/30 flex items-center justify-center mb-2 mx-auto">
            <ShieldX className="w-7 h-7 text-destructive" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Dare Blocked
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <p className="text-xs text-muted-foreground text-center mb-4">
            Please revise your dare to keep DarePool safe and fun for everyone.
          </p>
          <Button
            className="w-full"
            variant="outline"
            onClick={onClose}
            data-testid="btn-block-dismiss"
          >
            Edit My Dare
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Soft Warning Dialog ──────────────────────────────────────────────────────

interface SoftWarningDialogProps {
  open: boolean;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function SoftWarningDialog({
  open,
  message,
  onCancel,
  onConfirm,
}: SoftWarningDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-sm bg-card border-card-border">
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mb-2 mx-auto">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <DialogTitle className="text-lg font-bold text-foreground">
            Content Warning
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            {message}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          <Button
            className="w-full bg-amber-400 hover:bg-amber-400/90 text-black font-bold"
            onClick={onConfirm}
            data-testid="btn-warn-confirm"
          >
            Post Anyway
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={onCancel}
            data-testid="btn-warn-edit"
          >
            Edit My Dare
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
