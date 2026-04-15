
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
import { Upload, Trash2, FileText, Download, Loader2, Folder, ArrowLeft } from "lucide-react";

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

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pluralFiles(count: number): string {
  if (count === 0) return "prázdná";
  if (count === 1) return "1 soubor";
  if (count >= 2 && count <= 4) return `${count} soubory`;
  return `${count} souborů`;
}

export default function VehicleDocuments({ vehicleId }: { vehicleId: string }) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState("Ostatní");
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

  const uploadFiles = async (files: File[], category: string) => {
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

      if (uploadErr) { failed++; continue; }

      const { error: insertErr } = await supabase.from("vehicle_documents").insert({
        vehicle_id: vehicleId,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        category,
      } as any);

      if (insertErr) { failed++; } else { success++; }
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
    const cat = activeFolder || uploadCategory;
    await uploadFiles(Array.from(files), cat);
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

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) setDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await uploadFiles(files, activeFolder || uploadCategory);
  }, [vehicleId, activeFolder, uploadCategory]);

  // Count docs per category
  const folderCounts = CATEGORIES.map(cat => ({
    category: cat,
    count: documents.filter(d => d.category === cat).length,
  }));

  const folderDocs = activeFolder
    ? documents.filter(d => d.category === activeFolder)
    : [];

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // ── Folder detail view ──
  if (activeFolder) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setActiveFolder(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Zpět
          </Button>
          <Folder className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-base">{activeFolder}</h3>
          <span className="text-xs text-muted-foreground">({pluralFiles(folderDocs.length)})</span>
        </div>

        {/* Upload zone */}
        <div
          ref={dropRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground mb-2">
            Přetáhněte soubory sem — automaticky se uloží do „{activeFolder}"
          </p>
          <Label htmlFor="file-upload-folder" className="cursor-pointer">
            <Button asChild disabled={uploading} size="sm" variant="outline">
              <span>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Nahrát
              </span>
            </Button>
          </Label>
          <Input id="file-upload-folder" type="file" multiple className="hidden" onChange={handleUpload} />
        </div>

        {/* File list */}
        {folderDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Složka je prázdná</p>
        ) : (
          <div className="space-y-2">
            {folderDocs.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("cs")}
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

        {/* Delete dialog */}
        <DeleteDialog deleteDoc={deleteDoc} setDeleteDoc={setDeleteDoc} onConfirm={confirmDelete} />
      </div>
    );
  }

  // ── Folder overview ──
  return (
    <div className="space-y-4">
      {/* Folder grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {folderCounts.map(({ category: cat, count }) => (
          <button
            key={cat}
            onClick={() => setActiveFolder(cat)}
            className={`flex flex-col items-center gap-1 p-4 rounded-lg border transition-colors text-center hover:bg-accent/50 ${
              count === 0 ? "opacity-50" : "bg-card"
            }`}
          >
            <Folder className={`h-8 w-8 ${count > 0 ? "text-primary" : "text-muted-foreground"}`} />
            <span className="text-xs font-medium leading-tight">{cat}</span>
            <span className="text-[11px] text-muted-foreground">{pluralFiles(count)}</span>
          </button>
        ))}
      </div>

      {/* Upload from overview */}
      <div className="flex items-end gap-3 pt-2">
        <div className="w-48">
          <Label className="text-xs">Složka</Label>
          <Select value={uploadCategory} onValueChange={setUploadCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="file-upload-overview" className="cursor-pointer">
            <Button asChild disabled={uploading} size="sm">
              <span>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Nahrát dokument
              </span>
            </Button>
          </Label>
          <Input id="file-upload-overview" type="file" multiple className="hidden" onChange={handleUpload} />
        </div>
      </div>

      <DeleteDialog deleteDoc={deleteDoc} setDeleteDoc={setDeleteDoc} onConfirm={confirmDelete} />
    </div>
  );
}

function DeleteDialog({ deleteDoc, setDeleteDoc, onConfirm }: {
  deleteDoc: VehicleDocument | null;
  setDeleteDoc: (d: VehicleDocument | null) => void;
  onConfirm: () => void;
}) {
  return (
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
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Smazat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
