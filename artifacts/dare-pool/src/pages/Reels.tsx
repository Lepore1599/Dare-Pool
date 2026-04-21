import { useEffect, useRef, useState, useCallback } from "react";
import { Heart, MessageCircle, Flag, ExternalLink, WifiOff, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { apiGetReels, type ApiReel } from "@/lib/api";
import { UserLink } from "@/components/UserLink";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ReportModal } from "@/components/ReportModal";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

export function Reels({ onRequestLogin }: { onRequestLogin: () => void }) {
  const { user } = useUser();
  const [reels, setReels] = useState<ApiReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [commentsEntryId, setCommentsEntryId] = useState<number | null>(null);
  const [reportEntryId, setReportEntryId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({});

  const load = useCallback(() => {
    setLoadError(false);
    setLoading(true);
    apiGetReels()
      .then((r) => setReels(r.reels))
      .catch((err) => {
        console.error("[Reels] Failed to load:", err);
        setLoadError(true);
        setReels([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-play / pause based on active index
  useEffect(() => {
    reels.forEach((reel, i) => {
      const video = videoRefs.current[i];
      if (!video) return;
      if (i === activeIndex) {
        video.play().catch(() => {});
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex, reels]);

  // Intersection observer to track which reel is visible
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    reels.forEach((_, i) => {
      const video = videoRefs.current[i];
      if (!video) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIndex(i); },
        { threshold: 0.6 }
      );
      obs.observe(video.parentElement!);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [reels]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground text-sm">Loading reels…</p>
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
          <h2 className="font-bold text-foreground text-lg mb-1">Unable to Load Reels</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Could not reach the server. Check your connection and try again.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <MessageCircle className="w-8 h-8 text-primary opacity-50" />
        </div>
        <h2 className="font-bold text-foreground text-lg">No Reels Yet</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Be the first to submit a dare video. Accepted entries show up here.
        </p>
      </div>
    );
  }

  return (
    <>
      <CommentsSheet
        open={commentsEntryId !== null}
        entryId={commentsEntryId}
        onClose={() => setCommentsEntryId(null)}
        onRequestLogin={onRequestLogin}
      />
      {reportEntryId !== null && (
        <ReportModal
          open
          dareId={reels.find((r) => r.id === reportEntryId)?.dareId ?? 0}
          entryId={reportEntryId}
          onClose={() => setReportEntryId(null)}
        />
      )}

      <div
        ref={containerRef}
        className="overflow-y-scroll snap-y snap-mandatory"
        style={{
          height: "calc(100dvh - 56px - 64px)", // subtract top nav + bottom nav
          scrollbarWidth: "none",
        }}
        data-testid="reels-feed"
      >
        {reels.map((reel, i) => (
          <ReelCard
            key={reel.id}
            reel={reel}
            isActive={i === activeIndex}
            videoRef={(el) => { videoRefs.current[i] = el; }}
            onComments={() => {
              if (!user) { onRequestLogin(); return; }
              setCommentsEntryId(reel.id);
            }}
            onReport={() => {
              if (!user) { onRequestLogin(); return; }
              setReportEntryId(reel.id);
            }}
          />
        ))}
      </div>
    </>
  );
}

interface ReelCardProps {
  reel: ApiReel;
  isActive: boolean;
  videoRef: (el: HTMLVideoElement | null) => void;
  onComments: () => void;
  onReport: () => void;
}

function ReelCard({ reel, isActive: _, videoRef, onComments, onReport }: ReelCardProps) {
  const [muted, setMuted] = useState(true);

  return (
    <div
      className="relative snap-start snap-always flex-shrink-0 bg-black"
      style={{ height: "calc(100dvh - 56px - 64px)" }}
      data-testid={`reel-${reel.id}`}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={muted}
        playsInline
        onClick={() => setMuted((m) => !m)}
      />

      {/* Dark gradient overlay (bottom heavy) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent pointer-events-none" />

      {/* Muted indicator */}
      {muted && (
        <div className="absolute top-4 right-4 bg-black/60 rounded-full px-2 py-1 text-[10px] text-white/70 backdrop-blur">
          🔇 Tap to unmute
        </div>
      )}

      {/* Right action buttons */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
        <ActionButton icon={Heart} label={String(reel.voteCount)} onClick={() => {}} />
        <ActionButton icon={MessageCircle} label="Comments" onClick={onComments} />
        <ActionButton icon={Flag} label="Report" onClick={onReport} small />
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-4 left-4 right-16 space-y-1.5">
        {/* Username */}
        <UserLink
          userId={reel.userId}
          username={reel.username}
          className="text-white font-bold text-sm drop-shadow-lg"
        />

        {/* Dare info chip */}
        <Link href={`/dare/${reel.dareId}`}>
          <div className="inline-flex items-center gap-1.5 bg-primary/80 backdrop-blur rounded-full px-2.5 py-1 text-[11px] text-white font-semibold max-w-full">
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{reel.dareTitle}</span>
          </div>
        </Link>

        {/* Prize if set */}
        {reel.darePrize > 0 && (
          <div className="text-[10px] text-amber-300 font-semibold">
            ${reel.darePrize} prize pool
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  small,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
    >
      <div className={cn(
        "rounded-full bg-black/40 backdrop-blur flex items-center justify-center border border-white/10 transition-all group-hover:bg-white/20",
        small ? "w-9 h-9" : "w-11 h-11"
      )}>
        <Icon className={cn("text-white", small ? "w-4 h-4" : "w-5 h-5")} />
      </div>
      {!small && <span className="text-white text-[10px] font-semibold drop-shadow">{label}</span>}
    </button>
  );
}
