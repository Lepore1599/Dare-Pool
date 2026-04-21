import { useLocation } from "wouter";
import {
  ArrowLeft, User, Lock, Bell, CreditCard, Sliders,
  HelpCircle, Info, LogOut, ShieldCheck, Users
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { SettingsSection, SettingsRow } from "./settings/SettingsRow";

export function Settings() {
  const [, navigate] = useLocation();
  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-black text-foreground">Settings</h1>
      </div>

      {user && (
        <div className="bg-card border border-card-border rounded-2xl px-4 py-4 mb-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-black text-primary">{user.username.slice(0, 2).toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm">@{user.username}</p>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <SettingsSection title="Account">
          <SettingsRow icon={User} iconColor="text-blue-400" label="Account Information" onClick={() => navigate("/settings/account")} />
          <SettingsRow icon={Lock} iconColor="text-amber-400" label="Security" onClick={() => navigate("/settings/security")} />
        </SettingsSection>

        <SettingsSection title="Privacy">
          <SettingsRow icon={ShieldCheck} iconColor="text-emerald-400" label="Privacy Controls" onClick={() => navigate("/settings/privacy")} />
          <SettingsRow icon={Users} iconColor="text-rose-400" label="Blocked Users" onClick={() => navigate("/settings/blocked")} />
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsRow icon={Bell} iconColor="text-purple-400" label="Notifications" onClick={() => navigate("/settings/notifications")} />
          <SettingsRow icon={CreditCard} iconColor="text-amber-400" label="Payments & Wallet" onClick={() => navigate("/settings/payments")} />
          <SettingsRow icon={Sliders} iconColor="text-cyan-400" label="Content & App" onClick={() => navigate("/settings/content")} />
        </SettingsSection>

        <SettingsSection title="Support">
          <SettingsRow icon={HelpCircle} iconColor="text-indigo-400" label="Help & Support" onClick={() => navigate("/settings/support")} />
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow icon={Info} iconColor="text-muted-foreground" label="About DarePool" onClick={() => navigate("/settings/about")} />
        </SettingsSection>

        <SettingsSection>
          <SettingsRow
            icon={LogOut}
            iconColor="text-destructive"
            label="Log Out"
            onClick={handleLogout}
            destructive
            noBorder
          />
        </SettingsSection>

        <p className="text-center text-[11px] text-muted-foreground pb-2">DarePool v1.0.0</p>
      </div>
    </div>
  );
}
