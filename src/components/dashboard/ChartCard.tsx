import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  icon: LucideIcon;
  iconClass?: string;
  chipClass?: string;
  count?: number;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export default function ChartCard({ title, icon: Icon, iconClass = "text-primary", chipClass = "bg-primary/10", count, subtitle, action, className, children }: Props) {
  return (
    <Card className={cn("flex flex-col overflow-hidden shadow-card transition-shadow hover:shadow-card-hover", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm", chipClass)}>
              <Icon className={cn("h-4 w-4", iconClass)} />
            </span>
            <span className="truncate">{title}</span>
            {count !== undefined && count > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">{count}</Badge>
            )}
          </CardTitle>
          {subtitle && <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="flex-1 p-3 sm:p-4">{children}</CardContent>
    </Card>
  );
}