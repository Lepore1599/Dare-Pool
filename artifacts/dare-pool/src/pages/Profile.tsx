import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Trophy, Flame, Users, Crown, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { apiGetUser, type ApiUser, type ApiDare, type ApiEntry } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface ProfileProps { id: string; }

export function Profile({ id }: ProfileProps) {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [dares, setDares] = useState<ApiDare[]>([]);
  const [entries, setEntries] = useState<ApiEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { user: u, dares: d, entries: e } = await apiGetUser(Number(id));
        setUser(u); setDares(d); setEntries(e);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/")}>Go Home</Button>
      </div>
    );
  }

  const initials = user.username.slice(0, 2).toUpperCase();
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => setLocation("/")}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mb-5 text-sm">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-card-border rounded-2xl p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-2xl font-black text-primary">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-foreground">{user.username}</h1>
            {user.isAdmin && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/20 mt-1">
                Admin
              </span>
            )}
            {user.isBanned && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive px-2 py-0.5 rounded-full bg-destructive/20 mt-1 ml-2">
                Banned
              </span>
            )}
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" /> Member since {memberSince}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Wins", value: user.wins, icon: Crown, color: "text-amber-400" },
            { label: "Entries", value: user.totalEntries, icon: Flame, color: "text-primary" },
            { label: "Votes Cast", value: user.totalVotesCast, icon: Trophy, color: "text-emerald-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-secondary rounded-xl p-3 text-center">
              <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
              <div className={`text-xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Dares created */}
      {dares.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Flame className="w-3.5 h-3.5" /> Dares Posted
          </h2>
          <div className="space-y-2">
            {dares.map((dare) => (
              <Link key={dare.id} href={`/dare/${dare.id}`}>
                <div className="bg-card border border-card-border rounded-xl p-3 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground line-clamp-1">{dare.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{dare.entryCount} entries</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-black text-amber-400">${dare.prizePool}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      dare.status === "active" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{dare.status === "active" ? "Live" : "Ended"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Entries */}
      {entries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Entries Submitted
          </h2>
          <div className="space-y-2">
            {entries.map((entry) => (
              <Link key={entry.id} href={`/dare/${entry.dareId}`}>
                <div className="bg-card border border-card-border rounded-xl p-3 hover:border-primary/40 transition-all cursor-pointer flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {entry.status === "winner" && (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Crown className="w-3 h-3" /> Winner
                      </span>
                    )}
                    <span className="text-sm font-medium text-foreground">Dare #{entry.dareId}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Trophy className="w-3.5 h-3.5" /> {entry.voteCount} votes
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {dares.length === 0 && entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Flame className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No activity yet</p>
          <p className="text-sm mt-1">Post a dare or submit an entry to get started.</p>
        </div>
      )}
    </div>
  );
}
