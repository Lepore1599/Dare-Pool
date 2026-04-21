import { Link, useLocation } from "wouter";
import { Flame, Shield } from "lucide-react";
import { useUser } from "@/context/UserContext";

interface NavbarProps {
  onLoginClick: () => void;
}

export function Navbar({ onLoginClick: _ }: NavbarProps) {
  const { user } = useUser();
  const [location] = useLocation();

  // On reels, hide the top bar so the full-height feed isn't obstructed
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

        {/* Right side — admin shortcut only (other nav items live in BottomNav) */}
        <div className="flex items-center gap-1">
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
