import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import type { MonitoringFocus } from "@/components/dashboard/FleetHealthSummary";

export interface DeadlineItem {
  id: string;
  label: string;
  tag?: string;
  days: number | null;
  badge: string;
  overdue?: boolean;
  // Full duration of the term (start -> end) in days, when known.
  // Kept for reference; the bar no longer uses it (it shows urgency instead).
  totalDays?: number | null;
  // Days before the deadline when the item becomes critical (default 30).
  criticalDays?: number;
  // Look-ahead window in days: the bar fills from 0 % (entering the window)
  // to 100 % (deadline reached). Defaults to 90.
  windowDays?: number;
  onClick?: () => void;
}

export interface DeadlineGroup {
  key: string;
  label: string;
  items: DeadlineItem[];
  emptyText: string;
}

function urgency(item: DeadlineItem) {
  if (item.overdue || (item.days !== null && item.days < 0)) return "destructive";
  if (item.days !== null && item.days <= (item.criticalDays ?? 30)) return "warning";
  return "info";
}

// Urgency bar: fills from 0 % (item enters its look-ahead window) to 100 %
// (deadline reached), so a nearly-full bar always means "act now".
function deadlinePercent(item: DeadlineItem) {
  if (item.days === null) return 0;
  if (item.days <= 0) return 100;
  const windowDays = item.windowDays && item.windowDays > 0 ? item.windowDays : 90;
  return Math.min(100, Math.max(0, Math.round((1 - item.days / windowDays) * 100)));
}

const STRIPE: Record<string, string> = {
  destructive: "stripe-destructive",
  warning: "stripe-warning",
  info: "stripe-info",
};

export default function DeadlinesCard({ groups, focus }: { groups: DeadlineGroup[]; focus?: MonitoringFocus }) {
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const [groupKey, setGroupKey] = useState("all");
  const items = useMemo(() => groups
    .filter((group) => groupKey === "all" || group.key === groupKey)
    .flatMap((group) => group.items.map((item) => ({ ...item, groupLabel: group.label })))
    .filter((item) => {
      if (focus === "overdue") return item.overdue || (item.days !== null && item.days < 0);
      if (focus === "soon") return !item.overdue && item.days !== null && item.days >= 0 && item.days <= (item.criticalDays ?? 30);
      return true;
    })
    .sort((a, b) => {
      const aValue = a.overdue ? -10000 : a.days ?? 9999;
      const bValue = b.overdue ? -10000 : b.days ?? 9999;
      return aValue - bValue;
    }), [focus, groupKey, groups]);
  const critical = groups.flatMap((group) => group.items).filter((item) => item.overdue || (item.days !== null && item.days <= (item.criticalDays ?? 30))).length;

  return (
    <Card className="h-full overflow-hidden shadow-card">
      <CardHeader className="border-b border-border/60 px-4 py-3">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10">
              <CalendarClock className="h-4 w-4 text-warning" />
            </span>
            <span className="truncate">Blížící se termíny</span>
          </span>
          {critical > 0 && <Badge variant="destructive" className="shrink-0 text-[10px]">{critical} kritické</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <div className="mb-3 flex flex-wrap gap-1">
          <Button variant={groupKey === "all" ? "secondary" : "ghost"} size="sm" className="h-7 shrink-0 px-2 text-[11px]" onClick={() => setGroupKey("all")}>
            <SlidersHorizontal className="mr-1 h-3 w-3" /> Vše {total}
          </Button>
          {groups.map((group) => (
            <Button key={group.key} variant={groupKey === group.key ? "secondary" : "ghost"} size="sm" className="h-7 shrink-0 px-2 text-[11px]" onClick={() => setGroupKey(group.key)}>
              {group.label} {group.items.length}
            </Button>
          ))}
        </div>
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">Žádné termíny v tomto výběru</p>
        ) : (
          <div className="max-h-[248px] space-y-1 overflow-y-auto pr-1">
            {items.map((item) => {
              const u = urgency(item);
              return (
                <div key={`${item.groupLabel}-${item.id}`} onClick={item.onClick} className={cn("flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors", item.onClick && "cursor-pointer hover:bg-muted/60")}>
                  <span className={cn(
                    "flex min-h-10 min-w-14 max-w-24 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-bold tabular-nums",
                    u === "destructive" && "bg-destructive/10 text-destructive",
                    u === "warning" && "bg-warning/10 text-warning",
                    u === "info" && "bg-muted text-muted-foreground",
                  )}>{item.badge}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{item.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{item.groupLabel}{item.tag ? ` · ${item.tag}` : ""}</span>
                    <span className="mt-1.5 block h-2 w-full overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn("block h-full rounded-full transition-all", STRIPE[u])}
                        style={{ width: `${deadlinePercent(item)}%` }}
                      />
                    </span>
                  </span>
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full shadow-sm", STRIPE[u])} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}