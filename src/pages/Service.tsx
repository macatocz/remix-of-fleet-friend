import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wrench, Shield, FileCheck } from "lucide-react";

const serviceRecords = [
  { id: "1", vehicle: "Škoda Octavia (1AB 2345)", type: "Výměna oleje", date: "2026-03-15", cost: 3500, description: "Pravidelná výměna oleje a filtrů" },
  { id: "2", vehicle: "Ford Transit (3EF 1234)", type: "Oprava brzd", date: "2026-04-01", cost: 12800, description: "Výměna brzdových destiček a kotoučů" },
  { id: "3", vehicle: "VW Passat (2CD 6789)", type: "Klimatizace", date: "2026-03-20", cost: 4200, description: "Doplnění a kontrola klimatizace" },
];

const inspections = [
  { id: "1", vehicle: "Škoda Octavia (1AB 2345)", date: "2025-06-15", validUntil: "2027-06-15", status: "platná" },
  { id: "2", vehicle: "VW Passat (2CD 6789)", date: "2024-11-20", validUntil: "2026-11-20", status: "platná" },
  { id: "3", vehicle: "Ford Transit (3EF 1234)", date: "2024-05-10", validUntil: "2026-05-10", status: "brzy_expiruje" },
];

const insurances = [
  { id: "1", vehicle: "Škoda Octavia (1AB 2345)", insurer: "Česká pojišťovna", type: "Havarijní + POV", validUntil: "2027-01-15" },
  { id: "2", vehicle: "VW Passat (2CD 6789)", insurer: "Allianz", type: "POV", validUntil: "2026-04-30" },
  { id: "3", vehicle: "Ford Transit (3EF 1234)", insurer: "Kooperativa", type: "Havarijní + POV", validUntil: "2026-12-01" },
];

export default function Service() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Servis a údržba</h1>
        <Button><Plus className="mr-2 h-4 w-4" />Nový záznam</Button>
      </div>

      <Tabs defaultValue="service">
        <TabsList>
          <TabsTrigger value="service" className="gap-2"><Wrench className="h-4 w-4" />Servis</TabsTrigger>
          <TabsTrigger value="inspections" className="gap-2"><FileCheck className="h-4 w-4" />STK</TabsTrigger>
          <TabsTrigger value="insurance" className="gap-2"><Shield className="h-4 w-4" />Pojištění</TabsTrigger>
        </TabsList>

        <TabsContent value="service">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozidlo</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Náklady</TableHead>
                    <TableHead>Popis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceRecords.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.vehicle}</TableCell>
                      <TableCell>{s.type}</TableCell>
                      <TableCell>{new Date(s.date).toLocaleDateString("cs-CZ")}</TableCell>
                      <TableCell>{s.cost.toLocaleString("cs-CZ")} Kč</TableCell>
                      <TableCell className="text-muted-foreground">{s.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozidlo</TableHead>
                    <TableHead>Datum STK</TableHead>
                    <TableHead>Platnost do</TableHead>
                    <TableHead>Stav</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspections.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.vehicle}</TableCell>
                      <TableCell>{new Date(i.date).toLocaleDateString("cs-CZ")}</TableCell>
                      <TableCell>{new Date(i.validUntil).toLocaleDateString("cs-CZ")}</TableCell>
                      <TableCell>
                        {i.status === "platná" ?
                          <Badge className="bg-success text-success-foreground">Platná</Badge> :
                          <Badge className="bg-warning text-warning-foreground">Brzy expiruje</Badge>
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozidlo</TableHead>
                    <TableHead>Pojišťovna</TableHead>
                    <TableHead>Typ</TableHead>
                    <TableHead>Platnost do</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {insurances.map((ins) => (
                    <TableRow key={ins.id}>
                      <TableCell className="font-medium">{ins.vehicle}</TableCell>
                      <TableCell>{ins.insurer}</TableCell>
                      <TableCell>{ins.type}</TableCell>
                      <TableCell>{new Date(ins.validUntil).toLocaleDateString("cs-CZ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
