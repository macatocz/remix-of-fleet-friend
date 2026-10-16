import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteFuelRecord } from "@/lib/fuel/deleteFuelRecord";

export default function DeleteFuelButton({ record, docPath, onDeleted }: { record: any; docPath?: string; onDeleted: () => void }) {
  const run = async () => {
    try {
      await deleteFuelRecord(record, docPath);
      toast.success("Záznam tankování smazán");
      onDeleted();
    } catch (e: any) {
      toast.error("Smazání se nepodařilo: " + (e?.message || ""));
    }
  };
  const when = new Date(record.fueled_at).toLocaleString("cs-CZ", { dateStyle: "short", timeStyle: "short" });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Smazat tankování">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Smazat záznam tankování?</AlertDialogTitle>
          <AlertDialogDescription>
            {when} · {record.location || "bez místa"}{record.total_price ? ` · ${Number(record.total_price).toLocaleString("cs-CZ")} Kč` : ""}.
            Smaže se i fotka účtenky. Akci nelze vrátit.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zrušit</AlertDialogCancel>
          <AlertDialogAction onClick={run} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Smazat</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
