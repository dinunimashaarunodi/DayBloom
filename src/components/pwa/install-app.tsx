"use client"

import { CircleCheck, Download } from "lucide-react"
import { useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"

import {
  getInstallState,
  promptInstall,
  subscribeInstall,
  type InstallState,
} from "./install-prompt"

function isAppleMobile() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac with touch.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

/** Settings → Install: a button where the browser allows it, otherwise steps. */
export function InstallApp() {
  const state = useSyncExternalStore<InstallState | "unknown">(
    subscribeInstall,
    getInstallState,
    () => "unknown",
  )
  const apple = useSyncExternalStore(
    () => () => {},
    isAppleMobile,
    () => false,
  )
  const [busy, setBusy] = useState(false)

  if (state === "unknown") return null

  if (state === "installed") {
    return (
      <p className="flex items-center gap-2 text-sm">
        <CircleCheck className="size-4 text-primary" aria-hidden="true" />
        You&apos;re using the installed app.
      </p>
    )
  }

  if (state === "promptable") {
    return (
      <Button
        type="button"
        className="h-10 px-4"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await promptInstall()
          setBusy(false)
        }}
      >
        <Download aria-hidden="true" />
        Install DayBloom
      </Button>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      {apple ? (
        <>
          In Safari, tap the <span className="font-medium">Share</span> button,
          then <span className="font-medium">Add to Home Screen</span>.
        </>
      ) : (
        <>
          Open your browser&apos;s menu and choose{" "}
          <span className="font-medium">Install app</span> or{" "}
          <span className="font-medium">Add to Home screen</span>.
        </>
      )}
    </p>
  )
}
