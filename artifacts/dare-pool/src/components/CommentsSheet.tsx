import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageCircle } from "lucide-react";
import { apiGetComments, apiAddComment, type ApiComment } from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CommentsSheetProps {
  open: boolean;
  entryId: number | null;
  onClose: () => void;
  onRequestLogin: () => void;
}

export function CommentsSheet({ open, entryId, onClose, onRequestLogin }: CommentsSheetProps) {
  const { user } = useUser();
  const [comments, setComments] = useState<ApiComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || entryId === null) return;
    let cancelled = false;
    const requestedEntryId = entryId;
    setComments([]);
    setLoading(true);
    apiGetComments(requestedEntryId)
      .then((r) => { if (!cancelled) setComments(r.comments); })
      .catch(() => { if (!cancelled) setComments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, entryId]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePost = async () => {
    if (!user) { onRequestLogin(); return; }
    if (entryId === null) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    setPosting(true);
    try {
      const { comment } = await apiAddComment(entryId, trimmed);
      setComments((prev) => [comment, ...prev]);
      setContent("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
            data-testid="comments-backdrop"
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-background border-t border-border rounded-t-3xl flex flex-col max-h-[80vh] shadow-2xl"
            data-testid="comments-sheet"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" />
                Comments {comments.length > 0 && <span className="text-muted-foreground">({comments.length})</span>}
              </h3>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground" data-testid="btn-close-comments">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px]">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Be the first to comment.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="flex gap-3" data-testid={`comment-${c.id}`}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {(c.username ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-foreground">@{c.username ?? "user"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 break-words leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border p-3 flex gap-2 bg-card">
              <input
                ref={inputRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
                onFocus={() => { if (!user) { inputRef.current?.blur(); onRequestLogin(); } }}
                placeholder={user ? "Add a comment…" : "Log in to comment"}
                maxLength={500}
                className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                data-testid="input-comment"
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
                data-testid="btn-post-comment"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
