import { useState, useEffect } from "react";
import { Trophy, Crown, Users, Flame, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { getDares, getAllSubmissions, isExpired, type Dare, type Submission } from "@/lib/store";
import { CountdownBadge } from "@/components/CountdownBadge";

export function Leaderboard() {
  const [endedDares, setEndedDares] = useState<Dare[]>([]);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, Submission[]>>({});

  useEffect(() => {
    const dares = getDares().filter(isExpired);
    dares.sort((a, b) => b.expiresAt - a.expiresAt);
    setEndedDares(dares);

    const allSubs = getAllSubmissions();
    const map: Record<string, Submission[]> = {};
    for (const dare of dares) {
      map[dare.id] = allSubs.filter((s) => s.dareId === dare.id).sort((a, b) => b.votes - a.votes);
    }
    setSubmissionsMap(map);
  }, []);

  const topWinners: Array<{ username: string; wins: number; totalPrize: number }> = [];
  const winnerMap: Record<string, { wins: number; totalPrize: number }> = {};

  for (const dare of endedDares) {
    const subs = submissionsMap[dare.id] || [];
    const winner = subs.find((s) => s.isWinner);
    if (winner) {
      if (!winnerMap[winner.username]) {
        winnerMap[winner.username] = { wins: 0, totalPrize: 0 };
      }
      winnerMap[winner.username].wins += 1;
      winnerMap[winner.username].totalPrize += dare.prizePool;
    }
  }

  for (const [username, data] of Object.entries(winnerMap)) {
    topWinners.push({ username, ...data });
  }
  topWinners.sort((a, b) => b.totalPrize - a.totalPrize);

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

      {/* Top winners */}
      {topWinners.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Hall of Fame
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {topWinners.slice(0, 3).map((w, i) => (
              <motion.div
                key={w.username}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-card border border-card-border rounded-2xl p-4 text-center"
                data-testid={`winner-card-${i}`}
              >
                <Medal className={`w-6 h-6 mx-auto mb-2 ${rankColors[i] || "text-muted-foreground"}`} />
                <div className="font-black text-foreground text-sm">{w.username}</div>
                <div className="text-amber-400 font-bold">${w.totalPrize}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {w.wins} {w.wins === 1 ? "win" : "wins"}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Past dares */}
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Past Dares
      </h2>

      {endedDares.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-card-border rounded-2xl">
          <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No ended dares yet</p>
          <p className="text-sm mt-1">Dares appear here after their 48-hour timer expires.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {endedDares.map((dare, i) => {
            const subs = submissionsMap[dare.id] || [];
            const winner = subs.find((s) => s.isWinner);
            const totalVotes = subs.reduce((acc, s) => acc + s.votes, 0);

            return (
              <motion.div
                key={dare.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border border-card-border rounded-2xl p-4"
                data-testid={`leaderboard-dare-${dare.id}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm line-clamp-2">{dare.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">by {dare.createdBy}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-black text-amber-400">${dare.prizePool}</div>
                    <CountdownBadge expiresAt={dare.expiresAt} />
                  </div>
                </div>

                {winner ? (
                  <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/25 rounded-xl p-2.5">
                    <Crown className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-amber-400">Winner: </span>
                      <span className="text-sm font-semibold text-foreground">{winner.username}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                      <Users className="w-3 h-3" /> {winner.votes} votes
                    </span>
                  </div>
                ) : subs.length > 0 ? (
                  <div className="text-xs text-muted-foreground italic">
                    No winner determined (tie or no votes)
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    No entries were submitted.
                  </div>
                )}

                {subs.length > 0 && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {subs.length} {subs.length === 1 ? "entry" : "entries"}
                    </span>
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
