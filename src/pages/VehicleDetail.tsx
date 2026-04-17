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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, FileText, CalendarDays, Info, Loader2, Pencil, Save, X, Trash2, Wrench, BookOpen, CreditCard, CalendarIcon, Gauge } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInMonths } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import VehicleDocuments from "@/components/VehicleDocuments";
import VehicleCalendar from "@/components/VehicleCalendar";

import VehicleAlerts from "@/components/VehicleAlerts";
import VehicleService from "@/components/VehicleService";
import VehicleTripLogInline from "@/components/VehicleTripLogInline";
import VehicleFuelCards from "@/components/VehicleFuelCards";
import VehicleVignettes from "@/components/VehicleVignettes";

interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "select" | "textarea" | "date" | "driver_select" | "currency" | "computed" | "vignettes";
  options?: { value: string; label: string }[];
  suffix?: string;
  computeFn?: (vehicle: any, editData: Record<string, string>) => string;
}

// Branch options loaded dynamically — see useBranchOptions below

const BASIC_FIELDS: FieldDef[] = [
  { key: "znacka", label: "Značka / Model" },
  { key: "spravce", label: "Správce", type: "driver_select" },
  { key: "rz", label: "RZ" },
  { key: "vin", label: "VIN" },
  { key: "vlastnik", label: "Vlastník" },
  {
    key: "kategorie", label: "Kategorie", type: "select",
    options: [
      { value: "Ředitel", label: "Ředitel" },
      { value: "Projektový manažer", label: "Projektový manažer" },
      { value: "Konzultant Senior", label: "Konzultant Senior" },
      { value: "Konzultant", label: "Konzultant" },
    ]
  },
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
  {
    key: "doba_leasingu", label: "Doba leasingu (měsíce)", type: "computed",
    computeFn: (vehicle, editData) => {
      const from = editData.datum_zahajeni_leasingu ?? vehicle.datum_zahajeni_leasingu;
      const to = editData.datum_ukonceni_leasingu ?? vehicle.datum_ukonceni_leasingu;
      if (!from || !to) return "—";
      try {
        const months = differenceInMonths(parseISO(to), parseISO(from));
        return months > 0 ? `${months}` : "—";
      } catch { return "—"; }
    }
  },
  { key: "najezd_za_rok", label: "Nájezd/rok" },
  { key: "mesicni_splatka", label: "Měsíční splátka", type: "currency", suffix: "Kč" },
  { key: "datum_zahajeni_leasingu", label: "Leasing od", type: "date" },
  { key: "datum_ukonceni_leasingu", label: "Leasing do", type: "date" },
  { key: "cislo_smlouvy_leasing", label: "Č. smlouvy leasing" },
];

const DOC_FIELDS: FieldDef[] = [
  { key: "velky_tp", label: "Velký TP" },
  {
    key: "maly_tp", label: "Malý TP", type: "select",
    options: [{ value: "ANO", label: "ANO" }, { value: "NE", label: "NE" }]
  },
  { key: "tankovaci_karty", label: "Tankovací karty", type: "select", options: [{ value: "ANO", label: "ANO" }, { value: "NE", label: "NE" }] },
  { key: "stk", label: "STK do", type: "date" },
  { key: "dalnicni_znamka", label: "Dálniční známka", type: "vignettes" },
  { key: "zelena_karta", label: "Zelená karta do", type: "date" },
];

