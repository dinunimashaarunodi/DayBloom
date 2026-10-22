// Captures the browser's install prompt (Chromium's `beforeinstallprompt`),
// which fires once early in the page's life, so Settings can offer an
// "Install" button later. Safari and Firefox never fire it; the install
// section shows instructions there instead.

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/** Call once in the browser (from <PwaSetup>). */
export function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault() // We show our own button instead of the mini-bar.
    deferred = event as InstallPromptEvent
    notify()
  })
  window.addEventListener("appinstalled", () => {
    deferred = null
    installed = true
    notify()
  })
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export type InstallState = "installed" | "promptable" | "manual"

export function getInstallState(): InstallState {
  if (installed || window.matchMedia("(display-mode: standalone)").matches) {
    return "installed"
  }
  return deferred ? "promptable" : "manual"
}

/** Shows the browser's install dialog (only when "promptable"). */
export async function promptInstall() {
  if (!deferred) return
  const event = deferred
  deferred = null // A prompt can only be used once.
  notify()
  await event.prompt()
  await event.userChoice
}
