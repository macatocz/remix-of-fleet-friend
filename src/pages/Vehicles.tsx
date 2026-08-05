import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Columns3, Loader2, Save, Bookmark, Trash2, Star, Download, X, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VehicleImport from "@/components/VehicleImport";
import * as XLSX from "xlsx";

// All available columns definition
const ALL_COLUMNS = [
  { key: "nazev_vozu", label: "Název vozu" },
  { key: "znacka", label: "Značka" },
  { key: "spravce", label: "Správce" },
  { key: "rz", label: "RZ" },
  { key: "vin", label: "VIN" },
  { key: "kategorie", label: "Kategorie" },
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

type ColumnKey = typeof ALL_COLUMNS[number]["key"];

const DEFAULT_VISIBLE: ColumnKey[] = [
  "nazev_vozu", "rz", "spravce", "kategorie", "vlastnik", "stk", "lokalita", "status"
];

const STORAGE_KEY = "vehicles-visible-columns";
const SAVED_VIEWS_KEY = "vehicles-saved-views";

interface SavedView {
  id: string;
  name: string;
  columns: ColumnKey[];
  statusFilter: string;
  lokalitaFilter: string;
}

function getStoredColumns(): ColumnKey[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_VISIBLE;
}

function getSavedViews(): SavedView[] {
  try {
    const stored = localStorage.getItem(SAVED_VIEWS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

const statusBadge = (status: string) => {
  switch (status) {
    case "aktivní": return <Badge className="bg-success text-success-foreground">Aktivní</Badge>;
    case "objednáno": return <Badge className="bg-info text-info-foreground">Objednáno</Badge>;
    case "v_servisu": return <Badge className="bg-warning text-warning-foreground">V servisu</Badge>;
    case "vyřazeno": return <Badge variant="secondary">Vyřazeno</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

interface VehicleFormData {
  znacka: string; spravce: string; spravce_id: string | null; rz: string; vin: string; vlastnik: string;
  typ_vlastnictvi: string; leasingova_spolecnost: string; doba_leasingu: string;
  najezd_za_rok: string; mesicni_splatka: string; datum_zahajeni_leasingu: string;
  datum_ukonceni_leasingu: string; cislo_smlouvy_leasing: string;
  velky_tp: string; maly_tp: string; tankovaci_karty: string; stk: string;
  dalnicni_znamka: string; zelena_karta: string; v_uzivani_od: string;
  v_uzivani_do: string; misto_uskladneni_pneu: string; lekarnicka: string;
  cena_pronajmu: string; srazka_soukrome: string; parkovaci_stani: string;
  nahradni_klic: string; poznamky: string; lokalita: string; status: string;
}

const emptyForm: VehicleFormData = {
  znacka: "", spravce: "", spravce_id: null, rz: "", vin: "", vlastnik: "",
  typ_vlastnictvi: "majetek", leasingova_spolecnost: "", doba_leasingu: "",
  najezd_za_rok: "", mesicni_splatka: "", datum_zahajeni_leasingu: "",
  datum_ukonceni_leasingu: "", cislo_smlouvy_leasing: "",
  velky_tp: "", maly_tp: "", tankovaci_karty: "", stk: "", dalnicni_znamka: "",
  zelena_karta: "", v_uzivani_od: "", v_uzivani_do: "",
  misto_uskladneni_pneu: "", lekarnicka: "", cena_pronajmu: "",
  srazka_soukrome: "", parkovaci_stani: "", nahradni_klic: "",
  poznamky: "", lokalita: "", status: "aktivní",
};

export default function Vehicles() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lokalitaFilter, setLokalitaFilter] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(getStoredColumns);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<VehicleFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>(getSavedViews);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [driversList, setDriversList] = useState<{ id: string; name: string }[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qrExporting, setQrExporting] = useState(false);
  const [bulkDialog, setBulkDialog] = useState<null | "status" | "spravce" | "kategorie" | "lokalita">(null);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkSpravceId, setBulkSpravceId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchVehicles = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("vehicles").select("*").order("created_at");
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      setVehicles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
    Promise.all([
      supabase.from("drivers").select("id, first_name, last_name").eq("status", "aktivní"),
      supabase.from("company_settings").select("name").limit(1).maybeSingle(),
    ]).then(([drvRes, compRes]) => {
      setDriversList((drvRes.data || []).map((d: any) => ({ id: d.id, name: `${d.first_name} ${d.last_name}` })));
      setCompanyName(compRes.data?.name || "Společnost");
    });
  }, []);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveViewId(null);
  };

  const saveCurrentView = () => {
    if (!newViewName.trim()) return;
    const view: SavedView = {
      id: crypto.randomUUID(),
      name: newViewName.trim(),
      columns: visibleColumns,
      statusFilter,
      lokalitaFilter,
    };
    const updated = [...savedViews, view];
    setSavedViews(updated);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    setActiveViewId(view.id);
    setNewViewName("");
    setSaveViewDialogOpen(false);
    toast({ title: "Pohled uložen", description: `„${view.name}" byl uložen.` });
  };

  const loadView = (view: SavedView) => {
    setVisibleColumns(view.columns);
    setStatusFilter(view.statusFilter);
    setLokalitaFilter(view.lokalitaFilter);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(view.columns));
    setActiveViewId(view.id);
  };

  const deleteView = (id: string) => {
    const updated = savedViews.filter(v => v.id !== id);
    setSavedViews(updated);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    if (activeViewId === id) setActiveViewId(null);
    toast({ title: "Pohled smazán" });
  };

  const updateCurrentView = () => {
    if (!activeViewId) return;
    const updated = savedViews.map(v =>
      v.id === activeViewId ? { ...v, columns: visibleColumns, statusFilter, lokalitaFilter } : v
    );
    setSavedViews(updated);
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(updated));
    toast({ title: "Pohled aktualizován" });
  };

  const { sortKey, sortDirection, handleSort, sortData } = useSortableTable();

  const filtered = sortData(vehicles.filter((v) => {
    const searchStr = `${v.nazev_vozu || ""} ${v.znacka || ""} ${v.spravce || ""} ${v.rz || ""} ${v.vin || ""}`.toLowerCase();
    const matchSearch = searchStr.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchLokalita = lokalitaFilter === "all" || v.lokalita === lokalitaFilter;
    return matchSearch && matchStatus && matchLokalita;
  }));

  const lokality = [...new Set(vehicles.map(v => v.lokalita).filter(Boolean))];

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("vehicles").insert([form]);
    if (error) {
      toast({ title: "Chyba při ukládání", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vozidlo přidáno" });
      setForm(emptyForm);
      setDialogOpen(false);
      fetchVehicles();
    }
    setSaving(false);
  };

  const updateForm = (key: keyof VehicleFormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const renderCellValue = (vehicle: any, key: string) => {
    const val = vehicle[key];
    if (key === "status") return statusBadge(val || "aktivní");
    if (key === "typ_vlastnictvi") {
      const labels: Record<string, string> = { majetek: "Majetek", operativni_leasing: "Operativní leasing", financni_leasing: "Finanční leasing" };
      return labels[val] || val || "—";
    }
    return val || "—";
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      if (prev.size === filtered.length) return new Set();
      return new Set(filtered.map((v: any) => v.id));
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const exportSelected = () => {
    const rows = vehicles.filter(v => selectedIds.has(v.id)).map(v => {
      const row: Record<string, any> = {};
      ALL_COLUMNS.forEach(c => { row[c.label] = v[c.key] ?? ""; });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vozidla");
    XLSX.writeFile(wb, `vozidla_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Export hotov", description: `Exportováno ${rows.length} vozidel.` });
  };

  const exportSelectedQr = async () => {
    const list = vehicles.filter(v => selectedIds.has(v.id));
    if (!list.length) return;
    setQrExporting(true);
    try {
      const { generateQrSheetPdf } = await import("@/lib/vehicle/cardPdf");
      await generateQrSheetPdf(list.map((v: any) => ({ id: v.id, nazev_vozu: v.nazev_vozu, znacka: v.znacka, rz: v.rz })));
      toast({ title: "QR kódy vygenerovány", description: `${list.length} vozidel v PDF.` });
    } catch (e: any) {
      toast({ title: "Chyba exportu", description: e.message, variant: "destructive" });
    }
    setQrExporting(false);
  };

  const applyBulk = async () => {
    if (!bulkDialog) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    let payload: Record<string, any> = {};
    if (bulkDialog === "status") payload = { status: bulkValue };
    if (bulkDialog === "kategorie") payload = { kategorie: bulkValue };
    if (bulkDialog === "lokalita") payload = { lokalita: bulkValue };
    if (bulkDialog === "spravce") {
      if (bulkSpravceId === "__pool__") payload = { spravce: "POOL", spravce_id: null };
      else {
        const drv = driversList.find(d => d.id === bulkSpravceId);
        payload = { spravce: drv?.name || "", spravce_id: bulkSpravceId };
      }
    }
    const { error } = await supabase.from("vehicles").update(payload as any).in("id", ids);
    if (error) {
      toast({ title: "Chyba", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Hromadná změna provedena", description: `Upraveno ${ids.length} vozidel.` });
      setBulkDialog(null);
      setBulkValue("");
      setBulkSpravceId(null);
      clearSelection();
      fetchVehicles();
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vozidla</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Evidence vozidel — leasing, doklady, servis, dokumenty.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VehicleImport onImported={fetchVehicles} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Přidat vozidlo</Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nové vozidlo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Značka / Model</Label><Input placeholder="VW Golf" value={form.znacka} onChange={e => updateForm("znacka", e.target.value)} /></div>
                <div><Label>RZ (SPZ)</Label><Input placeholder="1AB 2345" value={form.rz} onChange={e => updateForm("rz", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>VIN</Label><Input placeholder="VIN kód" value={form.vin} onChange={e => updateForm("vin", e.target.value)} /></div>
                <div>
                  <Label>Správce</Label>
                  <Select
                    value={form.spravce_id || (form.spravce === "POOL" ? "__pool__" : "")}
                    onValueChange={v => {
                      if (v === "__pool__") {
                        setForm(p => ({ ...p, spravce: "POOL", spravce_id: null }));
                      } else {
                        const driver = driversList.find(d => d.id === v);
                        setForm(p => ({ ...p, spravce: driver?.name || "", spravce_id: v }));
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Vyberte správce" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__pool__">🏢 POOL – {companyName}</SelectItem>
                      {driversList.map(d => (
                        <SelectItem key={d.id} value={d.id}>👤 {d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Vlastník</Label><Input placeholder="Arval / Majetek" value={form.vlastnik} onChange={e => updateForm("vlastnik", e.target.value)} /></div>
                <div>
                  <Label>Lokalita</Label>
                  <Select value={form.lokalita} onValueChange={v => updateForm("lokalita", v)}>
                    <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Praha">Praha</SelectItem>
                      <SelectItem value="Liberec">Liberec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Typ vlastnictví a leasing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Typ vlastnictví</Label>
                  <Select value={form.typ_vlastnictvi} onValueChange={v => updateForm("typ_vlastnictvi", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="majetek">Majetek</SelectItem>
                      <SelectItem value="operativni_leasing">Operativní leasing</SelectItem>
                      <SelectItem value="financni_leasing">Finanční leasing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Leasingová společnost</Label><Input placeholder="Arval, ALD, LeasePlan..." value={form.leasingova_spolecnost} onChange={e => updateForm("leasingova_spolecnost", e.target.value)} /></div>
              </div>
              {(form.typ_vlastnictvi === "operativni_leasing" || form.typ_vlastnictvi === "financni_leasing") && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Doba leasingu</Label><Input placeholder="48 měsíců" value={form.doba_leasingu} onChange={e => updateForm("doba_leasingu", e.target.value)} /></div>
                    <div><Label>Nájezd za rok</Label><Input placeholder="30 000 km" value={form.najezd_za_rok} onChange={e => updateForm("najezd_za_rok", e.target.value)} /></div>
                    <div><Label>Měsíční splátka</Label><Input placeholder="9 681,-" value={form.mesicni_splatka} onChange={e => updateForm("mesicni_splatka", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Leasing od</Label><Input placeholder="1.1.2024" value={form.datum_zahajeni_leasingu} onChange={e => updateForm("datum_zahajeni_leasingu", e.target.value)} /></div>
                    <div><Label>Leasing do</Label><Input placeholder="31.12.2027" value={form.datum_ukonceni_leasingu} onChange={e => updateForm("datum_ukonceni_leasingu", e.target.value)} /></div>
                    <div><Label>Č. smlouvy</Label><Input placeholder="LS-2024-001" value={form.cislo_smlouvy_leasing} onChange={e => updateForm("cislo_smlouvy_leasing", e.target.value)} /></div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Velký TP</Label><Input placeholder="CM Praha / Arval" value={form.velky_tp} onChange={e => updateForm("velky_tp", e.target.value)} /></div>
                <div>
                  <Label>Malý TP</Label>
                  <Select value={form.maly_tp} onValueChange={v => updateForm("maly_tp", v)}>
                    <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANO">ANO</SelectItem>
                      <SelectItem value="NE">NE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Tankovací karty + PIN</Label><Input placeholder="SHELL: xxxx MOL: xxxx" value={form.tankovaci_karty} onChange={e => updateForm("tankovaci_karty", e.target.value)} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>STK</Label><Input placeholder="do 19.02.2027" value={form.stk} onChange={e => updateForm("stk", e.target.value)} /></div>
                <div><Label>Dálniční známka</Label><Input placeholder="do 31.1.2026" value={form.dalnicni_znamka} onChange={e => updateForm("dalnicni_znamka", e.target.value)} /></div>
                <div><Label>Zelená karta</Label><Input placeholder="datum" value={form.zelena_karta} onChange={e => updateForm("zelena_karta", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>V užívání od</Label><Input placeholder="datum" value={form.v_uzivani_od} onChange={e => updateForm("v_uzivani_od", e.target.value)} /></div>
                <div><Label>V užívání do</Label><Input placeholder="datum" value={form.v_uzivani_do} onChange={e => updateForm("v_uzivani_do", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Uskladnění pneu</Label><Input placeholder="AT pneu Chodov" value={form.misto_uskladneni_pneu} onChange={e => updateForm("misto_uskladneni_pneu", e.target.value)} /></div>
                <div>
                  <Label>Lékárnička</Label>
                  <Select value={form.lekarnicka} onValueChange={v => updateForm("lekarnicka", v)}>
                    <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANO">ANO</SelectItem>
                      <SelectItem value="NE">NE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Cena pronájmu</Label><Input placeholder="9 681,-" value={form.cena_pronajmu} onChange={e => updateForm("cena_pronajmu", e.target.value)} /></div>
                <div><Label>Srážka za soukr. užívání</Label><Input placeholder="500,-" value={form.srazka_soukrome} onChange={e => updateForm("srazka_soukrome", e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Parkovací stání</Label><Input placeholder="City Tower 322" value={form.parkovaci_stani} onChange={e => updateForm("parkovaci_stani", e.target.value)} /></div>
                <div><Label>Náhradní klíč</Label><Input placeholder="umístění" value={form.nahradni_klic} onChange={e => updateForm("nahradni_klic", e.target.value)} /></div>
              </div>
              <div>
                <Label>Poznámky</Label>
                <Textarea placeholder="Poznámky k vozidlu..." value={form.poznamky} onChange={e => updateForm("poznamky", e.target.value)} />
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Uložit vozidlo
              </Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Hledat (značka, správce, RZ, VIN)..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={lokalitaFilter} onValueChange={v => { setLokalitaFilter(v); setActiveViewId(null); }}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny lokality</SelectItem>
                {lokality.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setActiveViewId(null); }}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="aktivní">Aktivní</SelectItem>
                <SelectItem value="objednáno">Objednáno</SelectItem>
                <SelectItem value="v_servisu">V servisu</SelectItem>
                <SelectItem value="vyřazeno">Vyřazeno</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Nastavení sloupců">
                  <Columns3 className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto">
                <DropdownMenuLabel>Zobrazené sloupce</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ALL_COLUMNS.map(col => (
                  <DropdownMenuCheckboxItem
                    key={col.key}
                    checked={visibleColumns.includes(col.key)}
                    onCheckedChange={() => toggleColumn(col.key)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {col.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Save view button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" title="Uložené pohledy">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Uložené pohledy</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {savedViews.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground text-center">Zatím žádné uložené pohledy</div>
                )}
                {savedViews.map(view => (
                  <DropdownMenuItem key={view.id} className="flex items-center justify-between gap-2" onSelect={() => loadView(view)}>
                    <span className="flex items-center gap-2 truncate">
                      {activeViewId === view.id && <Star className="h-3 w-3 text-primary fill-primary" />}
                      {view.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => { e.stopPropagation(); deleteView(view.id); }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSaveViewDialogOpen(true)}>
                  <Save className="h-4 w-4 mr-2" />Uložit aktuální pohled
                </DropdownMenuItem>
                {activeViewId && (
                  <DropdownMenuItem onSelect={updateCurrentView}>
                    <Save className="h-4 w-4 mr-2" />Aktualizovat „{savedViews.find(v => v.id === activeViewId)?.name}"
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.size > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 p-3 rounded-md bg-primary/10 border border-primary/30">
              <span className="text-sm font-medium">Vybráno: {selectedIds.size}</span>
              <div className="flex-1" />
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog("status"); setBulkValue(""); }}>Změnit stav</Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog("spravce"); setBulkSpravceId(null); }}>Změnit správce</Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog("kategorie"); setBulkValue(""); }}>Změnit kategorii</Button>
              <Button size="sm" variant="outline" onClick={() => { setBulkDialog("lokalita"); setBulkValue(""); }}>Změnit lokalitu</Button>
              <Button size="sm" variant="outline" onClick={exportSelectedQr} disabled={qrExporting}>
                <QrCode className="h-3.5 w-3.5 mr-1" />{qrExporting ? "Generuji…" : "QR kódy PDF"}
              </Button>
              <Button size="sm" variant="outline" onClick={exportSelected}><Download className="h-3.5 w-3.5 mr-1" />Export XLSX</Button>
              <Button size="sm" variant="ghost" onClick={clearSelection}><X className="h-3.5 w-3.5" /></Button>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Vybrat vše"
                      />
                    </TableHead>
                    {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <SortableTableHead key={col.key} sortKey={col.key} currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort} className="whitespace-nowrap">{col.label}</SortableTableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                        Žádná vozidla nenalezena
                      </TableCell>
                    </TableRow>
                  ) : (
                     filtered.map((v) => (
                       <TableRow key={v.id} className="cursor-pointer" data-state={selectedIds.has(v.id) ? "selected" : undefined} onClick={() => navigate(`/vozidla/${v.id}`)}>
                         <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                           <Checkbox
                             checked={selectedIds.has(v.id)}
                             onCheckedChange={() => toggleSelected(v.id)}
                             aria-label={`Vybrat ${v.rz || v.znacka}`}
                           />
                         </TableCell>
                         {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                           <TableCell key={col.key} className="whitespace-nowrap">
                             {renderCellValue(v, col.key)}
                           </TableCell>
                         ))}
                       </TableRow>
                     ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 text-sm text-muted-foreground">
            Celkem: {filtered.length} vozidel
          </div>
        </CardContent>
      </Card>
      {/* Save view dialog */}
      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Uložit pohled</DialogTitle>
            <DialogDescription>Uložte aktuální nastavení sloupců a filtrů jako pojmenovaný pohled.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Název pohledu</Label>
              <Input
                placeholder="Např. Leasing Praha"
                value={newViewName}
                onChange={e => setNewViewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveCurrentView()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveViewDialogOpen(false)}>Zrušit</Button>
            <Button onClick={saveCurrentView} disabled={!newViewName.trim()}>
              <Save className="mr-2 h-4 w-4" />Uložit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk edit dialog */}
      <Dialog open={!!bulkDialog} onOpenChange={(o) => !o && setBulkDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {bulkDialog === "status" && "Hromadná změna stavu"}
              {bulkDialog === "spravce" && "Hromadná změna správce"}
              {bulkDialog === "kategorie" && "Hromadná změna kategorie"}
              {bulkDialog === "lokalita" && "Hromadná změna lokality"}
            </DialogTitle>
            <DialogDescription>Změna se aplikuje na {selectedIds.size} vybraných vozidel.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {bulkDialog === "status" && (
              <Select value={bulkValue} onValueChange={setBulkValue}>
                <SelectTrigger><SelectValue placeholder="Vyberte stav" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktivní">Aktivní</SelectItem>
                  <SelectItem value="objednáno">Objednáno</SelectItem>
                  <SelectItem value="v_servisu">V servisu</SelectItem>
                  <SelectItem value="vyřazeno">Vyřazeno</SelectItem>
                </SelectContent>
              </Select>
            )}
            {bulkDialog === "kategorie" && (
              <Select value={bulkValue} onValueChange={setBulkValue}>
                <SelectTrigger><SelectValue placeholder="Vyberte kategorii" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A – Ředitel</SelectItem>
                  <SelectItem value="B">B – Management</SelectItem>
                  <SelectItem value="C">C – Konzultant</SelectItem>
                  <SelectItem value="D">D – Referent</SelectItem>
                </SelectContent>
              </Select>
            )}
            {bulkDialog === "lokalita" && (
              <Select value={bulkValue} onValueChange={setBulkValue}>
                <SelectTrigger><SelectValue placeholder="Vyberte lokalitu" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Praha">Praha</SelectItem>
                  <SelectItem value="Liberec">Liberec</SelectItem>
                  {lokality.filter(l => l !== "Praha" && l !== "Liberec").map(l => (
                    <SelectItem key={l} value={l as string}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {bulkDialog === "spravce" && (
              <Select value={bulkSpravceId || ""} onValueChange={setBulkSpravceId}>
                <SelectTrigger><SelectValue placeholder="Vyberte správce" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__pool__">🏢 POOL – {companyName}</SelectItem>
                  {driversList.map(d => (
                    <SelectItem key={d.id} value={d.id}>👤 {d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialog(null)}>Zrušit</Button>
            <Button
              onClick={applyBulk}
              disabled={
                (bulkDialog === "status" && !bulkValue) ||
                (bulkDialog === "kategorie" && !bulkValue) ||
                (bulkDialog === "lokalita" && !bulkValue) ||
                (bulkDialog === "spravce" && !bulkSpravceId)
              }
            >
              Aplikovat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
