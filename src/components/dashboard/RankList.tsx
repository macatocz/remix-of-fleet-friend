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
  primary: "stripe-primary",
  success: "stripe-success",
  warning: "stripe-warning",
  destructive: "stripe-destructive",
  info: "stripe-info",
};

const RANK: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

export default function RankList({ items, suffix, tone = "primary" }: Props) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((r, i) => (
        <div key={r.name + i} className="relative overflow-hidden rounded-lg bg-muted/40">
          <div
            className={`absolute inset-y-0 left-0 ${BAR[tone]} opacity-25 transition-all`}
            style={{ width: `${Math.max((r.value / max) * 100, 2)}%` }}
          />
          <div className="relative flex items-center justify-between gap-2 px-2.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${RANK[tone]}`}>
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
