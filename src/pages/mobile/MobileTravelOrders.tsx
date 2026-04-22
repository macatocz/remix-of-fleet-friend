import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCZK } from "@/lib/travel/calc";

export default function MobileTravelOrders() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["travel_orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("travel_orders")
        .select("*, drivers(first_name,last_name), vehicles(rz)")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">Cestovní příkazy</h1>
          {data && <span className="text-muted-foreground text-sm">({data.length})</span>}
        </div>
        <Button size="sm" onClick={() => navigate("/cestovni-prikazy/novy")}>
          <Plus className="h-4 w-4" />Nový
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : data?.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Žádné cestovní příkazy</p>
        </Card>
      ) : (
        data?.map((o: any) => (
          <Card
            key={o.id}
            onClick={() => navigate(`/cestovni-prikazy/${o.id}`)}
            className="p-3 active:bg-accent cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{o.number}</span>
                  <Badge variant={o.status === "schvaleny" ? "default" : "outline"} className="text-[10px]">
                    {o.status}
                  </Badge>
                </div>
                <div className="text-sm mt-1 truncate">{o.drivers ? `${o.drivers.first_name} ${o.drivers.last_name}` : "—"} · {o.vehicles?.rz || "—"}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{o.date_from} → {o.date_to}</div>
                {o.purpose && <div className="text-xs text-muted-foreground truncate">{o.purpose}</div>}
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="font-medium text-sm">{formatCZK(Number(o.total_amount) || 0)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}