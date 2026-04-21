import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Bell, ArrowRight, Trophy, Wallet, Info, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  apiGetNotifications, apiMarkNotificationRead, apiMarkAllNotificationsRead,
  type ApiNotification,
} from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

function NotifIcon({ type }: { type: string }) {
  if (type === "dare_won") return <Trophy className="w-5 h-5 text-amber-400" />;
  if (type === "dare_completed") return <Wallet className="w-5 h-5 text-emerald-400" />;
  if (type === "dare_transferred") return <ArrowRight className="w-5 h-5 text-blue-400" />;
  return <Info className="w-5 h-5 text-muted-foreground" />;
}

function NotifBg({ type }: { type: string }) {
  if (type === "dare_won") return "bg-amber-400/10 border-amber-400/20";
  if (type === "dare_completed") return "bg-emerald-400/10 border-emerald-400/20";
  if (type === "dare_transferred") return "bg-blue-500/10 border-blue-500/20";
  return "bg-card border-card-border";
}

export function Notifications() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const { notifications: n } = await apiGetNotifications();
      setNotifications(n);
    } catch {
      toast.error("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); else setLoading(false); }, [user]);

  const markRead = async (id: number) => {
    await apiMarkNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  };

  const markAllRead = async () => {
    await apiMarkAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success("All notifications marked as read.");
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Log in to see your notifications.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
            <Check className="w-3.5 h-3.5" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-card-border rounded-2xl">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">You'll hear here when dares complete or pools transfer.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={cn(
                "relative border rounded-xl p-4 transition-opacity",
                NotifBg({ type: n.type }),
                n.isRead && "opacity-60"
              )}
            >
              {!n.isRead && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
              )}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-background/60 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <NotifIcon type={n.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                    {n.relatedTargetDareId && (
                      <Link href={`/dare/${n.relatedTargetDareId}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        View dare <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    {!n.relatedTargetDareId && n.relatedDareId && (
                      <Link href={`/dare/${n.relatedDareId}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1">
                        View dare <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    {!n.isRead && (
                      <button onClick={() => markRead(n.id)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
