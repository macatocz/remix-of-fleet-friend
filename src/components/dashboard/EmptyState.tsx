import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  hint?: string;
}

export default function EmptyState({ icon: Icon, title, hint }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="max-w-[240px] text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}