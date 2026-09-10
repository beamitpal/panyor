"use client"

import * as React from "react"
import { useApi } from "@/hooks/use-api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty } from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { Search } from "lucide-react"

interface MeProfile {
  id: string
  name: string
  studentId: string
  roomNumber: string | null
}

interface Distribution {
  id: string
  mealType: string
  messItemName: string
  distributionDate: string
}

interface MessRecord {
  id: string
  distributionId: string
  studentProfileId: string
  collectionType: string | null
  collectorStudentProfileId: string | null
}

interface Peer {
  id: string
  name: string
  studentId: string
  roomNumber: string | null
}

interface Delegation {
  id: string
  distributionId: string
  beneficiaryStudentProfileId: string
  collectorStudentProfileId: string
  status: string
}

export default function MyMessPage() {
  const today = React.useMemo(() => new Date().toISOString().split("T")[0] ?? "", [])
  const me = useApi<{ profile: MeProfile | null }>("/api/students/me")
  const profileId = me.data?.profile?.id ?? null

  const distUrl = `/api/mess/distributions?date=${today}`
  const recUrl = `/api/mess/records?date=${today}`
  const sessions = useApi<{ distributions: Distribution[] }>(distUrl)
  const records = useApi<{ records: MessRecord[] }>(recUrl)
  const peers = useApi<{ peers: Peer[] }>("/api/students/peers")
  const delegations = useApi<{ delegations: Delegation[]; profileId?: string }>(
    "/api/mess/delegations"
  )

  const [collectorQuery, setCollectorQuery] = React.useState("")
  const [collectorId, setCollectorId] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const profile = me.data?.profile ?? null
  const session = sessions.data?.distributions?.[0] ?? null
  const record = React.useMemo(
    () =>
      session && profileId
        ? (records.data?.records ?? []).find(
            (r) => r.distributionId === session.id && r.studentProfileId === profileId
          ) ?? null
        : null,
    [session, profileId, records.data]
  )
  const activeDelegation = React.useMemo(() => {
    const list = delegations.data?.delegations ?? []
    return session
      ? (list.find((d) => d.distributionId === session.id && d.status === "ACTIVE") ?? null)
      : null
  }, [delegations.data, session])
  const collectors = React.useMemo(() => {
    const q = collectorQuery.toLowerCase()
    return (peers.data?.peers ?? [])
      .filter((s) => s.id !== profileId)
      .filter((s) =>
        [s.name, s.studentId, s.roomNumber ?? ""].some((v) =>
          v.toLowerCase().includes(q)
        )
      )
      .slice(0, 6)
  }, [peers.data, profileId, collectorQuery])

  const collectorName = React.useMemo(() => {
    if (!activeDelegation) return null
    return (
      peers.data?.peers.find((p) => p.id === activeDelegation.collectorStudentProfileId)
        ?.name ?? activeDelegation.collectorStudentProfileId
    )
  }, [activeDelegation, peers.data])

  const loading = me.loading || sessions.loading || records.loading
  const loadError = me.error ?? sessions.error ?? records.error
  const retryAll = () => {
    me.reload()
    sessions.reload()
    records.reload()
    peers.reload()
    delegations.reload()
  }

  const delegate = async () => {
    if (!session || !collectorId) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/mess/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distributionId: session.id,
          collectorStudentProfileId: collectorId,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || "Unable to create delegation.")
      toast.success("Meal pickup delegation created.")
      setCollectorId("")
      setCollectorQuery("")
      delegations.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create delegation.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load mess data</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button onClick={retryAll}>Retry</Button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">My Mess</h1>
          <p className="text-sm text-muted-foreground">
            Manage today&apos;s meal collection and ask another resident to collect it for you.
          </p>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-6">
            <Empty
              title="Your student profile is being prepared"
              description="We could not find a student profile for your account yet. Please contact the warden office."
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 sm:px-6">
      <div className="min-w-0">
        <h1 className="text-xl font-bold sm:text-2xl">My Mess</h1>
        <p className="text-sm text-muted-foreground">
          Manage today&apos;s meal collection and ask another resident to collect it for you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="break-words text-lg sm:text-xl">
            {session ? `${session.mealType} — ${session.messItemName}` : "No meal session"}
          </CardTitle>
          <CardDescription className="break-words">
            {session
              ? `Today · ${session.distributionDate}`
              : "The mess has not opened a distribution session for today."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {record ? (
            <div className="rounded-lg border p-4 text-sm break-words">
              <p className="font-semibold">Meal collected</p>
              <p className="mt-1 text-muted-foreground">
                Collection type: {record.collectionType || "SELF"}
              </p>
              <Badge className="mt-2">COLLECTED</Badge>
            </div>
          ) : session ? (
            <div className="space-y-4">
              <p className="text-sm">Your meal has not been collected yet.</p>
              {activeDelegation ? (
                <div className="rounded-lg border p-4 text-sm break-words">
                  <p className="font-semibold">Delegation active</p>
                  <p className="mt-1 text-muted-foreground">
                    {collectorName} will collect your meal.
                  </p>
                  <Badge className="mt-2">ACTIVE</Badge>
                </div>
              ) : (
                <div className="rounded-lg border p-4">
                  <p className="font-medium text-sm">Ask another student to collect it</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    They will collect your meal, not their own. Only one meal is counted for you.
                  </p>
                  <Field className="mt-4">
                    <FieldLabel htmlFor="collector">Search collector</FieldLabel>
                    <InputGroup>
                      <InputGroupAddon>
                        <Search />
                      </InputGroupAddon>
                      <Input
                        id="collector"
                        value={collectorQuery}
                        onChange={(e) => setCollectorQuery(e.target.value)}
                        placeholder="Name, student ID or room"
                        className="border-0 shadow-none focus-visible:ring-0"
                      />
                    </InputGroup>
                  </Field>
                  <div className="mt-2 space-y-1">
                    {collectors.map((c) => (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCollectorId(c.id)}
                        className={`block w-full rounded-md border px-3 py-2 text-left text-sm ${
                          collectorId === c.id ? "bg-accent" : ""
                        }`}
                      >
                        <span className="font-medium break-words">{c.name}</span>
                        <span className="ml-2 break-all text-xs text-muted-foreground">
                          {c.studentId} · Room {c.roomNumber || "—"}
                        </span>
                      </button>
                    ))}
                    {!collectors.length && (
                      <Empty
                        title="No matching residents"
                        description="Try a different name, student ID, or room number."
                      />
                    )}
                  </div>
                  <Button
                    className="mt-3 w-full sm:w-auto"
                    disabled={!collectorId || submitting}
                    onClick={delegate}
                  >
                    {submitting ? "Delegating…" : "Delegate pickup"}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Empty
              title="No meal session today"
              description="The mess has not opened a distribution session for today."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
