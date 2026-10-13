import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Check, X } from "lucide-react";
import { compressImage } from "@/lib/compressImage";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCapture: (file: File) => void;
  /** Called when in-app camera is unavailable – parent opens system camera input. */
  onFallback: () => void;
}

export default function InAppCamera({ open, onOpenChange, onCapture, onFallback }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<{ file: File; url: string } | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { fail(); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      setReady(true);
    } catch {
      fail();
    }
  };

  const fail = () => {
    toast.error("Kameru v aplikaci nelze spustit – otevírám fotoaparát telefonu");
    stop();
    onOpenChange(false);
    onFallback();
  };

  useEffect(() => {
    if (open) { setShot(null); const t = setTimeout(start, 50); return () => clearTimeout(t); }
    stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => stop(), []);

  const snap = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.9));
    if (!blob) return;
    const f = await compressImage(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
    setShot({ file: f, url: URL.createObjectURL(f) });
  };

  const use = () => {
    if (!shot) return;
    onCapture(shot.file);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-w-none w-screen p-0 border-0 bg-foreground sm:rounded-none flex flex-col [&>button]:hidden">
        <DialogTitle className="sr-only">Vyfotit</DialogTitle>
        <div className="relative flex-1 overflow-hidden">
          <video ref={videoRef} playsInline muted className={`h-full w-full object-contain ${shot ? "hidden" : ""}`} />
          {shot && <img src={shot.url} alt="Náhled" className="h-full w-full object-contain" />}
          {!ready && !shot && (
            <div className="absolute inset-0 flex items-center justify-center text-background">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-around gap-4 p-6 pb-safe">
          <Button variant="secondary" size="icon" className="h-12 w-12 rounded-full" onClick={() => onOpenChange(false)} aria-label="Zavřít">
            <X className="h-5 w-5" />
          </Button>
          {shot ? (
            <>
              <Button variant="secondary" className="h-12" onClick={() => setShot(null)}><RotateCcw className="mr-2 h-4 w-4" />Znovu</Button>
              <Button className="h-12" onClick={use}><Check className="mr-2 h-4 w-4" />Použít</Button>
            </>
          ) : (
            <button type="button" onClick={snap} disabled={!ready} aria-label="Vyfotit"
              className="h-16 w-16 rounded-full border-4 border-background bg-background/80 active:scale-95 disabled:opacity-40" />
          )}
          {!shot && <div className="h-12 w-12" />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
