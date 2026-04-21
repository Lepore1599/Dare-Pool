import { useState, useEffect } from "react";
import { ArrowLeft, Play, VolumeX, Wifi, Globe } from "lucide-react";
import { useLocation } from "wouter";
import { apiGetContentSettings, apiUpdateContentSettings, type ApiContentSettings } from "@/lib/api";
import { toast } from "sonner";
import { SettingsSection, ToggleRow, SettingsRow } from "./SettingsRow";

export function ContentSettings() {
  const [, navigate] = useLocation();
  const [prefs, setPrefs] = useState<ApiContentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetContentSettings()
      .then(({ content }) => setPrefs(content))
      .catch(() => toast.error("Failed to load preferences."))
      .finally(() => setLoading(false));
  }, []);

  const update = async (patch: Partial<ApiContentSettings>) => {
    if (!prefs) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      await apiUpdateContentSettings(patch);
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
        <h1 className="text-xl font-black">Content & App</h1>
      </div>

      <div className="space-y-4">
        <SettingsSection title="Video">
          <ToggleRow
            icon={Play}
            iconColor="text-primary"
            label="Autoplay Videos"
            description="Automatically play videos in the feed"
            value={prefs.autoplayEnabled}
            onChange={(v) => update({ autoplayEnabled: v })}
          />
          <ToggleRow
            icon={VolumeX}
            iconColor="text-blue-400"
            label="Mute by Default"
            description="Start all videos muted"
            value={prefs.mutedByDefault}
            onChange={(v) => update({ mutedByDefault: v })}
          />
          <ToggleRow
            icon={Wifi}
            iconColor="text-amber-400"
            label="Data Saver"
            description="Reduce video quality to save data"
            value={prefs.dataSaverEnabled}
            onChange={(v) => update({ dataSaverEnabled: v })}
            noBorder
          />
        </SettingsSection>

        <SettingsSection title="Language">
          <SettingsRow
            icon={Globe}
            iconColor="text-cyan-400"
            label="Language"
            value={prefs.language === "en" ? "English" : prefs.language}
            noBorder
          />
        </SettingsSection>

        <SettingsSection title="App">
          <SettingsRow
            icon={undefined}
            label="App Theme"
            value="Dark (default)"
            noBorder
          />
        </SettingsSection>
      </div>
    </div>
  );
}
