import { Link, useLocation } from "wouter";
import { Flame, Video, Wallet, User } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Flame, testId: "tab-home" },
  { href: "/reels", label: "Reels", icon: Video, testId: "tab-reels" },
  { href: "/wallet", label: "Wallet", icon: Wallet, testId: "tab-wallet" },
  { href: "/profile", label: "Profile", icon: User, testId: "tab-profile" },
];

export function BottomNav({ onLoginClick }: { onLoginClick: () => void }) {
  const [location] = useLocation();
  const { user } = useUser();

  const getTabHref = (tab: (typeof tabs)[0]) => {
    if (tab.href === "/profile") {
      return user ? `/profile/${user.id}` : null;
    }
    return tab.href;
  };

  const isActive = (tab: (typeof tabs)[0]) => {
    if (tab.href === "/profile") {
      return location.startsWith("/profile");
    }
    if (tab.href === "/") {
      return location === "/" || location.startsWith("/dare");
    }
    return location.startsWith(tab.href);
  };

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map((tab) => {
          const href = getTabHref(tab);
          const active = isActive(tab);
          const Icon = tab.icon;

          const content = (
            <div
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all select-none",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-7 h-7",
                active && "after:absolute after:inset-0 after:rounded-full after:bg-primary/15 after:blur-sm"
              )}>
                <Icon className={cn("w-5 h-5 relative z-10", active && "drop-shadow-[0_0_6px_hsl(var(--primary))]")} />
              </div>
              <span className={cn("text-[10px] font-semibold tracking-wide", active ? "text-primary" : "")}>
                {tab.label}
              </span>
            </div>
          );

          if (!href) {
            return (
              <button
                key={tab.href}
                onClick={onLoginClick}
                className="flex-1 flex justify-center"
                data-testid={tab.testId}
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={tab.href} href={href} className="flex-1 flex justify-center" data-testid={tab.testId}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
