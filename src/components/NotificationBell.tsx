import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Row {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, title, body, link, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(15);
    setRows((data || []) as Row[]);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel("notif:" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  const unread = rows.filter((r) => !r.read_at).length;

  const markAllRead = async () => {
    if (!user || unread === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null).eq("user_id", user.id);
    load();
  };

  const openItem = async (r: Row) => {
    setOpen(false);
    if (!r.read_at) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", r.id);
    if (r.link) navigate(r.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center">{unread > 9 ? "9+" : unread}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-medium text-sm">Notifikace</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>Označit vše</Button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Žádné notifikace</div>
          ) : rows.map((r) => (
            <button
              key={r.id}
              onClick={() => openItem(r)}
              className={cn(
                "w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-accent transition-colors",
                !r.read_at && "bg-primary/5",
              )}
            >
              <div className="text-sm font-medium truncate">{r.title}</div>
              {r.body && <div className="text-xs text-muted-foreground line-clamp-2">{r.body}</div>}
              <div className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString("cs-CZ")}</div>
            </button>
          ))}
        </div>
        <div className="border-t px-3 py-2 text-center">
          <Link to="/notifikace" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>Všechny notifikace →</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}