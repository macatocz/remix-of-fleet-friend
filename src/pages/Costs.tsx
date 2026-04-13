import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Plus, Fuel, Receipt } from "lucide-react";

const fuelLogs = [
  { id: "1", vehicle: "Škoda Octavia (1AB 2345)", date: "2026-04-10", liters: 45, price: 1710, km: 52340 },
  { id: "2", vehicle: "Ford Transit (3EF 1234)", date: "2026-04-09", liters: 65, price: 2470, km: 98760 },
  { id: "3", vehicle: "VW Passat (2CD 6789)", date: "2026-04-08", liters: 40, price: 1560, km: 67890 },
  { id: "4", vehicle: "Toyota Corolla (5IJ 9012)", date: "2026-04-07", liters: 35, price: 1400, km: 23450 },
];

const costsByCategory = [
  { category: "PHM", leden: 62000, unor: 58000, brezen: 65000, duben: 61000 },
  { category: "Servis", leden: 45000, unor: 32000, brezen: 28000, duben: 52000 },
  { category: "Pojištění", leden: 18000, unor: 18000, brezen: 18000, duben: 18000 },
  { category: "STK", leden: 0, unor: 2500, brezen: 0, duben: 5000 },
];

const monthlyTotals = [
  { month: "Led", total: 125000 },
  { month: "Úno", total: 110500 },
  { month: "Bře", total: 111000 },
  { month: "Dub", total: 136000 },
];

export default function Costs() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Náklady a PHM</h1>
        <Button><Plus className="mr-2 h-4 w-4" />Nový záznam</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Měsíční přehled nákladů</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTotals}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: number) => `${v.toLocaleString("cs-CZ")} Kč`} />
              <Bar dataKey="total" name="Celkem" fill="hsl(217, 71%, 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Tabs defaultValue="fuel">
        <TabsList>
          <TabsTrigger value="fuel" className="gap-2"><Fuel className="h-4 w-4" />Tankování</TabsTrigger>
          <TabsTrigger value="overview" className="gap-2"><Receipt className="h-4 w-4" />Přehled nákladů</TabsTrigger>
        </TabsList>

        <TabsContent value="fuel">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozidlo</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Litry</TableHead>
                    <TableHead>Cena</TableHead>
                    <TableHead>Stav km</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fuelLogs.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.vehicle}</TableCell>
                      <TableCell>{new Date(f.date).toLocaleDateString("cs-CZ")}</TableCell>
                      <TableCell>{f.liters} l</TableCell>
                      <TableCell>{f.price.toLocaleString("cs-CZ")} Kč</TableCell>
                      <TableCell>{f.km.toLocaleString("cs-CZ")} km</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overview">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategorie</TableHead>
                    <TableHead>Leden</TableHead>
                    <TableHead>Únor</TableHead>
                    <TableHead>Březen</TableHead>
                    <TableHead>Duben</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costsByCategory.map((c) => (
                    <TableRow key={c.category}>
                      <TableCell className="font-medium">{c.category}</TableCell>
                      <TableCell>{c.leden.toLocaleString("cs-CZ")} Kč</TableCell>
                      <TableCell>{c.unor.toLocaleString("cs-CZ")} Kč</TableCell>
                      <TableCell>{c.brezen.toLocaleString("cs-CZ")} Kč</TableCell>
                      <TableCell>{c.duben.toLocaleString("cs-CZ")} Kč</TableCell>
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
