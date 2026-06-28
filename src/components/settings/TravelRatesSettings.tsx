import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Info, Lock } from "lucide-react";
import {
  MEAL_RATES_BY_YEAR, FOREIGN_MEAL_RATES_BY_YEAR,
  FUEL_PRICE_BY_YEAR, FUEL_PRICE_DETAIL_BY_YEAR, KM_RATE_BY_YEAR, LATEST_YEAR,
} from "@/lib/travel/calc";
import { TravelRatesEditor } from "./TravelRatesEditor";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export function TravelRatesSettings() {
  const years = Object.keys(MEAL_RATES_BY_YEAR).map(Number).sort((a, b) => b - a);
  const { isAdmin } = useAuth();
  const { data: ov } = useCompanySettings();

  const view = (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Roční sazebník cestovních příkazů</AlertTitle>
        <AlertDescription>
          Sazby se v cestovním příkazu vybírají automaticky podle <strong>data cesty</strong>.
          Tabulky níže ukazují státní sazby; firemní override se zobrazí jako badge.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Tuzemské stravné (Kč)</CardTitle>
          <CardDescription>Horní hranice státní sféry podle vyhlášky MF ČR.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rok</TableHead>
                <TableHead className="text-right">5–12 h</TableHead>
                <TableHead className="text-right">12–18 h</TableHead>
                <TableHead className="text-right">nad 18 h</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => {
                const r = ov?.meal_rates_override?.[String(y)] || MEAL_RATES_BY_YEAR[y];
                const isOv = !!ov?.meal_rates_override?.[String(y)];
                return (
                  <TableRow key={y}>
                    <TableCell className="font-medium">
                      {y} {y === LATEST_YEAR && <Badge variant="secondary" className="ml-2">aktuální</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{r["5_12"]} Kč</TableCell>
                    <TableCell className="text-right">{r["12_18"]} Kč</TableCell>
                    <TableCell className="text-right">{r["18_plus"]} Kč</TableCell>
                    <TableCell>{isOv && <Badge>Firemní override</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vlastní vozidlo</CardTitle>
          <CardDescription>Základní náhrada Kč/km a průměrné ceny PHM dle vyhlášky.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rok</TableHead>
                <TableHead className="text-right">Sazba Kč/km</TableHead>
                <TableHead className="text-right">N95 Kč/l</TableHead>
                <TableHead className="text-right">N98 Kč/l</TableHead>
                <TableHead className="text-right">Nafta Kč/l</TableHead>
                <TableHead className="text-right">El. Kč/kWh</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => {
                const d = FUEL_PRICE_DETAIL_BY_YEAR[y];
                const kmOv = ov?.km_rate_override?.[String(y)];
                const fuOv = ov?.fuel_price_override?.[String(y)];
                const kmVal = kmOv ?? KM_RATE_BY_YEAR[y];
                const n95Val = fuOv ?? d?.n95 ?? FUEL_PRICE_BY_YEAR[y];
                return (
                  <TableRow key={y}>
                    <TableCell className="font-medium">{y}</TableCell>
                    <TableCell className="text-right">{kmVal?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{n95Val?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{d?.n98?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell className="text-right">{d?.diesel?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell className="text-right">{d?.electricity?.toFixed(2) ?? "—"}</TableCell>
                    <TableCell>{(kmOv != null || fuOv != null) && <Badge>Override</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zahraniční stravné — plné denní sazby ({LATEST_YEAR})</CardTitle>
          <CardDescription>Pásma: 1–12 h = 1/3, 12–18 h = 2/3, nad 18 h = plná sazba.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Země</TableHead>
                <TableHead>Měna</TableHead>
                <TableHead className="text-right">Plná sazba</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(FOREIGN_MEAL_RATES_BY_YEAR[LATEST_YEAR] || {}).map(([c, r]) => {
                const o = ov?.foreign_meal_rates_override?.[String(LATEST_YEAR)]?.[c];
                const eff = o || r;
                return (
                  <TableRow key={c}>
                    <TableCell className="font-medium">{c}</TableCell>
                    <TableCell>{eff.currency}</TableCell>
                    <TableCell className="text-right">{eff.full} {eff.currency}</TableCell>
                    <TableCell>{o && <Badge>Override</Badge>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Tabs defaultValue="view" className="space-y-4">
      <TabsList>
        <TabsTrigger value="view">Přehled</TabsTrigger>
        <TabsTrigger value="edit" disabled={!isAdmin}>
          {!isAdmin && <Lock className="h-3 w-3 mr-1" />}Editace sazeb
        </TabsTrigger>
      </TabsList>
      <TabsContent value="view">{view}</TabsContent>
      <TabsContent value="edit">
        {isAdmin ? <TravelRatesEditor /> : (
          <Alert><Lock className="h-4 w-4" /><AlertTitle>Pouze pro administrátory</AlertTitle>
            <AlertDescription>Editace sazeb je dostupná uživatelům s rolí admin.</AlertDescription></Alert>
        )}
      </TabsContent>
    </Tabs>
  );
}