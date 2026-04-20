import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, User, Car } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface PendingReservation {
  id: string;
  vehicle_id: string;
  driver_name: string;
  date_from: string;
  date_to: string;
  time_from: string | null;
  time_to: string | null;
  purpose: string | null;
  vehicle?: { rz: string | null; znacka: string | null };
}

interface Props {
  reservation: PendingReservation;
  onChanged: () => void;
}

export default function PendingApprovalCard({ reservation: r, onChanged }: Props) {
  const [busy, setBusy] = useState(false);

  const setStatus = async (status: "schváleno" | "zamítnuto") => {
    setBusy(true);
    const { error } = await supabase
      .from("reservations")
      .update({ status })
      .eq("id", r.id);
    setBusy(false);
    if (error) { toast.error("Chyba: " + error.message); return; }
    toast.success(status === "schváleno" ? "Rezervace schválena" : "Rezervace zamítnuta");
    onChanged();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium flex items-center gap-1.5">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{r.driver_name}</span>
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Car className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{r.vehicle?.rz || "?"} · {r.vehicle?.znacka || "—"}</span>
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">čeká</Badge>
        </div>

        <div className="flex items-center gap-2 text-sm bg-accent/30 rounded-lg px-3 py-2">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="truncate">
            {r.date_from} {r.time_from?.slice(0,5)} → {r.date_to} {r.time_to?.slice(0,5)}
          </span>
        </div>

        {r.purpose && (
          <p className="text-sm text-muted-foreground line-clamp-2">{r.purpose}</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-11"
            disabled={busy}
            onClick={() => setStatus("schváleno")}
          >
            <Check className="h-4 w-4 mr-1.5" /> Schválit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-11 text-destructive hover:text-destructive" disabled={busy}>
                <X className="h-4 w-4 mr-1.5" /> Zamítnout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Zamítnout rezervaci?</AlertDialogTitle>
                <AlertDialogDescription>
                  Žadatel bude vidět status „zamítnuto". Tuto akci nelze jednoduše vrátit.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Ne</AlertDialogCancel>
                <AlertDialogAction onClick={() => setStatus("zamítnuto")}>
                  Ano, zamítnout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
