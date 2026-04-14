import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { ArrowLeft, FileText, CalendarDays, Info, Loader2, Pencil, Save, X, Trash2, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VehicleDocuments from "@/components/VehicleDocuments";
import VehicleCalendar from "@/components/VehicleCalendar";
import VehicleMileage from "@/components/VehicleMileage";

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea";
  options?: { value: string; label: string }[];
}

const BASIC_FIELDS: FieldDef[] = [
  { key: "znacka", label: "Značka / Model" },
  { key: "spravce", label: "Správce" },
  { key: "rz", label: "RZ" },
  { key: "vin", label: "VIN" },
  { key: "vlastnik", label: "Vlastník" },
  {
    key: "typ_vlastnictvi", label: "Typ vlastnictví", type: "select",
    options: [
      { value: "majetek", label: "Majetek" },
      { value: "operativni_leasing", label: "Operativní leasing" },
      { value: "financni_leasing", label: "Finanční leasing" },
    ]
  },
];

const LEASING_FIELDS: FieldDef[] = [
  { key: "leasingova_spolecnost", label: "Leasingová spol." },
  { key: "doba_leasingu", label: "Doba leasingu" },
  { key: "najezd_za_rok", label: "Nájezd/rok" },
  { key: "mesicni_splatka", label: "Měsíční splátka" },
  { key: "datum_zahajeni_leasingu", label: "Leasing od" },
  { key: "datum_ukonceni_leasingu", label: "Leasing do" },
  { key: "cislo_smlouvy_leasing", label: "Č. smlouvy leasing" },
];

const DOC_FIELDS: FieldDef[] = [
  { key: "velky_tp", label: "Velký TP" },
  {
    key: "maly_tp", label: "Malý TP", type: "select",
    options: [{ value: "ANO", label: "ANO" }, { value: "NE", label: "NE" }]
  },
  { key: "tankovaci_karty", label: "Tankovací karty" },
  { key: "stk", label: "STK" },
  { key: "dalnicni_znamka", label: "Dálniční známka" },
  { key: "zelena_karta", label: "Zelená karta" },
];

const OPS_FIELDS: FieldDef[] = [
  { key: "v_uzivani_od", label: "V užívání od" },
  { key: "v_uzivani_do", label: "V užívání do" },
  { key: "misto_uskladneni_pneu", label: "Uskladnění pneu" },
  {
    key: "lekarnicka", label: "Lékárnička", type: "select",
    options: [{ value: "ANO", label: "ANO" }, { value: "NE", label: "NE" }]
  },
  { key: "cena_pronajmu", label: "Cena pronájmu" },
  { key: "srazka_soukrome", label: "Srážka soukr." },
  { key: "parkovaci_stani", label: "Parkování" },
  { key: "nahradni_klic", label: "Náhradní klíč" },
  { key: "poznamky", label: "Poznámky", type: "textarea" },
  {
    key: "lokalita", label: "Lokalita", type: "select",
    options: [{ value: "Praha", label: "Praha" }, { value: "Liberec", label: "Liberec" }]
  },
  {
    key: "status", label: "Stav", type: "select",
    options: [
      { value: "aktivní", label: "Aktivní" },
      { value: "v_servisu", label: "V servisu" },
      { value: "vyřazeno", label: "Vyřazeno" },
    ]
  },
];

const typVlastnictviLabel: Record<string, string> = {
  majetek: "Majetek",
  operativni_leasing: "Operativní leasing",
  financni_leasing: "Finanční leasing",
};

