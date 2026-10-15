import VehicleFuelRecords from "@/components/fuel/VehicleFuelRecords";
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
import { ArrowLeft, FileText, CalendarDays, Info, Loader2, Pencil, Save, X, Trash2, Wrench, BookOpen, CreditCard, CalendarIcon, Gauge, ClipboardCheck, AlertTriangle, Sparkles, Car, User, FileSignature, ShieldCheck, Settings2, QrCode } from "lucide-react";
import { InfoCard, PlateBadge, YesNoBadge, DeadlineAlert, MiniProgress, deadlineLevel, relativeDeadline } from "@/components/vehicle/InfoCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, differenceInMonths } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { buildVehicleName } from "@/lib/vehicleName";
import { useAppPublicUrl } from "@/hooks/useAppPublicUrl";
import VehicleDocuments from "@/components/VehicleDocuments";
import VehicleCalendar from "@/components/VehicleCalendar";

import VehicleAlerts from "@/components/VehicleAlerts";
import LeasingMileagePanel from "@/components/leasing/LeasingMileagePanel";
import VehicleService from "@/components/VehicleService";
import VehicleTripLogInline from "@/components/VehicleTripLogInline";
import VehicleFuelCards from "@/components/VehicleFuelCards";
import { VehicleQRCode } from "@/components/VehicleQRCode";
import VehicleVignettes from "@/components/VehicleVignettes";
import VehicleServicePlan from "@/components/VehicleServicePlan";
import VehicleHandover from "@/components/VehicleHandover";
import VehicleIncidents from "@/components/VehicleIncidents";


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
  { key: "nazev_vozu", label: "Název vozu" },
  { key: "znacka", label: "Značka / Model" },
  { key: "spravce", label: "Správce", type: "driver_select" },
  { key: "hlavni_uzivatel", label: "Hlavní uživatel (u POOL vozů)" },
  { key: "rz", label: "RZ" },
  { key: "vin", label: "VIN" },
  { key: "vlastnik", label: "Vlastník" },
  {
    key: "kategorie", label: "Kategorie", type: "select",
    options: [
      { value: "A", label: "A – Ředitel" },
      { value: "B", label: "B – Management" },
      { value: "C", label: "C – Konzultant" },
      { value: "D", label: "D – Referent" },
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
  { key: "vychozi_stav_tachometru", label: "Výchozí stav tachometru", suffix: "km" },
  {
    key: "celkovy_najezd", label: "Celkový nájezd", type: "computed",
    computeFn: (vehicle, editData) => {
      const najezdRaw = editData.najezd_za_rok ?? vehicle.najezd_za_rok;
      const from = editData.datum_zahajeni_leasingu ?? vehicle.datum_zahajeni_leasingu;
      const to = editData.datum_ukonceni_leasingu ?? vehicle.datum_ukonceni_leasingu;
      const najezd = parseFloat(String(najezdRaw ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
      if (!najezd || !from || !to) return "—";
      try {
        const months = differenceInMonths(parseISO(to), parseISO(from));
        if (months <= 0) return "—";
        const total = Math.round(najezd * months / 12);
        return `${total.toLocaleString("cs-CZ")} km`;
      } catch { return "—"; }
    }
  },
  {
    key: "konecny_stav_tachometru", label: "Konečný stav tachometru", type: "computed",
    computeFn: (vehicle, editData) => {
      const vychoziRaw = editData.vychozi_stav_tachometru ?? vehicle.vychozi_stav_tachometru;
      const najezdRaw = editData.najezd_za_rok ?? vehicle.najezd_za_rok;
      const from = editData.datum_zahajeni_leasingu ?? vehicle.datum_zahajeni_leasingu;
      const to = editData.datum_ukonceni_leasingu ?? vehicle.datum_ukonceni_leasingu;
      const vychozi = parseFloat(String(vychoziRaw ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
      const najezd = parseFloat(String(najezdRaw ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
      if (!najezd || !from || !to) return "—";
      try {
        const months = differenceInMonths(parseISO(to), parseISO(from));
        if (months <= 0) return "—";
        const total = Math.round(najezd * months / 12);
        const konecny = (isNaN(vychozi) ? 0 : vychozi) + total;
        return `${konecny.toLocaleString("cs-CZ")} km`;
      } catch { return "—"; }
    }
  },
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

const kategorieLabel: Record<string, string> = {
  A: "A – Ředitel",
  B: "B – Management",
  C: "C – Konzultant",
  D: "D – Referent",
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

function headerAccentClass(status: string) {
  switch (status) {
    case "aktivní": return "border-l-primary";
    case "objednáno": return "border-l-info";
    case "v_servisu": return "border-l-warning";
    case "vyřazeno": return "border-l-muted-foreground/60";
    default: return "border-l-muted-foreground/60";
  }
}

function headerIconClass(status: string) {
  switch (status) {
    case "aktivní": return "bg-primary/10 text-primary";
    case "objednáno": return "bg-info/10 text-info";
    case "v_servisu": return "bg-warning/10 text-warning";
    case "vyřazeno": return "bg-muted text-muted-foreground";
    default: return "bg-muted text-muted-foreground";
  }
}

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
  const YESNO_KEYS = ["maly_tp", "tankovaci_karty", "lekarnicka"];
  const CRITICAL_DATE_KEYS = ["stk", "zelena_karta"];
  const DEADLINE_KEYS = ["stk", "zelena_karta", "datum_ukonceni_leasingu", "v_uzivani_do", "leasing_do"];

  const renderValue = (key: string, val: any) => {
    if (key === "status") return statusBadge(val || "aktivní");
    if (key === "typ_vlastnictvi") return typVlastnictviLabel[val] || val || "—";
    if (key === "kategorie") {
      if (!val) return <span className="text-muted-foreground">—</span>;
      return <Badge variant="secondary" className="font-semibold">{kategorieLabel[val] || val}</Badge>;
    }
    if (YESNO_KEYS.includes(key)) return <YesNoBadge value={val} />;
    if (field.type === "date") {
      if (!isValidDateStr(val)) return <span className="text-muted-foreground">—</span>;
      const isDeadline = DEADLINE_KEYS.includes(key);
      const lvl = isDeadline ? deadlineLevel(val) : "none";
      const rel = isDeadline ? relativeDeadline(val) : null;
      return (
        <span className="inline-flex items-baseline gap-1.5">
          <span className={cn(lvl === "expired" && "text-destructive", lvl === "soon" && "text-warning")}>
            {formatDateDisplay(val)}
          </span>
          {rel && <span className="text-[11px] font-normal text-muted-foreground">{rel}</span>}
        </span>
      );
    }
    if (field.type === "currency") {
      if (val === null || val === undefined || val === "") return <span className="text-muted-foreground">—</span>;
      const num = Number(val);
      const text = isNaN(num) ? String(val) : num.toLocaleString("cs-CZ", { maximumFractionDigits: 2 });
      return <span>{text} <span className="text-xs font-normal text-muted-foreground">{field.suffix || "Kč"}</span></span>;
    }
    if (field.type === "computed" && field.computeFn) return field.computeFn(vehicle, editData);
    if (field.suffix && val) {
      const num = Number(String(val).replace(/\s/g, "").replace(",", "."));
      const text = isNaN(num) ? String(val) : num.toLocaleString("cs-CZ");
      return <span>{text} <span className="text-xs font-normal text-muted-foreground">{field.suffix}</span></span>;
    }
    return val || <span className="text-muted-foreground">—</span>;
  };

  // Skip vignettes in regular FieldRow — handled separately
  if (field.type === "vignettes") return null;

  // Kritické termíny jako zvýrazněný blok
  if (!editing && CRITICAL_DATE_KEYS.includes(field.key)) {
    const lvl = deadlineLevel(vehicle[field.key]);
    if (lvl === "expired" || lvl === "soon") {
      return <DeadlineAlert label={field.label} dateText={formatDateDisplay(vehicle[field.key])} level={lvl} />;
    }
  }

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
      <div className="flex justify-between rounded px-2 py-1 transition-colors hover:bg-muted/50">
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
    <div className="flex justify-between rounded px-2 py-1.5 transition-colors hover:bg-muted/50">
      <dt className="text-muted-foreground">{field.label}</dt>
      <dd className="font-semibold text-right max-w-[230px] truncate">{renderValue(field.key, vehicle[field.key])}</dd>
    </div>
  );
}

function LeasingProgress({ vehicle, mileageRecords }: { vehicle: any; mileageRecords?: { vehicle_id: string; km: number; recorded_at: string }[] }) {
  const from = vehicle.datum_zahajeni_leasingu;
  const to = vehicle.datum_ukonceni_leasingu;
  if (!isValidDateStr(from) || !isValidDateStr(to)) return null;
  const start = parseISO(from);
  const end = parseISO(to);
  // Lease end date is inclusive (same rule as src/lib/leasing/mileage.ts).
  const endInclusive = new Date(end.getTime());
  endInclusive.setDate(endInclusive.getDate() + 1);
  const totalMonths = differenceInMonths(endInclusive, start);
  if (totalMonths <= 0) return null;
  const elapsed = Math.max(0, Math.min(totalMonths, differenceInMonths(new Date(), start)));
  const remaining = totalMonths - elapsed;

  const najezd = parseFloat(String(vehicle.najezd_za_rok ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  const totalKm = najezd ? Math.round(najezd * totalMonths / 12) : 0;
  const startKm = parseFloat(String(vehicle.vychozi_stav_tachometru ?? "").replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "")) || 0;
  const latest = (mileageRecords ?? [])
    .filter((m) => m.vehicle_id === vehicle.id)
    .sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0];
  const drivenKm = latest ? Math.max(0, latest.km - startKm) : null;
  const leftKm = drivenKm !== null ? totalKm - drivenKm : null;

  return (
    <div className="space-y-3 rounded-lg bg-muted/40 p-3">
      <MiniProgress
        label="Doba leasingu"
        valueText={`${elapsed} / ${totalMonths} měs. (zbývá ${remaining})`}
        percent={(elapsed / totalMonths) * 100}
      />
      {totalKm > 0 && (
        <MiniProgress
          label={leftKm !== null ? `Skutečně ujeto v leasingu (zbývá ${leftKm.toLocaleString("cs-CZ")} km)` : "Skutečně ujeto v leasingu"}
          valueText={drivenKm !== null ? `${drivenKm.toLocaleString("cs-CZ")} / ${totalKm.toLocaleString("cs-CZ")} km` : `— / ${totalKm.toLocaleString("cs-CZ")} km`}
          percent={drivenKm !== null ? (drivenKm / totalKm) * 100 : 0}
        />
      )}
    </div>
  );
}

function EditableCard({ title, icon, accent, right, header, fields, vehicle, editing, editData, onEdit }: {
  title: string; icon: React.ReactNode; accent?: "primary" | "neutral"; right?: React.ReactNode; header?: React.ReactNode;
  fields: FieldDef[]; vehicle: any; editing: boolean; editData: Record<string, string>; onEdit: (key: string, val: string) => void;
}) {
  const vignetteField = fields.find(f => f.type === "vignettes");

  return (
    <InfoCard title={title} icon={icon} accent={accent} right={editing ? undefined : right} className="h-full">
        <div className={editing ? "space-y-3" : ""}>
          {!editing && header}
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
            <dl className="space-y-1 text-sm">
              {fields.filter(f => f.type !== "vignettes").map(f => <FieldRow key={f.key} field={f} vehicle={vehicle} editing={false} editData={editData} onEdit={onEdit} />)}
              {vignetteField && (
                <div className="flex justify-between rounded px-2 py-1.5 transition-colors hover:bg-muted/50">
                  <dt className="text-muted-foreground">{vignetteField.label}</dt>
                  <dd className="font-medium text-right">
                    <VehicleVignettes vehicleId={vehicle.id} editing={false} />
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
    </InfoCard>
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
  const [cardPrinting, setCardPrinting] = useState(false);
  const [mileageRecords, setMileageRecords] = useState<{ vehicle_id: string; km: number; recorded_at: string; source: "vehicle_mileage" | "trip_log" }[]>([]);
  const [branchOptions, setBranchOptions] = useState<{ value: string; label: string }[]>([
    { value: "Praha", label: "Praha" },
    { value: "Brno", label: "Brno" },
    { value: "Liberec", label: "Liberec" },
  ]);
  const { toast } = useToast();
  const { url: appPublicUrl } = useAppPublicUrl();

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

  const printVehicleCard = async () => {
    if (!vehicle) return;
    setCardPrinting(true);
    try {
      const [{ generateVehicleCardPdf }, stkRes, insRes, spravceRes] = await Promise.all([
        import("@/lib/vehicle/cardPdf"),
        supabase.from("inspections").select("valid_until").eq("vehicle_id", vehicle.id)
          .order("valid_until", { ascending: false }).limit(1),
        supabase.from("insurance").select("insurer, type, valid_until").eq("vehicle_id", vehicle.id)
          .order("valid_until", { ascending: false }),
        vehicle.spravce_id
          ? supabase.from("drivers").select("phone, email").eq("id", vehicle.spravce_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const contact = spravceRes?.data
        ? [spravceRes.data.phone, spravceRes.data.email].filter(Boolean).join(" · ")
        : null;
      const currentKm = mileageRecords.length
        ? Math.max(...mileageRecords.map(m => m.km))
        : Number(vehicle.vychozi_stav_tachometru) || null;
      await generateVehicleCardPdf(vehicle, {
        spravceContact: contact,
        stkValidUntil: (stkRes.data?.[0] as any)?.valid_until ?? null,
        insurance: (insRes.data as any) || [],
        currentKm,
        publicUrl: appPublicUrl,
      });

    } catch (e: any) {
      toast({ title: "Chyba tisku", description: e.message, variant: "destructive" });
    }
    setCardPrinting(false);
  };

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("trip_logs").select("vehicle_id, km_end, date")
        .eq("vehicle_id", id).not("km_end", "is", null).order("date", { ascending: false }),
      supabase.from("vehicle_mileage").select("km, recorded_at").eq("vehicle_id", id),
    ]).then(([trips, manual]) => setMileageRecords([
      ...((trips.data as any[]) || []).map(r => ({ vehicle_id: id, km: r.km_end, recorded_at: r.date, source: "trip_log" as const })),
      ...((manual.data as any[]) || []).map(r => ({ vehicle_id: id, km: r.km, recorded_at: r.recorded_at, source: "vehicle_mileage" as const })),
    ].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))));
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
    delete payload.celkovy_najezd;
    delete payload.konecny_stav_tachometru;
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
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <Card className={cn("overflow-hidden border-l-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]", headerAccentClass(vehicle.status))}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 pl-4">
          <div className="flex items-start gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/vozidla")} className="shrink-0 mt-1">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-full border", headerIconClass(vehicle.status))}>
              <Car className="h-6 w-6" />
            </span>
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">{vehicle.nazev_vozu || vehicle.znacka || "Vozidlo"}</h1>
                {statusBadge(vehicle.status)}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                <PlateBadge rz={vehicle.rz} />
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {vehicle.spravce || "—"}
                </span>
                {vehicle.znacka && (
                  <span>{vehicle.znacka}</span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" />
                  {mileageRecords.length > 0 ? (
                    <>
                      <span className="font-medium text-foreground">{mileageRecords[0].km.toLocaleString("cs-CZ")} km</span>
                      <span>· k {format(parseISO(mileageRecords[0].recorded_at), "d. M. yyyy", { locale: cs })}</span>
                    </>
                  ) : (
                    <span>Žádný záznam</span>
                  )}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const suggested = buildVehicleName({
                      znacka: editData.znacka ?? vehicle.znacka,
                      spravce: editData.spravce ?? vehicle.spravce,
                      lokalita: editData.lokalita ?? vehicle.lokalita,
                    });
                    handleEdit("nazev_vozu", suggested);
                  }}
                  title="Vygenerovat z modelu a správce"
                >
                  <Sparkles className="mr-2 h-4 w-4" />Návrh názvu
                </Button>
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
      </Card>

      <VehicleAlerts
        vehicle={vehicle}
        mileageRecords={mileageRecords}
        tripLogs={mileageRecords
          .filter(r => r.source === "trip_log")
          .map(r => ({ vehicle_id: r.vehicle_id, km_end: r.km, date: r.recorded_at }))}
      />

      {showLeasing && (
        <LeasingMileagePanel vehicleId={vehicle.id} vehicle={vehicle} />
      )}

      <Tabs defaultValue="info" className="w-full max-w-full">
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <TabsList className="w-max min-w-full justify-start">
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
          <TabsTrigger value="handover">
            <ClipboardCheck className="mr-2 h-4 w-4" />Předání
          </TabsTrigger>
          <TabsTrigger value="incidents">
            <AlertTriangle className="mr-2 h-4 w-4" />Škody
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="info" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 items-start">
            <EditableCard
              title="Základní informace"
              icon={<Car className="h-4 w-4" />}
              accent="primary"
              right={<PlateBadge rz={vehicle.rz} />}
              header={
                <div className="mb-3 pb-3 border-b">
                  <p className="text-lg font-bold leading-tight">{vehicle.nazev_vozu || vehicle.znacka || "—"}</p>
                  {vehicle.znacka && vehicle.nazev_vozu && (
                    <p className="text-sm text-muted-foreground">{vehicle.znacka}</p>
                  )}
                </div>
              }
              fields={BASIC_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit}
            />
            {showLeasing && (
              <EditableCard
                title="Leasing"
                icon={<FileSignature className="h-4 w-4" />}
                header={<div className="mb-3"><LeasingProgress vehicle={vehicle} mileageRecords={mileageRecords} /></div>}
                fields={LEASING_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit}
              />
            )}
            <EditableCard title="Dokumenty a kontroly" icon={<ShieldCheck className="h-4 w-4" />} fields={DOC_FIELDS} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
            <EditableCard title="Provozní údaje" icon={<Settings2 className="h-4 w-4" />} fields={getOpsFields(branchOptions)} vehicle={vehicle} editing={editing} editData={editData} onEdit={handleEdit} />
            <Card className="md:col-span-2 overflow-hidden border-l-4 border-l-muted-foreground/60">
              <div className="flex items-center gap-2.5 border-b px-5 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <QrCode className="h-4 w-4" />
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80">QR kód vozidla</h3>
              </div>
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="shrink-0">
                <VehicleQRCode vehicleId={vehicle.id} label={`${vehicle.znacka || ""} ${vehicle.rz || ""}`.trim()} />
                </div>
                <div className="flex-1">
                <p className="text-xs text-muted-foreground">
                  Vytiskněte a nalepte do vozu — řidič nascanováním ihned otevře kartu vozidla.
                </p>
                <div className="mt-4">
                  <Button variant="outline" className="w-full sm:w-auto" onClick={printVehicleCard} disabled={cardPrinting}>
                    {cardPrinting ? "Připravuji PDF…" : "Tisk karty vozidla (PDF)"}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Jednostránkový přehled vozu včetně QR kódu, správce, platností a výbavy.
                  </p>
                </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-6 max-w-full overflow-x-auto">
          <Card>
            <CardContent className="pt-6">
              <VehicleCalendar vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-6 max-w-full overflow-x-auto">
          <Card>
            <CardContent className="pt-6">
              <VehicleDocuments vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="service" className="mt-6 max-w-full overflow-x-auto">
          <Tabs defaultValue="history">
            <TabsList>
              <TabsTrigger value="history">Historie servisu</TabsTrigger>
              <TabsTrigger value="plan">Servisní plán</TabsTrigger>
            </TabsList>
            <TabsContent value="history" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <VehicleService vehicleId={vehicle.id} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="plan" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <VehicleServicePlan vehicleId={vehicle.id} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="triplog" className="mt-6 max-w-full overflow-x-auto">
          <Card>
            <CardContent className="pt-6">
              <VehicleTripLogInline vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuelcards" className="mt-6 max-w-full space-y-6 overflow-x-auto">
          <Card>
            <CardContent className="pt-6">
              <VehicleFuelCards vehicleId={vehicle.id} defaultOwner={vehicle.spravce} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 space-y-3">
              <h3 className="text-sm font-semibold">Tankování a účtenky</h3>
              <VehicleFuelRecords vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="handover" className="mt-6 max-w-full overflow-x-auto">
          <Card>
            <CardContent className="pt-6">
              <VehicleHandover vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="mt-6 max-w-full overflow-x-auto">
          <Card>
            <CardContent className="pt-6">
              <VehicleIncidents vehicleId={vehicle.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
