import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { apiGetWallet, apiDepositFunds, apiWithdrawFunds, apiStartOnboarding, type ApiWallet, type ApiWalletTransaction } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function formatDollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function txIcon(type: string) {
  if (type === "deposit") return <ArrowDownLeft className="w-4 h-4 text-emerald-400" />;
  if (type === "withdrawal") return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
  if (type === "prize_win") return <CheckCircle className="w-4 h-4 text-amber-400" />;
  return <WalletIcon className="w-4 h-4 text-muted-foreground" />;
}

function statusBadge(status: string) {
  if (status === "completed") return <span className="text-[10px] font-semibold text-emerald-400">Completed</span>;
  if (status === "pending") return <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> Pending</span>;
  if (status === "failed") return <span className="text-[10px] font-semibold text-rose-400 flex items-center gap-0.5"><XCircle className="w-2.5 h-2.5" /> Failed</span>;
  return <span className="text-[10px] text-muted-foreground">{status}</span>;
}

export function Wallet({ onRequestLogin }: { onRequestLogin: () => void }) {
  const { user } = useUser();
  const [location] = useLocation();
  const [wallet, setWallet] = useState<ApiWallet | null>(null);
  const [transactions, setTransactions] = useState<ApiWalletTransaction[]>([]);
  const [hasPayoutAccount, setHasPayoutAccount] = useState(false);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiGetWallet();
      setWallet(data.wallet);
      setTransactions(data.transactions);
      setHasPayoutAccount(!!data.payoutAccount);
      setPayoutsEnabled(!!data.payoutAccount?.payoutsEnabled);
    } catch {
      toast.error("Failed to load wallet.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Handle return from Stripe Checkout/onboarding
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("deposit") === "success") {
      toast.success("Deposit successful! Your balance will update shortly.");
      window.history.replaceState({}, "", window.location.pathname);
      load();
    } else if (url.searchParams.get("onboard") === "complete") {
      toast.success("Payout account set up! You can now withdraw funds.");
      window.history.replaceState({}, "", window.location.pathname);
      load();
    }
  }, [location, load]);

  const handleDeposit = async () => {
    const cents = Math.round(parseFloat(depositAmount) * 100);
    if (!cents || cents < 100) { toast.error("Minimum deposit is $1.00."); return; }
    if (cents > 10_000_00) { toast.error("Maximum deposit is $10,000."); return; }
    setDepositing(true);
    try {
      const { url } = await apiDepositFunds(cents);
      window.location.href = url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Deposit failed.");
      setDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    const cents = Math.round(parseFloat(withdrawAmount) * 100);
    if (!cents || cents < 500) { toast.error("Minimum withdrawal is $5.00."); return; }
    if (!wallet || cents > wallet.withdrawableBalance) { toast.error("Insufficient withdrawable balance."); return; }
    setWithdrawing(true);
    try {
      await apiWithdrawFunds(cents);
      toast.success("Withdrawal initiated!");
      setShowWithdraw(false);
      setWithdrawAmount("");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Withdrawal failed.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleOnboard = async () => {
    setOnboarding(true);
    try {
      const { url } = await apiStartOnboarding();
      window.location.href = url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start onboarding.");
      setOnboarding(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <WalletIcon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-bold text-foreground text-xl">Your Wallet</h2>
        <p className="text-muted-foreground text-sm">Log in to manage your funds, deposit money, and withdraw winnings.</p>
        <button
          onClick={onRequestLogin}
          className="px-6 py-2.5 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Log In
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-8" data-testid="wallet-page">

      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-purple-900/30 to-background border border-primary/20 p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Available Balance</p>
        <p className="text-4xl font-black text-foreground" data-testid="wallet-balance">
          {formatDollars(wallet?.availableBalance ?? 0)}
        </p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-background/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pending</p>
            <p className="text-lg font-bold text-amber-400">{formatDollars(wallet?.pendingBalance ?? 0)}</p>
          </div>
          <div className="bg-background/50 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Withdrawable</p>
            <p className="text-lg font-bold text-emerald-400">{formatDollars(wallet?.withdrawableBalance ?? 0)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4">
          <p className="text-[10px] text-muted-foreground">
            Deposited: <span className="text-foreground font-semibold">{formatDollars(wallet?.lifetimeDeposited ?? 0)}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            Won: <span className="text-amber-400 font-semibold">{formatDollars(wallet?.lifetimeWon ?? 0)}</span>
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowDeposit(!showDeposit)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
          data-testid="btn-add-funds"
        >
          <Plus className="w-4 h-4" /> Add Funds
        </button>

        {!hasPayoutAccount || !payoutsEnabled ? (
          <button
            onClick={handleOnboard}
            disabled={onboarding}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-foreground font-semibold text-sm hover:bg-accent transition-colors"
            data-testid="btn-setup-withdrawals"
          >
            <ExternalLink className="w-4 h-4" />
            {onboarding ? "Loading…" : "Set Up Withdrawals"}
          </button>
        ) : (
          <button
            onClick={() => setShowWithdraw(!showWithdraw)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary border border-border text-foreground font-semibold text-sm hover:bg-accent transition-colors"
            data-testid="btn-withdraw"
          >
            <ArrowUpRight className="w-4 h-4" /> Withdraw
          </button>
        )}
      </div>

      {/* Deposit form */}
      {showDeposit && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3" data-testid="deposit-form">
          <p className="font-semibold text-foreground text-sm">Add Funds</p>
          <p className="text-xs text-muted-foreground">Enter an amount to deposit via Stripe Checkout. Minimum $1.00.</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min="1"
                max="10000"
                step="1"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="10.00"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="input-deposit-amount"
              />
            </div>
            <button
              onClick={handleDeposit}
              disabled={depositing || !depositAmount}
              className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {depositing ? "…" : "Checkout →"}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[10, 25, 50, 100].map((v) => (
              <button
                key={v}
                onClick={() => setDepositAmount(String(v))}
                className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border hover:bg-primary/10 hover:border-primary transition-colors"
              >
                ${v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Withdraw form */}
      {showWithdraw && payoutsEnabled && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3" data-testid="withdraw-form">
          <p className="font-semibold text-foreground text-sm">Withdraw Funds</p>
          <p className="text-xs text-muted-foreground">
            Withdrawable balance: <span className="text-emerald-400 font-semibold">{formatDollars(wallet?.withdrawableBalance ?? 0)}</span>
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min="5"
                step="1"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="5.00"
                className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-secondary text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="input-withdraw-amount"
              />
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {withdrawing ? "…" : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {/* Transaction history */}
      <div>
        <h3 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" /> Transaction History
        </h3>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-muted-foreground text-sm">No transactions yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3" data-testid={`tx-${tx.id}`}>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  {txIcon(tx.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.description || tx.type}</p>
                  <div className="flex items-center gap-2">
                    {statusBadge(tx.status)}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "text-sm font-bold flex-shrink-0",
                  tx.type === "deposit" || tx.type === "prize_win" ? "text-emerald-400" : "text-rose-400"
                )}>
                  {tx.type === "deposit" || tx.type === "prize_win" ? "+" : "-"}{formatDollars(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
