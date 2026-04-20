import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trophy, Users, ThumbsUp, Crown, Video, Link2, Upload, Flag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getDareById,
  getSubmissions,
  castVote,
  hasVoted,
  finalizeWinners,
  isExpired,
  type Dare,
  type Submission,
} from "@/lib/store";
import { isDareFlagged } from "@/lib/reports";
import { useUser } from "@/context/UserContext";
import { CountdownBadge } from "@/components/CountdownBadge";
import { Button } from "@/components/ui/button";
import { LoginModal } from "@/components/LoginModal";
import { SubmitEntryModal } from "@/components/SubmitEntryModal";
import { ReportModal } from "@/components/ReportModal";
import { cn } from "@/lib/utils";

interface DareDetailProps {
  id: string;
}

export function DareDetail({ id }: DareDetailProps) {
  const { username } = useUser();
  const [, setLocation] = useLocation();
  const [dare, setDare] = useState<Dare | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userVoted, setUserVoted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [votedSubId, setVotedSubId] = useState<string | null>(null);
  const [voteAnimation, setVoteAnimation] = useState<string | null>(null);
  const [flagged, setFlagged] = useState(false);

  const load = useCallback(() => {
    const d = getDareById(id);
    if (!d) return;
    if (isExpired(d)) finalizeWinners(id);
    setDare(d);
    setFlagged(isDareFlagged(id));

    const subs = getSubmissions(id);
    subs.sort((a, b) => b.votes - a.votes);
    setSubmissions(subs);

    if (username) {
      setUserVoted(hasVoted(id, username));
      const storedVotes = JSON.parse(localStorage.getItem("darepool_votes") || "[]");
      const myVoteRecord = storedVotes.find(
        (v: { dareId: string; submissionId: string; username: string }) =>
          v.dareId === id && v.username === username
      );
      if (myVoteRecord) setVotedSubId(myVoteRecord.submissionId);
    }
  }, [id, username]);

  useEffect(() => {
    load();
  }, [load]);

  if (!dare) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">Dare not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/")}>
          Go Home
        </Button>
      </div>
    );
  }

  const expired = isExpired(dare);

  const handleVote = (subId: string) => {
    if (!username) {
      setShowLogin(true);
      return;
    }
    if (userVoted || expired) return;
    const success = castVote(id, subId, username);
    if (success) {
      setVoteAnimation(subId);
      setTimeout(() => {
        setVoteAnimation(null);
        load();
      }, 600);
    }
  };

  const winner = submissions.find((s) => s.isWinner);
  const maxVotes = submissions.length > 0 ? Math.max(...submissions.map((s) => s.votes)) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={load}
      />
      <SubmitEntryModal
        open={showSubmit}
        dareId={id}
        onClose={() => setShowSubmit(false)}
        onSuccess={() => {
          setShowSubmit(false);
          load();
        }}
      />
      <ReportModal
        open={showReport}
        dareId={id}
        onClose={() => {
          setShowReport(false);
          load();
        }}
      />

      <button
        onClick={() => setLocation("/")}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-5 text-sm"
        data-testid="btn-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Flagged notice */}
      <AnimatePresence>
        {flagged && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-2.5 mb-4 text-sm text-amber-400"
            data-testid="dare-flagged-notice"
          >
            <Flag className="w-4 h-4 flex-shrink-0" />
            This dare has been reported and is under review.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-card-border rounded-2xl p-5 mb-5"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {expired ? (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                  Ended
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/20 text-primary">
                  Live
                </span>
              )}
              <span className="text-xs text-muted-foreground">by {dare.createdBy}</span>
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
            <CountdownBadge expiresAt={dare.expiresAt} large />
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="font-semibold text-foreground">{dare.submissionCount}</span> entries
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Report button */}
            <button
              onClick={() => setShowReport(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1.5 rounded-lg hover:bg-destructive/10"
              title="Report this dare"
              data-testid="btn-report-dare"
            >
              <Flag className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>

            {!expired && (
              <Button
                onClick={() => {
                  if (!username) {
                    setShowLogin(true);
                  } else {
                    setShowSubmit(true);
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm"
                data-testid="btn-submit-entry"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Submit Entry
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Winner banner */}
      <AnimatePresence>
        {expired && winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-amber-400/15 border border-amber-400/30 rounded-2xl p-4 mb-5 flex items-center gap-3"
          >
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

      {/* Submissions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            Submissions
          </h2>
          {!expired && username && !userVoted && (
            <span className="text-xs text-muted-foreground">Vote for your favorite</span>
          )}
          {!expired && username && userVoted && (
            <span className="text-xs text-emerald-400 font-medium">You voted!</span>
          )}
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-card border border-card-border rounded-2xl">
            <Video className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium">No entries yet</p>
            {!expired && (
              <p className="text-sm mt-1">Be the first to complete this dare!</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub, i) => (
              <SubmissionCard
                key={sub.id}
                sub={sub}
                index={i}
                expired={expired}
                userVoted={userVoted}
                votedSubId={votedSubId}
                maxVotes={maxVotes}
                isAnimating={voteAnimation === sub.id}
                onVote={() => handleVote(sub.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SubmissionCardProps {
  sub: Submission;
  index: number;
  expired: boolean;
  userVoted: boolean;
  votedSubId: string | null;
  maxVotes: number;
  isAnimating: boolean;
  onVote: () => void;
}

function SubmissionCard({
  sub,
  index,
  expired,
  userVoted,
  votedSubId,
  maxVotes,
  isAnimating,
  onVote,
}: SubmissionCardProps) {
  const isLeader = sub.votes === maxVotes && maxVotes > 0;
  const myVote = votedSubId === sub.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "bg-card border rounded-2xl p-4 transition-all",
        sub.isWinner
          ? "border-amber-400/50 bg-amber-400/5"
          : isLeader && !expired
          ? "border-primary/40 bg-primary/5"
          : "border-card-border"
      )}
      data-testid={`submission-card-${sub.id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {sub.isWinner && (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/20">
              <Crown className="w-3 h-3" /> Winner
            </span>
          )}
          {!sub.isWinner && isLeader && !expired && (
            <span className="text-xs font-bold text-primary px-2 py-0.5 rounded-full bg-primary/20">
              Leading
            </span>
          )}
          <span className="font-semibold text-foreground text-sm">@{sub.username}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(sub.uploadedAt).toLocaleDateString()}
        </span>
      </div>

      {/* Video preview */}
      <div className="mb-3">
        {sub.videoType === "link" ? (
          <a
            href={sub.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-secondary hover:bg-accent rounded-xl p-3 transition-colors group"
            data-testid={`link-video-${sub.id}`}
          >
            <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm text-foreground font-medium truncate">{sub.videoUrl}</span>
          </a>
        ) : (
          <div className="bg-secondary rounded-xl p-3 flex items-center gap-2">
            <Video className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">Video uploaded</span>
          </div>
        )}
      </div>

      {/* Vote section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black text-foreground">{sub.votes}</span>
          <span className="text-sm text-muted-foreground">votes</span>
          {sub.votes > 0 && maxVotes > 0 && (
            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(sub.votes / maxVotes) * 100}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          )}
        </div>

        <motion.button
          onClick={onVote}
          disabled={expired || userVoted}
          animate={isAnimating ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.4 }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all",
            expired
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
              : myVote
              ? "bg-primary/20 text-primary cursor-not-allowed"
              : userVoted
              ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              : "bg-primary hover:bg-primary/90 text-white glow-primary-sm cursor-pointer"
          )}
          data-testid={`btn-vote-${sub.id}`}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          {myVote ? "Voted" : expired ? "Closed" : "Vote"}
        </motion.button>
      </div>
    </motion.div>
  );
}
