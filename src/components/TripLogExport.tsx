import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

interface Props {
  vehicleId: string;
  selectedMonth: string;
  vehicleLabel?: string;
}

export default function TripLogExport({ vehicleId, selectedMonth, vehicleLabel }: Props) {
  const { toast } = useToast();

  const handleExport = async () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("trip_logs")
      .select("*, drivers(first_name, last_name)")
      .eq("vehicle_id", vehicleId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      toast({ title: "Chyba exportu", description: error.message, variant: "destructive" });
      return;
    }

    const rows = data || [];
    const monthLabel = new Date(year, month - 1).toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });

    // Build worksheet data
    const wsData: any[][] = [
      [`Kniha jízd – ${vehicleLabel || "Vozidlo"}`],
      [`Období: ${monthLabel}`],
      [],
      ["Datum", "Den", "Čas", "Přest. (min)", "Řidič", "Odkud", "Kam", "Účel", "Typ jízdy", "Popis", "Poč. km", "Kon. km", "Km celkem", "PHM (l)", "PHM (Kč)", "Ost. (Kč)"],
    ];

    let totalKm = 0;
    let totalFuel = 0;
    let totalFuelPrice = 0;
    let totalOther = 0;

    const dayNames = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

    rows.forEach(r => {
      const d = new Date(r.date + "T00:00:00");
      const dayName = dayNames[d.getDay()];
      const driverName = (r as any).drivers ? `${(r as any).drivers.first_name} ${(r as any).drivers.last_name}` : "";
      const km = r.km_total || 0;
      const fq = Number(r.fuel_quantity) || 0;
      const fp = Number(r.fuel_price) || 0;
      const op = Number(r.other_price) || 0;

      totalKm += km;
      totalFuel += fq;
      totalFuelPrice += fp;
      totalOther += op;

      wsData.push([
        d.toLocaleDateString("cs-CZ"),
        dayName,
        r.time ? r.time.slice(0, 5) : "",
        (r as any).break_minutes ?? "",
        driverName,
        r.route_from || "",
        r.route_to || "",
        r.purpose || "",
        purposeTypeLabel((r as any).purpose_type),
        r.description || "",
        r.km_start ?? "",
        r.km_end ?? "",
        km || "",
        fq || "",
        fp || "",
        op || "",
      ]);
    });

    // Summary row
    wsData.push([]);
    wsData.push(["", "", "", "", "", "", "", "", "", "CELKEM:", "", "", totalKm, Math.round(totalFuel * 10) / 10, Math.round(totalFuelPrice), Math.round(totalOther)]);

    if (totalKm > 0 && totalFuel > 0) {
      wsData.push(["", "", "", "", "", "", "", "", "", "Spotřeba l/100km:", "", "", "", Math.round(totalFuel / totalKm * 1000) / 10]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 }, { wch: 4 }, { wch: 6 }, { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kniha jízd");
    XLSX.writeFile(wb, `kniha-jizd_${selectedMonth}.xlsx`);
    toast({ title: "Export dokončen" });
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport}>
      <Download className="mr-1 h-4 w-4" />Excel
    </Button>
  );
}
