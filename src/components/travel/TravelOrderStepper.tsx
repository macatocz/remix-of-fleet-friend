import { Check, X, Circle } from "lucide-react";
import { STATUS_STEPS, stepIndex, isRejected } from "@/lib/travel/status";
import { cn } from "@/lib/utils";

type Signature = { by?: string | null; at?: string | null };

interface Props {
  status: string;
  signatures?: {
    koncept?: Signature;
    odeslano?: Signature;
    vyuctovano?: Signature;
    schvaleno?: Signature;
  };
  rejection?: { by?: string | null; at?: string | null; reason?: string | null };
}

const fmt = (at?: string | null) =>
  at ? new Date(at).toLocaleString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export function TravelOrderStepper({ status, signatures = {}, rejection }: Props) {
  const rejected = isRejected(status);
  const currentIdx = rejected ? -1 : stepIndex(status);

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-2">
        {STATUS_STEPS.map((s, i) => {
          const done = !rejected && i < currentIdx;
          const active = !rejected && i === currentIdx;
          const sig = signatures[s.key];
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center text-center relative">
              {i > 0 && (
                <div
                  className={cn(
                    "absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2",
                    done || active ? "bg-primary" : "bg-border",
                    rejected && "bg-red-300 dark:bg-red-900"
                  )}
                />
              )}
              <div
                className={cn(
                  "relative z-10 h-8 w-8 rounded-full flex items-center justify-center border-2 bg-background",
                  done && "bg-primary text-primary-foreground border-primary",
                  active && "border-primary text-primary",
                  !done && !active && "border-border text-muted-foreground",
                  rejected && "border-red-400 text-red-600 dark:border-red-800 dark:text-red-400"
                )}
              >
                {rejected ? <X className="h-4 w-4" /> : done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3 fill-current" />}
              </div>
              <div className={cn("mt-2 text-xs font-medium", active && "text-primary", !active && "text-foreground")}>{s.label}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{s.short}</div>
              {sig?.by && (
                <div className="mt-1 text-[10px] text-muted-foreground leading-tight">
                  {sig.by}
                  {sig.at && <><br />{fmt(sig.at)}</>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rejected && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40 p-3 text-sm">
          <div className="font-semibold text-red-800 dark:text-red-200">Zamítnuto</div>
          {rejection?.by && (
            <div className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              {rejection.by}{rejection.at ? ` • ${fmt(rejection.at)}` : ""}
            </div>
          )}
          {rejection?.reason && <div className="text-sm text-red-900 dark:text-red-100 mt-1">{rejection.reason}</div>}
        </div>
      )}
    </div>
  );
}