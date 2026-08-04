export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
];

export const axisProps = {
  tick: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
  tickLine: false,
  axisLine: false,
} as const;

export const gridProps = {
  strokeDasharray: "3 3",
  vertical: false,
  stroke: "hsl(var(--border))",
} as const;

export const formatCzk = (v: number) => `${Math.round(v).toLocaleString("cs-CZ")} Kč`;
export const formatNum = (v: number) => Number(v).toLocaleString("cs-CZ");