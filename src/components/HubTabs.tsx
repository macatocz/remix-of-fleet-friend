import { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface HubTab { value: string; label: string; content: ReactNode }

/** Sekce složená z existujících stránek jako záložky; aktivní záložka je v URL (?tab=). */
export default function HubTabs({ title, tabs, actions }: { title: string; tabs: HubTab[]; actions?: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const current = tabs.some((t) => t.value === params.get("tab")) ? params.get("tab")! : tabs[0].value;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions}
      </div>
      <Tabs value={current} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList className="flex-wrap h-auto">
          {tabs.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
        </TabsList>
        {tabs.map((t) => <TabsContent key={t.value} value={t.value} className="mt-4">{t.content}</TabsContent>)}
      </Tabs>
    </div>
  );
}
