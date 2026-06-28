import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import {
  MEAL_RATES_BY_YEAR, FOREIGN_MEAL_RATES_BY_YEAR,
  FUEL_PRICE_BY_YEAR, KM_RATE_BY_YEAR, LATEST_YEAR,
} from "@/lib/travel/calc";

export function TravelRatesSettings() {
  const years = Object.keys(MEAL_RATES_BY_YEAR).map(Number).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Roční sazebník cestovních příkazů</AlertTitle>
        <AlertDescription>
          Sazby se v cestovním příkazu vybírají automaticky podle <strong>data cesty</strong>.
          Hodnoty vychází z vyhlášek MF ČR. Pro rok {LATEST_YEAR} doplňte oficiální hodnoty
          po vydání vyhlášky (vychází obvykle v prosinci předchozího roku).
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => {
                const r = MEAL_RATES_BY_YEAR[y];
                return (
                  <TableRow key={y}>
                    <TableCell className="font-medium">
                      {y} {y === LATEST_YEAR && <Badge variant="secondary" className="ml-2">aktuální</Badge>}
                    </TableCell>
                    <TableCell className="text-right">{r["5_12"]} Kč</TableCell>
                    <TableCell className="text-right">{r["12_18"]} Kč</TableCell>
                    <TableCell className="text-right">{r["18_plus"]} Kč</TableCell>
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
          <CardDescription>Základní náhrada Kč/km a průměrná cena PHM (Natural 95).</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rok</TableHead>
                <TableHead className="text-right">Sazba Kč/km</TableHead>
                <TableHead className="text-right">Cena PHM Kč/l</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map((y) => (
                <TableRow key={y}>
                  <TableCell className="font-medium">{y}</TableCell>
                  <TableCell className="text-right">{KM_RATE_BY_YEAR[y]?.toFixed(2)} Kč</TableCell>
                  <TableCell className="text-right">{FUEL_PRICE_BY_YEAR[y]?.toFixed(2)} Kč</TableCell>
                </TableRow>
              ))}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(FOREIGN_MEAL_RATES_BY_YEAR[LATEST_YEAR] || {}).map(([c, r]) => (
                <TableRow key={c}>
                  <TableCell className="font-medium">{c}</TableCell>
                  <TableCell>{r.currency}</TableCell>
                  <TableCell className="text-right">{r.full} {r.currency}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Sazby pro nový rok aktualizuje vývojář v souboru <code>src/lib/travel/calc.ts</code>.
        Firemní přepsání (override) je v databázi připraveno a doplníme UI editor po potvrzení sazeb pro {LATEST_YEAR}.
      </p>
    </div>
  );
}