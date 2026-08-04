interface Item {
  name: string;
  value: number;
}

interface Props {
  items: Item[];
  suffix: string;
  tone?: "primary" | "success" | "warning" | "destructive" | "info";
}

const BAR: Record<string, string> = {
  primary: "bg-primary/25",
  success: "bg-success/25",
  warning: "bg-warning/25",
  destructive: "bg-destructive/25",
  info: "bg-info/25",
};

export default function RankList({ items, suffix, tone = "primary" }: Props) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((r, i) => (
        <div key={r.name + i} className="relative overflow-hidden rounded-md bg-muted/40">
          <div
            className={`absolute inset-y-0 left-0 ${BAR[tone]} transition-all`}
            style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }}
          />
          <div className="relative flex items-center justify-between gap-2 px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-background text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <span className="truncate text-sm font-medium">{r.name}</span>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {r.value.toLocaleString("cs-CZ")} {suffix}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}