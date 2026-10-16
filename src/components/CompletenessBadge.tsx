import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { completenessTone, type MissingItem } from "@/lib/completeness";
import { ClipboardCheck } from "lucide-react";

const toneCls = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
};
const barCls = { success: "bg-success", warning: "bg-warning", destructive: "bg-destructive" };

export function CompletenessBar({ percent }: { percent: number }) {
  const t = completenessTone(percent);
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", barCls[t])} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs tabular-nums">{percent} %</span>
    </div>
  );
}

const TAB_LABEL: Record<string, string> = { info: "Údaje", fuelcards: "Tankovací karty" };

export function CompletenessBadge({ percent, missing, onGo }: { percent: number; missing: MissingItem[]; onGo: (tab: string) => void }) {
  const t = completenessTone(percent);
  const groups: [string, MissingItem[]][] = [
    ["Důležité", missing.filter(m => m.priority === "important")],
    ["Ostatní", missing.filter(m => m.priority === "other")],
  ];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", toneCls[t])}>
          <ClipboardCheck className="h-3.5 w-3.5" />Úplnost {percent} %
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
        <p className="font-semibold text-sm mb-2">Co chybí ({missing.length})</p>
        {missing.length === 0 && <p className="text-sm text-muted-foreground">Vše je vyplněno.</p>}
        {groups.map(([title, items]) => items.length > 0 && (
          <div key={title} className="mb-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{title}</p>
            <ul className="space-y-1">
              {items.map(m => (
                <li key={m.key} className="flex items-center justify-between gap-2 text-sm">
                  <span>{m.label}</span>
                  <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => onGo(m.tab)}>
                    {TAB_LABEL[m.tab] || "Otevřít"} →
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
