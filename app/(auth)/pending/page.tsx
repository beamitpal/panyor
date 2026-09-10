"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Clock, LogOut } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BrandMark } from "@/components/shared/brand"

export default function PendingPage() {
  const router = useRouter()
  const [signingOut, setSigningOut] = React.useState(false)

  const signOutToLogin = async () => {
    setSigningOut(true)
    try {
      await authClient.signOut()
    } catch {
      // Fall through to login regardless — layout guards the session.
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 sm:p-6">
      <div className="w-full max-w-md min-w-0 rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="flex justify-center">
          <BrandMark withName={false} />
        </div>
        <span className="mx-auto mt-4 flex size-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
          <Clock className="size-6" />
        </span>
        <div className="mt-4 flex items-center justify-center gap-2">
          <h1 className="text-lg font-bold sm:text-xl">Registration awaiting approval</h1>
        </div>
        <div className="mt-2">
          <Badge variant="warning" className="font-mono text-[10px]">PENDING</Badge>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your hostel account has been created and is waiting for approval from the warden&apos;s
          office. You will be able to sign in normally after approval — usually within a day.
        </p>
        <Button onClick={signOutToLogin} disabled={signingOut} className="mt-6 w-full gap-1.5">
          <LogOut className="size-4" />
          {signingOut ? "Signing out…" : "Back to login"}
        </Button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Wrong account? Sign out and register or sign in again.
        </p>
      </div>
    </div>
  )
}
