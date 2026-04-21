import { useState, useEffect } from "react";
import { ArrowLeft, Mail, User, Calendar, Hash, BadgeCheck, Pencil, Check, X, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGetSettingsProfile, apiUpdateSettingsProfile, type ApiSettingsProfile } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { SettingsSection, SettingsRow } from "./SettingsRow";

export function AccountInfo() {
  const [, navigate] = useLocation();
  const { refreshUser } = useUser();
  const [profile, setProfile] = useState<ApiSettingsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<"displayName" | "bio" | "email" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    apiGetSettingsProfile()
      .then(({ profile: p }) => setProfile(p))
      .catch(() => toast.error("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const startEdit = (field: "displayName" | "bio" | "email") => {
    if (!profile) return;
    setEditValue(field === "displayName" ? (profile.displayName ?? "") : field === "bio" ? (profile.bio ?? "") : profile.email);
    setEditing(field);
  };

  const saveEdit = async () => {
    if (!editing || !profile) return;
    setSaving(true);
    try {
      await apiUpdateSettingsProfile({ [editing]: editValue });
      setProfile((p) => p ? { ...p, [editing]: editValue || null } : p);
      await refreshUser();
      toast.success("Saved!");
      setEditing(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const canChangeUsername = () => {
    if (!profile?.lastUsernameChangeAt) return true;
    const last = new Date(profile.lastUsernameChangeAt);
    const now = new Date();
    const diffDays = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 30;
  };

  const usernameAvailableDate = () => {
    if (!profile?.lastUsernameChangeAt) return null;
    const last = new Date(profile.lastUsernameChangeAt);
    last.setDate(last.getDate() + 30);
    return last.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-black">Account Information</h1>
      </div>

      {profile && (
        <div className="space-y-4">
          <div className="bg-card border border-card-border rounded-2xl px-4 py-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-black text-primary">{profile.username.slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-foreground">@{profile.username}</p>
              {profile.displayName && <p className="text-sm text-muted-foreground">{profile.displayName}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">Account ID #{profile.id}</p>
            </div>
          </div>

          <SettingsSection title="Profile Details">
            <InfoRow icon={User} label="Display Name" value={profile.displayName ?? "Not set"} onEdit={() => startEdit("displayName")} />
            <InfoRow icon={Mail} label="Email" value={profile.email} onEdit={() => startEdit("email")} />
            <InfoRow icon={Hash} label="Username" value={`@${profile.username}`}
              onEdit={canChangeUsername() ? () => navigate("/settings/security") : undefined}
              note={!canChangeUsername() ? `Can change on ${usernameAvailableDate()}` : "30-day cooldown applies"}
            />
            <InfoRow icon={Calendar} label="Joined" value={new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
            <InfoRow icon={BadgeCheck} label="Email Verified" value={profile.emailVerified ? "Verified" : "Not verified"} />
          </SettingsSection>

          <SettingsSection title="Legal Agreements">
            <InfoRow icon={BadgeCheck} label="Terms of Service" value={profile.termsAcceptedAt ? `Accepted ${new Date(profile.termsAcceptedAt).toLocaleDateString()}` : "Not accepted"} />
            <InfoRow icon={BadgeCheck} label="Community Guidelines" value={profile.guidelinesAcceptedAt ? `Accepted ${new Date(profile.guidelinesAcceptedAt).toLocaleDateString()}` : "Not accepted"} />
            <InfoRow icon={BadgeCheck} label="Privacy Policy" value={profile.privacyAcceptedAt ? `Accepted ${new Date(profile.privacyAcceptedAt).toLocaleDateString()}` : "Not accepted"} />
            <InfoRow icon={BadgeCheck} label="Safety Disclaimer" value={profile.riskAcceptedAt ? `Accepted ${new Date(profile.riskAcceptedAt).toLocaleDateString()}` : "Not accepted"} />
            <InfoRow icon={Hash} label="Policy Version" value={profile.acceptedPolicyVersion ?? "—"} />
          </SettingsSection>

          <SettingsSection title="Danger Zone">
            <SettingsRow
              icon={Trash2}
              iconColor="text-destructive"
              label="Delete Account"
              onClick={() => setShowDelete(true)}
              destructive
              noBorder
            />
          </SettingsSection>
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
              className="bg-card border border-card-border rounded-2xl p-5 w-full max-w-sm">
              <h3 className="font-bold text-foreground mb-3">
                Edit {editing === "displayName" ? "Display Name" : editing === "bio" ? "Bio" : "Email"}
              </h3>
              {editing === "bio" ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  maxLength={200}
                  rows={3}
                  className="w-full bg-secondary border border-input rounded-xl px-3 py-2.5 text-sm text-foreground resize-none outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Tell the community about yourself..."
                />
              ) : (
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="bg-secondary border-input" autoFocus />
              )}
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setEditing(null)}>
                  <X className="w-3.5 h-3.5 mr-1" /> Cancel
                </Button>
                <Button size="sm" className="flex-1 bg-primary" onClick={saveEdit} disabled={saving}>
                  <Check className="w-3.5 h-3.5 mr-1" /> {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDelete && (
          <DeleteAccountModal onClose={() => setShowDelete(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, onEdit, note }: {
  icon: typeof User;
  label: string;
  value: string;
  onEdit?: () => void;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary/80">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground truncate">{value}</p>
        {note && <p className="text-[10px] text-muted-foreground mt-0.5">{note}</p>}
      </div>
      {onEdit && (
        <button onClick={onEdit} className="text-muted-foreground hover:text-primary transition-colors p-1">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { logout } = useUser();
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleDelete = async () => {
    if (!confirmed || !password) return;
    setDeleting(true);
    try {
      const { apiDeleteAccount } = await import("@/lib/api");
      await apiDeleteAccount(password);
      toast.success("Account deleted. Goodbye.");
      logout();
      navigate("/");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} exit={{ y: 40 }}
        className="bg-card border border-destructive/30 rounded-2xl p-5 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 className="w-5 h-5 text-destructive flex-shrink-0" />
          <h3 className="font-bold text-destructive">Delete Account</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          This action is permanent. Your profile, dares, and submissions will be anonymized. Financial records are retained for legal purposes.
        </p>
        <Input type="password" placeholder="Enter your password to confirm" value={password}
          onChange={(e) => setPassword(e.target.value)} className="bg-secondary border-input mb-3" />
        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 accent-destructive" />
          <span className="text-xs text-muted-foreground">I understand this action is irreversible</span>
        </label>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
            disabled={!confirmed || !password || deleting} onClick={handleDelete}>
            {deleting ? "Deleting…" : "Delete Account"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
