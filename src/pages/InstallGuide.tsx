import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Apple, ArrowLeft, Check, CheckCircle2, Chrome, Copy, Download, Monitor, Share, Smartphone,
} from "lucide-react";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 min-w-0">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {n}
      </span>
      <span className="text-sm leading-6 break-words">{children}</span>
    </li>
  );
}

function IosGuide() {
  return (
    <ol className="space-y-3">
      <Step n={1}>Otevřete aplikaci v prohlížeči <strong>Safari</strong> (v Chromu na iPhonu instalace nefunguje).</Step>
      <Step n={2}>
        Klepněte dole na tlačítko <strong>Sdílet</strong>{" "}
        <Share className="inline h-4 w-4 align-text-bottom" /> (čtvereček se šipkou nahoru).
      </Step>
      <Step n={3}>V nabídce sjeďte níž a zvolte <strong>Přidat na plochu</strong>.</Step>
      <Step n={4}>Vpravo nahoře potvrďte <strong>Přidat</strong>.</Step>
      <Step n={5}>Na ploše telefonu se objeví ikona <strong>Vozový park</strong> — odtud aplikaci spouštějte.</Step>
    </ol>
  );
}

function AndroidGuide() {
  return (
    <ol className="space-y-3">
      <Step n={1}>Otevřete aplikaci v prohlížeči <strong>Chrome</strong>.</Step>
      <Step n={2}>Vpravo nahoře klepněte na <strong>menu se třemi tečkami</strong>.</Step>
      <Step n={3}>Zvolte <strong>Instalovat aplikaci</strong> (nebo <strong>Přidat na plochu</strong>).</Step>
      <Step n={4}>Potvrďte <strong>Instalovat</strong>.</Step>
      <Step n={5}>Chrome může instalaci nabídnout i sám dole na obrazovce — stačí ji potvrdit.</Step>
    </ol>
  );
}

function DesktopGuide() {
  return (
    <ol className="space-y-3">
      <Step n={1}>Otevřete aplikaci v prohlížeči <strong>Chrome</strong> nebo <strong>Edge</strong>.</Step>
      <Step n={2}>V adresním řádku vpravo klepněte na ikonu <strong>instalace</strong> (monitor se šipkou).</Step>
      <Step n={3}>Potvrďte <strong>Instalovat</strong> — aplikace se otevře ve vlastním okně.</Step>
    </ol>
  );
}

const GUIDES: Record<Platform, { title: string; icon: typeof Smartphone; el: JSX.Element }> = {
  android: { title: "Android (Chrome)", icon: Smartphone, el: <AndroidGuide /> },
  ios: { title: "iPhone a iPad (Safari)", icon: Apple, el: <IosGuide /> },
  desktop: { title: "Počítač (Chrome / Edge)", icon: Monitor, el: <DesktopGuide /> },
};

export default function InstallGuide() {
  const detected = detectPlatform();
  // Android/Chrome je primární cesta pro většinu uživatelů.
  const [platform, setPlatform] = useState<Platform>(detected === "ios" ? "ios" : "android");
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setInstalled(!!standalone);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast.success("Odkaz zkopírován");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Odkaz se nepodařilo zkopírovat");
    }
  };

  const others = (Object.keys(GUIDES) as Platform[]).filter((p) => p !== platform);
  const Primary = GUIDES[platform];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl max-w-full overflow-x-hidden p-4 pb-16 space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/"><ArrowLeft className="mr-2 h-4 w-4" /> Zpět do aplikace</Link>
        </Button>

        <header className="min-w-0">
          <h1 className="text-2xl font-bold break-words">Instalace do mobilu</h1>
          <p className="mt-1 text-sm text-muted-foreground break-words">
            Přidejte si Vozový park na plochu telefonu — spustí se na celou obrazovku jako běžná
            aplikace, bez adresního řádku, a přihlášení zůstane zapamatované.
          </p>
        </header>

        {installed ? (
          <Card className="border-primary/40">
            <CardContent className="flex items-start gap-3 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <div className="font-semibold">Aplikace je nainstalovaná</div>
                <p className="mt-1 text-sm text-muted-foreground break-words">
                  Právě ji používáte v režimu aplikace. Návod níž potřebujete jen na dalším zařízení.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {deferred && !installed ? (
          <Card className="border-primary/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Chrome className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <div className="font-semibold">Nejrychlejší cesta pro Android</div>
                  <p className="mt-1 text-sm text-muted-foreground break-words">
                    Chrome na Androidu umí aplikaci nainstalovat jedním klepnutím. Zbytek vám zařídíme.
                  </p>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={install}>
                <Download className="mr-2 h-4 w-4" /> Nainstalovat aplikaci
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {platform === "android" ? (
                <Chrome className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Primary.icon className="h-5 w-5 shrink-0 text-primary" />
              )}
              <span className="break-words">{Primary.title}</span>
              <Badge variant="secondary" className="ml-auto shrink-0">Doporučeno</Badge>
            </CardTitle>
            <CardDescription>
              {platform === "android"
                ? "Nejrychlejší postup pro většinu telefonů."
                : "Postup pro zařízení, ze kterého tuto stránku čtete."}
            </CardDescription>
          </CardHeader>
          <CardContent>{Primary.el}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Adresa aplikace</CardTitle>
            <CardDescription>Pošlete si ji do telefonu, pokud instalujete z počítače.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm break-all">{appUrl}</div>
            <Button variant="outline" className="w-full" onClick={copyUrl}>
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              Zkopírovat odkaz
            </Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Ostatní zařízení</h2>
          <Accordion type="single" collapsible defaultValue={detected === "desktop" ? "android" : undefined} className="rounded-lg border">
            {others.map((p) => {
              const g = GUIDES[p];
              return (
                <AccordionItem key={p} value={p} className="px-4">
                  <AccordionTrigger className="text-sm">
                    <span className="flex items-center gap-2 text-left">
                      {p === "android" ? (
                        <Chrome className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <g.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      {g.title}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">{g.el}</AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Časté dotazy</h2>
          <Accordion type="single" collapsible className="rounded-lg border">
            <AccordionItem value="q1" className="px-4">
              <AccordionTrigger className="text-sm text-left">Budu se muset znovu přihlásit?</AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-6 text-muted-foreground">
                Po prvním spuštění z ikony se přihlásíte jednou. Přihlášení pak zůstává uložené,
                takže se aplikace otevře rovnou.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2" className="px-4">
              <AccordionTrigger className="text-sm text-left">Nevidím „Přidat na plochu"</AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-6 text-muted-foreground">
                Na iPhonu musíte být v Safari (ne v Chromu ani v odkazu otevřeném z e‑mailové
                aplikace). Na Androidu použijte Chrome. Pomůže také zavřít anonymní/soukromé okno.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3" className="px-4">
              <AccordionTrigger className="text-sm text-left">Jak se aplikace aktualizuje?</AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-6 text-muted-foreground">
                Sama. Při každém spuštění se načte aktuální verze, nic se nestahuje z obchodu.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4" className="px-4">
              <AccordionTrigger className="text-sm text-left">Jak ji odinstaluji?</AccordionTrigger>
              <AccordionContent className="pb-4 text-sm leading-6 text-muted-foreground">
                Stejně jako jinou aplikaci — podržte ikonu na ploše a zvolte odebrat či odinstalovat.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>
      </div>
    </div>
  );
}
