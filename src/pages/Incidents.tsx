import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Loader2, Search } from "lucide-react";

interface Row {
  id: string;
  vehicle_id: string;
  date: string;
  location: string | null;
  description: string | null;
  estimated_cost: number | null;
  status: string;
  vehicles?: { znacka: string | null; rz: string | null };
}

const STATUS_LABEL: Record<string, { label: string; variant: any }> = {
  nahlaseno: { label: "Nahlášeno", variant: "default" },
  v_reseni: { label: "V řešení", variant: "secondary" },
  uzavreno: { label: "Uzavřeno", variant: "outline" },
};

export default function Incidents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("incidents")
        .select("*, vehicles(znacka, rz)")
        .order("date", { ascending: false });
      setRows((data || []) as any);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (
        !(r.location || "").toLowerCase().includes(s) &&
        !(r.description || "").toLowerCase().includes(s) &&
        !(r.vehicles?.znacka || "").toLowerCase().includes(s) &&
        !(r.vehicles?.rz || "").toLowerCase().includes(s)
      )
        return false;
    }
    return true;
  });

  const totalCost = filtered.reduce((s, r) => s + Number(r.estimated_cost || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-6 w-6 text-warning mt-1" />
        <div>
          <h1 className="text-2xl font-bold">Škody a pojistné události</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Evidence nehod a pojistných událostí včetně fotodokumentace.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Celkem záznamů</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{rows.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Otevřené</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rows.filter((r) => r.status !== "uzavreno").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Odhadované náklady (filtr)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCost.toLocaleString("cs-CZ")} Kč</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Hledat..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="nahlaseno">Nahlášeno</SelectItem>
                <SelectItem value="v_reseni">V řešení</SelectItem>
                <SelectItem value="uzavreno">Uzavřeno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Žádné záznamy.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Vozidlo</TableHead>
                  <TableHead>Místo</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Odhad (Kč)</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const sl = STATUS_LABEL[r.status] || { label: r.status, variant: "outline" };
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{new Date(r.date).toLocaleDateString("cs-CZ")}</TableCell>
                      <TableCell className="font-medium">{r.vehicles?.znacka || "—"} ({r.vehicles?.rz || "—"})</TableCell>
                      <TableCell>{r.location || "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{r.description || "—"}</TableCell>
                      <TableCell>{r.estimated_cost ? Number(r.estimated_cost).toLocaleString("cs-CZ") : "—"}</TableCell>
                      <TableCell><Badge variant={sl.variant}>{sl.label}</Badge></TableCell>
                      <TableCell>
                        <Link to={`/vozidla/${r.vehicle_id}`}>
                          <Button size="sm" variant="outline">Detail vozidla</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
