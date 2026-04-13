import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search } from "lucide-react";

interface Vehicle {
  id: string;
  spz: string;
  brand: string;
  model: string;
  year: number;
  vin: string;
  fuelType: string;
  status: "aktivní" | "v_servisu" | "vyřazeno";
}

const mockVehicles: Vehicle[] = [
  { id: "1", spz: "1AB 2345", brand: "Škoda", model: "Octavia", year: 2021, vin: "TMBAG7NE1M0123456", fuelType: "Nafta", status: "aktivní" },
  { id: "2", spz: "2CD 6789", brand: "Volkswagen", model: "Passat", year: 2020, vin: "WVWZZZ3CZWE123456", fuelType: "Benzín", status: "aktivní" },
  { id: "3", spz: "3EF 1234", brand: "Ford", model: "Transit", year: 2019, vin: "WF0XXXGCFXKY12345", fuelType: "Nafta", status: "v_servisu" },
  { id: "4", spz: "4GH 5678", brand: "Škoda", model: "Superb", year: 2022, vin: "TMBAG9NE1N0654321", fuelType: "Nafta", status: "aktivní" },
  { id: "5", spz: "5IJ 9012", brand: "Toyota", model: "Corolla", year: 2023, vin: "SB1K83BE10E123456", fuelType: "Hybrid", status: "aktivní" },
];

const statusBadge = (status: Vehicle["status"]) => {
  switch (status) {
    case "aktivní": return <Badge className="bg-success text-success-foreground">Aktivní</Badge>;
    case "v_servisu": return <Badge className="bg-warning text-warning-foreground">V servisu</Badge>;
    case "vyřazeno": return <Badge variant="secondary">Vyřazeno</Badge>;
  }
};

export default function Vehicles() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = mockVehicles.filter((v) => {
    const matchSearch = `${v.brand} ${v.model} ${v.spz}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vozidla</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Přidat vozidlo</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nové vozidlo</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>SPZ</Label><Input placeholder="1AB 2345" /></div>
                <div><Label>VIN</Label><Input placeholder="VIN kód" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Značka</Label><Input placeholder="Škoda" /></div>
                <div><Label>Model</Label><Input placeholder="Octavia" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Rok výroby</Label><Input type="number" placeholder="2023" /></div>
                <div>
                  <Label>Typ paliva</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Vyberte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="benzin">Benzín</SelectItem>
                      <SelectItem value="nafta">Nafta</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="elektro">Elektro</SelectItem>
                      <SelectItem value="lpg">LPG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="w-full">Uložit vozidlo</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Hledat (značka, model, SPZ)..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Všechny stavy</SelectItem>
                <SelectItem value="aktivní">Aktivní</SelectItem>
                <SelectItem value="v_servisu">V servisu</SelectItem>
                <SelectItem value="vyřazeno">Vyřazeno</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SPZ</TableHead>
                <TableHead>Značka</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Rok</TableHead>
                <TableHead>Palivo</TableHead>
                <TableHead>Stav</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id} className="cursor-pointer">
                  <TableCell className="font-medium">{v.spz}</TableCell>
                  <TableCell>{v.brand}</TableCell>
                  <TableCell>{v.model}</TableCell>
                  <TableCell>{v.year}</TableCell>
                  <TableCell>{v.fuelType}</TableCell>
                  <TableCell>{statusBadge(v.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
