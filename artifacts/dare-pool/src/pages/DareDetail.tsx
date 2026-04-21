import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trophy, Users, Crown, Video, Play, Upload, Flag, Heart, Wallet, ArrowRight, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  apiGetDare, apiGetEntries, apiVote, apiFundDare,
  type ApiDare, type ApiEntry,
} from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { CountdownBadge } from "@/components/CountdownBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginModal } from "@/components/LoginModal";
import { SubmitEntryModal } from "@/components/SubmitEntryModal";
import { ReportModal } from "@/components/ReportModal";
import { EntryFeed } from "@/components/EntryFeed";
import { DareComments } from "@/components/DareComments";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DareDetailProps { id: string; }

export function DareDetail({ id }: DareDetailProps) {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [dare, setDare] = useState<ApiDare | null>(null);
  const [entries, setEntries] = useState<ApiEntry[]>([]);
  const [votedEntryId, setVotedEntryId] = useState<number | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [funding, setFunding] = useState(false);
  const [feedStartIndex, setFeedStartIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const numId = Number(id);

  const load = useCallback(async () => {
    try {
      const [{ dare: d }, { entries: e, votedEntryId: v }] = await Promise.all([
        apiGetDare(numId),
        apiGetEntries(numId),
      ]);
      setDare(d);
      setEntries(e);
      setVotedEntryId(v);
    } catch {
      setDare(null);
    } finally {
      setLoading(false);
    }
  }, [numId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (entries.length === 0) return;
    const hash = window.location.hash;
    const m = /^#entry-(\d+)$/.exec(hash);
    if (!m) return;
    const targetId = Number(m[1]);
    const idx = entries.findIndex((e) => e.id === targetId);
    if (idx >= 0) setFeedStartIndex(idx);
  }, [entries]);

  const handleVote = async (entryId: number) => {
    if (!user) { setShowLogin(true); return; }
    if (votedEntryId !== null || dare?.status !== "active") return;
    try {
      await apiVote(numId, entryId);
      setVotedEntryId(entryId);
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, voteCount: e.voteCount + 1 } : e));
      toast.success("Vote cast!");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cast vote.");
    }
  };

  const handleFund = async () => {
    if (!user) { setShowLogin(true); return; }
    const amount = Number(fundAmount);
    if (!Number.isInteger(amount) || amount < 1) {
      toast.error("Enter a whole dollar amount of at least $1.");
      return;
    }
    setFunding(true);
    try {
      const { newPrizePool } = await apiFundDare(numId, amount);
      setDare((d) => d ? { ...d, prizePool: newPrizePool } : d);
      setFundAmount("");
      setShowFund(false);
      toast.success(`Added $${amount} to the pool!`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to fund dare.");
    } finally {
      setFunding(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (!dare) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Dare not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/")}>Go Home</Button>
      </div>
    );
  }

  const isActive = dare.status === "active";
  const isCompleted = dare.status === "completed";
  const isTransferred = dare.status === "transferred";
  const isNoSubmissions = dare.status === "expired_no_submissions";
  const expired = !isActive;
  const winner = entries.find((e) => e.status === "winner");
  const flagged = dare.status === "reported";

  const winnerCut = Math.floor(dare.prizePool * 0.8);
  const creatorCut = Math.floor(dare.prizePool * 0.1);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <LoginModal open={showLogin} onClose={() => setShowLogin(false)} onSuccess={load} />
      <SubmitEntryModal open={showSubmit} dareId={numId} onClose={() => setShowSubmit(false)}
        onSuccess={() => { setShowSubmit(false); load(); }} />
      <ReportModal open={showReport} dareId={numId} onClose={() => { setShowReport(false); load(); }} />
      <EntryFeed
        open={feedStartIndex !== null}
        entries={entries}
        startIndex={feedStartIndex ?? 0}
        dareTitle={dare.title}
        votedEntryId={votedEntryId}
        expired={expired}
        isLoggedIn={!!user}
        onClose={() => setFeedStartIndex(null)}
        onVote={handleVote}
        onRequestLogin={() => setShowLogin(true)}
        onReportSubmitted={load}
      />

      <button onClick={() => setLocation("/")}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-5 text-sm"
        data-testid="btn-back">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <AnimatePresence>
        {flagged && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-2.5 mb-4 text-sm text-amber-400">
            <Flag className="w-4 h-4 flex-shrink-0" />
            This dare has been reported and is under review.
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-card-border rounded-2xl p-5 mb-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {isActive ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary">Live</span>
              ) : isCompleted ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Completed</span>
              ) : isTransferred ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400">Pool Transferred</span>
              ) : isNoSubmissions ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">No Submissions</span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Ended</span>
              )}
              <Link href={`/profile/${dare.createdByUserId}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                by {dare.createdByUsername}
              </Link>
            </div>
            <h1 className="text-xl font-black text-foreground leading-snug">{dare.title}</h1>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-amber-400 glow-gold">${dare.prizePool}</div>
            <div className="text-xs text-muted-foreground">prize pool</div>
            {(dare.funderCount ?? 0) > 0 && (
              <div className="text-[10px] text-muted-foreground mt-0.5">{dare.funderCount} funder{dare.funderCount !== 1 ? "s" : ""}</div>
            )}
          </div>
        </div>

        {isActive && (
          <div className="text-[11px] text-muted-foreground bg-secondary/50 rounded-lg px-3 py-1.5 mb-3 flex items-center gap-1.5">
            <Info className="w-3 h-3 flex-shrink-0" />
            Winner gets 80% · Creator gets 10% · Platform 10%
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{dare.description}</p>

        <div className="border-t border-border pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <CountdownBadge expiresAt={new Date(dare.expiresAt).getTime()} large />
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="font-semibold text-foreground">{entries.length}</span> entries
              </span>
            </div>
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1.5 rounded-lg hover:bg-destructive/10"
              data-testid="btn-report-dare">
              <Flag className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
          </div>
          {isActive && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"
                onClick={() => user ? setShowFund(true) : setShowLogin(true)}
                className="border-amber-400/40 text-amber-400 hover:bg-amber-400/10 text-xs gap-1 flex-1"
                data-testid="btn-fund-dare">
                <Wallet className="w-3.5 h-3.5" /> Fund Pool
              </Button>
              <Button onClick={() => user ? setShowSubmit(true) : setShowLogin(true)}
                className="bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm flex-1"
                data-testid="btn-submit-entry">
                <Upload className="w-4 h-4 mr-1.5" /> Submit Entry
              </Button>
            </div>
          )}
        </div>

        {/* Fund dare inline form */}
        <AnimatePresence>
          {showFund && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input
                    type="number" min={1} placeholder="10"
                    value={fundAmount} onChange={(e) => setFundAmount(e.target.value)}
                    className="pl-7 bg-secondary border-input"
                    data-testid="input-fund-amount"
                  />
                </div>
                <Button onClick={handleFund} disabled={funding}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-bold shrink-0"
                  data-testid="btn-fund-confirm">
                  {funding ? "Adding…" : "Add to Pool"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowFund(false)}>Cancel</Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
                Funds are deducted from your wallet balance immediately.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Winner banner */}
      <AnimatePresence>
        {isCompleted && winner && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-400/15 border border-amber-400/30 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Winner</p>
                <p className="font-bold text-foreground">
                  <Link href={`/profile/${winner.userId}`} className="hover:underline">{winner.username}</Link>
                  {" "}won <span className="text-amber-400">${winnerCut}</span>
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-black/20 rounded-lg p-2">
                <div className="font-bold text-amber-400">${winnerCut}</div>
                <div className="text-muted-foreground">Winner (80%)</div>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <div className="font-bold text-purple-400">${creatorCut}</div>
                <div className="text-muted-foreground">Creator (10%)</div>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <div className="font-bold text-muted-foreground">${dare.prizePool - winnerCut - creatorCut}</div>
                <div className="text-muted-foreground">Platform (10%)</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pool transferred banner */}
      <AnimatePresence>
        {isTransferred && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ArrowRight className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Pool Transferred</p>
              <p className="text-sm text-foreground">No valid submissions were received. The ${dare.prizePool} prize pool was moved to another active dare.</p>
              {dare.transferredToDareTitle && dare.transferredToDareId && (
                <Link href={`/dare/${dare.transferredToDareId}`}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 font-medium">
                  See: {dare.transferredToDareTitle} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No submissions banner */}
      <AnimatePresence>
        {isNoSubmissions && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-muted/50 border border-border rounded-2xl p-4 mb-5 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
              <Info className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">No Valid Submissions</p>
              <p className="text-sm text-muted-foreground">
                {dare.transferReason ?? "This dare expired with no valid submissions."}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" /> Submissions
          </h2>
          {isActive && user && votedEntryId === null && (
            <span className="text-xs text-muted-foreground">Vote for your favorite</span>
          )}
          {isActive && user && votedEntryId !== null && (
            <span className="text-xs text-emerald-400 font-medium">You voted!</span>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-card-border rounded-2xl">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No entries yet</p>
            {isActive && <p className="text-sm mt-1">Be the first to complete this dare!</p>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {entries.map((entry, i) => {
                const isWinner = entry.status === "winner";
                const myVote = votedEntryId === entry.id;
                return (
                  <button
                    key={entry.id}
                    onClick={() => setFeedStartIndex(i)}
                    className={cn(
                      "relative aspect-[9/14] rounded-xl overflow-hidden bg-secondary border text-left transition-all hover:scale-[1.02] hover:shadow-lg",
                      isWinner ? "border-amber-400/50" : "border-card-border"
                    )}
                    data-testid={`entry-thumb-${entry.id}`}
                  >
                    {entry.videoType === "upload" ? (
                      <video
                        src={entry.videoUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-700/20 to-black flex items-center justify-center">
                        <Video className="w-8 h-8 text-white/70" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="bg-black/50 rounded-full p-3 backdrop-blur">
                        <Play className="w-5 h-5 text-white" fill="white" />
                      </div>
                    </div>
                    {isWinner && (
                      <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-bold text-amber-300 px-1.5 py-0.5 rounded-full bg-amber-400/30 backdrop-blur ring-1 ring-amber-400/50">
                        <Crown className="w-3 h-3" />
                      </div>
                    )}
                    {myVote && (
                      <div className="absolute top-2 right-2 text-[10px] font-bold text-rose-200 px-1.5 py-0.5 rounded-full bg-rose-500/40 backdrop-blur">
                        Voted
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-end justify-between gap-1">
                      <div className="min-w-0">
                        <div className="text-white text-xs font-semibold truncate">@{entry.username}</div>
                      </div>
                      <div className="flex items-center gap-1 text-white text-xs font-bold">
                        <Heart className={cn("w-3 h-3", myVote && "fill-rose-500 text-rose-500")} />
                        {entry.voteCount}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Tap any entry to swipe through the feed
            </p>
          </>
        )}

        <DareComments dareId={numId} onRequestLogin={() => setShowLogin(true)} />
      </div>
    </div>
  );
}
