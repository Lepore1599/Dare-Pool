import { ArrowLeft, FileText, Shield, Users, AlertTriangle, Info } from "lucide-react";
import { useLocation } from "wouter";
import { SettingsSection, SettingsRow } from "./SettingsRow";
import { useUser } from "@/context/UserContext";

export function AboutSettings() {
  const [, navigate] = useLocation();
  const { logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-black">About DarePool</h1>
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-card-border rounded-2xl px-4 py-5 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🔥</span>
          </div>
          <p className="font-black text-lg text-foreground">DarePool</p>
          <p className="text-xs text-muted-foreground mt-1">Version 1.0.0</p>
          <p className="text-xs text-muted-foreground">Dare. Compete. Win.</p>
        </div>

        <SettingsSection title="Legal">
          <SettingsRow icon={FileText} iconColor="text-blue-400" label="Terms of Service" onClick={() => navigate("/legal/terms")} />
          <SettingsRow icon={Users} iconColor="text-emerald-400" label="Community Guidelines" onClick={() => navigate("/legal/guidelines")} />
          <SettingsRow icon={Shield} iconColor="text-purple-400" label="Privacy Policy" onClick={() => navigate("/legal/privacy")} />
          <SettingsRow icon={AlertTriangle} iconColor="text-amber-400" label="Safety & Risk Disclaimer" onClick={() => navigate("/legal/safety")} noBorder />
        </SettingsSection>

        <SettingsSection title="App Info">
          <SettingsRow icon={Info} iconColor="text-muted-foreground" label="App Version" value="1.0.0" />
          <SettingsRow icon={Info} iconColor="text-muted-foreground" label="Platform" value="DarePool Inc." noBorder />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            icon={undefined}
            label="Log Out"
            onClick={handleLogout}
            destructive
            noBorder
          />
        </SettingsSection>

        <p className="text-center text-[11px] text-muted-foreground pb-4">
          © 2025 DarePool. All rights reserved.
        </p>
      </div>
    </div>
  );
}
