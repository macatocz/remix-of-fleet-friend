import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FuelCard {
  id: string;
  provider: string | null;
  card_number: string | null;
  pin: string | null;
  status: string | null;
  valid_until: string | null;
}

function maskNumber(num: string | null): string {
  if (!num) return "—";
  const cleaned = num.replace(/\s+/g, "");
  if (cleaned.length <= 4) return cleaned;
  return "•••• " + cleaned.slice(-4);
}

export default function ReservationFuelCardWidget({
  vehicleId,
  startsAt,
}: {
  vehicleId: string;
  /** Začátek rezervace — pokud je v budoucnu, zobrazí se poznámka. */
  startsAt?: Date | null;
}) {
  const [cards, setCards] = useState<FuelCard[] | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("fuel_cards")
        .select("id, provider, card_number, pin, status, valid_until")
        .eq("vehicle_id", vehicleId)
        .eq("status", "aktivní");
      if (!cancelled) setCards((data as FuelCard[]) || []);
    })();
    return () => { cancelled = true; };
  }, [vehicleId]);

  const notStarted = !!startsAt && startsAt.getTime() > Date.now();

  const reveal = (id: string) => {
    setRevealed(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setRevealed(prev => ({ ...prev, [id]: false }));
    }, 10000);
  };

  if (cards === null) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Tankovací karta k vozu
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {cards.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">
            K tomuto vozu není přiřazena tankovací karta.
          </p>
        ) : cards.map(c => (
          <div key={c.id} className="rounded-lg border bg-accent/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{c.provider || "Karta"}</span>
              <span className="font-mono text-sm tracking-wider">{maskNumber(c.card_number)}</span>
            </div>
            {c.pin && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">PIN</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm tracking-widest">
                    {revealed[c.id] ? c.pin : "••••"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => reveal(c.id)}
                  >
                    {revealed[c.id]
                      ? <EyeOff className="h-3.5 w-3.5" />
                      : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
            )}
            {c.valid_until && (
              <div className="flex items-center justify-end text-xs text-muted-foreground pt-1 border-t">
                <Badge variant="outline" className="text-[10px]">
                  platnost do {new Date(c.valid_until).toLocaleDateString("cs-CZ")}
                </Badge>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}