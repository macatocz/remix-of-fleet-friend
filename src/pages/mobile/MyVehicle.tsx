import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDriverContext } from "@/hooks/useDriverContext";

export default function MyVehicle() {
  const { myVehicles, loading } = useDriverContext();
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Moje vozidla</h2>
      {loading && <p className="text-sm text-muted-foreground">Načítání…</p>}
      {!loading && myVehicles.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nejste vedeni jako správce žádného vozidla. Pro zápis jízdy si můžete vybrat libovolné vozidlo z firmy.
          </CardContent>
        </Card>
      )}
      {myVehicles.map((v) => (
        <Card
          key={v.id}
          className="cursor-pointer hover:bg-accent/30"
          onClick={() => navigate(`/vozidla/${v.id}`)}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <Car className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium">{v.znacka || "—"}</p>
              <p className="text-sm text-muted-foreground">{v.rz || "bez RZ"}</p>
            </div>
            <Badge variant="outline">{v.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
