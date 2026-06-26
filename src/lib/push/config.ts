// VAPID public key is safe to expose (designed to be public).
export const VAPID_PUBLIC_KEY =
  "BEI-uwq00sJMqIgOQqfEtU-2bVlzbSAWDALpHbgnC2Crjz0w9Xt4kdlQa1PCpm9YeixvDMZXJNfD02t7sIto-Vc";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}