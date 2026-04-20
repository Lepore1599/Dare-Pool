import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Crown,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  X,
} from "lucide-react";
import type { ApiEntry } from "@/lib/api";
import { apiGetComments } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CommentsSheet } from "./CommentsSheet";
import { ReportModal } from "./ReportModal";
import { toast } from "sonner";

interface EntryFeedProps {
  open: boolean;
  entries: ApiEntry[];
  startIndex: number;
  dareTitle: string;
  votedEntryId: number | null;
  expired: boolean;
  isLoggedIn: boolean;
  onClose: () => void;
  onVote: (entryId: number) => Promise<void> | void;
  onRequestLogin: () => void;
  onReportSubmitted?: () => void;
}

export function EntryFeed({
  open,
  entries,
  startIndex,
  dareTitle,
  votedEntryId,
  expired,
  isLoggedIn,
  onClose,
  onVote,
  onRequestLogin,
  onReportSubmitted,
}: EntryFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [muted, setMuted] = useState(true);
  const [commentsOpenFor, setCommentsOpenFor] = useState<number | null>(null);
  const [reportOpenFor, setReportOpenFor] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Record<number, number>>({});

  // Scroll to start index on open
  useEffect(() => {
    if (!open) return;
    setActiveIndex(startIndex);
    requestAnimationFrame(() => {
      const el = containerRef.current?.querySelector<HTMLElement>(`[data-feed-idx="${startIndex}"]`);
      el?.scrollIntoView({ behavior: "auto", block: "start" });
    });
  }, [open, startIndex]);

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Preload comment counts for visible entries
  const loadCount = useCallback(async (entryId: number) => {
    if (commentCounts[entryId] !== undefined) return;
    try {
      const { comments } = await apiGetComments(entryId);
      setCommentCounts((prev) => ({ ...prev, [entryId]: comments.length }));
    } catch {
      setCommentCounts((prev) => ({ ...prev, [entryId]: 0 }));
    }
  }, [commentCounts]);

  useEffect(() => {
    if (!open) return;
    const e = entries[activeIndex];
    if (e) loadCount(e.id);
    const next = entries[activeIndex + 1];
    if (next) loadCount(next.id);
  }, [open, activeIndex, entries, loadCount]);

  // IntersectionObserver to track active card
  useEffect(() => {
    if (!open) return;
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entriesIO) => {
        // Pick the entry with the highest intersection ratio (most visible).
        let bestIdx = -1;
        let bestRatio = 0.6; // minimum threshold
        for (const e of entriesIO) {
          if (e.intersectionRatio > bestRatio) {
            const idx = Number((e.target as HTMLElement).dataset["feedIdx"]);
            if (!Number.isNaN(idx)) {
              bestIdx = idx;
              bestRatio = e.intersectionRatio;
            }
          }
        }
        if (bestIdx !== -1) setActiveIndex(bestIdx);
      },
      { root, threshold: [0.6, 0.75, 0.9, 1] }
    );
    root.querySelectorAll<HTMLElement>("[data-feed-idx]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [open, entries.length]);

  const handleShare = async (entry: ApiEntry) => {
    const url = `${window.location.origin}/dare/${entry.dareId}#entry-${entry.id}`;
    const shareData = {
      title: `DarePool — ${dareTitle}`,
      text: `Check out @${entry.username ?? "user"}'s submission on DarePool`,
      url,
    };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // user cancelled or blocked — fall through to copy
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Couldn't share — try copying the URL manually.");
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black"
        data-testid="entry-feed"
      >
        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
          <button
            onClick={onClose}
            className="pointer-events-auto p-2 rounded-full bg-black/40 backdrop-blur text-white hover:bg-black/60"
            aria-label="Close feed"
            data-testid="btn-close-feed"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="pointer-events-none text-center text-white text-sm font-semibold truncate max-w-[60%]">
            {dareTitle}
          </div>
          <button
            onClick={() => setMuted((m) => !m)}
            className="pointer-events-auto p-2 rounded-full bg-black/40 backdrop-blur text-white hover:bg-black/60"
            aria-label={muted ? "Unmute" : "Mute"}
            data-testid="btn-mute"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Vertical snap scroll */}
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-y-scroll snap-y snap-mandatory overscroll-contain"
          style={{ scrollbarWidth: "none" }}
          data-testid="feed-scroller"
        >
          {entries.map((entry, idx) => (
            <FeedItem
              key={entry.id}
              entry={entry}
              index={idx}
              isActive={idx === activeIndex}
              muted={muted}
              hasVoted={votedEntryId !== null}
              myVote={votedEntryId === entry.id}
              expired={expired}
              isLoggedIn={isLoggedIn}
              commentCount={commentCounts[entry.id] ?? 0}
              onVote={() => onVote(entry.id)}
              onComments={() => setCommentsOpenFor(entry.id)}
              onShare={() => handleShare(entry)}
              onReport={() => {
                if (!isLoggedIn) { onRequestLogin(); return; }
                setReportOpenFor(entry.id);
              }}
              onRequestLogin={onRequestLogin}
            />
          ))}
        </div>

        <CommentsSheet
          open={commentsOpenFor !== null}
          entryId={commentsOpenFor}
          onClose={() => {
            // refresh count for the closed entry
            if (commentsOpenFor !== null) {
              const id = commentsOpenFor;
              apiGetComments(id)
                .then((r) => setCommentCounts((prev) => ({ ...prev, [id]: r.comments.length })))
                .catch(() => {});
            }
            setCommentsOpenFor(null);
          }}
          onRequestLogin={onRequestLogin}
        />

        <ReportModal
          open={reportOpenFor !== null}
          entryId={reportOpenFor ?? undefined}
          onClose={() => { setReportOpenFor(null); onReportSubmitted?.(); }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Single feed item ────────────────────────────────────────────────────────

interface FeedItemProps {
  entry: ApiEntry;
  index: number;
  isActive: boolean;
  muted: boolean;
  hasVoted: boolean;
  myVote: boolean;
  expired: boolean;
  isLoggedIn: boolean;
  commentCount: number;
  onVote: () => void;
  onComments: () => void;
  onShare: () => void;
  onReport: () => void;
  onRequestLogin: () => void;
}

function FeedItem({
  entry,
  index,
  isActive,
  muted,
  hasVoted,
  myVote,
  expired,
  isLoggedIn,
  commentCount,
  onVote,
  onComments,
  onShare,
  onReport,
  onRequestLogin,
}: FeedItemProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const isUpload = entry.videoType === "upload";
  const isWinner = entry.status === "winner";

  // Auto play/pause based on active
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive && !paused) {
      v.play().catch(() => { /* autoplay may be blocked */ });
    } else {
      v.pause();
    }
  }, [isActive, paused]);

  // Apply muted prop
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const togglePause = () => {
    setPaused((p) => !p);
  };

  return (
    <section
      data-feed-idx={index}
      id={`entry-${entry.id}`}
      className="relative w-full h-[100dvh] snap-start snap-always bg-black flex items-center justify-center"
      data-testid={`feed-item-${entry.id}`}
    >
      {/* Media */}
      <div className="absolute inset-0 flex items-center justify-center" onClick={togglePause}>
        {isUpload ? (
          <video
            ref={videoRef}
            src={entry.videoUrl}
            className="w-full h-full object-contain bg-black"
            loop
            playsInline
            muted={muted}
            preload={isActive ? "auto" : "metadata"}
          />
        ) : (
          <LinkPreview url={entry.videoUrl} />
        )}

        {/* Pause overlay */}
        <AnimatePresence>
          {paused && isUpload && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-black/40 rounded-full p-5 backdrop-blur">
                <Play className="w-10 h-10 text-white" fill="white" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom gradient + meta */}
      <div className="absolute inset-x-0 bottom-0 z-10 pb-[max(env(safe-area-inset-bottom),1rem)] pt-20 px-4 pr-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/20">
            {(entry.username ?? "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">@{entry.username ?? "user"}</div>
            <div className="text-white/60 text-xs">{new Date(entry.createdAt).toLocaleDateString()}</div>
          </div>
          {isWinner && (
            <span className="ml-auto pointer-events-auto flex items-center gap-1 text-xs font-bold text-amber-300 px-2 py-1 rounded-full bg-amber-400/20 ring-1 ring-amber-400/40">
              <Crown className="w-3 h-3" /> Winner
            </span>
          )}
        </div>
        {!isUpload && (
          <a
            href={entry.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto inline-flex items-center gap-1.5 text-white/80 text-xs hover:text-white underline-offset-2 hover:underline"
          >
            <ExternalLink className="w-3 h-3" /> Open original
          </a>
        )}
      </div>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-[max(env(safe-area-inset-bottom),1rem)] z-20 pb-6 flex flex-col items-center gap-5">
        <ActionButton
          icon={<Heart className={cn("w-7 h-7", myVote && "fill-current")} />}
          label={String(entry.voteCount)}
          active={myVote}
          activeColor="text-rose-500"
          disabled={expired || (hasVoted && !myVote)}
          onClick={() => {
            if (!isLoggedIn) { onRequestLogin(); return; }
            if (expired || (hasVoted && !myVote)) {
              if (expired) toast.info("Voting is closed for this dare.");
              else toast.info("You already voted on another entry.");
              return;
            }
            onVote();
          }}
          testId={`feed-vote-${entry.id}`}
        />
        <ActionButton
          icon={<MessageCircle className="w-7 h-7" />}
          label={commentCount > 0 ? String(commentCount) : "Comment"}
          onClick={onComments}
          testId={`feed-comment-${entry.id}`}
        />
        <ActionButton
          icon={<Share2 className="w-7 h-7" />}
          label="Share"
          onClick={onShare}
          testId={`feed-share-${entry.id}`}
        />
        <ActionButton
          icon={<Flag className="w-6 h-6" />}
          label="Report"
          onClick={onReport}
          testId={`feed-report-${entry.id}`}
        />
        {isUpload && (
          <ActionButton
            icon={paused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
            label={paused ? "Play" : "Pause"}
            onClick={togglePause}
            testId={`feed-playpause-${entry.id}`}
          />
        )}
      </div>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ActionButton({
  icon, label, active, activeColor, onClick, disabled, testId,
}: {
  icon: React.ReactNode; label: string; active?: boolean; activeColor?: string;
  onClick: () => void; disabled?: boolean; testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center gap-1 transition-transform active:scale-90",
        disabled && "opacity-60"
      )}
      data-testid={testId}
    >
      <span className={cn(
        "w-12 h-12 rounded-full bg-black/35 backdrop-blur flex items-center justify-center text-white shadow-lg",
        active && (activeColor ?? "text-primary")
      )}>
        {icon}
      </span>
      <span className="text-white text-[11px] font-semibold drop-shadow tabular-nums">{label}</span>
    </button>
  );
}

function LinkPreview({ url }: { url: string }) {
  // Try to embed YouTube; otherwise show a simple link card.
  const yt = parseYouTube(url);
  if (yt) {
    return (
      <iframe
        title="YouTube video"
        src={`https://www.youtube.com/embed/${yt}?autoplay=0&playsinline=1&rel=0`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-0"
      />
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
        <ExternalLink className="w-7 h-7 text-primary" />
      </div>
      <p className="text-white/80 text-sm mb-2">External link submission</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary font-semibold underline break-all max-w-full"
      >
        {url}
      </a>
    </div>
  );
}

function parseYouTube(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] ?? null;
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
