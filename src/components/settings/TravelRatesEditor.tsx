import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RotateCcw, Save, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  MEAL_RATES_BY_YEAR, FOREIGN_MEAL_RATES_BY_YEAR,
  FUEL_PRICE_BY_YEAR, KM_RATE_BY_YEAR, LATEST_YEAR,
  type MealRates, type ForeignMealRate,
} from "@/lib/travel/calc";
import { useCompanySettings } from "@/hooks/useCompanySettings";

const YEARS = Object.keys(MEAL_RATES_BY_YEAR).map(Number).sort((a, b) => b - a);

function num(v: string): number | null {
  if (v === "" || v == null) return null;
  const n = Number(v.replace(",", "."));
  if (!isFinite(n) || n < 0 || n > 99999) return null;
  return n;
}

export function TravelRatesEditor() {
  const { data, loading, saveOverrides } = useCompanySettings();
  const [year, setYear] = useState<number>(LATEST_YEAR);
  const [saving, setSaving] = useState(false);

  // Domácí stravné
  const [meal512, setMeal512] = useState("");
  const [meal1218, setMeal1218] = useState("");
  const [meal18p, setMeal18p] = useState("");
  // Kč/km a PHM
  const [km, setKm] = useState("");
  const [fuel, setFuel] = useState("");
  // Zahraniční stravné
  const [foreign, setForeign] = useState<Record<string, { currency: string; full: string }>>({});

  // Načti aktuální hodnoty (override > default) do inputů, když se mění rok / data
  useEffect(() => {
    if (!data) return;
    const mo = data.meal_rates_override?.[String(year)];
    setMeal512(mo ? String(mo["5_12"]) : "");
    setMeal1218(mo ? String(mo["12_18"]) : "");
    setMeal18p(mo ? String(mo["18_plus"]) : "");
    setKm(data.km_rate_override?.[String(year)] != null ? String(data.km_rate_override[String(year)]) : "");
    setFuel(data.fuel_price_override?.[String(year)] != null ? String(data.fuel_price_override[String(year)]) : "");
    const fo = data.foreign_meal_rates_override?.[String(year)] || {};
    const base = FOREIGN_MEAL_RATES_BY_YEAR[year] || FOREIGN_MEAL_RATES_BY_YEAR[LATEST_YEAR] || {};
    const merged: Record<string, { currency: string; full: string }> = {};
    Object.keys(base).forEach((c) => {
      const o = fo[c];
      merged[c] = { currency: o?.currency || base[c].currency, full: o ? String(o.full) : "" };
    });
    Object.keys(fo).forEach((c) => {
      if (!merged[c]) merged[c] = { currency: fo[c].currency, full: String(fo[c].full) };
    });
    setForeign(merged);
  }, [data, year]);

  const stateDefault = MEAL_RATES_BY_YEAR[year];

  // —— Save akce ——
  const saveDomestic = async () => {
    const a = num(meal512), b = num(meal1218), c = num(meal18p);
    if (a == null || b == null || c == null) { toast.error("Vyplňte všechna 3 pásma kladnými čísly"); return; }
    const newMap = { ...(data?.meal_rates_override || {}), [String(year)]: { "5_12": a, "12_18": b, "18_plus": c } as MealRates };
    setSaving(true);
    try { await saveOverrides({ meal_rates_override: newMap }); toast.success(`Tuzemské stravné ${year} uloženo`); }
    catch (e: any) { toast.error("Chyba uložení", { description: e.message }); }
    finally { setSaving(false); }
  };
  const resetDomestic = async () => {
    const m = { ...(data?.meal_rates_override || {}) }; delete m[String(year)];
    setSaving(true);
    try { await saveOverrides({ meal_rates_override: Object.keys(m).length ? m : null }); toast.success("Obnoveno na státní sazbu"); }
    catch (e: any) { toast.error("Chyba", { description: e.message }); }
    finally { setSaving(false); }
  };

  const saveVehicle = async () => {
    const patch: any = {};
    const k = num(km), f = num(fuel);
    if (k != null) patch.km_rate_override = { ...(data?.km_rate_override || {}), [String(year)]: k };
    else { const m = { ...(data?.km_rate_override || {}) }; delete m[String(year)]; patch.km_rate_override = Object.keys(m).length ? m : null; }
    if (f != null) patch.fuel_price_override = { ...(data?.fuel_price_override || {}), [String(year)]: f };
    else { const m = { ...(data?.fuel_price_override || {}) }; delete m[String(year)]; patch.fuel_price_override = Object.keys(m).length ? m : null; }
    setSaving(true);
    try { await saveOverrides(patch); toast.success(`Kč/km a PHM pro ${year} uloženo`); }
    catch (e: any) { toast.error("Chyba", { description: e.message }); }
    finally { setSaving(false); }
  };

  const saveForeign = async () => {
    const out: Record<string, ForeignMealRate> = {};
    for (const [c, v] of Object.entries(foreign)) {
      const n = num(v.full);
      if (n != null) out[c] = { currency: v.currency, full: n };
    }
    const m = { ...(data?.foreign_meal_rates_override || {}) };
    if (Object.keys(out).length) m[String(year)] = out;
    else delete m[String(year)];
    setSaving(true);
    try { await saveOverrides({ foreign_meal_rates_override: Object.keys(m).length ? m : null }); toast.success(`Zahraniční stravné ${year} uloženo`); }
    catch (e: any) { toast.error("Chyba", { description: e.message }); }
    finally { setSaving(false); }
  };
  const resetForeign = async () => {
    const m = { ...(data?.foreign_meal_rates_override || {}) }; delete m[String(year)];
    setSaving(true);
    try { await saveOverrides({ foreign_meal_rates_override: Object.keys(m).length ? m : null }); toast.success("Obnoveno na státní sazby"); }
    catch (e: any) { toast.error("Chyba", { description: e.message }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Načítám…</div>;

  const hasMealOv = !!data?.meal_rates_override?.[String(year)];
  const hasKmOv = data?.km_rate_override?.[String(year)] != null;
  const hasFuelOv = data?.fuel_price_override?.[String(year)] != null;
  const foreignOvCount = Object.keys(data?.foreign_meal_rates_override?.[String(year)] || {}).length;

  return (
    <div className="space-y-6">
      <Alert>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Firemní override sazeb</AlertTitle>
        <AlertDescription>
          Hodnoty zde ručně přepíší státní sazby pro vybraný rok. Prázdné pole = použije se státní sazba.
          Změna ovlivní pouze <strong>nové výpočty</strong> v cestovních příkazech, již uložené řádky zůstanou beze změny do dalšího přepočtu.
        </AlertDescription>
      </Alert>

      <div className="flex items-end gap-3">
        <div className="w-40">
          <Label>Rok</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Tuzemské stravné (Kč) — {year}</CardTitle>
              <CardDescription>Státní sazby: {stateDefault["5_12"]} / {stateDefault["12_18"]} / {stateDefault["18_plus"]}</CardDescription>
            </div>
            {hasMealOv && <Badge variant="secondary">Firemní override aktivní</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>5–12 h</Label><Input inputMode="decimal" placeholder={String(stateDefault["5_12"])} value={meal512} onChange={(e) => setMeal512(e.target.value)} /></div>
            <div><Label>12–18 h</Label><Input inputMode="decimal" placeholder={String(stateDefault["12_18"])} value={meal1218} onChange={(e) => setMeal1218(e.target.value)} /></div>
            <div><Label>nad 18 h</Label><Input inputMode="decimal" placeholder={String(stateDefault["18_plus"])} value={meal18p} onChange={(e) => setMeal18p(e.target.value)} /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveDomestic} disabled={saving}><Save className="h-4 w-4 mr-1" />Uložit override</Button>
            <Button variant="outline" onClick={resetDomestic} disabled={saving || !hasMealOv}><RotateCcw className="h-4 w-4 mr-1" />Vrátit na státní</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Vlastní vozidlo — {year}</CardTitle>
              <CardDescription>Státní: {KM_RATE_BY_YEAR[year]?.toFixed(2)} Kč/km · PHM N95 {FUEL_PRICE_BY_YEAR[year]?.toFixed(2)} Kč/l</CardDescription>
            </div>
            {(hasKmOv || hasFuelOv) && <Badge variant="secondary">Override aktivní</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Sazba Kč/km</Label><Input inputMode="decimal" placeholder={String(KM_RATE_BY_YEAR[year] ?? "")} value={km} onChange={(e) => setKm(e.target.value)} /></div>
            <div><Label>Cena PHM Natural 95 (Kč/l)</Label><Input inputMode="decimal" placeholder={String(FUEL_PRICE_BY_YEAR[year] ?? "")} value={fuel} onChange={(e) => setFuel(e.target.value)} /></div>
          </div>
          <Button onClick={saveVehicle} disabled={saving}><Save className="h-4 w-4 mr-1" />Uložit</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Zahraniční stravné — {year}</CardTitle>
              <CardDescription>Plná denní sazba v měně dané země. Pásma se počítají automaticky (1/3, 2/3, plná).</CardDescription>
            </div>
            {foreignOvCount > 0 && <Badge variant="secondary">{foreignOvCount} zemí s override</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Země</TableHead>
                <TableHead>Měna</TableHead>
                <TableHead className="text-right">Státní</TableHead>
                <TableHead className="text-right">Override</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(foreign).map(([c, v]) => {
                const base = (FOREIGN_MEAL_RATES_BY_YEAR[year] || {})[c];
                return (
                  <TableRow key={c}>
                    <TableCell className="font-medium">{c}</TableCell>
                    <TableCell>
                      <Input className="h-8 w-20" value={v.currency}
                        onChange={(e) => setForeign((p) => ({ ...p, [c]: { ...p[c], currency: e.target.value.toUpperCase() } }))} />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{base ? `${base.full} ${base.currency}` : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Input className="h-8 w-28 ml-auto" inputMode="decimal" placeholder={base ? String(base.full) : ""}
                        value={v.full} onChange={(e) => setForeign((p) => ({ ...p, [c]: { ...p[c], full: e.target.value } }))} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex gap-2">
            <Button onClick={saveForeign} disabled={saving}><Save className="h-4 w-4 mr-1" />Uložit override</Button>
            <Button variant="outline" onClick={resetForeign} disabled={saving || foreignOvCount === 0}><RotateCcw className="h-4 w-4 mr-1" />Vrátit na státní</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}