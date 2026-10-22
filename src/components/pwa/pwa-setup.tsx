"use client"

import { useEffect } from "react"

import { captureInstallPrompt } from "./install-prompt"

/**
 * Registers the service worker (production only: in development it would
 * serve stale pages) and starts listening for the install prompt.
 */
export function PwaSetup() {
  useEffect(() => {
    captureInstallPrompt()
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Not fatal: the app works the same without it.
      })
  }, [])
  return null
}
