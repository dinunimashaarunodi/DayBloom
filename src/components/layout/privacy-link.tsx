import Link from "next/link"

/** Small footer link to the privacy notice. */
export function PrivacyLink() {
  return (
    <Link
      href="/privacy"
      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      Privacy
    </Link>
  )
}
