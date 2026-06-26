import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push/config";

export type PushStatus = "unsupported" | "denied" | "default" | "granted";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("default");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PushStatus);
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "navigate" && e.data.link) window.location.href = e.data.link;
    };
    navigator.serviceWorker.addEventListener?.("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener?.("message", onMsg);
  }, []);

  const enable = useCallback(async () => {
    if (status === "unsupported") return false;
    setRegistering(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as PushStatus);
      if (perm !== "granted") return false;
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      const raw = sub.toJSON();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: sub.endpoint,
          p256dh: raw.keys?.p256dh || "",
          auth: raw.keys?.auth || "",
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" },
      );
      return true;
    } finally {
      setRegistering(false);
    }
  }, [status]);

  const disable = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  }, []);

  return { status, registering, enable, disable };
}