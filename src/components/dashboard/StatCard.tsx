import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type Tone = "primary" | "success" | "warning" | "info" | "destructive";

const TONES: Record<Tone, { ring: string; icon: string; grad: string; stroke: string }> = {
  primary: { ring: "bg-primary/15 ring-1 ring-inset ring-primary/20", icon: "text-primary", grad: "from-primary/[0.12]", stroke: "hsl(var(--primary))" },
  success: { ring: "bg-success/15 ring-1 ring-inset ring-success/20", icon: "text-success", grad: "from-success/[0.12]", stroke: "hsl(var(--success))" },
  warning: { ring: "bg-warning/15 ring-1 ring-inset ring-warning/20", icon: "text-warning", grad: "from-warning/[0.12]", stroke: "hsl(var(--warning))" },
  info: { ring: "bg-info/15 ring-1 ring-inset ring-info/20", icon: "text-info", grad: "from-info/[0.12]", stroke: "hsl(var(--info))" },
  destructive: { ring: "bg-destructive/15 ring-1 ring-inset ring-destructive/20", icon: "text-destructive", grad: "from-destructive/[0.12]", stroke: "hsl(var(--destructive))" },
};

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  spark?: number[];
  onClick?: () => void;
  delay?: number;
}

export default function StatCard({ label, value, hint, icon: Icon, tone = "primary", spark, onClick, delay = 0 }: Props) {
  const t = TONES[tone];
  const sparkData = (spark || []).map((v, i) => ({ i, v }));
  const gradId = `spark-${tone}-${label.replace(/\W/g, "")}`;

  return (
    <Card
      onClick={onClick}
      style={{ animationDelay: `${delay}ms` }}
      className={cn(
        "relative overflow-hidden animate-fade-in-up shadow-card transition-all",
        "bg-gradient-to-br to-card",
        t.grad,
        onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover"
      )}
    >
      <div className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-4">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm sm:h-10 sm:w-10", t.ring)}>
          <Icon className={cn("h-5 w-5", t.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">{value}</p>
          {hint && <p className="truncate text-[10px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {sparkData.length > 1 && (
        <div className="h-8 w-full opacity-90 sm:h-9">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.stroke} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={t.stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={t.stroke} strokeWidth={2.5} fill={`url(#${gradId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}