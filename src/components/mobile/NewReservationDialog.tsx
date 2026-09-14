import { useEffect, useState } from "react";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MobileDatePicker } from "@/components/ui/mobile-date-picker";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useDriverContext } from "@/hooks/useDriverContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { insertOrQueue } from "@/lib/offline/tripQueue";
import {
import { localDateStr } from "@/lib/utils";
  PURPOSE_TYPES, checkAdvanceLimit, checkPrivateLimit, getPrivateUsage,
  PRIVATE_LIMIT_WEEKENDS, PRIVATE_LIMIT_WORKDAYS, MAX_ADVANCE_DAYS,
} from "@/lib/reservationRules";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
  initialVehicleId?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialTimeFrom?: string;
  initialTimeTo?: string;
}

export default function NewReservationDialog({
  open, onOpenChange, onCreated,
  initialVehicleId, initialDateFrom, initialDateTo, initialTimeFrom, initialTimeTo,
}: Props) {
  const { driver, myVehicles, allVehicles } = useDriverContext();
  const today = localDateStr();
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_ADVANCE_DAYS);
    return localDateStr(d);
  })();

  const [vehicleId, setVehicleId] = useState(initialVehicleId || "");
  const [dateFrom, setDateFrom] = useState(initialDateFrom || today);
  const [dateTo, setDateTo] = useState(initialDateTo || today);
  const [timeFrom, setTimeFrom] = useState(initialTimeFrom || "08:00");
  const [timeTo, setTimeTo] = useState(initialTimeTo || "17:00");
  const [purpose, setPurpose] = useState("");
  const [purposeType, setPurposeType] = useState("pracovne");
  const [usage, setUsage] = useState<{ weekends: number; workdays: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialVehicleId) setVehicleId(initialVehicleId);
      if (initialDateFrom) setDateFrom(initialDateFrom);
      if (initialDateTo) setDateTo(initialDateTo);
      if (initialTimeFrom) setTimeFrom(initialTimeFrom);
      if (initialTimeTo) setTimeTo(initialTimeTo);
    }
  }, [open, initialVehicleId, initialDateFrom, initialDateTo, initialTimeFrom, initialTimeTo]);

  useEffect(() => {
    if (!open || purposeType !== "soukrome" || !driver?.fullName || !dateFrom) {
      setUsage(null);
      return;
    }
    getPrivateUsage(driver.fullName, dateFrom).then(setUsage).catch(() => setUsage(null));
  }, [open, purposeType, driver?.fullName, dateFrom]);

  const vehicles = myVehicles.length ? [...myVehicles, ...allVehicles.filter(a => !myVehicles.find(m => m.id === a.id))] : allVehicles;

  const reset = () => {
    setVehicleId(""); setDateFrom(today); setDateTo(today);
    setTimeFrom("08:00"); setTimeTo("17:00"); setPurpose(""); setPurposeType("pracovne");
  };

  const submit = async () => {
    if (!vehicleId || !dateFrom || !dateTo) {
      toast.error("Vyplňte vozidlo a datum");
      return;
    }
    if (dateTo < dateFrom) { toast.error("Datum do musí být ≥ datum od"); return; }
    if (!driver) { toast.error("Váš účet není propojen s řidičem"); return; }

    const advanceErr = checkAdvanceLimit(dateFrom);
    if (advanceErr) { toast.error(advanceErr); return; }

    setSaving(true);

    if (purposeType === "soukrome") {
      const limitErr = await checkPrivateLimit(driver.fullName, dateFrom, dateTo);
      if (limitErr) { setSaving(false); toast.error(limitErr, { duration: 6000 }); return; }
    }

    const { data: conflicts, error: confErr } = await supabase
      .from("reservations")
      .select("id, date_from, date_to, time_from, time_to, driver_name, status")
      .eq("vehicle_id", vehicleId)
      .in("status", ["čeká", "schváleno"])
      .lte("date_from", dateTo)
      .gte("date_to", dateFrom);

    if (confErr) {
      setSaving(false);
      toast.error("Chyba při kontrole dostupnosti: " + confErr.message);
      return;
    }

    const overlapping = (conflicts || []).filter((c) => {
      if (c.date_from !== c.date_to || dateFrom !== dateTo || c.date_from !== dateFrom) {
        return true;
      }
      const cFrom = c.time_from || "00:00:00";
      const cTo = c.time_to || "23:59:59";
      const nFrom = (timeFrom || "00:00") + ":00";
      const nTo = (timeTo || "23:59") + ":00";
      return cFrom < nTo && nFrom < cTo;
    });

    if (overlapping.length > 0) {
      setSaving(false);
      const c = overlapping[0];
      toast.error(
        `Vozidlo je v daném termínu obsazené (${c.driver_name}, ${c.date_from} → ${c.date_to}, stav: ${c.status}). Zvolte jiný termín nebo vozidlo.`,
        { duration: 6000 }
      );
      return;
    }

    const res = await insertOrQueue("reservations", {
      vehicle_id: vehicleId,
      driver_name: driver.fullName,
      date_from: dateFrom,
      date_to: dateTo,
      time_from: timeFrom,
      time_to: timeTo,
      purpose: purpose || null,
      purpose_type: purposeType,
      status: "čeká",
    });
    setSaving(false);
    if (res.status === "error") { toast.error("Chyba: " + res.message); return; }
    toast.success(res.status === "queued"
      ? "Offline – žádost uložena, odešle se po obnovení sítě"
      : "Žádost odeslána ke schválení");
    reset();
    onOpenChange(false);
    onCreated?.();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader>
          <DrawerTitle>Nová žádost o vozidlo</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto">
          <div className="space-y-1.5">
            <Label>Vozidlo *</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Vyberte vozidlo" /></SelectTrigger>
              <SelectContent>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id} className="py-3">
                    {(v as any).nazev_vozu || v.znacka || "?"} · {v.rz || "?"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Datum od *</Label>
              <MobileDatePicker value={dateFrom} onChange={setDateFrom} min={today} max={maxDate} />
            </div>
            <div className="space-y-1.5">
              <Label>Datum do *</Label>
              <MobileDatePicker value={dateTo} onChange={setDateTo} min={dateFrom} max={maxDate} />
            </div>
            <div className="space-y-1.5">
              <Label>Čas od</Label>
              <Input className="h-12" type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Čas do</Label>
              <Input className="h-12" type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Účel cesty *</Label>
            <Select value={purposeType} onValueChange={setPurposeType}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PURPOSE_TYPES.map(p => (
                  <SelectItem key={p.value} value={p.value} className="py-3">{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {purposeType === "soukrome" && usage && (
              <p className="text-xs text-muted-foreground">
                Čerpáno tento měsíc: {usage.weekends}/{PRIVATE_LIMIT_WEEKENDS} víkend, {usage.workdays}/{PRIVATE_LIMIT_WORKDAYS} pracovních dní.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Poznámka k účelu</Label>
            <Textarea value={purpose} onChange={e => setPurpose(e.target.value)} rows={3} placeholder="Služební jednání v Brně" className="text-base" />
          </div>
          <p className="text-xs text-muted-foreground">
            Žádost bude odeslána ke schválení správci nebo dispečerovi.
          </p>
          <p className="text-xs text-muted-foreground">
            Rezervovat lze nejvýše {MAX_ADVANCE_DAYS} dní dopředu.
          </p>
        </div>
        <DrawerFooter className="pb-safe gap-2">
          <Button className="w-full h-12 text-base" onClick={submit} disabled={saving}>
            {saving ? "Odesílám…" : "Odeslat žádost"}
          </Button>
          <Button variant="outline" className="w-full h-12" onClick={() => onOpenChange(false)}>
            Zrušit
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
