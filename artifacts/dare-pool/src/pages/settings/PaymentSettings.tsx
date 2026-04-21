import { useState, useEffect } from "react";
import { ArrowLeft, Wallet, DollarSign, Plus, ArrowDownToLine, Clock, Receipt } from "lucide-react";
import { useLocation } from "wouter";
import { apiGetWallet, type ApiWallet } from "@/lib/api";
import { SettingsSection, SettingsRow } from "./SettingsRow";

export function PaymentSettings() {
  const [, navigate] = useLocation();
  const [wallet, setWallet] = useState<ApiWallet | null>(null);

  useEffect(() => {
    apiGetWallet().then(({ wallet: w }) => setWallet(w)).catch(() => {});
  }, []);

  const balanceDollars = wallet ? (wallet.availableBalance / 100).toFixed(2) : "—";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-black">Payments & Wallet</h1>
      </div>

      <div className="space-y-4">
        <div className="bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/25 rounded-2xl p-5">
          <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
          <p className="text-4xl font-black text-foreground">${balanceDollars}</p>
          <p className="text-xs text-muted-foreground mt-1">Ready to use for dares, boosts, and badges</p>
        </div>

        <SettingsSection title="Quick Actions">
          <SettingsRow icon={Plus} iconColor="text-emerald-400" label="Add Funds" value="Deposit to wallet" onClick={() => navigate("/wallet")} />
          <SettingsRow icon={ArrowDownToLine} iconColor="text-blue-400" label="Withdraw" value="Transfer earnings to bank" onClick={() => navigate("/wallet")} noBorder />
        </SettingsSection>

        <SettingsSection title="History & Info">
          <SettingsRow icon={Receipt} iconColor="text-amber-400" label="Transaction History" onClick={() => navigate("/wallet")} />
          <SettingsRow icon={Clock} iconColor="text-muted-foreground" label="Pending Balance" value="$0.00" />
          <SettingsRow icon={Wallet} iconColor="text-purple-400" label="Payout Method" value="Manage via Stripe" onClick={() => navigate("/wallet")} noBorder />
        </SettingsSection>

        <SettingsSection title="Tax & Legal">
          <SettingsRow icon={DollarSign} iconColor="text-muted-foreground" label="Tax / Payment Info" value="Coming soon — consult a tax advisor for earnings" noBorder />
        </SettingsSection>

        <p className="text-xs text-muted-foreground text-center px-4">
          Payments are processed securely through Stripe. DarePool does not store raw card or bank details.
        </p>
      </div>
    </div>
  );
}
