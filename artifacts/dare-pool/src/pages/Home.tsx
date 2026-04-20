import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Flame, Trophy, Plus, Users, ChevronRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDares, type Dare, isExpired, seedIfEmpty } from "@/lib/store";
import { CountdownBadge } from "@/components/CountdownBadge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/UserContext";

interface HomeProps {
  onLoginClick: () => void;
}

export function Home({ onLoginClick }: HomeProps) {
  const { username } = useUser();
  const [dares, setDares] = useState<Dare[]>([]);
  const [filter, setFilter] = useState<"active" | "ended">("active");

  const load = useCallback(() => {
    seedIfEmpty();
    setDares(getDares());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = dares.filter((d) => !isExpired(d));
  const ended = dares.filter((d) => isExpired(d));
  const displayed = filter === "active" ? active : ended;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 rounded-full px-3 py-1 mb-4">
          <Zap className="w-3 h-3 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">Live Dares</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
          Dare. Compete. <span className="text-primary">Win.</span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Post a dare, submit your proof, let the community decide.
        </p>
        <div className="flex items-center justify-center gap-3 mt-5">
          <Link href="/create">
            <Button
              className="gap-2 bg-primary hover:bg-primary/90 text-white font-bold glow-primary-sm"
              data-testid="btn-create-dare-hero"
            >
              <Plus className="w-4 h-4" />
              Create a Dare
            </Button>
          </Link>
          {!username && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={onLoginClick}
              data-testid="btn-join-hero"
            >
              Join to Vote
            </Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Active Dares", value: active.length, icon: Flame, color: "text-primary" },
          { label: "Ended", value: ended.length, icon: Trophy, color: "text-amber-400" },
          {
            label: "Total Pool",
            value: `$${dares.reduce((acc, d) => acc + d.prizePool, 0)}`,
            icon: Zap,
            color: "text-emerald-400",
          },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-card border border-card-border rounded-xl p-3 text-center"
          >
            <Icon className={`w-4 h-4 mx-auto mb-1 ${color}`} />
            <div className={`text-lg font-black ${color}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        {(["active", "ended"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filter === f
                ? "bg-primary text-white glow-primary-sm"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`filter-${f}`}
          >
            {f === "active" ? `Active (${active.length})` : `Ended (${ended.length})`}
          </button>
        ))}
      </div>

      {/* Dare cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={filter}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {displayed.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Flame className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No {filter} dares yet</p>
              {filter === "active" && (
                <p className="text-sm mt-1">
                  Be the first —{" "}
                  <Link href="/create" className="text-primary hover:underline">
                    create one
                  </Link>
                </p>
              )}
            </div>
          ) : (
            displayed.map((dare, i) => (
              <DareCard key={dare.id} dare={dare} index={i} />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DareCard({ dare, index }: { dare: Dare; index: number }) {
  const expired = isExpired(dare);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
    >
      <Link href={`/dare/${dare.id}`}>
        <div
          className="group bg-card border border-card-border rounded-2xl p-4 hover:border-primary/40 transition-all hover:shadow-lg cursor-pointer"
          data-testid={`dare-card-${dare.id}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {expired ? (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    Ended
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                    Live
                  </span>
                )}
                <span className="text-xs text-muted-foreground">by {dare.createdBy}</span>
              </div>
              <h2 className="font-bold text-foreground text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {dare.title}
              </h2>
            </div>

            {/* Prize */}
            <div className="flex-shrink-0 text-right">
              <div className="text-lg font-black text-amber-400 glow-gold leading-none">
                ${dare.prizePool}
              </div>
              <div className="text-xs text-muted-foreground">prize</div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <CountdownBadge expiresAt={dare.expiresAt} />
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {dare.submissionCount} {dare.submissionCount === 1 ? "entry" : "entries"}
              </span>
            </div>
            <span className="text-xs text-primary font-semibold flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
              View <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
