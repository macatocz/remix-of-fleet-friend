import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildMonthlyClosing } from "@/lib/report/monthlyClosing";

export default function MonthlyClosingButton() {
  const prev = new Date(); prev.setMonth(prev.getMonth() - 1);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async () => {
    try {
      setBusy("Připravuji…");
      const blob = await buildMonthlyClosing(month, setBusy);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `mesicni-uzaverka_${month}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast.success("Uzávěrka stažena");
      setOpen(false);
    } catch (e: any) {
      toast.error("Uzávěrku se nepodařilo vytvořit", { description: e?.message });
    } finally { setBusy(null); }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}><Archive className="mr-2 h-4 w-4" />Stáhnout měsíční uzávěrku</Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Měsíční uzávěrka pro účetní</DialogTitle>
            <DialogDescription>ZIP obsahuje souhrn nákladů (PDF + Excel), oficiální knihy jízd všech aut, schválené cestovní příkazy a fotky účtenek.</DialogDescription>
          </DialogHeader>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Měsíc" />
          <DialogFooter>
            <Button onClick={run} disabled={!!busy || !month}>
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{busy}</> : "Stáhnout ZIP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
