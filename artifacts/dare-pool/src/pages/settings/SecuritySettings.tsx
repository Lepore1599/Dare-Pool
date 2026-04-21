import { useState } from "react";
import { ArrowLeft, Lock, KeyRound, ShieldCheck, Check, X } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiChangePassword } from "@/lib/api";
import { toast } from "sonner";
import { SettingsSection, SettingsRow } from "./SettingsRow";

export function SecuritySettings() {
  const [, navigate] = useLocation();
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-black">Security</h1>
      </div>

      <div className="space-y-4">
        <SettingsSection title="Password">
          <SettingsRow icon={Lock} iconColor="text-amber-400" label="Change Password" onClick={() => setShowChangePassword(true)} noBorder />
        </SettingsSection>

        <SettingsSection title="Account Security">
          <SettingsRow icon={ShieldCheck} iconColor="text-emerald-400" label="Two-Factor Authentication" value="Coming soon" noBorder />
        </SettingsSection>

        <SettingsSection title="Session">
          <SettingsRow icon={KeyRound} iconColor="text-blue-400" label="Current Session" value="Active on this device" noBorder />
        </SettingsSection>

        <p className="text-xs text-muted-foreground text-center px-4">
          Never share your password. DarePool will never ask for it outside the app.
        </p>
      </div>

      <AnimatePresence>
        {showChangePassword && (
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!current || !next || !confirm) {
      toast.error("All fields are required.");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (next.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    setSaving(true);
    try {
      await apiChangePassword({ currentPassword: current, newPassword: next });
      toast.success("Password updated!");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
        className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
        <h3 className="font-bold text-foreground mb-4">Change Password</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Current Password</label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="bg-secondary border-input" autoFocus />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="bg-secondary border-input" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Confirm New Password</label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="bg-secondary border-input" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}><X className="w-3.5 h-3.5 mr-1" /> Cancel</Button>
          <Button size="sm" className="flex-1 bg-primary" onClick={handleSave} disabled={saving}>
            <Check className="w-3.5 h-3.5 mr-1" />{saving ? "Saving…" : "Update Password"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
