import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Plus, CalendarDays } from "lucide-react";

const mockReservations = [
  { id: "1", vehicle: "Škoda Octavia (1AB 2345)", driver: "Jan Novák", from: "2026-04-14", to: "2026-04-16", purpose: "Obchodní jednání Praha", status: "schváleno" },
  { id: "2", vehicle: "VW Passat (2CD 6789)", driver: "Marie Dvořáková", from: "2026-04-15", to: "2026-04-15", purpose: "Návštěva klienta", status: "čeká" },
  { id: "3", vehicle: "Toyota Corolla (5IJ 9012)", driver: "Tomáš Černý", from: "2026-04-17", to: "2026-04-18", purpose: "Školení Brno", status: "čeká" },
  { id: "4", vehicle: "Škoda Superb (4GH 5678)", driver: "Petr Svoboda", from: "2026-04-10", to: "2026-04-11", purpose: "Dodávka materiálu", status: "dokončeno" },
];

const statusBadge = (status: string) => {
  switch (status) {
    case "schváleno": return <Badge className="bg-success text-success-foreground">Schváleno</Badge>;
    case "čeká": return <Badge className="bg-warning text-warning-foreground">Čeká na schválení</Badge>;
    case "dokončeno": return <Badge variant="secondary">Dokončeno</Badge>;
    case "zamítnuto": return <Badge variant="destructive">Zamítnuto</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Reservations() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Rezervace</h1>
        <Button><Plus className="mr-2 h-4 w-4" />Nová rezervace</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="h-5 w-5" />
            Přehled rezervací
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vozidlo</TableHead>
                <TableHead>Řidič</TableHead>
                <TableHead>Od</TableHead>
                <TableHead>Do</TableHead>
                <TableHead>Účel</TableHead>
                <TableHead>Stav</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReservations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.vehicle}</TableCell>
                  <TableCell>{r.driver}</TableCell>
                  <TableCell>{new Date(r.from).toLocaleDateString("cs-CZ")}</TableCell>
                  <TableCell>{new Date(r.to).toLocaleDateString("cs-CZ")}</TableCell>
                  <TableCell>{r.purpose}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
