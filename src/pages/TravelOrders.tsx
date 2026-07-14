import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCZK } from "@/lib/travel/calc";
import { STATUS_LABEL, STATUS_BADGE_CLASS } from "@/lib/travel/status";
import { cn } from "@/lib/utils";

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "Vše" },
  { key: "koncept", label: "Koncepty" },
  { key: "odeslano", label: "Odesláno" },
  { key: "vyuctovano", label: "K schválení" },
  { key: "schvaleno", label: "Schválené" },
  { key: "zamitnuto", label: "Zamítnuté" },
];

export default function TravelOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["travel_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("travel_orders")
        .select("*, drivers(first_name,last_name), vehicles(rz,znacka)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    return data.filter((o: any) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      const driver = `${o.drivers?.first_name || ""} ${o.drivers?.last_name || ""}`.toLowerCase();
      return (
        o.number?.toLowerCase().includes(q) ||
        driver.includes(q) ||
        o.vehicles?.rz?.toLowerCase().includes(q) ||
        o.purpose?.toLowerCase().includes(q)
      );
    });
  }, [data, search, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data?.length || 0 };
    (data || []).forEach((o: any) => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2">
          <FileText className="h-6 w-6 text-primary mt-1" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Cestovní příkazy</h1>
              {data && <span className="text-muted-foreground">({data.length})</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Tuzemské i zahraniční cesťáky včetně výpočtu stravného a exportu PDF.
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/cestovni-prikazy/novy")}>
          <Plus className="h-4 w-4" />
          Nový příkaz
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Hledat (číslo, řidič, RZ, účel)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            <span className="ml-1 opacity-70">({counts[f.key] || 0})</span>
          </Button>
        ))}
      </div>

      <Card>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
            <p>Žádné cestovní příkazy</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Číslo</TableHead>
                <TableHead>Řidič</TableHead>
                <TableHead>Vozidlo</TableHead>
                <TableHead>Období</TableHead>
                <TableHead>Účel</TableHead>
                <TableHead>Stav</TableHead>
                <TableHead className="text-right">Částka</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o: any) => (
                <TableRow
                  key={o.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/cestovni-prikazy/${o.id}`)}
                >
                  <TableCell className="font-mono">{o.number}</TableCell>
                  <TableCell>{o.drivers ? `${o.drivers.first_name} ${o.drivers.last_name}` : "—"}</TableCell>
                  <TableCell>{o.vehicles?.rz || "—"}</TableCell>
                  <TableCell className="text-sm">{o.date_from} → {o.date_to}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{o.purpose || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(STATUS_BADGE_CLASS[o.status])}>
                      {STATUS_LABEL[o.status] || o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCZK(Number(o.total_amount) || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}