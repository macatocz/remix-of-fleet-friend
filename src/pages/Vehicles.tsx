import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Columns3, Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import VehicleDocuments from "@/components/VehicleDocuments";

// All available columns definition
const ALL_COLUMNS = [
  { key: "znacka", label: "Značka" },
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

type ColumnKey = typeof ALL_COLUMNS[number]["key"];

const DEFAULT_VISIBLE: ColumnKey[] = [
  "znacka", "spravce", "rz", "vlastnik", "stk", "lokalita", "status"
];

const STORAGE_KEY = "vehicles-visible-columns";

function getStoredColumns(): ColumnKey[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_VISIBLE;
}

const statusBadge = (status: string) => {
  switch (status) {
    case "aktivní": return <Badge className="bg-success text-success-foreground">Aktivní</Badge>;
    case "v_servisu": return <Badge className="bg-warning text-warning-foreground">V servisu</Badge>;
    case "vyřazeno": return <Badge variant="secondary">Vyřazeno</Badge>;
    default: return <Badge>{status}</Badge>;
  }
};

interface VehicleFormData {
  znacka: string; spravce: string; rz: string; vin: string; vlastnik: string;
  velky_tp: string; maly_tp: string; tankovaci_karty: string; stk: string;
  dalnicni_znamka: string; zelena_karta: string; v_uzivani_od: string;
  v_uzivani_do: string; misto_uskladneni_pneu: string; lekarnicka: string;
  cena_pronajmu: string; srazka_soukrome: string; parkovaci_stani: string;
  nahradni_klic: string; poznamky: string; lokalita: string; status: string;
}

const emptyForm: VehicleFormData = {
  znacka: "", spravce: "", rz: "", vin: "", vlastnik: "", velky_tp: "",
  maly_tp: "", tankovaci_karty: "", stk: "", dalnicni_znamka: "",
  zelena_karta: "", v_uzivani_od: "", v_uzivani_do: "",
  misto_uskladneni_pneu: "", lekarnicka: "", cena_pronajmu: "",
  srazka_soukrome: "", parkovaci_stani: "", nahradni_klic: "",
  poznamky: "", lokalita: "", status: "aktivní",
};

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lokalitaFilter, setLokalitaFilter] = useState("all");
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(getStoredColumns);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<VehicleFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [detailVehicle, setDetailVehicle] = useState<any>(null);
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

  useEffect(() => { fetchVehicles(); }, []);

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filtered = vehicles.filter((v) => {
    const searchStr = `${v.znacka || ""} ${v.spravce || ""} ${v.rz || ""} ${v.vin || ""}`.toLowerCase();
    const matchSearch = searchStr.includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    const matchLokalita = lokalitaFilter === "all" || v.lokalita === lokalitaFilter;
    return matchSearch && matchStatus && matchLokalita;
  });

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

  const renderCellValue = (vehicle: any, key: ColumnKey) => {
    const val = vehicle[key];
    if (key === "status") return statusBadge(val || "aktivní");
    return val || "—";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vozidla</h1>
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
                <div><Label>Správce</Label><Input placeholder="Jméno správce" value={form.spravce} onChange={e => updateForm("spravce", e.target.value)} /></div>
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

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Hledat (značka, správce, RZ, VIN)..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={lokalitaFilter} onValueChange={setLokalitaFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny lokality</SelectItem>
                {lokality.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="aktivní">Aktivní</SelectItem>
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {ALL_COLUMNS.filter(c => visibleColumns.includes(c.key)).map(col => (
                      <TableHead key={col.key} className="whitespace-nowrap">{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length} className="text-center py-8 text-muted-foreground">
                        Žádná vozidla nenalezena
                      </TableCell>
                    </TableRow>
                  ) : (
                     filtered.map((v) => (
                       <TableRow key={v.id} className="cursor-pointer" onClick={() => setDetailVehicle(v)}>
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
      {/* Vehicle detail dialog */}
      <Dialog open={!!detailVehicle} onOpenChange={(open) => !open && setDetailVehicle(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailVehicle?.znacka || "Detail vozidla"} — {detailVehicle?.rz || ""}</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="info">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Údaje</TabsTrigger>
              <TabsTrigger value="documents" className="flex-1">
                <FileText className="mr-2 h-4 w-4" />Dokumenty
              </TabsTrigger>
            </TabsList>
            <TabsContent value="info" className="mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {ALL_COLUMNS.map(col => (
                  <div key={col.key}>
                    <span className="text-muted-foreground">{col.label}:</span>{" "}
                    <span className="font-medium">{detailVehicle?.[col.key] || "—"}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="documents" className="mt-4">
              {detailVehicle && <VehicleDocuments vehicleId={detailVehicle.id} />}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
