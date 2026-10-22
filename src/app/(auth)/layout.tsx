import { BrandPanel } from "@/components/layout/brand-panel"
import { Logo } from "@/components/layout/logo"
import { PrivacyLink } from "@/components/layout/privacy-link"

/** Sign-in pages: the brand story beside the form on wide screens. */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <BrandPanel className="hidden lg:flex" />
      <main className="flex flex-col items-center justify-center gap-6 px-4 py-10 sm:px-8">
        <Logo className="lg:hidden" />
        <div className="flex w-full animate-in justify-center duration-300 fade-in slide-in-from-bottom-2">
          {children}
        </div>
        <PrivacyLink />
      </main>
    </div>
  )
}
