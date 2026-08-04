import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import EmptyState from "./EmptyState";
import { cn } from "@/lib/utils";

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

const STRIPE: Record<string, string> = {
  destructive: "bg-destructive",
  warning: "bg-warning",
  info: "bg-info",
};

export default function DeadlinesCard({ groups }: { groups: DeadlineGroup[] }) {
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  const first = groups[0]?.key ?? "";

  return (
    <Card className="shadow-card">
      <CardHeader className="border-b border-border/60 bg-muted/30 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-warning" />
          Blížící se termíny
          {total > 0 && <Badge variant="secondary">{total}</Badge>}
        </CardTitle>
        <p className="text-xs text-muted-foreground">STK, pojištění, leasing a plánovaný servis na jednom místě.</p>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue={first}>
          <TabsList className="mb-3 flex h-auto w-full flex-wrap justify-start gap-1">
            {groups.map((g) => (
              <TabsTrigger key={g.key} value={g.key} className="gap-1.5 text-xs">
                {g.label}
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold tabular-nums">
                  {g.items.length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((g) => (
            <TabsContent key={g.key} value={g.key} className="mt-0">
              {g.items.length === 0 ? (
                <EmptyState icon={CheckCircle2} title={g.emptyText} hint="Nic nevyžaduje pozornost." />
              ) : (
                <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {g.items.map((item) => {
                    const u = urgency(item);
                    return (
                      <div
                        key={item.id}
                        onClick={item.onClick}
                        className={cn(
                          "relative flex items-center justify-between gap-2 overflow-hidden rounded-md bg-muted/40 py-2 pl-4 pr-2.5 transition-colors",
                          item.onClick && "cursor-pointer hover:bg-muted"
                        )}
                      >
                        <span className={cn("absolute inset-y-0 left-0 w-1", STRIPE[u])} />
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium">{item.label}</span>
                          {item.tag && <Badge variant="outline" className="shrink-0 text-[10px]">{item.tag}</Badge>}
                        </div>
                        <Badge
                          variant={u === "destructive" ? "destructive" : "secondary"}
                          className="shrink-0 text-xs tabular-nums"
                        >
                          {item.badge}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}