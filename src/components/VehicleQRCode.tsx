import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useAppPublicUrl } from "@/hooks/useAppPublicUrl";

interface Props {
  vehicleId: string;
  label?: string;
  size?: number;
}

/**
 * Generates a QR code that opens the mobile vehicle detail directly
 * (so a driver can scan it from inside the car). Uses the configured
 * public app URL when available, so the PWA on Android opens instead
 * of the browser.
 */
export function VehicleQRCode({ vehicleId, label, size = 220 }: Props) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const { url: publicUrl } = useAppPublicUrl();
  const target = `${publicUrl}/m/vozidla/${vehicleId}`;

  useEffect(() => {
    QRCode.toDataURL(target, { width: size, margin: 1 }).then(setDataUrl).catch(() => {});
  }, [target, size]);

  const download = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${(label || vehicleId).replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const print = () => {
    const w = window.open("", "_blank", "width=600,height=600");
    if (!w) return;
    w.document.write(`
      <html><head><title>QR ${label || ""}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}img{margin:20px 0}h1{font-size:20px;margin:0}.note{font-size:12px;color:#666;max-width:320px;margin:12px auto 0}</style>
      </head><body>
      <h1>${label || "Vozidlo"}</h1>
      <img src="${dataUrl}" />
      <p>Naskenujte pro otevření karty vozidla</p>
      <p class="note">Pro otevření přímo v nainstalované aplikaci musí být aplikace nainstalovaná z adresy ${publicUrl}.</p>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-card">
      {dataUrl ? <img src={dataUrl} alt="QR kód vozidla" width={size} height={size} /> : (
        <div style={{ width: size, height: size }} className="bg-muted animate-pulse" />
      )}
      <div className="text-xs text-muted-foreground text-center break-all">{target}</div>
      <p className="text-xs text-center text-muted-foreground max-w-xs">
        Pro otevření přímo v nainstalované aplikaci musí být aplikace nainstalovaná z téže adresy.
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4 mr-1" />Stáhnout</Button>
        <Button variant="outline" size="sm" onClick={print}><Printer className="h-4 w-4 mr-1" />Vytisknout</Button>
      </div>
    </div>
  );
}
