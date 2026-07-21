import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

// Map Czech headers to DB columns
const HEADER_MAP: Record<string, string> = {
  "název vozu": "nazev_vozu", "nazev vozu": "nazev_vozu", "nazev_vozu": "nazev_vozu",
  "značka": "znacka", "znacka": "znacka", "značka / model": "znacka", "model": "znacka",
  "rz": "rz", "spz": "rz", "registrační značka": "rz",
  "vin": "vin",
  "správce": "spravce", "spravce": "spravce",
  "vlastník": "vlastnik", "vlastnik": "vlastnik",
  "typ vlastnictví": "typ_vlastnictvi", "typ_vlastnictvi": "typ_vlastnictvi",
  "leasingová společnost": "leasingova_spolecnost", "leasingova_spolecnost": "leasingova_spolecnost",
  "doba leasingu": "doba_leasingu",
  "nájezd/rok": "najezd_za_rok", "najezd za rok": "najezd_za_rok", "nájezd za rok": "najezd_za_rok",
  "měsíční splátka": "mesicni_splatka", "mesicni_splatka": "mesicni_splatka",
  "leasing od": "datum_zahajeni_leasingu", "datum zahájení leasingu": "datum_zahajeni_leasingu",
  "leasing do": "datum_ukonceni_leasingu", "datum ukončení leasingu": "datum_ukonceni_leasingu",
  "č. smlouvy": "cislo_smlouvy_leasing", "číslo smlouvy": "cislo_smlouvy_leasing",
  "stk": "stk",
  "dálniční známka": "dalnicni_znamka",
  "zelená karta": "zelena_karta",
  "velký tp": "velky_tp",
  "malý tp": "maly_tp",
  "tankovací karty": "tankovaci_karty",
  "lokalita": "lokalita",
  "poznámky": "poznamky", "poznamky": "poznamky",
  "status": "status", "stav": "status",
  "v užívání od": "v_uzivani_od",
  "v užívání do": "v_uzivani_do",
  "uskladnění pneu": "misto_uskladneni_pneu",
  "lékárnička": "lekarnicka",
  "cena pronájmu": "cena_pronajmu",
  "srážka soukr.": "srazka_soukrome", "srážka soukromé": "srazka_soukrome",
  "parkování": "parkovaci_stani", "parkovací stání": "parkovaci_stani",
  "náhradní klíč": "nahradni_klic",
};

const VALID_COLUMNS = new Set(Object.values(HEADER_MAP));

interface PreviewRow {
  data: Record<string, string>;
  valid: boolean;
  error?: string;
}

interface Props {
  onImported: () => void;
}

export default function VehicleImport({ onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

      if (jsonRows.length === 0) {
        toast({ title: "Prázdný soubor", variant: "destructive" });
        return;
      }

      // Map headers
      const rawHeaders = Object.keys(jsonRows[0]);
      const mappedCols: string[] = [];
      const headerMapping: Record<string, string> = {};

      rawHeaders.forEach(h => {
        const normalized = h.toLowerCase().trim();
        const mapped = HEADER_MAP[normalized];
        if (mapped) {
          mappedCols.push(mapped);
          headerMapping[h] = mapped;
        }
      });

      setColumns(mappedCols);

      const rows: PreviewRow[] = jsonRows.map(row => {
        const mapped: Record<string, string> = {};
        Object.entries(row).forEach(([key, val]) => {
          const col = headerMapping[key];
          if (col) mapped[col] = String(val || "").trim();
        });

        // Validate
        const valid = !!(mapped.znacka || mapped.rz);
        const error = valid ? undefined : "Chybí značka nebo RZ";

        // Defaults
        if (!mapped.status) mapped.status = "aktivní";
        if (!mapped.typ_vlastnictvi) mapped.typ_vlastnictvi = "majetek";

        return { data: mapped, valid, error };
      });

      setPreview(rows);
      setImported(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    const validRows = preview.filter(r => r.valid);
    if (validRows.length === 0) {
      toast({ title: "Žádné platné řádky", variant: "destructive" });
      return;
    }

    setImporting(true);

    // Fetch drivers to resolve spravce_id
    const { data: allDrivers } = await supabase.from("drivers").select("id, first_name, last_name");
    const driverMap = new Map((allDrivers || []).map((d: any) => [`${d.first_name} ${d.last_name}`, d.id]));

    const rows = validRows.map(r => {
      const row: Record<string, any> = { ...r.data };
      if (row.spravce && driverMap.has(row.spravce)) {
        row.spravce_id = driverMap.get(row.spravce);
      }
      return row;
    });

    const { error } = await supabase.from("vehicles").insert(rows);
    if (error) {
      toast({ title: "Chyba importu", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Importováno ${validRows.length} vozidel` });
      setImported(true);
      onImported();
    }
    setImporting(false);
  };

  const reset = () => {
    setPreview([]);
    setColumns([]);
    setImported(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="mr-2 h-4 w-4" />Import z Excelu</Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hromadný import vozidel</DialogTitle>
        </DialogHeader>

        {preview.length === 0 ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Nahrajte Excel soubor (.xlsx) s vozidly. Sloupce budou automaticky namapovány podle názvů hlaviček.
              Podporované sloupce: Značka, RZ, VIN, Správce, Vlastník, Lokalita, STK, Status...
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">{preview.length} řádků</Badge>
              <Badge className="bg-success text-success-foreground">{preview.filter(r => r.valid).length} platných</Badge>
              {preview.some(r => !r.valid) && (
                <Badge variant="destructive">{preview.filter(r => !r.valid).length} neplatných</Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                Namapované sloupce: {columns.join(", ")}
              </span>
            </div>

            <div className="overflow-x-auto border rounded-md max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Značka</TableHead>
                    <TableHead>RZ</TableHead>
                    <TableHead>Správce</TableHead>
                    <TableHead>Lokalita</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Stav</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i} className={row.valid ? "" : "bg-destructive/5"}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell>{row.data.znacka || "—"}</TableCell>
                      <TableCell>{row.data.rz || "—"}</TableCell>
                      <TableCell>{row.data.spravce || "—"}</TableCell>
                      <TableCell>{row.data.lokalita || "—"}</TableCell>
                      <TableCell>{row.data.status || "—"}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <span className="flex items-center gap-1 text-destructive text-xs">
                            <AlertTriangle className="h-3 w-3" />{row.error}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {imported && (
              <p className="text-sm text-success font-medium flex items-center gap-2">
                <Check className="h-4 w-4" /> Import dokončen!
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {preview.length > 0 && !imported && (
            <>
              <Button variant="outline" onClick={reset}>Zrušit</Button>
              <Button onClick={handleImport} disabled={importing || preview.filter(r => r.valid).length === 0}>
                {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importovat {preview.filter(r => r.valid).length} vozidel
              </Button>
            </>
          )}
          {imported && <Button onClick={() => { setOpen(false); reset(); }}>Zavřít</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
