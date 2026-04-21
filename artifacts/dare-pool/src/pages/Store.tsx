import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Sparkles, Zap, Check, Lock, ArrowLeft, Loader2, ChevronRight, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  apiGetStoreItems,
  apiGetMyBadges,
  apiGetDares,
  apiPurchaseBadge,
  apiEquipBadge,
  apiPurchaseBoost,
  apiGetWallet,
  type ApiStoreBadge,
  type ApiUserBadge,
  type ApiDare,
} from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";

// ─── PAYMENT FLOW SEPARATION ─────────────────────────────────────────────────
//
// DarePool has TWO distinct payment flows that must remain strictly separated:
//
// 1. WALLET / REAL-MONEY FLOW (Stripe) — Exempt from Apple IAP
//    - Depositing funds into wallet via Stripe
//    - Funding dares (placing money into prize pool)
//    - Payouts to dare winners
//    - Withdrawals via Stripe Connect
//    → Apple allows real-money marketplace transactions via Stripe.
//    → Apple does NOT take a cut of these transactions.
//
// 2. DIGITAL GOODS FLOW (currently wallet; must migrate to Apple IAP on iOS)
//    - Purchasing profile badges
//    - Purchasing dare boosts
//    → Apple REQUIRES these to go through Apple In-App Purchase (StoreKit).
//    → When releasing on iOS App Store, replace handleBuyBadge /
//      handleBoostConfirm with calls to src/lib/iap.ts → purchaseProduct().
//    → The backend must then verify the Apple receipt server-side before
//      granting the item.
//
// See: artifacts/dare-pool/src/lib/iap.ts for the IAP integration placeholder.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Boost tiers (mirrors backend definition) ─────────────────────────────────

