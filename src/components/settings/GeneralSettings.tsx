import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function GeneralSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((r) => { map[r.key] = r.value || ""; });
          setSettings(map);
        }
        setLoading(false);
      });
  }, []);

  const update = (key: string, value: string) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    const promises = Object.entries(settings).map(([key, value]) =>
      supabase.from("app_settings").update({ value }).eq("key", key)
    );
    const results = await Promise.all(promises);
    setSaving(false);
    if (results.some((r) => r.error)) {
      toast.error("Chyba při ukládání");
    } else {
      toast.success("Nastavení uloženo");
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Obecné nastavení
        </CardTitle>
        <CardDescription>Formáty, měna a nastavení notifikací</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Formát data</Label>
            <Select value={settings.date_format || "dd.MM.yyyy"} onValueChange={(v) => update("date_format", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dd.MM.yyyy">dd.MM.yyyy</SelectItem>
                <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Měna</Label>
            <Select value={settings.currency || "CZK"} onValueChange={(v) => update("currency", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CZK">CZK (Kč)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium mb-3">Upozornění</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Upozornění na expiraci STK</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  className="w-20"
                  value={settings.stk_warning_days || "30"}
                  onChange={(e) => update("stk_warning_days", e.target.value)}
                />
                <span className="text-sm text-muted-foreground">dní předem</span>
                <Switch
                  checked={settings.notifications_stk === "true"}
                  onCheckedChange={(c) => update("notifications_stk", c ? "true" : "false")}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Upozornění na pojištění</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  className="w-20"
                  value={settings.insurance_warning_days || "30"}
                  onChange={(e) => update("insurance_warning_days", e.target.value)}
                />
                <span className="text-sm text-muted-foreground">dní předem</span>
                <Switch
                  checked={settings.notifications_insurance === "true"}
                  onCheckedChange={(c) => update("notifications_insurance", c ? "true" : "false")}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Upozornění na konec leasingu</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  className="w-20"
                  value={settings.leasing_warning_days || "60"}
                  onChange={(e) => update("leasing_warning_days", e.target.value)}
                />
                <span className="text-sm text-muted-foreground">dní předem</span>
                <Switch
                  checked={settings.notifications_leasing === "true"}
                  onCheckedChange={(c) => update("notifications_leasing", c ? "true" : "false")}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>E-mailové notifikace</Label>
              <Switch
                checked={settings.notifications_email === "true"}
                onCheckedChange={(c) => update("notifications_email", c ? "true" : "false")}
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Uložit
        </Button>
      </CardContent>
    </Card>
  );
}
