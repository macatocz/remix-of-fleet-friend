import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAppPublicUrl() {
  const [url, setUrl] = useState<string>(typeof window !== "undefined" ? window.location.origin : "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "app_public_url")
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.value) {
          setUrl(data.value.replace(/\/$/, ""));
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { url, loading };
}
