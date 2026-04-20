import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trophy, Users, Crown, Video, Play, Upload, Flag, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { apiGetDare, apiGetEntries, apiVote, type ApiDare, type ApiEntry } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { CountdownBadge } from "@/components/CountdownBadge";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";
import { SubmitEntryModal } from "@/components/SubmitEntryModal";
import { ReportModal } from "@/components/ReportModal";
import { EntryFeed } from "@/components/EntryFeed";
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

  // Open the feed at a shared deep-link entry (#entry-123) once entries load
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
      // Optimistic update so the heart number bumps immediately in the feed
      setVotedEntryId(entryId);
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, voteCount: e.voteCount + 1 } : e));
      toast.success("Vote cast!");
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cast vote.");
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

  const expired = dare.status !== "active";
  const winner = entries.find((e) => e.status === "winner");
  const flagged = dare.status === "reported";

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
              {expired ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Ended</span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary">Live</span>
              )}
              <Link href={`/profile/${dare.createdByUserId}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">by {dare.createdByUsername}</Link>
            </div>
            <h1 className="text-xl font-black text-foreground leading-snug">{dare.title}</h1>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-amber-400 glow-gold">${dare.prizePool}</div>
            <div className="text-xs text-muted-foreground">prize pool</div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{dare.description}</p>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-4 text-sm">
            <CountdownBadge expiresAt={new Date(dare.expiresAt).getTime()} large />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-foreground">{dare.entryCount}</span> entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1.5 rounded-lg hover:bg-destructive/10"
              data-testid="btn-report-dare">
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
            {!expired && (
              <Button onClick={() => user ? setShowSubmit(true) : setShowLogin(true)}
                className="bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm"
                data-testid="btn-submit-entry">
                <Upload className="w-4 h-4 mr-1.5" /> Submit Entry
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {expired && winner && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-400/15 border border-amber-400/30 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Winner</p>
              <p className="font-bold text-foreground">
                {winner.username} won <span className="text-amber-400">${dare.prizePool}</span>
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
          {!expired && user && votedEntryId === null && (
            <span className="text-xs text-muted-foreground">Vote for your favorite</span>
          )}
          {!expired && user && votedEntryId !== null && (
            <span className="text-xs text-emerald-400 font-medium">You voted!</span>
          )}
        </div>

        {entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-card-border rounded-2xl">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No entries yet</p>
            {!expired && <p className="text-sm mt-1">Be the first to complete this dare!</p>}
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
      </div>
    </div>
  );
}
