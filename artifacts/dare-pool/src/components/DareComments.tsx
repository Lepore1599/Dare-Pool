import { useEffect, useState, useRef } from "react";
import { MessageCircle, Send, Flag } from "lucide-react";
import {
  apiGetDareComments,
  apiAddDareComment,
  apiReportComment,
  type ApiDareComment,
} from "@/lib/api";
import { UserLink } from "./UserLink";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate_speech", label: "Hate speech" },
  { value: "offensive", label: "Offensive content" },
  { value: "spam", label: "Spam" },
  { value: "sexual", label: "Sexual content" },
  { value: "other", label: "Other" },
];

interface DareCommentsProps {
  dareId: number;
  onRequestLogin: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function DareComments({ dareId, onRequestLogin }: DareCommentsProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<ApiDareComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiGetDareComments(dareId)
      .then((r) => { if (!cancelled) setComments(r.comments); })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dareId]);

  const handlePost = async () => {
    if (!user) { onRequestLogin(); return; }
    const trimmed = content.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      const { comment } = await apiAddDareComment(dareId, trimmed);
      setComments((prev) => [comment, ...prev]);
      setContent("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  const handleReport = async (commentId: number, reason: string) => {
    if (!user) { onRequestLogin(); return; }
    try {
      await apiReportComment(commentId, "dare", dareId, reason);
      toast.success("Comment reported. Thank you.");
      setReportingId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to report.");
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card overflow-hidden" data-testid="dare-comments">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
        data-testid="dare-comments-toggle"
      >
        <div className="flex items-center gap-2 font-semibold text-foreground text-sm">
          <MessageCircle className="w-4 h-4 text-primary" />
          Discussion
          {!loading && comments.length > 0 && (
            <span className="text-muted-foreground font-normal">({comments.length})</span>
          )}
        </div>
        <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <>
          {/* Comments list */}
          <div className="px-4 pb-3 max-h-[400px] overflow-y-auto space-y-4 border-t border-border pt-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <MessageCircle className="w-7 h-7 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Start the discussion!</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="group flex gap-3" data-testid={`dare-comment-${c.id}`}>
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 overflow-hidden">
                    {c.avatarUrl ? (
                      <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (c.username ?? "?").slice(0, 1).toUpperCase()
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                      <UserLink userId={c.userId} username={c.username} className="font-semibold text-sm text-foreground" />
                      <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                      {/* Report button */}
                      {user && user.userId !== c.userId && (
                        <button
                          onClick={() => setReportingId(reportingId === c.id ? null : c.id)}
                          className="ml-auto opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all p-1 rounded"
                          title="Report comment"
                          data-testid={`btn-report-comment-${c.id}`}
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 break-words leading-relaxed">{c.content}</p>

                    {/* Report picker */}
                    {reportingId === c.id && (
                      <div className="mt-2 p-2 bg-secondary rounded-xl flex flex-wrap gap-1.5" data-testid={`report-picker-${c.id}`}>
                        <p className="w-full text-xs text-muted-foreground font-medium mb-0.5">Why are you reporting this?</p>
                        {REPORT_REASONS.map((r) => (
                          <button
                            key={r.value}
                            onClick={() => handleReport(c.id, r.value)}
                            className="text-xs px-2.5 py-1 rounded-full bg-card border border-border hover:bg-destructive/10 hover:border-destructive hover:text-destructive transition-colors"
                          >
                            {r.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setReportingId(null)}
                          className="text-xs px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground hover:bg-secondary transition-colors ml-auto"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border px-4 py-3 flex gap-2 bg-card/50">
            <input
              ref={inputRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
              onFocus={() => { if (!user) { inputRef.current?.blur(); onRequestLogin(); } }}
              placeholder={user ? "Share your thoughts…" : "Log in to comment"}
              maxLength={500}
              className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="input-dare-comment"
            />
            <button
              onClick={handlePost}
              disabled={posting || !content.trim()}
              className={cn(
                "p-2 rounded-full transition-all flex items-center justify-center",
                content.trim() && !posting
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
              data-testid="btn-post-dare-comment"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}
