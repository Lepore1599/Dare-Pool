import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  ArrowLeft, Crown, Flame, Trophy, Users, Calendar, Pencil, X, Check,
  MessageCircle, Zap, Star, TrendingUp, Clock, ShieldAlert, Camera, Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  apiGetUser, apiUpdateProfile, apiUploadAvatar,
  type ApiUser, type ApiBadge, type ApiProfileEntry, type ApiWin, type ApiProfileComment,
} from "@/lib/api";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Avatar helpers ───────────────────────────────────────────────────────────

const GRADIENTS = [
  "from-violet-500 to-blue-500",
  "from-rose-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-yellow-500",
  "from-blue-500 to-cyan-500",
  "from-pink-500 to-fuchsia-500",
];

function avatarGradient(username: string) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function Avatar({
  user,
  size = "lg",
  preview,
}: {
  user: ApiUser;
  size?: "sm" | "md" | "lg";
  preview?: string | null;
}) {
  const sizeClass = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-lg", lg: "w-20 h-20 text-2xl" }[size];
  const initials = user.username.slice(0, 2).toUpperCase();
  const src = preview ?? user.avatarUrl;

  if (src) {
    return (
      <img
        src={src}
        alt={user.username}
        className={cn(sizeClass, "rounded-2xl object-cover ring-2 ring-white/10")}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        "rounded-2xl flex items-center justify-center font-black text-white bg-gradient-to-br ring-2 ring-white/10",
        avatarGradient(user.username)
      )}
    >
      {initials}
    </div>
  );
}

// ─── Username cooldown helpers ────────────────────────────────────────────────

