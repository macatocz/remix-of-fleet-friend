import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Row {
  id: string; type: string; title: string; body: string | null;
  link: string | null; read_at: string | null; created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications").select("*").order("created_at", { ascending: false }).limit(200);
    setRows((data || []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user?.id]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", user.id);
    load();
  };
  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h1 className="text-2xl font-semibold">Notifikace</h1>
          {unread > 0 && <span className="text-sm text-muted-foreground">({unread} nepřečtených)</span>}
        </div>
        {unread > 0 && <Button variant="outline" size="sm" onClick={markAllRead}>Označit vše jako přečtené</Button>}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Načítám…</div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Žádné notifikace</Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className={cn("p-3 flex items-start gap-3", !r.read_at && "border-primary/40 bg-primary/5")}>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.title}</div>
                {r.body && <div className="text-sm text-muted-foreground">{r.body}</div>}
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(r.created_at).toLocaleString("cs-CZ")}
                  {r.link && <> · <Link to={r.link} className="text-primary hover:underline">Otevřít</Link></>}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(r.id)} aria-label="Smazat">
                <Trash2 className="h-4 w-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}