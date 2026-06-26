import { useEffect, useRef, useState } from "react";

// Minimal Web Speech API hook. Returns transcript + start/stop controls.
export function useVoiceInput(lang: string = "cs-CZ") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR: any =
      (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.lang = lang;
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((res: any) => res[0].transcript).join(" ");
      setTranscript(t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recRef.current = r;
    return () => { try { r.abort(); } catch (_) {} };
  }, [lang]);

  const start = () => {
    if (!recRef.current) return;
    setTranscript("");
    try { recRef.current.start(); setListening(true); } catch (_) {}
  };
  const stop = () => { try { recRef.current?.stop(); } catch (_) {} setListening(false); };

  return { supported, listening, transcript, start, stop, reset: () => setTranscript("") };
}