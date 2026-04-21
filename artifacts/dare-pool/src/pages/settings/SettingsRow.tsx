import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsRowProps {
  icon?: LucideIcon;
  iconColor?: string;
  label: string;
  value?: string;
  onClick?: () => void;
  destructive?: boolean;
  rightEl?: React.ReactNode;
  noBorder?: boolean;
}

export function SettingsRow({
  icon: Icon,
  iconColor = "text-muted-foreground",
  label,
  value,
  onClick,
  destructive,
  rightEl,
  noBorder,
}: SettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        onClick && "hover:bg-white/5 active:bg-white/10",
        destructive ? "text-destructive" : "text-foreground",
        !noBorder && "border-b border-white/5 last:border-0",
      )}
    >
      {Icon && (
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary/80", iconColor.replace("text-", "bg-").replace("-400", "-400/15").replace("-500", "-500/15"))}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <span className={cn("text-sm font-medium leading-none", destructive && "text-destructive")}>{label}</span>
        {value && <p className="text-xs text-muted-foreground mt-0.5 truncate">{value}</p>}
      </div>
      {rightEl ?? (onClick && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />)}
    </button>
  );
}

interface SettingsSectionProps {
  title?: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <div>
      {title && (
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-4 mb-1 mt-1">{title}</p>
      )}
      <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

interface ToggleRowProps {
  icon?: LucideIcon;
  iconColor?: string;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  noBorder?: boolean;
}

export function ToggleRow({ icon: Icon, iconColor = "text-muted-foreground", label, description, value, onChange, noBorder }: ToggleRowProps) {
  return (
    <div
      className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/5 transition-colors", !noBorder && "border-b border-white/5 last:border-0")}
      onClick={() => onChange(!value)}
    >
      {Icon && (
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-secondary/80")}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div
        className={cn(
          "w-11 h-6 rounded-full flex items-center transition-colors flex-shrink-0",
          value ? "bg-primary" : "bg-secondary border border-white/10"
        )}
      >
        <div className={cn(
          "w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5",
          value ? "translate-x-5" : "translate-x-0"
        )} />
      </div>
    </div>
  );
}
