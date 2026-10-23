"use client"

import { BellOff, BellRing } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"

import { removePushSubscription, savePushSubscription } from "../actions"
import { vapidKeyToBytes } from "../push"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

type DeviceState =
  | "checking"
  | "unsupported"
  | "install-first"
  | "no-worker"
  | "denied"
  | "off"
  | "on"

async function currentRegistration() {
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

/** Turns reminders on or off for this browser or installed app. */
export function DevicePush() {
  const [state, setState] = useState<DeviceState>("checking")
  const [error, setError] = useState<string>()
  const [saving, startTransition] = useTransition()

  useEffect(() => {
    let cancelled = false
    async function check(): Promise<DeviceState> {
      const supported =
        VAPID_PUBLIC_KEY !== "" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
      if (!supported) {
        // iPhone and iPad only allow web push for apps on the home screen.
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
        return ios ? "install-first" : "unsupported"
      }
      if (Notification.permission === "denied") return "denied"
      const registration = await currentRegistration()
      // The worker only registers in the production build.
      if (!registration) return "no-worker"
      const subscription = await registration.pushManager.getSubscription()
      return subscription ? "on" : "off"
    }
    check().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function enable() {
    startTransition(async () => {
      setError(undefined)
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off")
        return
      }
      const registration = await currentRegistration()
      if (!registration) {
        setState("no-worker")
        return
      }
      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKeyToBytes(VAPID_PUBLIC_KEY),
        })
        const result = await savePushSubscription(subscription.toJSON())
        if (result.error) {
          await subscription.unsubscribe()
          setError(result.error)
          return
        }
        setState("on")
        await registration.showNotification("Reminders are on", {
          body: "We'll send gentle reminders here at the times you choose.",
          icon: "/icons/icon-192.png",
          tag: "daybloom-welcome",
        })
      } catch {
        setError(
          "This browser couldn't turn on notifications. Please try again.",
        )
      }
    })
  }

  function disable() {
    startTransition(async () => {
      setError(undefined)
      const registration = await currentRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await removePushSubscription(subscription.endpoint)
        await subscription.unsubscribe()
      }
      setState("off")
    })
  }

  const message: Record<DeviceState, string> = {
    checking: "Checking this device…",
    unsupported: "This browser can't show reminders.",
    "install-first":
      "On iPhone and iPad, add DayBloom to your home screen first (Share, then Add to Home Screen), then turn reminders on from the installed app.",
    "no-worker":
      "Reminders work in the live app. Reload the page and try again.",
    denied:
      "Notifications are blocked for DayBloom. Allow them in your browser's site settings, then reload.",
    off: "Reminders are off on this device.",
    on: "Reminders are on for this device.",
  }

  return (
    <div className="grid gap-3">
      <p role="status" className="text-sm text-muted-foreground">
        {message[state]}
      </p>
      {state === "off" && (
        <Button
          type="button"
          className="h-10 w-fit px-4"
          disabled={saving}
          onClick={enable}
        >
          <BellRing aria-hidden="true" />
          {saving ? "Turning on…" : "Turn on reminders on this device"}
        </Button>
      )}
      {state === "on" && (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-fit px-4"
          disabled={saving}
          onClick={disable}
        >
          <BellOff aria-hidden="true" />
          {saving ? "Turning off…" : "Turn off on this device"}
        </Button>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
