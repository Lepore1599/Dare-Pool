import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Flame, Shield, Bell } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { apiGetNotifications } from "@/lib/api";

interface NavbarProps {
  onLoginClick: () => void;
}

export function Navbar({ onLoginClick: _ }: NavbarProps) {
  const { user } = useUser();
  const [location] = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    apiGetNotifications()
      .then(({ unreadCount: c }) => setUnreadCount(c))
      .catch(() => {});

    const interval = setInterval(() => {
      apiGetNotifications()
        .then(({ unreadCount: c }) => setUnreadCount(c))
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  if (location === "/reels") return null;

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center glow-primary-sm transition-all group-hover:scale-105">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-foreground">
            Dare<span className="text-primary">Pool</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {user && (
            <Link href="/notifications">
              <button
                className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Notifications"
                data-testid="nav-notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            </Link>
          )}
          {user?.isAdmin && (
            <Link href="/admin">
              <button
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-400 hover:bg-amber-400/10 transition-colors"
                data-testid="nav-admin"
                title="Admin Dashboard"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
