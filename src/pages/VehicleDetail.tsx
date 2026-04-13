import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, CalendarDays, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VehicleDocuments from "@/components/VehicleDocuments";
import VehicleCalendar from "@/components/VehicleCalendar";

const ALL_FIELDS = [
  { key: "znacka", label: "Značka / Model" },
  { key: "spravce", label: "Správce" },
  { key: "rz", label: "RZ" },
  { key: "vin", label: "VIN" },
  { key: "vlastnik", label: "Vlastník" },
  { key: "typ_vlastnictvi", label: "Typ vlastnictví" },
  { key: "leasingova_spolecnost", label: "Leasingová spol." },
  { key: "doba_leasingu", label: "Doba leasingu" },
  { key: "najezd_za_rok", label: "Nájezd/rok" },
  { key: "mesicni_splatka", label: "Měsíční splátka" },
  { key: "datum_zahajeni_leasingu", label: "Leasing od" },
  { key: "datum_ukonceni_leasingu", label: "Leasing do" },
  { key: "cislo_smlouvy_leasing", label: "Č. smlouvy leasing" },
  { key: "velky_tp", label: "Velký TP" },
  { key: "maly_tp", label: "Malý TP" },
  { key: "tankovaci_karty", label: "Tankovací karty" },
  { key: "stk", label: "STK" },
  { key: "dalnicni_znamka", label: "Dálniční známka" },
  { key: "zelena_karta", label: "Zelená karta" },
  { key: "v_uzivani_od", label: "V užívání od" },
  { key: "v_uzivani_do", label: "V užívání do" },
  { key: "misto_uskladneni_pneu", label: "Uskladnění pneu" },
  { key: "lekarnicka", label: "Lékárnička" },
  { key: "cena_pronajmu", label: "Cena pronájmu" },
  { key: "srazka_soukrome", label: "Srážka soukr." },
  { key: "parkovaci_stani", label: "Parkování" },
  { key: "nahradni_klic", label: "Náhradní klíč" },
  { key: "poznamky", label: "Poznámky" },
  { key: "lokalita", label: "Lokalita" },
  { key: "status", label: "Stav" },
] as const;

const statusBadge = (status: string) => {
  switch (status) {
    case "aktivní": return <Badge className="bg-success text-success-foreground">Aktivní</Badge>;
    case "v_servisu": return <Badge className="bg-warning text-warning-foreground">V servisu</Badge>;
    case "vyřazeno": return <Badge variant="secondary">Vyřazeno</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

const typVlastnictviLabel: Record<string, string> = {
  majetek: "Majetek",
  operativni_leasing: "Operativní leasing",
  financni_leasing: "Finanční leasing",
};

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.from("vehicles").select("*").eq("id", id).maybeSingle();
      if (error) {
        toast({ title: "Chyba", description: error.message, variant: "destructive" });
      }
      setVehicle(data);
      setLoading(false);
    };
    fetchVehicle();
  }, [id]);

  const renderValue = (key: string, val: any) => {
    if (key === "status") return statusBadge(val || "aktivní");
    if (key === "typ_vlastnictvi") return typVlastnictviLabel[val] || val || "—";
    return val || "—";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/vozidla")}>
          <ArrowLeft className="mr-2 h-4 w-4" />Zpět na vozidla
        </Button>
        <div className="text-center py-12 text-muted-foreground">Vozidlo nenalezeno.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/vozidla")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{vehicle.znacka || "Vozidlo"}</h1>
          <p className="text-muted-foreground">{vehicle.rz || "—"} · {vehicle.spravce || "—"}</p>
        </div>
        <div className="ml-auto">{statusBadge(vehicle.status)}</div>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">
            <Info className="mr-2 h-4 w-4" />Údaje
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <CalendarDays className="mr-2 h-4 w-4" />Kalendář
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />Dokumenty
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Základní informace</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {ALL_FIELDS.slice(0, 6).map(f => (
                    <div key={f.key} className="flex justify-between">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="font-medium text-right">{renderValue(f.key, vehicle[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            {(vehicle.typ_vlastnictvi === "operativni_leasing" || vehicle.typ_vlastnictvi === "financni_leasing") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Leasing</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3 text-sm">
                    {ALL_FIELDS.slice(6, 13).map(f => (
                      <div key={f.key} className="flex justify-between">
                        <dt className="text-muted-foreground">{f.label}</dt>
                        <dd className="font-medium text-right">{renderValue(f.key, vehicle[f.key])}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dokumenty a kontroly</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {ALL_FIELDS.slice(13, 19).map(f => (
                    <div key={f.key} className="flex justify-between">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="font-medium text-right">{renderValue(f.key, vehicle[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Provozní údaje</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {ALL_FIELDS.slice(19).map(f => (
                    <div key={f.key} className="flex justify-between">
                      <dt className="text-muted-foreground">{f.label}</dt>
                      <dd className="font-medium text-right max-w-[200px] truncate">{renderValue(f.key, vehicle[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <VehicleCalendar vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <VehicleDocuments vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
