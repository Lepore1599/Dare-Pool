import { useState, useEffect } from "react";
import { Trophy, Crown, Users, Flame, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { apiGetDares, apiGetEntries, type ApiDare, type ApiEntry } from "@/lib/api";
import { CountdownBadge } from "@/components/CountdownBadge";

export function Leaderboard() {
  const [endedDares, setEndedDares] = useState<ApiDare[]>([]);
  const [entriesMap, setEntriesMap] = useState<Record<number, ApiEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { dares } = await apiGetDares();
        const ended = dares.filter((d) => d.status === "expired").sort((a, b) =>
          new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()
        );
        setEndedDares(ended);
        const map: Record<number, ApiEntry[]> = {};
        await Promise.all(ended.map(async (dare) => {
          try {
            const { entries } = await apiGetEntries(dare.id);
            map[dare.id] = entries.sort((a, b) => b.voteCount - a.voteCount);
          } catch { map[dare.id] = []; }
        }));
        setEntriesMap(map);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const winnerMap: Record<number, { userId: number; username: string; wins: number; totalPrize: number }> = {};
  for (const dare of endedDares) {
    const winner = (entriesMap[dare.id] || []).find((e) => e.status === "winner");
    if (winner?.username && winner.userId) {
      winnerMap[winner.userId] ??= { userId: winner.userId, username: winner.username, wins: 0, totalPrize: 0 };
      winnerMap[winner.userId].wins += 1;
      winnerMap[winner.userId].totalPrize += dare.prizePool;
    }
  }
  const topWinners = Object.values(winnerMap).sort((a, b) => b.totalPrize - a.totalPrize);

  const rankColors = ["text-amber-400", "text-gray-300", "text-amber-700"];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <h1 className="text-2xl font-black text-foreground">Leaderboard</h1>
        </div>
        <p className="text-muted-foreground text-sm">Past dares and their champions.</p>
      </div>

      {topWinners.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Hall of Fame</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topWinners.slice(0, 3).map((w, i) => (
              <motion.div key={w.username} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-card-border rounded-2xl p-4 text-center">
                <Medal className={`w-6 h-6 mx-auto mb-2 ${rankColors[i] || "text-muted-foreground"}`} />
                <Link href={`/profile/${w.userId}`} className="font-black text-foreground text-sm hover:text-primary transition-colors">
                  @{w.username}
                </Link>
                <div className="text-amber-400 font-bold">${w.totalPrize}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{w.wins} {w.wins === 1 ? "win" : "wins"}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Past Dares</h2>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">
          <Flame className="w-8 h-8 mx-auto mb-3 opacity-30 animate-pulse" />
          <p className="text-sm">Loading…</p>
        </div>
      ) : endedDares.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-card-border rounded-2xl">
          <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No ended dares yet</p>
          <p className="text-sm mt-1">Dares appear here after their 48-hour timer expires.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {endedDares.map((dare, i) => {
            const subs = entriesMap[dare.id] || [];
            const winner = subs.find((e) => e.status === "winner");
            const totalVotes = subs.reduce((acc, e) => acc + e.voteCount, 0);
            return (
              <motion.div key={dare.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-card-border rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm line-clamp-2">{dare.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">by <Link href={`/profile/${dare.createdByUserId}`} className="hover:text-primary transition-colors">{dare.createdByUsername}</Link></p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-black text-amber-400">${dare.prizePool}</div>
                    <CountdownBadge expiresAt={new Date(dare.expiresAt).getTime()} />
                  </div>
                </div>
                {winner ? (
                  <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/25 rounded-xl p-2.5">
                    <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-amber-400">Winner: </span>
                      <Link href={`/profile/${winner.userId}`} className="text-sm font-semibold text-foreground hover:text-primary transition-colors">@{winner.username}</Link>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {winner.voteCount} votes
                    </span>
                  </div>
                ) : subs.length > 0 ? (
                  <div className="text-xs text-muted-foreground italic">No winner (tie or no votes)</div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">No entries were submitted.</div>
                )}
                {subs.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {subs.length} {subs.length === 1 ? "entry" : "entries"}</span>
                    <span>{totalVotes} total votes</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
