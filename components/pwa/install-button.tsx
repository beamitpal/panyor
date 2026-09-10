"use client"

import * as React from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

/**
 * PWA install button. Captures beforeinstallprompt; on iOS (no event)
 * shows share-sheet guidance instead. Renders nothing when the app is
 * already installed (standalone display mode).
 */
export function InstallButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches
  )
  const [isIos] = React.useState(
    () => typeof window !== "undefined" && /iphone|ipad|ipod/i.test(window.navigator.userAgent)
  )
  const [iosHint, setIosHint] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  if (installed) return null

  if (deferred) {
    return (
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={async () => {
          await deferred.prompt()
          const { outcome } = await deferred.userChoice
          if (outcome === "accepted") setDeferred(null)
        }}
      >
        <Download className="size-3.5" />
        Install App
      </Button>
    )
  }

  // Only render when installation is actually possible: Chromium's
  // install prompt, or iOS Safari's manual Add-to-Home-Screen flow.
  // Otherwise this would be a dead button that merely toggles a hint.
  if (!deferred && !isIos) return null

  if (isIos && !deferred) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-[11px] text-muted-foreground">
          On iPhone: tap Share → “Add to Home Screen” to install Panyor Hall.
        </p>
      </div>
    )
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={className}
        onClick={() => setIosHint((v) => !v)}
      >
        <Download className="size-3.5" />
        Install App
      </Button>
      {iosHint && (
        <p className="text-[11px] text-muted-foreground">
          On iPhone: tap Share → “Add to Home Screen”. On Android/Chrome: menu → “Install app”.
        </p>
      )}
    </>
  )
}
