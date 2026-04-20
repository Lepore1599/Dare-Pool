import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface UserLinkProps {
  userId: number;
  username: string | null;
  className?: string;
  prefix?: boolean;
}

export function UserLink({ userId, username, className, prefix = true }: UserLinkProps) {
  return (
    <Link
      href={`/profile/${userId}`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "hover:text-primary hover:underline underline-offset-2 transition-colors",
        className
      )}
    >
      {prefix ? `@${username ?? "user"}` : (username ?? "user")}
    </Link>
  );
}
