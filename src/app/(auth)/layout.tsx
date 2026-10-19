import { Logo } from "@/components/layout/logo"
import { PrivacyLink } from "@/components/layout/privacy-link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10">
      <Logo />
      {children}
      <PrivacyLink />
    </main>
  )
}
