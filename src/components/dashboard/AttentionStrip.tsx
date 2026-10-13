import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DeadlineGroup } from "./DeadlinesCard";

export default function AttentionStrip({ groups, loading }: { groups: DeadlineGroup[]; loading: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const items = groups.flatMap(group => group.items.map(item => ({ ...item, category: group.label })))
    .sort((a, b) => (a.overdue ? -10000 : a.days ?? 9999) - (b.overdue ? -10000 : b.days ?? 9999));
  const overdue = items.filter(item => item.overdue || (item.days !== null && item.days < 0)).length;
  const critical = items.filter(item => !item.overdue && item.days !== null && item.days >= 0 && item.days <= (item.criticalDays ?? 30)).length;
  return (
    <section aria-label="Vyžaduje pozornost" className="border-y border-border bg-muted/30 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {items.length ? <AlertTriangle className="h-4 w-4 text-warning" /> : <CheckCircle2 className="h-4 w-4 text-success" />}
          Vyžaduje pozornost
        </h2>
        <div className="flex flex-wrap gap-x-3 text-xs tabular-nums" aria-live="polite">
          {loading ? <span className="text-muted-foreground">Načítání…</span> : <>
            <span className="text-destructive">{overdue} po termínu</span>
            <span className="text-warning">{critical} kritické</span>
            <span className="text-muted-foreground">{items.length - overdue - critical} nadcházející</span>
          </>}
        </div>
        {items.length > 3 && <Button size="sm" variant="ghost" className="ml-auto h-7 gap-1 text-xs" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Sbalit" : `Všechna upozornění (${items.length})`}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>}
      </div>
      {items.length > 0 && <div className={cn("mt-2 grid gap-x-5 gap-y-1", !expanded && "lg:grid-cols-3", expanded && "max-h-64 overflow-y-auto sm:grid-cols-2")}>
        {(expanded ? items : items.slice(0, 3)).map(item => <Button key={`${item.category}-${item.id}`} variant="ghost" onClick={item.onClick} className="h-auto min-h-10 justify-start gap-2 px-0 py-1 text-left whitespace-normal">
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.overdue || (item.days !== null && item.days < 0) ? "bg-destructive" : item.days !== null && item.days <= (item.criticalDays ?? 30) ? "bg-warning" : "bg-info")} />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium">{item.label}</span>
            <span className="block text-[11px] font-normal text-muted-foreground">{item.category}{item.tag ? ` · ${item.tag}` : ""} · {item.days !== null ? item.days < 0 ? `${Math.abs(item.days)} dní po termínu` : `za ${item.days} dní` : item.badge}</span>
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>)}
      </div>}
      {!loading && items.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Žádné blížící se termíny ani prošlé platnosti.</p>}
    </section>
  );
}