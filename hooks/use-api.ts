"use client"

/* eslint-disable react-hooks/set-state-in-effect --
   useApi exists solely to synchronize external API state into React on
   mount/URL change (the canonical effect use-case: external-system sync
   with cancellation guards). Centralizing the single justified disable
   here keeps every consumer lint-clean instead of scattering disables. */

import * as React from "react"

export interface ApiState<T> {
  data: T | null
  error: string | null
  loading: boolean
  reload: () => void
}

/**
 * GET JSON from an same-origin API route with loading/error state.
 * Pass `null` to suspend (e.g. until a permission check resolves).
 * Initial fetch lives in an effect because it synchronizes React state
 * with an external system (the API) — the canonical effect use-case.
 */
export function useApi<T>(url: string | null): ApiState<T> {
  const [data, setData] = React.useState<T | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(url !== null)
  const [nonce, setNonce] = React.useState(0)

  React.useEffect(() => {
    if (url === null) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(url, { cache: "no-store" })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) throw new Error(json.error || `Request failed (${res.status}).`)
        setData(json as T)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed.")
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [url, nonce])

  const reload = React.useCallback(() => setNonce((n) => n + 1), [])

  return { data, error, loading, reload }
}
