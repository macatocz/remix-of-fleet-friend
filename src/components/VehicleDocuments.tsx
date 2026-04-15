
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText, Download, Loader2 } from "lucide-react";

const CATEGORIES = [
  "Technický průkaz",
  "Pojistná smlouva",
  "Zelená karta",
  "STK protokol",
  "Servisní záznam",
  "Faktura",
  "Předávací protokol",
  "Ostatní",
];

interface VehicleDocument {
  id: string;
  vehicle_id: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  category: string | null;
  created_at: string;
}

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function VehicleDocuments({ vehicleId }: { vehicleId: string }) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Ostatní");
  const [filterCategory, setFilterCategory] = useState("all");
  const [deleteDoc, setDeleteDoc] = useState<VehicleDocument | null>(null);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchDocs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicle_documents")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });
    if (!error) setDocuments((data as VehicleDocument[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, [vehicleId]);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    let success = 0;
    let failed = 0;

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const filePath = `${vehicleId}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage
        .from("vehicle-documents")
        .upload(filePath, file);

      if (uploadErr) {
        failed++;
        continue;
      }

      const { error: insertErr } = await supabase.from("vehicle_documents").insert({
        vehicle_id: vehicleId,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        category,
      } as any);

      if (insertErr) {
        failed++;
      } else {
        success++;
      }
    }

    if (failed === 0) {
      toast({ title: success === 1 ? "Dokument nahrán" : `Nahráno ${success} dokumentů` });
    } else {
      toast({
        title: `Nahráno ${success} z ${files.length} souborů`,
        description: `${failed} se nepodařilo nahrát`,
        variant: "destructive",
      });
    }

    setUploading(false);
    fetchDocs();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files));
    e.target.value = "";
  };

  const handleDownload = async (doc: VehicleDocument) => {
    const { data, error } = await supabase.storage
      .from("vehicle-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Chyba", description: "Nepodařilo se stáhnout soubor", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const confirmDelete = async () => {
    if (!deleteDoc) return;
    await supabase.storage.from("vehicle-documents").remove([deleteDoc.file_path]);
    await supabase.from("vehicle_documents").delete().eq("id", deleteDoc.id as any);
    toast({ title: "Dokument smazán" });
    setDeleteDoc(null);
    fetchDocs();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) {
      setDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await uploadFiles(files);
  }, [vehicleId, category]);

  const filteredDocs = filterCategory === "all"
    ? documents
    : documents.filter(d => d.category === filterCategory);

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-3">
          Přetáhněte soubory sem nebo klikněte na tlačítko níže
        </p>
        <div className="flex items-end justify-center gap-3">
          <div className="w-48">
            <Label className="text-xs">Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="file-upload" className="cursor-pointer">
              <Button asChild disabled={uploading} size="sm">
                <span>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Nahrát
                </span>
              </Button>
            </Label>
            <Input
              id="file-upload"
              type="file"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
          </div>
        </div>
      </div>

      {/* Filter */}
      {documents.length > 0 && (
        <div className="w-48">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrovat kategorii" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny kategorie</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filteredDocs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          {documents.length === 0 ? "Žádné dokumenty" : "Žádné dokumenty v této kategorii"}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.category} · {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("cs")}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title="Stáhnout">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteDoc(doc)} title="Smazat" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteDoc} onOpenChange={(open) => !open && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat dokument</AlertDialogTitle>
            <AlertDialogDescription>
              Opravdu chcete smazat dokument „{deleteDoc?.name}"? Tuto akci nelze vrátit zpět.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
