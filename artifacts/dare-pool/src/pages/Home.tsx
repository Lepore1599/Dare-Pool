import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Flame, Trophy, Plus, Users, ChevronRight, Zap, TrendingUp, Clock, Rocket, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGetDares, type ApiDare } from "@/lib/api";
import { CountdownBadge } from "@/components/CountdownBadge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";

// ─── Scoring ─────────────────────────────────────────────────────────────────

function hotScore(d: ApiDare): number {
  return (
    (d.recentFundingDollars ?? 0) * 1.5 +
    (d.recentFunderCount ?? 0) * 6 +
    d.entryCount * 2
  );
}

function trendingScore(d: ApiDare): number {
  return (
    d.prizePool * 0.5 +
    d.entryCount * 10 +
    (d.voteCount ?? 0) * 5 +
    (d.recentFunderCount ?? 0) * 8 +
    (d.commentCount ?? 0) * 2
  );
}

// ─── Boost tier sort weight ───────────────────────────────────────────────────

function boostTierWeight(tier: string): number {
  return tier === "tier3" ? 3 : tier === "tier2" ? 2 : 1;
}

// ─── Feed tab type ────────────────────────────────────────────────────────────

type FeedTab = "hot" | "trending" | "recent";

// ─── Card label helpers ───────────────────────────────────────────────────────

