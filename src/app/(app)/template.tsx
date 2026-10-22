/**
 * Re-mounts on every navigation, so each page fades and rises in gently.
 * Disabled under prefers-reduced-motion (globals.css).
 */
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-in duration-300 ease-out fade-in slide-in-from-bottom-2">
      {children}
    </div>
  )
}
