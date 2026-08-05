import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";

const TYPES: Array<{ key: string; label: string }> = [
  { key: "reservation_approved", label: "Rezervace schválena" },
  { key: "reservation_rejected", label: "Rezervace zamítnuta" },
  { key: "reservation_pending", label: "Nová rezervace ke schválení" },
  { key: "reservation_starting", label: "Připomenutí – rezervace začíná dnes" },
  { key: "travel_order_required", label: "Vyplňte cestovní příkaz" },
  { key: "incident_new", label: "Nové hlášení škody" },
  { key: "expiration_stk", label: "Konec STK" },
  { key: "expiration_insurance", label: "Konec pojištění" },
  { key: "expiration_leasing", label: "Konec leasingu" },
  { key: "expiration_service", label: "Plánovaný servis" },
  { key: "expiration_vignette", label: "Dálniční známka" },
];

export function NotificationSettings() {
  const { user } = useAuth();
  const { status, registering, enable, disable } = usePushNotifications();
  const [types, setTypes] = useState<Record<string, boolean>>({});
  const [pushEnabled, setPushEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
      const base: Record<string, boolean> = {};
      for (const t of TYPES) base[t.key] = true;
      if (data) {
        setPushEnabled(data.push_enabled);
        setTypes({ ...base, ...(data.types as any) });
      } else {
        setTypes(base);
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const save = async (next: { push_enabled?: boolean; types?: Record<string, boolean> }) => {
    if (!user) return;
    const payload = {
      user_id: user.id,
      push_enabled: next.push_enabled ?? pushEnabled,
      types: next.types ?? types,
    };
    const { error } = await supabase.from("notification_preferences").upsert(payload);
    if (error) toast.error(error.message);
  };

  const togglePush = async (val: boolean) => {
    setPushEnabled(val);
    await save({ push_enabled: val });
    if (val) {
      const ok = await enable();
      if (ok) toast.success("Push notifikace zapnuty");
      else if (status !== "unsupported") toast.error("Povolení nebylo uděleno");
    } else {
      await disable();
      toast.success("Push notifikace vypnuty");
    }
  };

  const toggleType = async (key: string, val: boolean) => {
    const next = { ...types, [key]: val };
    setTypes(next);
    await save({ types: next });
  };

  if (loading) return <div className="text-sm text-muted-foreground">Načítám…</div>;

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {pushEnabled && status === "granted" ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4" />}
            Push notifikace v prohlížeči
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status === "unsupported" ? (
            <p className="text-sm text-muted-foreground">Tento prohlížeč push notifikace nepodporuje.</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Posílat upozornění do tohoto zařízení</Label>
                  <p className="text-xs text-muted-foreground">
                    Stav povolení: {status === "granted" ? "uděleno" : status === "denied" ? "zamítnuto v prohlížeči" : "nenastaveno"}
                  </p>
                </div>
                <Switch checked={pushEnabled} onCheckedChange={togglePush} disabled={registering} />
              </div>
              {pushEnabled && status !== "granted" && (
                <Button size="sm" variant="outline" onClick={enable} disabled={registering}>
                  {registering ? "Registruji…" : "Povolit notifikace v prohlížeči"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Typy notifikací</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {TYPES.map((t) => (
            <div key={t.key} className="flex items-center justify-between py-1.5 border-b last:border-b-0">
              <Label className="text-sm font-normal">{t.label}</Label>
              <Switch checked={types[t.key] !== false} onCheckedChange={(v) => toggleType(t.key, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}