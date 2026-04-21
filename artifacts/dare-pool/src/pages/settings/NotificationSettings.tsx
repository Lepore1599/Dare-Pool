import { useState, useEffect } from "react";
import { ArrowLeft, Bell, DollarSign, Trophy, MessageCircle, Rocket, Wallet, Shield, Megaphone } from "lucide-react";
import { useLocation } from "wouter";
import { apiGetNotificationPreferences, apiUpdateNotificationPreferences, type ApiNotificationPreferences } from "@/lib/api";
import { toast } from "sonner";
import { SettingsSection, ToggleRow } from "./SettingsRow";

export function NotificationSettings() {
  const [, navigate] = useLocation();
  const [prefs, setPrefs] = useState<ApiNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetNotificationPreferences()
      .then(({ notifications }) => setPrefs(notifications))
      .catch(() => toast.error("Failed to load notification preferences."))
      .finally(() => setLoading(false));
  }, []);

  const update = async (patch: Partial<ApiNotificationPreferences>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      await apiUpdateNotificationPreferences(patch);
    } catch {
      setPrefs(prefs);
      toast.error("Failed to save.");
    }
  };

  if (loading || !prefs) {
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
        <h1 className="text-xl font-black">Notifications</h1>
      </div>

      <div className="space-y-4">
        <SettingsSection title="Dare Activity">
          <ToggleRow icon={DollarSign} iconColor="text-amber-400" label="Dare Funded" description="When someone adds to your dare's pool" value={prefs.notifyDareFunded} onChange={(v) => update({ notifyDareFunded: v })} />
          <ToggleRow icon={Bell} iconColor="text-blue-400" label="New Submission" description="When someone submits an entry to your dare" value={prefs.notifyNewSubmission} onChange={(v) => update({ notifyNewSubmission: v })} />
          <ToggleRow icon={MessageCircle} iconColor="text-purple-400" label="Comment on My Dare" description="New comments on dares you created" value={prefs.notifyNewDareComment} onChange={(v) => update({ notifyNewDareComment: v })} />
          <ToggleRow icon={MessageCircle} iconColor="text-cyan-400" label="Comment on My Submission" description="New comments on your video entries" value={prefs.notifyNewSubmissionComment} onChange={(v) => update({ notifyNewSubmissionComment: v })} />
          <ToggleRow icon={Rocket} iconColor="text-orange-400" label="Dare Boosted" description="When someone boosts one of your dares" value={prefs.notifyBoostOnMyDare} onChange={(v) => update({ notifyBoostOnMyDare: v })} />
        </SettingsSection>

        <SettingsSection title="Outcomes">
          <ToggleRow icon={Trophy} iconColor="text-amber-400" label="Dare Won" description="When you win a dare" value={prefs.notifyDareWon} onChange={(v) => update({ notifyDareWon: v })} />
          <ToggleRow icon={Bell} iconColor="text-blue-400" label="Pool Transferred" description="When a dare pool is transferred" value={prefs.notifyPoolTransferred} onChange={(v) => update({ notifyPoolTransferred: v })} noBorder />
        </SettingsSection>

        <SettingsSection title="Wallet & Payments">
          <ToggleRow icon={Wallet} iconColor="text-emerald-400" label="Wallet Deposit" description="When a deposit is confirmed" value={prefs.notifyWalletDeposit} onChange={(v) => update({ notifyWalletDeposit: v })} />
          <ToggleRow icon={DollarSign} iconColor="text-amber-400" label="Withdrawal Updates" description="Status updates on your withdrawals" value={prefs.notifyWithdrawalStatus} onChange={(v) => update({ notifyWithdrawalStatus: v })} noBorder />
        </SettingsSection>

        <SettingsSection title="Account">
          <ToggleRow icon={Shield} iconColor="text-red-400" label="Security Alerts" description="Login attempts and account security notices" value={prefs.notifySecurityAlerts} onChange={(v) => update({ notifySecurityAlerts: v })} />
          <ToggleRow icon={Megaphone} iconColor="text-muted-foreground" label="Marketing & Updates" description="News, features, and promotions from DarePool" value={prefs.notifyMarketing} onChange={(v) => update({ notifyMarketing: v })} noBorder />
        </SettingsSection>
      </div>
    </div>
  );
}
