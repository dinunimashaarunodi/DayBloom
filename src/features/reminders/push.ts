/**
 * The VAPID public key (base64url, as stored in NEXT_PUBLIC_VAPID_PUBLIC_KEY)
 * as the bytes PushManager.subscribe() expects.
 */
export function vapidKeyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replaceAll("-", "+").replaceAll("_", "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
