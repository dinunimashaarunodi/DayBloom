"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { buttonVariants } from "@/components/ui/button"
import { safeNextPath } from "@/lib/auth/routes"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Problem = "expired" | "invalid"

/** Reads what Supabase put in the URL. Only the browser can see the #fragment. */
function readLink() {
  const hash = new URLSearchParams(window.location.hash.slice(1))
  const query = new URLSearchParams(window.location.search)
  const errorCode =
    hash.get("error_code") ??
    query.get("error_code") ??
    hash.get("error") ??
    query.get("error")
  return {
    next: safeNextPath(query.get("next")),
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    errorCode,
  }
}

/**
 * Finishes sign-in from an email link (signup confirmation or password reset).
 * The link carries a one-time session in the URL fragment, so it works on any
 * device or browser, not just the one that asked for the email.
 */
export function EmailLinkHandler() {
  const router = useRouter()
  const [problem, setProblem] = useState<Problem | null>(null)
  // The link is single-use and we clear it from the URL, so handle it exactly
  // once (React runs effects twice in development).
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const link = readLink()
    // Remove the tokens from the address bar and browser history right away.
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?next=${encodeURIComponent(link.next)}`,
    )

    if (link.errorCode || !link.accessToken || !link.refreshToken) {
      queueMicrotask(() =>
        setProblem(link.errorCode === "otp_expired" ? "expired" : "invalid"),
      )
      return
    }

    createClient()
      .auth.setSession({
        access_token: link.accessToken,
        refresh_token: link.refreshToken,
      })
      .then(({ error }) => {
        if (error) {
          setProblem("invalid")
        } else {
          router.replace(link.next)
          router.refresh()
        }
      })
  }, [router])

  if (!problem) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Signing you in…
      </p>
    )
  }

  return (
    <div className="grid gap-4">
      <Alert>
        <AlertDescription>
          {problem === "expired"
            ? "That link has expired or was already used. Each new email replaces the previous link, so use the most recent one."
            : "We couldn't use that link. It may be incomplete or already used."}{" "}
          If you were confirming your email, it may already be confirmed, so try
          logging in.
        </AlertDescription>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Link href="/login" className={cn(buttonVariants(), "h-10 px-4")}>
          Log in
        </Link>
        <Link
          href="/forgot-password"
          className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}
        >
          Get a new reset link
        </Link>
      </div>
    </div>
  )
}
