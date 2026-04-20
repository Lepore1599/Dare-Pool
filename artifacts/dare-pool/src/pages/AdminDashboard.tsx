import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Shield, Flag, Users, Flame, CheckCircle, XCircle, UserX, Star, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  apiAdminOverview, apiAdminRemoveDare, apiAdminBanUser, apiAdminUnbanUser,
  apiAdminDismissReport, apiAdminActionReport, apiAdminFeatureDare,
  type ApiDare, type ApiReport, type ApiUser,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "reports" | "dares" | "users";

export function AdminDashboard() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<Tab>("reports");
  const [dares, setDares] = useState<ApiDare[]>([]);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isAdmin) { setLocation("/"); return; }
    load();
  }, [user]);

  const load = async () => {
    try {
      const { dares: d, reports: r, users: u } = await apiAdminOverview();
      setDares(d); setReports(r); setUsers(u);
    } catch { toast.error("Failed to load admin data."); }
    finally { setLoading(false); }
  };

  const withRefresh = async (fn: () => Promise<unknown>, successMsg: string) => {
    try { await fn(); toast.success(successMsg); await load(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Action failed."); }
  };

  const pendingReports = reports.filter((r) => r.status === "pending");
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "reports", label: "Reports", count: pendingReports.length },
    { id: "dares", label: "Dares", count: dares.length },
    { id: "users", label: "Users", count: users.length },
  ];

  if (!user?.isAdmin) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">Moderate content, manage users, and review reports.</p>
      </div>

      {/* Stat summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Pending Reports", value: pendingReports.length, icon: Flag, color: "text-destructive" },
          { label: "Active Dares", value: dares.filter((d) => d.status === "active").length, icon: Flame, color: "text-primary" },
          { label: "Total Users", value: users.length, icon: Users, color: "text-emerald-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-card-border rounded-xl p-3 text-center">
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className={`text-xl font-black ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1 mb-5">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}>
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded-full font-bold",
                t.id === "reports" && tab !== "reports" ? "bg-destructive text-white" : "bg-muted text-muted-foreground"
              )}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        </div>
      ) : (
        <div className="space-y-3">
          {tab === "reports" && (
            pendingReports.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-card border border-card-border rounded-2xl">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-70" />
                <p className="font-medium">No pending reports</p>
              </div>
            ) : pendingReports.map((report, i) => (
              <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card border border-card-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-destructive" />
                      <span className="font-semibold text-sm text-foreground capitalize">{report.reason.replace("_", " ")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {report.dareId ? `Dare #${report.dareId}` : `Entry #${report.entryId}`}
                      {" · "}{new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-semibold">pending</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5"
                    onClick={() => withRefresh(() => apiAdminDismissReport(report.id), "Report dismissed.")}>
                    <XCircle className="w-3.5 h-3.5" /> Dismiss
                  </Button>
                  <Button size="sm" className="flex-1 gap-1.5 bg-destructive hover:bg-destructive/90 text-white"
                    onClick={() => withRefresh(() => apiAdminActionReport(report.id, "Admin action"), "Action taken.")}>
                    <CheckCircle className="w-3.5 h-3.5" /> Take Action
                  </Button>
                </div>
              </motion.div>
            ))
          )}

          {tab === "dares" && dares.map((dare, i) => (
            <motion.div key={dare.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-card-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground line-clamp-1">{dare.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {dare.createdByUsername} · {dare.entryCount} entries
                    {dare.reportCount > 0 && <span className="text-destructive"> · {dare.reportCount} reports</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-semibold",
                    dare.status === "active" ? "bg-primary/20 text-primary" :
                    dare.status === "removed" ? "bg-destructive/20 text-destructive" :
                    "bg-muted text-muted-foreground"
                  )}>{dare.status}</span>
                  {dare.isFeatured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="gap-1"
                  onClick={() => withRefresh(() => apiAdminFeatureDare(dare.id), dare.isFeatured ? "Unfeatured." : "Featured!")}>
                  <Star className="w-3 h-3" /> {dare.isFeatured ? "Unfeature" : "Feature"}
                </Button>
                {dare.status !== "removed" && (
                  <Button size="sm" variant="outline" className="gap-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => withRefresh(() => apiAdminRemoveDare(dare.id, "Admin removed"), "Dare removed.")}>
                    <Trash2 className="w-3 h-3" /> Remove
                  </Button>
                )}
              </div>
            </motion.div>
          ))}

          {tab === "users" && users.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-card border border-card-border rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{u.username}</span>
                    {u.isAdmin && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-semibold">admin</span>}
                    {u.isBanned && <span className="text-xs px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-semibold">banned</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {u.wins} wins · {u.totalEntries} entries · Strikes: {u.strikeCount ?? 0}
                  </p>
                </div>
                {!u.isAdmin && (
                  <Button size="sm" variant="outline"
                    className={u.isBanned ? "gap-1 text-emerald-400 border-emerald-400/30 hover:bg-emerald-400/10" :
                      "gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"}
                    onClick={() => withRefresh(
                      () => u.isBanned ? apiAdminUnbanUser(u.id) : apiAdminBanUser(u.id, "Admin ban"),
                      u.isBanned ? "User unbanned." : "User banned."
                    )}>
                    <UserX className="w-3 h-3" /> {u.isBanned ? "Unban" : "Ban"}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