const statusBadge = (status: string) => {
  switch (status) {
    case "aktivní": return <Badge className="bg-success text-success-foreground">Aktivní</Badge>;
    case "v_servisu": return <Badge className="bg-warning text-warning-foreground">V servisu</Badge>;
    case "vyřazeno": return <Badge variant="secondary">Vyřazeno</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

function EditableField({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  if (field.type === "select" && field.options) {
    return (
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte" /></SelectTrigger>
        <SelectContent>
          {field.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  if (field.type === "textarea") {
    return <Textarea className="text-sm min-h-[60px]" value={value || ""} onChange={e => onChange(e.target.value)} />;
  }
  return <Input className="h-8 text-sm" value={value || ""} onChange={e => onChange(e.target.value)} />;
}

function FieldRow({ field, vehicle, editing, editData, onEdit }: {
  field: FieldDef; vehicle: any; editing: boolean; editData: Record<string, string>; onEdit: (key: string, val: string) => void;
}) {
  const renderValue = (key: string, val: any) => {
    if (key === "status") return statusBadge(val || "aktivní");
    if (key === "typ_vlastnictvi") return typVlastnictviLabel[val] || val || "—";
    return val || "—";
  };

  if (editing) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <EditableField field={field} value={editData[field.key] ?? vehicle[field.key] ?? ""} onChange={v => onEdit(field.key, v)} />
      </div>
    );
  }

  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{field.label}</dt>
      <dd className="font-medium text-right max-w-[200px] truncate">{renderValue(field.key, vehicle[field.key])}</dd>
    </div>
  );
}

function EditableCard({ title, fields, vehicle, editing, editData, onEdit }: {
  title: string; fields: FieldDef[]; vehicle: any; editing: boolean; editData: Record<string, string>; onEdit: (key: string, val: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={editing ? "space-y-3" : ""}>
          {editing ? (
            fields.map(f => <FieldRow key={f.key} field={f} vehicle={vehicle} editing editData={editData} onEdit={onEdit} />)
          ) : (
            <dl className="space-y-3 text-sm">
              {fields.map(f => <FieldRow key={f.key} field={f} vehicle={vehicle} editing={false} editData={editData} onEdit={onEdit} />)}
            </dl>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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

  useEffect(() => { fetchVehicle(); }, [id]);

  const startEditing = () => {
    setEditData({});
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditData({});
    setEditing(false);
  };

  const handleEdit = (key: string, val: string) => {
    setEditData(prev => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    if (Object.keys(editData).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicles").update(editData as any).eq("id", id!);
    if (error) {
      toast({ title: "Chyba při ukládání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Změny uloženy" });
      setEditing(false);
      setEditData({});
      fetchVehicle();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id!);
    if (error) {
      toast({ title: "Chyba při mazání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vozidlo smazáno" });
      navigate("/vozidla");
    }
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

  const showLeasing = editing
    ? (editData.typ_vlastnictvi ?? vehicle.typ_vlastnictvi) !== "majetek"
    : vehicle.typ_vlastnictvi === "operativni_leasing" || vehicle.typ_vlastnictvi === "financni_leasing";

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
        <div className="ml-auto flex items-center gap-2">
          {statusBadge(vehicle.status)}
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="mr-2 h-4 w-4" />Upravit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />Smazat
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Smazat vozidlo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Opravdu chcete smazat vozidlo <strong>{vehicle.znacka}</strong> ({vehicle.rz})? Tato akce je nevratná a smaže i všechny přiložené dokumenty a rezervace.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Smazat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={cancelEditing}>
                <X className="mr-2 h-4 w-4" />Zrušit
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Uložit
              </Button>
            </>
          )}
        </div>
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
          <TabsTrigger value="mileage">
            <Gauge className="mr-2 h-4 w-4" />Nájezdy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <EditableCard title="Základní informace" fields={BASIC_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
            {showLeasing && (
              <EditableCard title="Leasing" fields={LEASING_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
            )}
            <EditableCard title="Dokumenty a kontroly" fields={DOC_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
            <EditableCard title="Provozní údaje" fields={OPS_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
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

        <TabsContent value="mileage" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <VehicleMileage
                vehicleId={vehicle.id}
                contractualKmPerYear={vehicle.najezd_za_rok}
                leasingStart={vehicle.datum_zahajeni_leasingu}
                leasingEnd={vehicle.datum_ukonceni_leasingu}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
