interface Props {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: number) => string;
}

export default function ChartTooltip({ active, payload, label, formatter }: Props) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-card-hover">
      {label && <p className="mb-1 text-xs font-semibold text-popover-foreground">{label}</p>}
      <div className="space-y-0.5">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: p.color || p.payload?.fill }}
            />
            <span className="text-muted-foreground">{p.name}</span>
            <span className="ml-auto font-semibold text-popover-foreground">
              {formatter ? formatter(Number(p.value)) : Number(p.value).toLocaleString("cs-CZ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}