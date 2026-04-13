import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useState } from "react";

const mockDrivers = [
  { id: "1", name: "Jan Novák", phone: "+420 601 234 567", email: "novak@firma.cz", license: "B", vehicle: "Škoda Octavia (1AB 2345)" },
  { id: "2", name: "Petr Svoboda", phone: "+420 602 345 678", email: "svoboda@firma.cz", license: "B, C", vehicle: "Ford Transit (3EF 1234)" },
  { id: "3", name: "Marie Dvořáková", phone: "+420 603 456 789", email: "dvorakova@firma.cz", license: "B", vehicle: "Toyota Corolla (5IJ 9012)" },
  { id: "4", name: "Tomáš Černý", phone: "+420 604 567 890", email: "cerny@firma.cz", license: "B", vehicle: "—" },
];

export default function Drivers() {
  const [search, setSearch] = useState("");

  const filtered = mockDrivers.filter((d) =>
    `${d.name} ${d.email} ${d.vehicle}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Řidiči</h1>
        <Button><Plus className="mr-2 h-4 w-4" />Přidat řidiče</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Hledat řidiče..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jméno</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Řidičák</TableHead>
                <TableHead>Přiřazené vozidlo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="cursor-pointer">
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell>{d.email}</TableCell>
                  <TableCell><Badge variant="outline">{d.license}</Badge></TableCell>
                  <TableCell>{d.vehicle}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