function getCardLabels(
  dare: ApiDare,
  tab: FeedTab,
  hotRank: number,
  trendingRank: number,
  totalActive: number
): string[] {
  const labels: string[] = [];
  const now = Date.now();
  const expiresMs = new Date(dare.expiresAt).getTime();
  const createdMs = new Date(dare.createdAt).getTime();

  if (dare.boostInfo) labels.push("Boosted");
  if (tab === "hot" && hotRank / totalActive < 0.25 && hotScore(dare) > 0) labels.push("Hot");
  if (tab === "trending" && trendingRank / totalActive < 0.3 && trendingScore(dare) > 0) labels.push("Trending");
  if (now - createdMs < 3 * 60 * 60 * 1000) labels.push("New");
  if (dare.status === "active" && expiresMs - now < 6 * 60 * 60 * 1000 && expiresMs > now) labels.push("Ending Soon");

  return labels;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HomeProps {
  onLoginClick: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Home({ onLoginClick }: HomeProps) {
  const { user } = useUser();
  const [dares, setDares] = useState<ApiDare[]>([]);
  const [tab, setTab] = useState<FeedTab>("hot");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const { dares: d } = await apiGetDares();
      setDares(d);
    } catch (err) {
      console.error("[Home] Failed to load dares:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => dares.filter((d) => d.status === "active"), [dares]);
  const ended = useMemo(() => dares.filter((d) => d.status !== "active" && d.status !== "removed"), [dares]);
  const totalPool = useMemo(() => dares.reduce((acc, d) => acc + d.prizePool, 0), [dares]);

  // Boosted dares — show max 3, sorted by tier desc then longest remaining
  const boostedDares = useMemo(() => {
    return active
      .filter((d) => d.boostInfo != null)
      .sort((a, b) => {
        const tierDiff = boostTierWeight(b.boostInfo!.boostTier) - boostTierWeight(a.boostInfo!.boostTier);
        if (tierDiff !== 0) return tierDiff;
        return new Date(b.boostInfo!.endsAt).getTime() - new Date(a.boostInfo!.endsAt).getTime();
      })
      .slice(0, 3);
  }, [active]);

  const boostedIds = useMemo(() => new Set(boostedDares.map((d) => d.id)), [boostedDares]);

  // Feed dares (exclude already-shown boosted ones from feed to avoid duplicates)
  const feedDares = useMemo(() => {
    const nonBoosted = active.filter((d) => !boostedIds.has(d.id));
    if (tab === "hot") {
      return [...nonBoosted].sort((a, b) => hotScore(b) - hotScore(a));
    }
    if (tab === "trending") {
      return [...nonBoosted].sort((a, b) => trendingScore(b) - trendingScore(a));
    }
    // recent
    return [...nonBoosted].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [active, tab, boostedIds]);

  // Pre-compute rank maps for label logic
  const { hotRankMap, trendingRankMap } = useMemo(() => {
    const byHot = [...active].sort((a, b) => hotScore(b) - hotScore(a));
    const byTrending = [...active].sort((a, b) => trendingScore(b) - trendingScore(a));
    const hotRankMap: Record<number, number> = {};
    const trendingRankMap: Record<number, number> = {};
    byHot.forEach((d, i) => { hotRankMap[d.id] = i; });
    byTrending.forEach((d, i) => { trendingRankMap[d.id] = i; });
    return { hotRankMap, trendingRankMap };
  }, [active]);

  const TABS: { id: FeedTab; label: string; icon: typeof Flame }[] = [
    { id: "hot",      label: "Hot",      icon: Flame       },
    { id: "trending", label: "Trending", icon: TrendingUp  },
    { id: "recent",   label: "Recent",   icon: Clock       },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Loading dares…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-destructive/70" />
        </div>
        <div>
          <h2 className="font-bold text-foreground text-lg mb-1">Unable to Load Dares</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Could not reach the server. Check your connection and try again.
          </p>
        </div>
        <Button
          onClick={load}
          className="bg-primary hover:bg-primary/90 text-white font-semibold"
          data-testid="btn-retry-home"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 rounded-full px-3 py-1 mb-4">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Live Dares</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Dare. Compete. <span className="text-primary">Win.</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Post a dare, submit your proof, let the community decide.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <Link href="/create">
            <Button className="gap-2 bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm" data-testid="btn-create-dare-hero">
              <Plus className="w-4 h-4" /> Create a Dare
            </Button>
          </Link>
          {!user && (
            <Button variant="outline" className="gap-2" onClick={onLoginClick} data-testid="btn-join-hero">
              Join to Vote
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Active Dares", value: active.length,  icon: Flame,  color: "text-primary"     },
          { label: "Ended",        value: ended.length,   icon: Trophy, color: "text-amber-400"   },
          { label: "Total Pool",   value: `$${totalPool}`,icon: Zap,    color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-card-border rounded-xl p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className={`text-lg font-black ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Boosted section ──────────────────────────────────────── */}
      {boostedDares.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Boosted</span>
          </div>
          <div className="space-y-2">
            {boostedDares.map((dare, i) => (
              <BoostedCard key={dare.id} dare={dare} index={i} />
            ))}
          </div>
          <div className="h-px bg-border mt-5 mb-1" />
        </div>
      )}

      {/* ── Feed tabs ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-4 bg-secondary/50 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            data-testid={`tab-${id}`}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? "bg-primary text-white shadow glow-primary-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Feed ─────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="space-y-3"
        >
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <Flame className="w-8 h-8 mx-auto mb-3 opacity-30 animate-pulse" />
              <p className="text-sm">Loading dares…</p>
            </div>
          ) : feedDares.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No active dares yet</p>
              <p className="text-sm mt-1">
                Be the first — <Link href="/create" className="text-primary hover:underline">create one</Link>
              </p>
            </div>
          ) : (
            feedDares.map((dare, i) => (
              <DareCard
                key={dare.id}
                dare={dare}
                index={i}
                tab={tab}
                hotRank={hotRankMap[dare.id] ?? 0}
                trendingRank={trendingRankMap[dare.id] ?? 0}
                totalActive={active.length}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Boosted Card ─────────────────────────────────────────────────────────────

function BoostedCard({ dare, index }: { dare: ApiDare; index: number }) {
  const [, navigate] = useLocation();
  const tierLabel: Record<string, string> = { tier1: "2h Boost", tier2: "10h Boost", tier3: "24h Boost" };
  const booster = dare.boostInfo?.boostedByUsername ?? null;
  const tierTag = tierLabel[dare.boostInfo?.boostTier ?? "tier1"] ?? "Boost";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.22 }}
    >
      <div
        className="group bg-amber-400/5 border border-amber-400/30 rounded-2xl p-4 hover:border-amber-400/60 transition-all hover:shadow-lg cursor-pointer"
        onClick={() => navigate(`/dare/${dare.id}`)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 flex items-center gap-1">
                <Rocket className="w-3 h-3" /> Boosted · {tierTag}
              </span>
              {booster && (
                <span className="text-xs text-muted-foreground">by @{booster}</span>
              )}
            </div>
            <h2 className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors">
              {dare.title}
            </h2>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-lg font-black text-amber-400 glow-gold leading-none">${dare.prizePool}</div>
            <div className="text-xs text-muted-foreground">prize</div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-amber-400/15 text-xs text-muted-foreground">
          <CountdownBadge expiresAt={new Date(dare.expiresAt).getTime()} />
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {dare.entryCount} {dare.entryCount === 1 ? "entry" : "entries"}
          </span>
          <span className="ml-auto text-xs text-primary font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
            View <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Dare Card ────────────────────────────────────────────────────────────────

interface DareCardProps {
  dare: ApiDare;
  index: number;
  tab: FeedTab;
  hotRank: number;
  trendingRank: number;
  totalActive: number;
}

function DareCard({ dare, index, tab, hotRank, trendingRank, totalActive }: DareCardProps) {
  const [, navigate] = useLocation();
  const isCompleted = dare.status === "completed";
  const isTransferred = dare.status === "transferred";

  const labels = getCardLabels(dare, tab, hotRank, trendingRank, totalActive);

  const recentLabel = dare.recentFundingDollars && dare.recentFundingDollars > 0
    ? `+$${dare.recentFundingDollars} recently`
    : null;

  function StatusBadge() {
    if (dare.status === "active") return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Live</span>;
    if (isCompleted)   return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Completed</span>;
    if (isTransferred) return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Pool Moved</span>;
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Ended</span>;
  }

  function LabelPill({ label }: { label: string }) {
    const styles: Record<string, string> = {
      "Hot":          "bg-orange-500/15 text-orange-400",
      "Trending":     "bg-purple-500/15 text-purple-400",
      "New":          "bg-emerald-500/15 text-emerald-400",
      "Ending Soon":  "bg-red-500/15 text-red-400",
      "Boosted":      "bg-amber-400/15 text-amber-400",
    };
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${styles[label] ?? "bg-muted text-muted-foreground"}`}>
        {label}
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
    >
      <div
        className="group bg-card border border-card-border rounded-2xl p-4 hover:border-primary/40 transition-all hover:shadow-lg cursor-pointer"
        data-testid={`dare-card-${dare.id}`}
        onClick={() => navigate(`/dare/${dare.id}`)}
      >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <StatusBadge />
                {labels.map((l) => <LabelPill key={l} label={l} />)}
                <Link
                  href={`/profile/${dare.createdByUserId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors ml-0.5"
                >
                  by {dare.createdByUsername}
                </Link>
              </div>
              <h2 className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {dare.title}
              </h2>
              {recentLabel && (
                <p className="text-[11px] text-emerald-400 mt-0.5 font-semibold">{recentLabel}</p>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-lg font-black text-amber-400 glow-gold leading-none">${dare.prizePool}</div>
              <div className="text-xs text-muted-foreground">prize</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <CountdownBadge expiresAt={new Date(dare.expiresAt).getTime()} />
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {dare.entryCount} {dare.entryCount === 1 ? "entry" : "entries"}
              </span>
            </div>
            <span className="text-xs text-primary font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
              View <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
      </div>
    </motion.div>
  );
}
