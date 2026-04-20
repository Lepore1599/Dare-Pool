import { Link, useLocation } from "wouter";
import { Flame, Trophy, Plus, User, LogOut, Shield } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onLoginClick: () => void;
}

export function Navbar({ onLoginClick }: NavbarProps) {
  const { user, logout } = useUser();
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dares", icon: Flame },
    { href: "/leaderboard", label: "Leaders", icon: Trophy },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center glow-primary-sm transition-all group-hover:scale-105">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-foreground">
            Dare<span className="text-primary">Pool</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <button className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                location === href ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )} data-testid={`nav-${label.toLowerCase()}`}>
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            </Link>
          ))}

          <Link href="/create">
            <Button size="sm" className="ml-1 gap-1.5 bg-primary hover:bg-primary/90 text-white glow-primary-sm" data-testid="nav-create-dare">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Dare</span>
            </Button>
          </Link>

          {user ? (
            <div className="flex items-center gap-1 ml-1">
              <Link href={`/profile/${user.id}`}>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary cursor-pointer hover:bg-accent transition-colors">
                  {user.isAdmin ? <Shield className="w-3 h-3 text-amber-400" /> : <User className="w-3 h-3 text-primary" />}
                  <span className="text-xs font-semibold text-foreground max-w-[80px] truncate" data-testid="nav-username">
                    {user.username}
                  </span>
                </div>
              </Link>
              {user.isAdmin && (
                <Link href="/admin">
                  <button className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors" title="Admin Dashboard">
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                </Link>
              )}
              <button onClick={logout}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Logout" data-testid="btn-logout">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="ml-1 gap-1" onClick={onLoginClick} data-testid="btn-login">
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Login</span>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
