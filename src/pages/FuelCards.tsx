import { useState } from "react";
import { useSortableTable } from "@/hooks/useSortableTable";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, CreditCard } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusColor: Record<string, string> = {
  "aktivní": "bg-green-100 text-green-800 border-green-200",
  "blokovaná": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "zrušená": "bg-gray-100 text-gray-600 border-gray-200",
};

const providers = ["MOL", "Shell", "Bonett", "Jiné"];
const statuses = ["aktivní", "blokovaná", "zrušená"];

export default function FuelCards() {
  const navigate = useNavigate();
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visiblePins, setVisiblePins] = useState<Set<string>>(new Set());

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["fuel_cards_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_cards")
        .select("*, vehicles(rz, znacka)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { sortKey, sortDirection, handleSort, sortData } = useSortableTable();

  const filtered = sortData(cards.filter((c: any) => {
    if (providerFilter !== "all" && c.provider !== providerFilter) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  }), (item: any, key: string) => {
    if (key === "vehicle") return item.vehicles?.rz || "";
    return item[key];
  });

  const togglePin = (id: string) => {
    setVisiblePins((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Tankovací karty</h1>
      </div>

      <div className="flex gap-4">
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni poskytovatelé</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Stav" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Načítání…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">Žádné tankovací karty.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="vehicle" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Vozidlo</SortableTableHead>
              <SortableTableHead sortKey="provider" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Provider</SortableTableHead>
              <SortableTableHead sortKey="card_number" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Číslo karty</SortableTableHead>
              <TableHead>PIN</TableHead>
              <SortableTableHead sortKey="owner_name" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Vlastník</SortableTableHead>
              <SortableTableHead sortKey="valid_until" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Platnost do</SortableTableHead>
              <SortableTableHead sortKey="status" currentSortKey={sortKey} sortDirection={sortDirection} onSort={handleSort}>Stav</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((card: any) => {
              const vehicle = card.vehicles as any;
              const expiring = isExpiringSoon(card.valid_until);
              return (
                <TableRow
                  key={card.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/vozidla/${card.vehicle_id}`)}
                >
                  <TableCell className="font-medium">
                    {vehicle?.rz || "—"}{" "}
                    <span className="text-muted-foreground text-xs">{vehicle?.znacka || ""}</span>
                  </TableCell>
                  <TableCell>{card.provider}</TableCell>
                  <TableCell>{card.card_number || "—"}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-sm">
                        {visiblePins.has(card.id) ? card.pin || "—" : card.pin ? "••••" : "—"}
                      </span>
                      {card.pin && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePin(card.id)}>
                          {visiblePins.has(card.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{card.owner_name || "—"}</TableCell>
                  <TableCell className={expiring ? "text-orange-600 font-medium" : ""}>
                    {card.valid_until ? new Date(card.valid_until).toLocaleDateString("cs-CZ") : "—"}
                    {expiring && <span className="ml-1 text-xs">⚠️</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColor[card.status] || ""} variant="outline">
                      {card.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
