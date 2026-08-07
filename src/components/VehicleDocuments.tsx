
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
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Trash2, FileText, Download, Loader2, Folder,
  ArrowLeft, Plus, Pencil, FolderInput
} from "lucide-react";

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

interface DocumentFolder {
  id: string;
  vehicle_id: string;
  name: string;
  sort_order: number;
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

const DEFAULT_FOLDERS = [
  "Technický průkaz", "Pojistná smlouva", "Zelená karta", "STK protokol",
  "Servisní záznam", "Faktura", "Předávací protokol", "Ostatní",
];

export default function VehicleDocuments({ vehicleId }: { vehicleId: string }) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadOk, setLoadOk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState("");
  const [deleteDoc, setDeleteDoc] = useState<VehicleDocument | null>(null);
  const [dragging, setDragging] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Folder management state
  const [folderDialog, setFolderDialog] = useState<{ mode: "create" | "rename"; folder?: DocumentFolder } | null>(null);
  const [folderName, setFolderName] = useState("");
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<DocumentFolder | null>(null);
  const [moveDocTarget, setMoveDocTarget] = useState<VehicleDocument | null>(null);
  const [moveToFolder, setMoveToFolder] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const [docsRes, foldersRes] = await Promise.all([
      supabase.from("vehicle_documents").select("*").eq("vehicle_id", vehicleId).order("created_at", { ascending: false }),
      supabase.from("document_folders").select("*").eq("vehicle_id", vehicleId).order("sort_order", { ascending: true }) as any,
    ]);
    if (!docsRes.error) setDocuments((docsRes.data as VehicleDocument[]) || []);
    if (!foldersRes.error) {
      const f = (foldersRes.data as DocumentFolder[]) || [];
      setFolders(f);
      if (f.length > 0 && !uploadCategory) setUploadCategory(f[0].name);
    }
    const err = docsRes.error || foldersRes.error;
    if (err) {
      toast({
        title: "Dokumenty se nepodařilo načíst",
        description: err.message,
        variant: "destructive",
      });
    }
    setLoading(false);
    setLoadOk(!err);
    return !err;
  };

  useEffect(() => { fetchData(); }, [vehicleId]);

  // Ensure default folders exist for this vehicle
  useEffect(() => {
    if (loading || !loadOk || folders.length > 0) return;
    if (seededRef.current === vehicleId) return;
    seededRef.current = vehicleId;
    (async () => {
      const inserts = DEFAULT_FOLDERS.map((name, i) => ({
        vehicle_id: vehicleId, name, sort_order: i,
      }));
      const { error } = await (supabase.from("document_folders") as any)
        .upsert(inserts, { onConflict: "vehicle_id,name", ignoreDuplicates: true });
      if (error) {
        toast({ title: "Složky se nepodařilo vytvořit", description: error.message, variant: "destructive" });
        return;
      }
      fetchData();
    })();
  }, [loading, loadOk, folders.length, vehicleId]);

  const uploadFiles = async (files: File[], category: string) => {
    if (files.length === 0) return;
    setUploading(true);
    let success = 0, failed = 0;

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const filePath = `${vehicleId}/${Date.now()}_${safeName}`;
      const { error: uploadErr } = await supabase.storage.from("vehicle-documents").upload(filePath, file);
      if (uploadErr) { failed++; continue; }

      const { error: insertErr } = await supabase.from("vehicle_documents").insert({
        vehicle_id: vehicleId, name: file.name, file_path: filePath,
        file_size: file.size, mime_type: file.type, category,
      } as any);
      if (insertErr) { failed++; } else { success++; }
    }

    toast(failed === 0
      ? { title: success === 1 ? "Dokument nahrán" : `Nahráno ${success} dokumentů` }
      : { title: `Nahráno ${success} z ${files.length}`, description: `${failed} se nepodařilo`, variant: "destructive" as const }
    );
    setUploading(false);
    fetchData();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadFiles(Array.from(files), activeFolder || uploadCategory);
    e.target.value = "";
  };

  const handleDownload = async (doc: VehicleDocument) => {
    const { data, error } = await supabase.storage.from("vehicle-documents").createSignedUrl(doc.file_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Chyba", description: "Nepodařilo se stáhnout soubor", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const confirmDeleteDoc = async () => {
    if (!deleteDoc) return;
    await supabase.storage.from("vehicle-documents").remove([deleteDoc.file_path]);
    await supabase.from("vehicle_documents").delete().eq("id", deleteDoc.id as any);
    toast({ title: "Dokument smazán" });
    setDeleteDoc(null);
    fetchData();
  };

  // ── Folder CRUD ──
  const handleCreateFolder = async () => {
    const trimmed = folderName.trim();
    if (!trimmed) return;
    if (folders.some(f => f.name === trimmed)) {
      toast({ title: "Složka s tímto názvem již existuje", variant: "destructive" });
      return;
    }
    await (supabase.from("document_folders") as any).insert({
      vehicle_id: vehicleId, name: trimmed, sort_order: folders.length,
    });
    toast({ title: `Složka „${trimmed}" vytvořena` });
    setFolderDialog(null);
    setFolderName("");
    fetchData();
  };

  const handleRenameFolder = async () => {
    if (!folderDialog?.folder) return;
    const trimmed = folderName.trim();
    if (!trimmed) return;
    const oldName = folderDialog.folder.name;
    if (folders.some(f => f.name === trimmed && f.id !== folderDialog.folder!.id)) {
      toast({ title: "Složka s tímto názvem již existuje", variant: "destructive" });
      return;
    }
    // Update folder name
    await (supabase.from("document_folders") as any).update({ name: trimmed }).eq("id", folderDialog.folder.id);
    // Update category on documents in that folder
    await supabase.from("vehicle_documents").update({ category: trimmed } as any).eq("vehicle_id", vehicleId).eq("category", oldName);
    toast({ title: `Složka přejmenována na „${trimmed}"` });
    if (activeFolder === oldName) setActiveFolder(trimmed);
    setFolderDialog(null);
    setFolderName("");
    fetchData();
  };

  const confirmDeleteFolder = async () => {
    if (!deleteFolderTarget) return;
    const docsInFolder = documents.filter(d => d.category === deleteFolderTarget.name);
    if (docsInFolder.length > 0) {
      // Move docs to "Ostatní"
      for (const doc of docsInFolder) {
        await supabase.from("vehicle_documents").update({ category: "Ostatní" } as any).eq("id", doc.id);
      }
    }
    await (supabase.from("document_folders") as any).delete().eq("id", deleteFolderTarget.id);
    toast({ title: `Složka „${deleteFolderTarget.name}" smazána`, description: docsInFolder.length > 0 ? `${docsInFolder.length} dokumentů přesunuto do „Ostatní"` : undefined });
    if (activeFolder === deleteFolderTarget.name) setActiveFolder(null);
    setDeleteFolderTarget(null);
    fetchData();
  };

  const handleMoveDoc = async () => {
    if (!moveDocTarget || !moveToFolder) return;
    await supabase.from("vehicle_documents").update({ category: moveToFolder } as any).eq("id", moveDocTarget.id);
    toast({ title: `Přesunuto do „${moveToFolder}"` });
    setMoveDocTarget(null);
    setMoveToFolder("");
    fetchData();
  };

  // Drag & drop
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget as Node)) setDragging(false);
  }, []);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await uploadFiles(files, activeFolder || uploadCategory);
  }, [vehicleId, activeFolder, uploadCategory]);

  const folderCounts = folders.map(f => ({
    ...f,
    count: documents.filter(d => d.category === f.name).length,
  }));

  const folderDocs = activeFolder ? documents.filter(d => d.category === activeFolder) : [];

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // ── Folder detail view ──
  if (activeFolder) {
    return (
      <div className="space-y-4">
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
          ref={dropRef} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
          }`}
        >
          <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
          <p className="text-xs text-muted-foreground mb-2">Přetáhněte soubory sem — uloží se do „{activeFolder}"</p>
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
                <Button variant="ghost" size="icon" onClick={() => { setMoveDocTarget(doc); setMoveToFolder(""); }} title="Přesunout">
                  <FolderInput className="h-4 w-4" />
                </Button>
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

        <DeleteDocDialog deleteDoc={deleteDoc} setDeleteDoc={setDeleteDoc} onConfirm={confirmDeleteDoc} />
        <MoveDocDialog
          doc={moveDocTarget} folders={folders} currentFolder={activeFolder}
          moveToFolder={moveToFolder} setMoveToFolder={setMoveToFolder}
          onClose={() => setMoveDocTarget(null)} onConfirm={handleMoveDoc}
        />
      </div>
    );
  }

  // ── Folder overview ──
  return (
    <div className="space-y-4">
      {/* Folder grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {folderCounts.map(({ id, name, count }) => (
          <div key={id} className={`relative group flex flex-col items-center gap-1 p-4 rounded-lg border transition-colors text-center hover:bg-accent/50 cursor-pointer ${count === 0 ? "opacity-50" : "bg-card"}`}>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setFolderDialog({ mode: "rename", folder: folders.find(f => f.id === id)! }); setFolderName(name); }} title="Přejmenovat">
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folders.find(f => f.id === id)!); }} title="Smazat složku">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div onClick={() => setActiveFolder(name)} className="flex flex-col items-center gap-1 w-full">
              <Folder className={`h-8 w-8 ${count > 0 ? "text-primary" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium leading-tight">{name}</span>
              <span className="text-[11px] text-muted-foreground">{pluralFiles(count)}</span>
            </div>
          </div>
        ))}

        {/* New folder button */}
        <button
          onClick={() => { setFolderDialog({ mode: "create" }); setFolderName(""); }}
          className="flex flex-col items-center justify-center gap-1 p-4 rounded-lg border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-8 w-8" />
          <span className="text-xs font-medium">Nová složka</span>
        </button>
      </div>

      {/* Upload from overview */}
      {folders.length > 0 && (
        <div className="flex items-end gap-3 pt-2">
          <div className="w-48">
            <Label className="text-xs">Složka</Label>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {folders.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
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
      )}

      {/* Dialogs */}
      <DeleteDocDialog deleteDoc={deleteDoc} setDeleteDoc={setDeleteDoc} onConfirm={confirmDeleteDoc} />

      {/* Folder create/rename dialog */}
      <Dialog open={!!folderDialog} onOpenChange={(open) => !open && setFolderDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{folderDialog?.mode === "create" ? "Nová složka" : "Přejmenovat složku"}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label>Název složky</Label>
            <Input value={folderName} onChange={e => setFolderName(e.target.value)} placeholder="Název složky"
              onKeyDown={e => { if (e.key === "Enter") folderDialog?.mode === "create" ? handleCreateFolder() : handleRenameFolder(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderDialog(null)}>Zrušit</Button>
            <Button onClick={folderDialog?.mode === "create" ? handleCreateFolder : handleRenameFolder}>
              {folderDialog?.mode === "create" ? "Vytvořit" : "Přejmenovat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder confirmation */}
      <AlertDialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat složku „{deleteFolderTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {documents.filter(d => d.category === deleteFolderTarget?.name).length > 0
                ? `Dokumenty ve složce budou přesunuty do „Ostatní".`
                : "Složka je prázdná a bude odstraněna."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteFolder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub-components ──

function DeleteDocDialog({ deleteDoc, setDeleteDoc, onConfirm }: {
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

function MoveDocDialog({ doc, folders, currentFolder, moveToFolder, setMoveToFolder, onClose, onConfirm }: {
  doc: VehicleDocument | null;
  folders: DocumentFolder[];
  currentFolder: string;
  moveToFolder: string;
  setMoveToFolder: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const otherFolders = folders.filter(f => f.name !== currentFolder);
  return (
    <Dialog open={!!doc} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Přesunout „{doc?.name}"</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Label>Cílová složka</Label>
          <Select value={moveToFolder} onValueChange={setMoveToFolder}>
            <SelectTrigger><SelectValue placeholder="Vyberte složku" /></SelectTrigger>
            <SelectContent>
              {otherFolders.map(f => <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zrušit</Button>
          <Button onClick={onConfirm} disabled={!moveToFolder}>Přesunout</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
