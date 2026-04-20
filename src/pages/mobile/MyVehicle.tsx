import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car, ChevronRight, Route, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDriverContext } from "@/hooks/useDriverContext";
import { useState } from "react";
import QuickTripDialog from "@/components/mobile/QuickTripDialog";
import QuickIncidentDialog from "@/components/mobile/QuickIncidentDialog";

export default function MyVehicle() {
  const { myVehicles, loading } = useDriverContext();
  const navigate = useNavigate();
  const [tripOpen, setTripOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Moje vozidla</h2>

      {loading && <p className="text-sm text-muted-foreground">Načítání…</p>}

      {!loading && myVehicles.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nejste vedeni jako správce žádného vozidla. Pro zápis jízdy si můžete vybrat libovolné vozidlo z firmy.
          </CardContent>
        </Card>
      )}

      {myVehicles.map((v) => (
        <Card key={v.id} className="overflow-hidden">
          <button
            onClick={() => navigate(`/vozidla/${v.id}`)}
            className="w-full text-left active:bg-accent/30 transition-colors"
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Car className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base truncate">{v.znacka || "—"}</p>
                <p className="text-sm text-muted-foreground">{v.rz || "bez RZ"}</p>
              </div>
              <Badge variant="outline" className="shrink-0">{v.status}</Badge>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardContent>
          </button>
          <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1 border-t">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setTripOpen(true)}
            >
              <Route className="h-4 w-4 mr-2" /> Zápis jízdy
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => setIncidentOpen(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-destructive" /> Hlásit škodu
            </Button>
          </div>
        </Card>
      ))}

      <QuickTripDialog open={tripOpen} onOpenChange={setTripOpen} />
      <QuickIncidentDialog open={incidentOpen} onOpenChange={setIncidentOpen} />
    </div>
  );
}
