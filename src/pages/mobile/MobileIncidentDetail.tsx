import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { vehicleLabel } from "@/lib/vehicleName";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Car,
  ChevronRight,
  MapPin,
  ReceiptText,
  User,
} from "lucide-react";
import { reporterName } from "@/components/incidents/ReporterSelect";

interface Incident {
  id: string;
  vehicle_id: string;
  date: string;
  location: string | null;
  description: string | null;
  estimated_cost: number | null;
  status: string;
  drivers?: { first_name: string; last_name: string } | null;
  vehicles?: {
    znacka: string | null;
    rz: string | null;
    nazev_vozu?: string | null;
  } | null;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  nahlaseno: { label: "Nahlášeno", className: "bg-warning/15 text-warning border-warning/30" },
  v_reseni: { label: "V řešení", className: "bg-primary/15 text-primary border-primary/30" },
  uzavreno: { label: "Uzavřeno", className: "bg-muted text-muted-foreground border-border" },
};

export default function MobileIncidentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    const fetchIncident = async () => {
      if (!id) {
        setError(true);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("incidents")
        .select("*, vehicles(znacka, rz, nazev_vozu), drivers(first_name, last_name)")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      if (fetchError || !data) {
        setError(true);
      } else {
        setIncident(data as Incident);
        const { data: photos } = await supabase
          .from("incident_photos")
          .select("file_path")
          .eq("incident_id", id)
          .order("created_at", { ascending: true });
        if (active && photos?.length) {
          const urls: string[] = [];
          for (const ph of photos) {
            const { data: signed } = await supabase.storage
              .from("handover-photos")
              .createSignedUrl(ph.file_path, 3600);
            if (signed?.signedUrl) urls.push(signed.signedUrl);
          }
          if (active) setPhotoUrls(urls);
        }
      }
      setLoading(false);
    };

    fetchIncident();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-full overflow-x-hidden">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="space-y-5 max-w-full overflow-x-hidden">
        <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/m/skody")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na škody
        </Button>
        <div className="py-14 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-3 text-lg font-semibold">Záznam se nepodařilo načíst</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Událost neexistuje nebo k ní nemáte přístup.
          </p>
        </div>
      </div>
    );
  }

  const status = STATUS_LABEL[incident.status] || {
    label: incident.status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/m/skody")}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Zpět na škody
      </Button>

      <header className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-lg font-bold">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
              <span className="break-words">Detail škody</span>
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(incident.date).toLocaleDateString("cs-CZ")}
            </p>
          </div>
          <Badge variant="outline" className={`${status.className} shrink-0`}>
            {status.label}
          </Badge>
        </div>
      </header>

      <Card
        className="p-4 active:bg-accent/40 transition-colors"
        onClick={() => navigate(`/m/vozidla/${incident.vehicle_id}`)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Car className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted-foreground">Vozidlo</div>
            <div className="font-semibold break-words">{vehicleLabel(incident.vehicles)}</div>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
        </div>
      </Card>

      <Card className="divide-y overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Datum události</div>
            <div className="mt-0.5 text-sm font-medium">
              {new Date(incident.date).toLocaleDateString("cs-CZ")}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Nahlásil</div>
            <div className="mt-0.5 text-sm font-medium break-words">{reporterName(incident.drivers)}</div>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Místo</div>
            <div className="mt-0.5 text-sm font-medium break-words">{incident.location || "Neuvedeno"}</div>
          </div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <ReceiptText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Odhadované náklady</div>
            <div className="mt-0.5 text-sm font-semibold">
              {incident.estimated_cost
                ? `${Number(incident.estimated_cost).toLocaleString("cs-CZ")} Kč`
                : "Neuvedeno"}
            </div>
          </div>
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Popis události</h2>
        <Card className="p-4">
          <p className="text-sm leading-6 break-words whitespace-pre-wrap">
            {incident.description || "Popis nebyl uveden."}
          </p>
        </Card>
      </section>

      {photoUrls.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Fotky ({photoUrls.length})</h2>
          <div className="grid grid-cols-2 gap-2">
            {photoUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="block">
                <img
                  src={url}
                  alt={`Fotka škody ${i + 1}`}
                  className="h-36 w-full rounded-lg border object-cover"
                />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}