"use client"

import { WifiOff } from "lucide-react"
import { useSyncExternalStore } from "react"

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange)
  window.addEventListener("offline", onChange)
  return () => {
    window.removeEventListener("online", onChange)
    window.removeEventListener("offline", onChange)
  }
}

/**
 * A gentle notice while the device is offline. Changes aren't queued
 * (offline writes are postponed), so it says so plainly.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  )
  if (online) return null
  return (
    <div
      role="status"
      className="mb-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        <span className="font-medium">You&apos;re offline.</span> You can keep
        reading, but changes won&apos;t save until you&apos;re back online.
      </p>
    </div>
  )
}
