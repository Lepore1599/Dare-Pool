import { useState, useEffect } from "react";
import { ArrowLeft, EyeOff, MessageCircle, DollarSign, Rocket, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { apiGetPrivacySettings, apiUpdatePrivacySettings, type ApiPrivacySettings } from "@/lib/api";
import { toast } from "sonner";
import { SettingsSection, ToggleRow } from "./SettingsRow";

const PRIVACY_OPTIONS = ["everyone", "followers", "nobody"] as const;

export function PrivacySettings() {
  const [, navigate] = useLocation();
  const [prefs, setPrefs] = useState<ApiPrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetPrivacySettings()
      .then(({ privacy }) => setPrefs(privacy))
      .catch(() => toast.error("Failed to load privacy settings."))
      .finally(() => setLoading(false));
  }, []);

  const update = async (patch: Partial<ApiPrivacySettings>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      await apiUpdatePrivacySettings(patch);
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
        <h1 className="text-xl font-black">Privacy Controls</h1>
      </div>

      <div className="space-y-4">
        <SettingsSection title="Account Privacy">
          <ToggleRow
            icon={Globe}
            iconColor="text-blue-400"
            label="Private Account"
            description="Only approved followers can see your profile activity"
            value={prefs.privateAccount}
            onChange={(v) => update({ privateAccount: v })}
          />
          <ToggleRow
            icon={DollarSign}
            iconColor="text-amber-400"
            label="Hide Earnings"
            description="Hide total prize earnings from your public profile"
            value={prefs.hideEarnings}
            onChange={(v) => update({ hideEarnings: v })}
          />
          <ToggleRow
            icon={Rocket}
            iconColor="text-purple-400"
            label="Allow Others to Boost My Dares"
            description="Let other users spend their wallet to boost your dares"
            value={prefs.allowBoosts}
            onChange={(v) => update({ allowBoosts: v })}
            noBorder
          />
        </SettingsSection>

        <SettingsSection title="Comment Privacy">
          <SelectRow
            icon={MessageCircle}
            label="Comments on My Dares"
            value={prefs.commentPrivacyDares}
            options={PRIVACY_OPTIONS}
            onChange={(v) => update({ commentPrivacyDares: v })}
          />
          <SelectRow
            icon={MessageCircle}
            label="Comments on My Submissions"
            value={prefs.commentPrivacySubmissions}
            options={PRIVACY_OPTIONS}
            onChange={(v) => update({ commentPrivacySubmissions: v })}
          />
          <SelectRow
            icon={EyeOff}
            label="Who Can Message Me"
            value={prefs.messagePrivacy}
            options={PRIVACY_OPTIONS}
            onChange={(v) => update({ messagePrivacy: v })}
            noBorder
          />
        </SettingsSection>
      </div>
    </div>
  );
}

function SelectRow({ icon: Icon, label, value, options, onChange, noBorder }: {
  icon: typeof MessageCircle;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  noBorder?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${noBorder ? "" : "border-b border-white/5"}`}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary/80">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-secondary border border-white/10 rounded-lg px-2 py-1 text-xs text-foreground capitalize outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
        ))}
      </select>
    </div>
  );
}
