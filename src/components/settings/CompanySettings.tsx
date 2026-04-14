import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CompanyData {
  id: string;
  name: string;
  ico: string;
  dic: string;
  address: string;
  city: string;
  zip: string;
  email: string;
  phone: string;
  website: string;
}

export function CompanySettings() {
  const [data, setData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("*")
      .limit(1)
      .single()
      .then(({ data: row }) => {
        if (row) {
          setData({
            id: row.id,
            name: row.name || "",
            ico: row.ico || "",
            dic: row.dic || "",
            address: row.address || "",
            city: row.city || "",
            zip: row.zip || "",
            email: row.email || "",
            phone: row.phone || "",
            website: row.website || "",
          });
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase
      .from("company_settings")
      .update({
        name: data.name,
        ico: data.ico,
        dic: data.dic,
        address: data.address,
        city: data.city,
        zip: data.zip,
        email: data.email,
        phone: data.phone,
        website: data.website,
      })
      .eq("id", data.id);
    setSaving(false);
    if (error) {
      toast.error("Chyba při ukládání");
    } else {
      toast.success("Firemní údaje uloženy");
    }
  };

  const update = (field: keyof CompanyData, value: string) =>
    setData((prev) => (prev ? { ...prev, [field]: value } : prev));

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) return null;

  const fields: { label: string; key: keyof CompanyData; placeholder: string; half?: boolean }[] = [
    { label: "Název společnosti", key: "name", placeholder: "ABC s.r.o." },
    { label: "IČO", key: "ico", placeholder: "12345678", half: true },
    { label: "DIČ", key: "dic", placeholder: "CZ12345678", half: true },
    { label: "Adresa", key: "address", placeholder: "Ulice 123" },
    { label: "Město", key: "city", placeholder: "Praha", half: true },
    { label: "PSČ", key: "zip", placeholder: "110 00", half: true },
    { label: "E-mail", key: "email", placeholder: "info@firma.cz", half: true },
    { label: "Telefon", key: "phone", placeholder: "+420 123 456 789", half: true },
    { label: "Web", key: "website", placeholder: "https://www.firma.cz" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Firma
        </CardTitle>
        <CardDescription>Nastavení společnosti a kontaktní údaje</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key} className={f.half ? "" : "md:col-span-2"}>
              <Label>{f.label}</Label>
              <Input
                value={data[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => update(f.key, e.target.value)}
              />
            </div>
          ))}
        </div>
        <Button className="mt-6" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Uložit
        </Button>
      </CardContent>
    </Card>
  );
}