const BOOST_TIERS = [
  { tier: "tier1" as const, label: "2-Hour Boost",  price: "$1.99", cents: 199, hours: 2,  description: "Give a dare a quick visibility lift" },
  { tier: "tier2" as const, label: "10-Hour Boost", price: "$4.99", cents: 499, hours: 10, description: "Keep a dare pinned at the top all day" },
  { tier: "tier3" as const, label: "24-Hour Boost", price: "$9.99", cents: 999, hours: 24, description: "Maximum 24-hour prime placement" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function Store() {
  const { user } = useUser();
  const [tab, setTab] = useState<"badges" | "boosts">("badges");

  // Badges state
  const [storeItems, setStoreItems]     = useState<ApiStoreBadge[]>([]);
  const [ownedBadges, setOwnedBadges]   = useState<ApiUserBadge[]>([]);
  const [equippedBadge, setEquippedBadge] = useState<string | null>(null);

  // Boosts state
  const [activeDares, setActiveDares]   = useState<ApiDare[]>([]);
  const [selectedDare, setSelectedDare] = useState<number | null>(null);
  const [selectedTier, setSelectedTier] = useState<"tier1" | "tier2" | "tier3" | null>(null);
  const [confirmOpen, setConfirmOpen]   = useState(false);

  // Wallet
  const [walletCents, setWalletCents]   = useState<number | null>(null);

  // Loading / busy
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [itemsRes, wallRes, daresRes] = await Promise.all([
        apiGetStoreItems(),
        user ? apiGetWallet() : null,
        apiGetDares(),
      ]);

      setStoreItems(itemsRes.badges);
      if (wallRes) setWalletCents(wallRes.wallet.availableBalance);
      setActiveDares(daresRes.dares.filter((d) => d.status === "active"));

      if (user) {
        const badgesRes = await apiGetMyBadges();
        setOwnedBadges(badgesRes.badges);
        const equipped = badgesRes.badges.find((b) => b.equippedAt != null);
        setEquippedBadge(equipped?.badgeId ?? null);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Badge purchase ────────────────────────────────────────────────────────
  // CURRENT: deducts from wallet balance (Stripe-backed)
  // iOS App Store: replace this with iap.purchaseProduct(IAP_PRODUCT_IDS.BADGE_*)
  // from src/lib/iap.ts, then verify receipt server-side.

  const handleBuyBadge = async (badgeId: string, cents: number) => {
    if (!user) { toast.error("Log in to purchase."); return; }
    if (walletCents !== null && walletCents < cents) {
      toast.error("Insufficient wallet balance. Deposit funds first.");
      return;
    }
    setBusy(true);
    try {
      await apiPurchaseBadge(badgeId);
      toast.success("Badge purchased!");
      if (walletCents !== null) setWalletCents(walletCents - cents);
      const badgesRes = await apiGetMyBadges();
      setOwnedBadges(badgesRes.badges);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Purchase failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleEquipBadge = async (badgeId: string) => {
    if (!user) return;
    const isCurrentlyEquipped = equippedBadge === badgeId;
    setBusy(true);
    try {
      await apiEquipBadge(badgeId, !isCurrentlyEquipped);
      setEquippedBadge(isCurrentlyEquipped ? null : badgeId);
      toast.success(isCurrentlyEquipped ? "Badge unequipped." : "Badge equipped!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  };

  // ── Boost purchase ────────────────────────────────────────────────────────
  // CURRENT: deducts from wallet balance (Stripe-backed)
  // iOS App Store: replace this with iap.purchaseProduct(IAP_PRODUCT_IDS.BOOST_*)
  // from src/lib/iap.ts, then verify receipt server-side.

  const handleBoostConfirm = async () => {
    if (!selectedDare || !selectedTier) return;
    const tierDef = BOOST_TIERS.find((t) => t.tier === selectedTier)!;
    if (walletCents !== null && walletCents < tierDef.cents) {
      toast.error("Insufficient wallet balance. Deposit funds first.");
      return;
    }
    setBusy(true);
    try {
      await apiPurchaseBoost(selectedDare, selectedTier);
      toast.success("Dare boosted! It will appear at the top of the feed.");
      if (walletCents !== null) setWalletCents(walletCents - tierDef.cents);
      setConfirmOpen(false);
      setSelectedDare(null);
      setSelectedTier(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Boost failed.");
    } finally {
      setBusy(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const walletDollars = walletCents !== null ? (walletCents / 100).toFixed(2) : null;
  const selectedDareObj = activeDares.find((d) => d.id === selectedDare);
  const selectedTierObj = BOOST_TIERS.find((t) => t.tier === selectedTier);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/">
          <button className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-black text-foreground">Store</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Badges &amp; boosts — paid from your wallet</p>
        </div>
        {walletDollars !== null && (
          <div className="ml-auto bg-card border border-card-border rounded-xl px-3 py-1.5 text-right">
            <div className="text-xs text-muted-foreground">Wallet</div>
            <div className="text-sm font-black text-emerald-400">${walletDollars}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 rounded-xl p-1 mb-6">
        {(["badges", "boosts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t ? "bg-primary text-white shadow glow-primary-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "badges" ? "Profile Badges" : "Boost a Dare"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3 opacity-40" />
          <p className="text-sm">Loading store…</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === "badges" ? (
            <motion.div key="badges" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <BadgesTab
                items={storeItems}
                owned={ownedBadges}
                equipped={equippedBadge}
                busy={busy}
                loggedIn={!!user}
                onBuy={handleBuyBadge}
                onEquip={handleEquipBadge}
              />
            </motion.div>
          ) : (
            <motion.div key="boosts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <BoostsTab
                dares={activeDares}
                loggedIn={!!user}
                selectedDare={selectedDare}
                selectedTier={selectedTier}
                onSelectDare={setSelectedDare}
                onSelectTier={setSelectedTier}
                onConfirm={() => setConfirmOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Boost confirm modal */}
      <AnimatePresence>
        {confirmOpen && selectedDareObj && selectedTierObj && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-card-border rounded-2xl p-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-black mb-1">Confirm Boost</h2>
              <p className="text-sm text-muted-foreground mb-4">This will deduct {selectedTierObj.price} from your wallet.</p>
              <div className="bg-secondary/50 rounded-xl p-3 mb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dare</span>
                  <span className="font-semibold truncate max-w-[180px]">{selectedDareObj.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boost</span>
                  <span className="font-semibold">{selectedTierObj.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-black text-amber-400">{selectedTierObj.price}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold"
                  onClick={handleBoostConfirm}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Boost"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Badges Tab ───────────────────────────────────────────────────────────────

interface BadgesTabProps {
  items: ApiStoreBadge[];
  owned: ApiUserBadge[];
  equipped: string | null;
  busy: boolean;
  loggedIn: boolean;
  onBuy: (id: string, cents: number) => void;
  onEquip: (id: string) => void;
}

function BadgesTab({ items, owned, equipped, busy, loggedIn, onBuy, onEquip }: BadgesTabProps) {
  const ownedIds = new Set(owned.map((b) => b.badgeId));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground mb-3">
        Purchase a badge to display on your profile. Only one badge can be equipped at a time.
      </p>
      {items.map((item) => {
        const isOwned = ownedIds.has(item.id);
        const isEquipped = equipped === item.id;
        return (
          <div
            key={item.id}
            className={`bg-card border rounded-2xl p-4 flex items-center gap-4 transition-all ${
              isEquipped ? "border-amber-400/50 bg-amber-400/5" : "border-card-border"
            }`}
          >
            <div className="text-4xl leading-none">{item.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{item.label}</span>
                {isEquipped && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400">
                    Equipped
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              <p className="text-sm font-black text-amber-400 mt-1">
                ${(item.amountCents / 100).toFixed(2)}
              </p>
            </div>
            <div className="flex-shrink-0">
              {!loggedIn ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Login
                </span>
              ) : isOwned ? (
                <Button
                  size="sm"
                  variant={isEquipped ? "outline" : "default"}
                  className={isEquipped ? "" : "bg-amber-400/20 text-amber-400 hover:bg-amber-400/30 border border-amber-400/30"}
                  onClick={() => onEquip(item.id)}
                  disabled={busy}
                >
                  {isEquipped ? "Unequip" : "Equip"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-white font-bold"
                  onClick={() => onBuy(item.id, item.amountCents)}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Buy"}
                </Button>
              )}
            </div>
          </div>
        );
      })}
      {owned.length > 0 && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          You own {owned.length} badge{owned.length !== 1 ? "s" : ""}. Visit your{" "}
          <Link href="/profile/me" className="text-primary hover:underline">profile</Link> to see them.
        </p>
      )}
    </div>
  );
}

// ─── Boosts Tab ───────────────────────────────────────────────────────────────

interface BoostsTabProps {
  dares: ApiDare[];
  loggedIn: boolean;
  selectedDare: number | null;
  selectedTier: "tier1" | "tier2" | "tier3" | null;
  onSelectDare: (id: number) => void;
  onSelectTier: (tier: "tier1" | "tier2" | "tier3") => void;
  onConfirm: () => void;
}

function BoostsTab({ dares, loggedIn, selectedDare, selectedTier, onSelectDare, onSelectTier, onConfirm }: BoostsTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          Boost any active dare to pin it at the top of everyone's feed. Boosting is visibility only — it does not change the pool, votes, or payouts.
        </p>

        {/* Step 1: Choose dare */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center">1</span>
            Choose a dare to boost
          </h3>
          {!loggedIn ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> Log in to boost dares.
            </p>
          ) : dares.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active dares right now.</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {dares.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onSelectDare(d.id)}
                  className={`w-full text-left bg-card border rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all ${
                    selectedDare === d.id
                      ? "border-primary bg-primary/10"
                      : "border-card-border hover:border-primary/40"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="flex-1 text-sm font-medium line-clamp-1">{d.title}</span>
                  <span className="text-xs text-amber-400 font-bold flex-shrink-0">${d.prizePool}</span>
                  {selectedDare === d.id && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2: Choose tier */}
        {selectedDare && (
          <div className="mb-4">
            <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-black flex items-center justify-center">2</span>
              Choose a boost duration
            </h3>
            <div className="space-y-2">
              {BOOST_TIERS.map((t) => (
                <button
                  key={t.tier}
                  onClick={() => onSelectTier(t.tier)}
                  className={`w-full text-left bg-card border rounded-xl px-4 py-3 flex items-center gap-3 transition-all ${
                    selectedTier === t.tier
                      ? "border-primary bg-primary/10"
                      : "border-card-border hover:border-primary/40"
                  }`}
                >
                  <Zap className={`w-4 h-4 flex-shrink-0 ${
                    t.tier === "tier3" ? "text-amber-400" : t.tier === "tier2" ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <div className="flex-1">
                    <div className="text-sm font-bold">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.description}</div>
                  </div>
                  <span className="text-sm font-black text-amber-400">{t.price}</span>
                  {selectedTier === t.tier && <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        {selectedDare && selectedTier && (
          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm gap-2"
            onClick={onConfirm}
          >
            <Zap className="w-4 h-4" />
            Review &amp; Boost
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
