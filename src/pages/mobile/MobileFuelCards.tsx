import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  CreditCard, Search, Eye, EyeOff, User, Calendar,
  AlertTriangle, ChevronDown, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDERS = ["MOL", "Shell", "Bonett", "Jiné"];
const STATUSES = ["aktivní", "blokovaná", "zrušená"];

const statusStyles: Record<string, string> = {
  "aktivní": "bg-success/15 text-success border-success/30",
  "blokovaná": "bg-warning/15 text-warning border-warning/30",
  "zrušená": "bg-muted text-muted-foreground border-border",
};

const isExpiringSoon = (date: string | null) => {
  if (!date) return false;
  const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 30;
};

const isExpired = (date: string | null) => {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
};

export default function MobileFuelCards() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());
  const [providerSheet, setProviderSheet] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["fuel_cards_mobile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_cards")
        .select("*, vehicles(rz, znacka)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards.filter((c: any) => {
      if (providerFilter !== "all" && c.provider !== providerFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        c.vehicles?.rz, c.vehicles?.znacka, c.card_number,
        c.owner_name, c.provider,
      ].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [cards, search, providerFilter, statusFilter, providerFilter]);

  const togglePin = (id: string) =>
    setVisiblePins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const FilterChip = ({
    label, value, active, onClick,
  }: { label: string; value: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary font-medium"
          : "border-border bg-background text-foreground"
      )}
    >
      <span className="text-muted-foreground text-xs">{label}:</span>
      <span>{value === "all" ? "Vše" : value}</span>
      <ChevronDown className="h-3.5 w-3.5 opacity-60" />
    </button>
  );

  const SelectSheet = ({
    open, onOpenChange, title, options, current, onSelect,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    title: string;
    options: string[];
    current: string;
    onSelect: (v: string) => void;
  }) => (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1">
          {["all", ...options].map((opt) => (
            <button
              key={opt}
              onClick={() => { onSelect(opt); onOpenChange(false); }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-muted"
            >
              <span className="text-base capitalize">{opt === "all" ? "Vše" : opt}</span>
              {current === opt && <Check className="h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Tankovací karty</h1>
        </div>
        {!isLoading && (
          <Badge variant="secondary" className="rounded-full">
            {filtered.length}
          </Badge>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Hledat RZ, číslo, vlastníka…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        <FilterChip
          label="Provider"
          value={providerFilter}
          active={providerFilter !== "all"}
          onClick={() => setProviderSheet(true)}
        />
        <FilterChip
          label="Stav"
          value={statusFilter}
          active={statusFilter !== "all"}
          onClick={() => setStatusSheet(true)}
        />
        {(providerFilter !== "all" || statusFilter !== "all" || search) && (
          <button
            onClick={() => { setProviderFilter("all"); setStatusFilter("all"); setSearch(""); }}
            className="shrink-0 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground"
          >
            Vyčistit
          </button>
        )}
      </div>

      <SelectSheet
        open={providerSheet} onOpenChange={setProviderSheet}
        title="Poskytovatel" options={PROVIDERS}
        current={providerFilter} onSelect={setProviderFilter}
      />
      <SelectSheet
        open={statusSheet} onOpenChange={setStatusSheet}
        title="Stav karty" options={STATUSES}
        current={statusFilter} onSelect={setStatusFilter}
      />

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Žádné tankovací karty</p>
          {(search || providerFilter !== "all" || statusFilter !== "all") && (
            <p className="text-xs text-muted-foreground mt-1">Zkus změnit filtry</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((card: any) => {
            const v = card.vehicles;
            const expiring = isExpiringSoon(card.valid_until);
            const expired = isExpired(card.valid_until);
            const pinShown = visiblePins.has(card.id);
            return (
              <Card
                key={card.id}
                onClick={() => navigate(`/m/vozidla/${card.vehicle_id}`)}
                className="active:scale-[0.99] transition-transform cursor-pointer overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  {/* Top row: vehicle + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-base truncate">
                        {v?.rz || "—"}
                      </div>
                      {v?.znacka && (
                        <div className="text-xs text-muted-foreground truncate">
                          {v.znacka}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("capitalize shrink-0", statusStyles[card.status])}
                    >
                      {card.status}
                    </Badge>
                  </div>

                  {/* Provider + card number */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm font-medium">{card.provider}</span>
                    <span className="font-mono text-sm tracking-wider">
                      {card.card_number || "—"}
                    </span>
                  </div>

                  {/* PIN */}
                  {card.pin && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">PIN</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm tracking-widest">
                          {pinShown ? card.pin : "••••"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); togglePin(card.id); }}
                        >
                          {pinShown
                            ? <EyeOff className="h-3.5 w-3.5" />
                            : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Footer: owner + valid until */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                    <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{card.owner_name || "—"}</span>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1.5 shrink-0",
                      expired ? "text-destructive font-medium"
                        : expiring ? "text-warning font-medium"
                        : "text-muted-foreground"
                    )}>
                      {(expired || expiring) && <AlertTriangle className="h-3.5 w-3.5" />}
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {card.valid_until
                          ? new Date(card.valid_until).toLocaleDateString("cs-CZ")
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}