const getOpsFields = (branchOptions: { value: string; label: string }[]): FieldDef[] => [
  { key: "v_uzivani_od", label: "V užívání od", type: "date" },
  { key: "v_uzivani_do", label: "V užívání do", type: "date" },
  { key: "misto_uskladneni_pneu", label: "Uskladnění pneu" },
  {
    key: "lekarnicka", label: "Lékárnička", type: "select",
    options: [{ value: "ANO", label: "ANO" }, { value: "NE", label: "NE" }]
  },
  { key: "cena_pronajmu", label: "Cena bez DPH", type: "currency", suffix: "Kč" },
  { key: "srazka_soukrome", label: "Srážka soukr.", type: "currency", suffix: "Kč" },
  { key: "parkovaci_stani", label: "Parkování" },
  { key: "nahradni_klic", label: "Náhradní klíč", type: "select", options: branchOptions },
  { key: "poznamky", label: "Poznámky", type: "textarea" },
  { key: "lokalita", label: "Lokalita", type: "select", options: branchOptions },
  {
    key: "status", label: "Stav", type: "select",
    options: [
      { value: "aktivní", label: "Aktivní" },
      { value: "objednáno", label: "Objednáno" },
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
    case "objednáno": return <Badge className="bg-info text-info-foreground">Objednáno</Badge>;
    case "v_servisu": return <Badge className="bg-warning text-warning-foreground">V servisu</Badge>;
    case "vyřazeno": return <Badge variant="secondary">Vyřazeno</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

function isValidDateStr(val: string | null | undefined): boolean {
  if (!val) return false;
  try {
    const d = parseISO(val);
    return !isNaN(d.getTime());
  } catch { return false; }
}

function formatDateDisplay(val: string | null | undefined): string {
  if (!isValidDateStr(val)) return "—";
  return format(parseISO(val!), "d.M.yyyy");
}

// ── Editable field components ──

function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const date = isValidDateStr(value) ? parseISO(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-8 text-sm w-full justify-start", !date && "text-muted-foreground")}
        >
          <CalendarIcon className="mr-2 h-3 w-3" />
          {date ? format(date, "d.M.yyyy") : "Vyberte datum"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : "")}
          locale={cs}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

function CurrencyField({ value, onChange, suffix }: { value: string; onChange: (v: string) => void; suffix: string }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        className="h-8 text-sm flex-1"
        type="number"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="text-sm text-muted-foreground whitespace-nowrap">{suffix}</span>
    </div>
  );
}

function DriverSelectField({ value, onChange, onSpravceIdChange }: { value: string; onChange: (v: string) => void; onSpravceIdChange?: (id: string | null) => void }) {
  const [drivers, setDrivers] = useState<{ id: string; name: string }[]>([]);
  const [companyName, setCompanyName] = useState<string>("");
  useEffect(() => {
    Promise.all([
      supabase.from("drivers").select("id, first_name, last_name").eq("status", "aktivní"),
      supabase.from("company_settings").select("name").limit(1).maybeSingle(),
    ]).then(([drvRes, compRes]) => {
      setDrivers((drvRes.data || []).map((d: any) => ({ id: d.id, name: `${d.first_name} ${d.last_name}` })));
      setCompanyName(compRes.data?.name || "Společnost");
    });
  }, []);

  const handleChange = (v: string) => {
    if (v === "__pool__") {
      onChange("POOL");
      onSpravceIdChange?.(null);
    } else {
      const driver = drivers.find(d => d.id === v);
      onChange(driver?.name || v);
      onSpravceIdChange?.(v);
    }
  };

  // Determine current select value from spravce text
  const selectValue = value === "POOL" ? "__pool__" : drivers.find(d => d.name === value)?.id || "";

  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte správce" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__pool__">🏢 POOL – {companyName}</SelectItem>
        {drivers.map((d) => (
          <SelectItem key={d.id} value={d.id}>👤 {d.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EditableField({ field, value, onChange, onEdit }: { field: FieldDef; value: string; onChange: (v: string) => void; onEdit?: (key: string, val: string) => void }) {
  if (field.type === "date") return <DatePickerField value={value} onChange={onChange} />;
  if (field.type === "currency") return <CurrencyField value={value} onChange={onChange} suffix={field.suffix || "Kč"} />;
  if (field.type === "driver_select") return <DriverSelectField value={value} onChange={onChange} onSpravceIdChange={(id) => onEdit?.("spravce_id", id || "__null__")} />;
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
    if (field.type === "date") return formatDateDisplay(val);
    if (field.type === "currency") return val ? `${val} ${field.suffix || "Kč"}` : "—";
    if (field.type === "computed" && field.computeFn) return field.computeFn(vehicle, editData);
    return val || "—";
  };

  // Skip vignettes in regular FieldRow — handled separately
  if (field.type === "vignettes") return null;

  if (field.type === "computed") {
    const computed = field.computeFn ? field.computeFn(vehicle, editData) : "—";
    if (editing) {
      return (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input className="h-8 text-sm bg-muted" value={computed} readOnly />
        </div>
      );
    }
    return (
      <div className="flex justify-between">
        <dt className="text-muted-foreground">{field.label}</dt>
        <dd className="font-medium text-right max-w-[200px] truncate">{computed}</dd>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{field.label}</Label>
        <EditableField field={field} value={editData[field.key] ?? vehicle[field.key] ?? ""} onChange={v => onEdit(field.key, v)} onEdit={onEdit} />
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
  const vignetteField = fields.find(f => f.type === "vignettes");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={editing ? "space-y-3" : ""}>
          {editing ? (
            <>
              {fields.filter(f => f.type !== "vignettes").map(f => <FieldRow key={f.key} field={f} vehicle={vehicle} editing editData={editData} onEdit={onEdit} />)}
              {vignetteField && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{vignetteField.label}</Label>
                  <VehicleVignettes vehicleId={vehicle.id} editing />
                </div>
              )}
            </>
          ) : (
            <dl className="space-y-3 text-sm">
              {fields.filter(f => f.type !== "vignettes").map(f => <FieldRow key={f.key} field={f} vehicle={vehicle} editing={false} editData={editData} onEdit={onEdit} />)}
              {vignetteField && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{vignetteField.label}</dt>
                  <dd className="font-medium text-right">
                    <VehicleVignettes vehicleId={vehicle.id} editing={false} />
                  </dd>
                </div>
              )}
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
  const [mileageRecords, setMileageRecords] = useState<{ km: number; recorded_at: string }[]>([]);
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([
    { value: "Praha", label: "Praha" },
    { value: "Brno", label: "Brno" },
    { value: "Liberec", label: "Liberec" },
  ]);
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "branches").maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const arr = JSON.parse(data.value) as string[];
            setBranchOptions(arr.map(b => ({ value: b, label: b })));
          } catch {}
        }
      });
  }, []);

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

  useEffect(() => {
    if (!id) return;
    supabase.from("trip_logs").select("km_end, date")
      .eq("vehicle_id", id).not("km_end", "is", null).order("date", { ascending: false })
      .then(({ data }) => setMileageRecords(
        ((data as any[]) || []).map(r => ({ km: r.km_end, recorded_at: r.date }))
      ));
  }, [id]);

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
    // Remove computed fields from save payload
    const payload: Record<string, any> = { ...editData };
    delete payload.doba_leasingu;
    delete payload.dalnicni_znamka;

    // Convert spravce_id null marker
    if (payload.spravce_id === "__null__") {
      payload.spravce_id = null;
    }

    if (Object.keys(payload).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vehicles").update(payload as any).eq("id", id!);
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
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <Gauge className="h-4 w-4" />
            {mileageRecords.length > 0 ? (
              <span>
                <span className="font-medium text-foreground">{mileageRecords[0].km.toLocaleString("cs-CZ")} km</span>
                {" "}· k {format(parseISO(mileageRecords[0].recorded_at), "d. M. yyyy", { locale: cs })}
              </span>
            ) : (
              <span>Žádný záznam</span>
            )}
          </div>
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

      <VehicleAlerts vehicle={vehicle} mileageRecords={mileageRecords} />

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
          <TabsTrigger value="service">
            <Wrench className="mr-2 h-4 w-4" />Servis
          </TabsTrigger>
          <TabsTrigger value="triplog">
            <BookOpen className="mr-2 h-4 w-4" />Kniha jízd
          </TabsTrigger>
          <TabsTrigger value="fuelcards">
            <CreditCard className="mr-2 h-4 w-4" />Tankovací karty
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <EditableCard title="Základní informace" fields={BASIC_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
            {showLeasing && (
              <EditableCard title="Leasing" fields={LEASING_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
            )}
            <EditableCard title="Dokumenty a kontroly" fields={DOC_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
            <EditableCard title="Provozní údaje" fields={getOpsFields(branchOptions)} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
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


        <TabsContent value="service" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <VehicleService vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triplog" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <VehicleTripLogInline vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuelcards" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <VehicleFuelCards vehicleId={vehicle.id} defaultOwner={vehicle.spravce} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
