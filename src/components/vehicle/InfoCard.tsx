import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { parseISO, differenceInDays, differenceInMonths } from "date-fns";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type Accent = "primary" | "neutral";

export function InfoCard({
  title, icon, accent = "neutral", right, children, className,
}: {
  title: string;
  icon: ReactNode;
  accent?: Accent;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 transition-shadow hover:shadow-md",
        accent === "primary" ? "border-l-primary" : "border-l-muted-foreground/60",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              accent === "primary" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {icon}
          </span>
          <h3 className="truncate text-sm font-bold uppercase tracking-wider text-foreground/80">{title}</h3>
        </div>
        {right}
      </div>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

/** Registrační značka jako štítek */
export function PlateBadge({ rz }: { rz?: string | null }) {
  if (!rz) return null;
  return (
    <span className="shrink-0 rounded border-2 border-foreground/70 bg-background px-2.5 py-0.5 font-mono text-base font-bold tracking-tight text-foreground">
      {rz}
    </span>
  );
}

export function YesNoBadge({ value }: { value?: string | null }) {
  const yes = String(value || "").trim().toUpperCase() === "ANO";
  if (!value) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase",
        yes ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {yes ? "ANO" : "NE"}
    </span>
  );
}

export type DeadlineLevel = "expired" | "soon" | "ok" | "none";

export function deadlineLevel(value?: string | null): DeadlineLevel {
  if (!value) return "none";
  try {
    const d = parseISO(value);
    if (isNaN(d.getTime())) return "none";
    const days = differenceInDays(d, new Date());
    if (days < 0) return "expired";
    if (days <= 30) return "soon";
    return "ok";
  } catch {
    return "none";
  }
}

export function relativeDeadline(value?: string | null): string | null {
  const lvl = deadlineLevel(value);
  if (lvl === "none") return null;
  const d = parseISO(value!);
  const days = differenceInDays(d, new Date());
  if (days < 0) return `před ${Math.abs(days)} dny`;
  if (days === 0) return "dnes";
  if (days < 31) return `za ${days} dní`;
  const months = Math.max(1, differenceInMonths(d, new Date()));
  return `za ${months} měs.`;
}

/** Zvýrazněný blok pro kritický termín (STK, zelená karta…) */
export function DeadlineAlert({
  label, dateText, level,
}: { label: string; dateText: string; level: Exclude<DeadlineLevel, "ok" | "none"> }) {
  const expired = level === "expired";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border p-3",
        expired ? "border-destructive/30 bg-destructive/10" : "border-warning/30 bg-warning/10",
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-xs font-bold uppercase", expired ? "text-destructive" : "text-warning")}>{label}</p>
        <p className={cn("text-sm font-bold", expired ? "text-destructive" : "text-warning")}>{dateText}</p>
      </div>
      <span
        className={cn(
          "flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white",
          expired ? "bg-destructive" : "bg-warning",
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        {expired ? "Prošlé" : "Končí brzy"}
      </span>
    </div>
  );
}

export function MiniProgress({
  label, valueText, percent, tone = "primary",
}: { label: string; valueText: string; percent: number; tone?: "primary" | "muted" }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{valueText}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", tone === "primary" ? "bg-primary" : "bg-muted-foreground")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export const OkIcon = CheckCircle2;