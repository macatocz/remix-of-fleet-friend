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
  if (item.days !== null && item.days <= 30) return "warning";
  return "info";
}

// How close the deadline is, as a percentage of a 90-day window.
function deadlinePercent(item: DeadlineItem) {
  if (item.days === null) return 0;
  if (item.days <= 0) return 100;
  return Math.min(100, Math.round((1 - item.days / 90) * 100));
}

const STRIPE: Record<string, string> = {
  destructive: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
};

export default function DeadlinesCard({ groups, focus }: { groups: DeadlineGroup[]; focus?: MonitoringFocus }) {
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const [groupKey, setGroupKey] = useState("all");
  const items = useMemo(() => groups
    .filter((group) => groupKey === "all" || group.key === groupKey)
    .flatMap((group) => group.items.map((item) => ({ ...item, groupLabel: group.label })))
    .filter((item) => {
      if (focus === "overdue") return item.overdue || (item.days !== null && item.days < 0);
      if (focus === "soon") return !item.overdue && item.days !== null && item.days >= 0 && item.days <= 30;
      return true;
    })
    .sort((a, b) => {
      const aValue = a.overdue ? -10000 : a.days ?? 9999;
      const bValue = b.overdue ? -10000 : b.days ?? 9999;
      return aValue - bValue;
    }), [focus, groupKey, groups]);
  const critical = groups.flatMap((group) => group.items).filter((item) => item.overdue || (item.days !== null && item.days <= 30)).length;

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
                <div key={`${item.groupLabel}-${item.id}`} onClick={item.onClick} className={cn("flex items-center gap-3 rounded-lg px-2 py-2 transition-colors", item.onClick && "cursor-pointer hover:bg-muted/60")}>
                  <span className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                    u === "destructive" && "bg-destructive/10 text-destructive",
                    u === "warning" && "bg-warning/10 text-warning",
                    u === "info" && "bg-muted text-muted-foreground",
                  )}>{item.badge}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{item.label}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{item.groupLabel}{item.tag ? ` · ${item.tag}` : ""}</span>
                    <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <span
                        className={cn("block h-full transition-all", STRIPE[u])}
                        style={{ width: `${deadlinePercent(item)}%` }}
                      />
                    </span>
                  </span>
                  <span className={cn("h-2 w-2 shrink-0 rounded-full", STRIPE[u])} />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}