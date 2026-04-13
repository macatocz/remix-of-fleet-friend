
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
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

export default function VehicleDocuments({ vehicleId }: { vehicleId: string }) {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState("Ostatní");
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const filePath = `${vehicleId}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("vehicle-documents")
        .upload(filePath, file);

      if (uploadErr) {
        toast({ title: "Chyba nahrávání", description: uploadErr.message, variant: "destructive" });
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
        toast({ title: "Chyba ukládání záznamu", description: insertErr.message, variant: "destructive" });
      }
    }
    toast({ title: "Dokumenty nahrány" });
    setUploading(false);
    fetchDocs();
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

  const handleDelete = async (doc: VehicleDocument) => {
    await supabase.storage.from("vehicle-documents").remove([doc.file_path]);
    await supabase.from("vehicle_documents").delete().eq("id", doc.id as any);
    toast({ title: "Dokument smazán" });
    fetchDocs();
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Label>Kategorie</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <Button asChild disabled={uploading}>
              <span>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Nahrát dokumenty
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

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Žádné dokumenty</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
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
              <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)} title="Smazat" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
