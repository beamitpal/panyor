"use client"

import * as React from "react"

/** Registers /sw.js once on the client (production only — dev chunks change
 * on every rebuild and must never be served from cache). Silent failure —
 * PWA is progressive enhancement. */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (process.env.NODE_ENV !== "production") return
    if (!("serviceWorker" in navigator)) return
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {})
    }
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
    return () => window.removeEventListener("load", register)
  }, [])
  return null
}
