import { Clock } from "lucide-react";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

interface CountdownBadgeProps {
  expiresAt: number;
  className?: string;
  large?: boolean;
}

export function CountdownBadge({ expiresAt, className, large }: CountdownBadgeProps) {
  const { expired, formatted, remaining } = useCountdown(expiresAt);

  const urgentColor =
    expired
      ? "text-muted-foreground"
      : remaining < 3600 * 1000
      ? "text-red-400"
      : remaining < 12 * 3600 * 1000
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono font-semibold",
        large ? "text-base" : "text-xs",
        urgentColor,
        className
      )}
      data-testid="countdown-badge"
    >
      <Clock className={large ? "w-4 h-4" : "w-3 h-3"} />
      {formatted}
    </span>
  );
}
