import { useState, useEffect } from "react";
import { ArrowLeft, UserX, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { apiGetBlockedUsers, apiUnblockUser, type ApiBlockedUser } from "@/lib/api";
import { toast } from "sonner";

export function BlockedUsers() {
  const [, navigate] = useLocation();
  const [blocked, setBlocked] = useState<ApiBlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<number | null>(null);

  useEffect(() => {
    apiGetBlockedUsers()
      .then(({ blocked: b }) => setBlocked(b))
      .catch(() => toast.error("Failed to load blocked users."))
      .finally(() => setLoading(false));
  }, []);

  const handleUnblock = async (blockId: number, username: string | null) => {
    setUnblocking(blockId);
    try {
      await apiUnblockUser(blockId);
      setBlocked((prev) => prev.filter((b) => b.id !== blockId));
      toast.success(`Unblocked @${username ?? "user"}`);
    } catch {
      toast.error("Failed to unblock.");
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/settings")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-black">Blocked Users</h1>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        </div>
      ) : blocked.length === 0 ? (
        <div className="text-center py-16 bg-card border border-card-border rounded-2xl">
          <UserX className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-foreground text-sm">No blocked users</p>
          <p className="text-xs text-muted-foreground mt-1">Users you block will appear here</p>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
          <AnimatePresence initial={false}>
            {blocked.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary/80 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-muted-foreground">
                    {(b.blockedUsername ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">@{b.blockedUsername ?? `user_${b.blockedUserId}`}</p>
                  <p className="text-xs text-muted-foreground">
                    Blocked {new Date(b.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs border-destructive/40 text-destructive hover:bg-destructive/10 flex-shrink-0"
                  onClick={() => handleUnblock(b.id, b.blockedUsername)}
                  disabled={unblocking === b.id}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  {unblocking === b.id ? "…" : "Unblock"}
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-6 px-4">
        Blocking a user prevents them from interacting with your content.
      </p>
    </div>
  );
}
