export type TravelOrderStatus =
  | "koncept"
  | "odeslano"
  | "vyuctovano"
  | "schvaleno"
  | "zamitnuto";

export const STATUS_LABEL: Record<string, string> = {
  koncept: "Koncept",
  odeslano: "Odesláno",
  vyuctovano: "Vyúčtováno",
  schvaleno: "Schváleno",
  zamitnuto: "Zamítnuto",
};

// Tailwind classes for the badge — semantic tokens where possible, and
// discrete state colors so každý stav je jasně rozlišený.
export const STATUS_BADGE_CLASS: Record<string, string> = {
  koncept: "bg-muted text-muted-foreground border-border",
  odeslano: "bg-muted text-foreground border-border dark:bg-muted/20 dark:text-foreground",
  vyuctovano: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
  schvaleno: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900",
  zamitnuto: "bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive-foreground",
};

// Kroky v stepperu (bez „Zamítnuto" — to je vedlejší větev)
export const STATUS_STEPS: { key: TravelOrderStatus; label: string; short: string }[] = [
  { key: "koncept", label: "Koncept", short: "Vytvoření" },
  { key: "odeslano", label: "Odesláno", short: "Ke schválení / na cestě" },
  { key: "vyuctovano", label: "Vyúčtováno", short: "Doloženo" },
  { key: "schvaleno", label: "Schváleno", short: "Proplaceno" },
];

export function stepIndex(status: string): number {
  const i = STATUS_STEPS.findIndex((s) => s.key === status);
  return i < 0 ? 0 : i;
}

export function isRejected(status: string) {
  return status === "zamitnuto";
}