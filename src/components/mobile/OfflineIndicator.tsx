import { useEffect, useState } from "react";
import { WifiOff, CloudUpload } from "lucide-react";
import { pendingCount } from "@/lib/offline/tripQueue";

/** Small header badge: shows offline state and the number of records waiting to sync. */
export function OfflineIndicator() {
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = () => { pendingCount().then(setPending).catch(() => {}); };
    const up = () => { setOnline(true); refresh(); };
    const down = () => setOnline(false);
    refresh();
    const t = setInterval(refresh, 10000);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { clearInterval(t); window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
      {online ? <CloudUpload className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
      {pending > 0 ? <span>{pending}</span> : <span>Offline</span>}
    </div>
  );
}