function getUsernameCooldownInfo(lastUsernameChangeAt?: string | null): {
  canChange: boolean;
  nextAllowed: Date | null;
  daysLeft: number;
} {
  if (!lastUsernameChangeAt) return { canChange: true, nextAllowed: null, daysLeft: 0 };
  const last = new Date(lastUsernameChangeAt);
  const nextAllowed = new Date(last.getTime() + 30 * 24 * 60 * 60 * 1000);
  const daysLeft = Math.ceil((nextAllowed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { canChange: daysLeft <= 0, nextAllowed, daysLeft: Math.max(0, daysLeft) };
}

// ─── Profile component ────────────────────────────────────────────────────────

interface ProfileProps { id: string; }

type Tab = "entries" | "wins" | "comments";
type EntrySort = "newest" | "votes" | "winners";

export function Profile({ id }: ProfileProps) {
  const { user: me, refreshUser } = useUser();
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [entries, setEntries] = useState<ApiProfileEntry[]>([]);
  const [wins, setWins] = useState<ApiWin[]>([]);
  const [comments, setComments] = useState<ApiProfileComment[]>([]);
  const [badges, setBadges] = useState<ApiBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("entries");
  const [entrySort, setEntrySort] = useState<EntrySort>("newest");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editBio, setEditBio] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const numId = Number(id);
  const isSelf = me?.id === numId;

  const load = useCallback(async () => {
    try {
      const { user: u, entries: e, wins: w, comments: c, badges: b } = await apiGetUser(numId);
      setUser(u); setEntries(e); setWins(w); setComments(c); setBadges(b);
      setEditBio(u.bio ?? "");
      setEditUsername(u.username);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [numId]);

  useEffect(() => { load(); }, [load]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ALLOWED.includes(f.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }

    setAvatarFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let avatarUrl = user.avatarUrl;

      // Upload new avatar if selected
      if (avatarFile) {
        const { avatarUrl: uploaded } = await apiUploadAvatar(numId, avatarFile);
        avatarUrl = uploaded;
        toast.success("Profile picture updated!");
      }

      // Determine what text fields changed
      const updates: { bio?: string; username?: string; avatarUrl?: string } = {};
      if (editBio !== (user.bio ?? "")) updates.bio = editBio;
      if (editUsername !== user.username) updates.username = editUsername;
      if (avatarFile) updates.avatarUrl = avatarUrl ?? undefined;

      if (Object.keys(updates).length > 0) {
        await apiUpdateProfile(numId, updates);
        if (updates.username) toast.success("Username updated!");
        else if (updates.bio !== undefined) toast.success("Profile updated!");
      }

      // Refresh profile data and context if self
      await load();
      if (isSelf) await refreshUser();

      setEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!user) return;
    setEditing(false);
    setEditBio(user.bio ?? "");
    setEditUsername(user.username);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

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

  if (user.isBanned && !me?.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ShieldAlert className="w-10 h-10 text-destructive mx-auto mb-3 opacity-60" />
        <p className="font-semibold text-foreground">This account is restricted.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/")}>Go Home</Button>
      </div>
    );
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const lastActive = user.lastActiveAt
    ? new Date(user.lastActiveAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  const cooldown = getUsernameCooldownInfo(user.lastUsernameChangeAt);

  // Sorted entries
  const sortedEntries = [...entries].sort((a, b) => {
    if (entrySort === "votes") return b.voteCount - a.voteCount;
    if (entrySort === "winners") return (b.status === "winner" ? 1 : 0) - (a.status === "winner" ? 1 : 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  const filteredEntries = entrySort === "winners" ? sortedEntries.filter((e) => e.status === "winner") : sortedEntries;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {isSelf && !editing && (
          <button
            onClick={() => setLocation("/settings")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-xl hover:bg-white/5"
            title="Settings"
            data-testid="btn-settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Profile Header ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-card-border rounded-2xl p-5 mb-4">

        <div className="flex items-start gap-4">
          {/* Avatar with upload overlay in edit mode */}
          <div className="relative flex-shrink-0">
            <Avatar user={user} size="lg" preview={avatarPreview} />
            {editing && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-2xl bg-black/60 flex flex-col items-center justify-center gap-1 hover:bg-black/70 transition-colors"
                >
                  <Camera className="w-5 h-5 text-white" />
                  <span className="text-white text-[10px] font-bold leading-none">Change</span>
                </button>
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0 flex-1">
                {editing ? (
                  <div className="space-y-0.5">
                    <input
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      maxLength={24}
                      placeholder="Username"
                      className="w-full bg-secondary rounded-xl px-3 py-2 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {!cooldown.canChange && (
                      <p className="text-[11px] text-amber-400 leading-tight">
                        Username locked until{" "}
                        {cooldown.nextAllowed?.toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                    )}
                    {cooldown.canChange && editUsername !== user.username && (
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        You can only change your username once every 30 days.
                      </p>
                    )}
                  </div>
                ) : (
                  <h1 className="text-xl font-black text-foreground leading-none">@{user.username}</h1>
                )}

                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {user.isAdmin && (
                    <span className="inline-flex items-center text-xs font-semibold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/15">
                      Admin
                    </span>
                  )}
                  {user.isBanned && (
                    <span className="inline-flex items-center text-xs font-semibold text-destructive px-2 py-0.5 rounded-full bg-destructive/15">
                      Banned
                    </span>
                  )}
                  {isSelf && !editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-0.5 rounded-full hover:bg-primary/10"
                    >
                      <Pencil className="w-3 h-3" /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            <AnimatePresence mode="wait">
              {editing ? (
                <motion.div key="editing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="mt-3 space-y-2">
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={200}
                    placeholder="Tell everyone about yourself…"
                    className="w-full bg-secondary rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} disabled={saving}
                      className="flex items-center gap-1.5 text-xs font-bold bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 disabled:opacity-60">
                      <Check className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={handleCancelEdit} disabled={saving}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground px-3 py-1.5 rounded-lg hover:bg-secondary disabled:opacity-60">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {user.bio && (
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{user.bio}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {memberSince}
              </span>
              {lastActive && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Active {lastActive}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avatar upload hint when editing */}
        {editing && avatarFile && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <Check className="w-3 h-3" /> New photo ready to save: {avatarFile.name}
            </p>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  title={badge.description}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary border border-card-border hover:border-primary/40 transition-colors cursor-default"
                >
                  <span>{badge.emoji}</span>
                  <span className="text-foreground">{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Stats Grid ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {[
          { label: "Wins", value: user.wins, icon: Crown, color: "text-amber-400" },
          { label: "Entries", value: user.totalEntries, icon: Flame, color: "text-primary" },
          { label: "Prize Earned", value: `$${user.totalPrizeEarnings}`, icon: Trophy, color: "text-emerald-400" },
          { label: "Win Rate", value: `${user.winRate}%`, icon: TrendingUp, color: "text-blue-400" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.04 }}
            className="bg-card border border-card-border rounded-xl p-3 text-center">
            <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
            <div className={cn("text-xl font-black", color)}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {[
          { label: "Votes Cast", value: user.totalVotesCast, icon: Zap, color: "text-violet-400" },
          { label: "Comments", value: user.totalComments, icon: MessageCircle, color: "text-cyan-400" },
          { label: "Win Streak", value: user.currentWinStreak, icon: Star, color: "text-rose-400" },
          { label: "Best Streak", value: user.bestWinStreak, icon: Star, color: "text-orange-400" },
        ].map(({ label, value, icon: Icon, color }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.10 + i * 0.04 }}
            className="bg-card border border-card-border rounded-xl p-3 text-center">
            <Icon className={cn("w-4 h-4 mx-auto mb-1", color)} />
            <div className={cn("text-xl font-black", color)}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Best entry callout */}
      {user.maxVotesOnEntry > 0 && (
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/25 rounded-xl px-4 py-2.5 mb-5 text-sm">
          <Trophy className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="text-muted-foreground">Top entry earned</span>
          <span className="font-bold text-foreground">{user.maxVotesOnEntry} votes</span>
        </div>
      )}

      {/* Admin-only panel */}
      {me?.isAdmin && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-3 mb-5 text-xs">
          <p className="font-bold text-destructive mb-1 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" /> Admin View</p>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <span>Strikes: <span className="text-foreground font-semibold">{user.strikeCount ?? 0}</span></span>
            <span>Banned: <span className={user.isBanned ? "text-destructive font-semibold" : "text-foreground font-semibold"}>{user.isBanned ? "Yes" : "No"}</span></span>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 mb-4 bg-secondary p-1 rounded-xl">
        {([
          { id: "entries", label: `Entries (${entries.length})` },
          { id: "wins", label: `Wins (${wins.length})` },
          { id: "comments", label: `Comments (${comments.length})` },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 text-xs font-semibold py-2 px-2 rounded-lg transition-all",
              tab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Entries Tab ────────────────────────────────────────────────────── */}
      {tab === "entries" && (
        <div>
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {([
              { id: "newest", label: "Newest" },
              { id: "votes", label: "Most Voted" },
              { id: "winners", label: "Winners Only" },
            ] as const).map((s) => (
              <button key={s.id} onClick={() => setEntrySort(s.id)}
                className={cn(
                  "flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-all",
                  entrySort === s.id
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}>
                {s.label}
              </button>
            ))}
          </div>

          {filteredEntries.length === 0 ? (
            <EmptyState icon={Flame} title="No entries" subtitle={entrySort === "winners" ? "No wins yet." : "Nothing submitted yet."} />
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry, i) => (
                <motion.div key={entry.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <Link href={`/dare/${entry.dareId}`}>
                    <div className="bg-card border border-card-border rounded-xl p-3.5 hover:border-primary/40 transition-all cursor-pointer flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.status === "winner" && (
                            <span className="flex items-center gap-1 text-xs font-bold text-amber-400">
                              <Crown className="w-3 h-3" /> Winner
                            </span>
                          )}
                          <p className="font-semibold text-sm text-foreground line-clamp-1">{entry.dareTitle}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="font-bold text-foreground">{entry.voteCount}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Wins Tab ───────────────────────────────────────────────────────── */}
      {tab === "wins" && (
        <div>
          {wins.length === 0 ? (
            <EmptyState icon={Crown} title="No wins yet" subtitle="Enter dares and get votes to win!" />
          ) : (
            <div className="space-y-2">
              {wins.map((win, i) => (
                <motion.div key={win.entryId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <Link href={`/dare/${win.dareId}`}>
                    <div className="bg-amber-400/5 border border-amber-400/30 hover:border-amber-400/60 rounded-xl p-3.5 transition-all cursor-pointer">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <p className="font-bold text-sm text-foreground line-clamp-1">{win.dareTitle}</p>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{win.voteCount} votes</span>
                            <span>{new Date(win.completedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="text-amber-400 font-black text-base flex-shrink-0">${win.prizePool}</div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Comments Tab ───────────────────────────────────────────────────── */}
      {tab === "comments" && (
        <div>
          {comments.length === 0 ? (
            <EmptyState icon={MessageCircle} title="No comments yet" subtitle="Join the conversation under dare entries!" />
          ) : (
            <div className="space-y-2">
              {comments.map((c, i) => (
                <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <Link href={c.dareId ? `/dare/${c.dareId}` : "/"}>
                    <div className="bg-card border border-card-border rounded-xl p-3.5 hover:border-primary/40 transition-all cursor-pointer">
                      <div className="flex items-start gap-2 mb-1.5">
                        <MessageCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground line-clamp-1">on: {c.dareTitle}</p>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2 leading-relaxed">"{c.content}"</p>
                      <p className="text-xs text-muted-foreground mt-1.5">{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle: string;
}) {
  return (
    <div className="text-center py-12 text-muted-foreground bg-card border border-card-border rounded-2xl">
      <Icon className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p className="font-semibold text-foreground">{title}</p>
      <p className="text-sm mt-1">{subtitle}</p>
    </div>
  );
}
