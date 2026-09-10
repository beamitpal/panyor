import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  BedDouble,
  BellRing,
  Building2,
  Gamepad2,
  LifeBuoy,
  ShieldCheck,
  UtensilsCrossed,
} from "lucide-react"
import { getEffectiveRoles, getSessionIdentity } from "@/lib/auth/server"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BrandMark, BRAND_SUB } from "@/components/shared/brand"

export const metadata = {
  title: "Panyor Hall of Residence | Rajiv Gandhi University",
  description:
    "Official hostel portal for Panyor Hall of Residence, RGU — admissions, rooms, mess, sports equipment, complaints and notices.",
}

const FEATURES = [
  {
    icon: BedDouble,
    title: "Rooms & Allotment",
    desc: "Double-occupancy bed tracking, floor-wise grid, and warden-approved allocations.",
  },
  {
    icon: UtensilsCrossed,
    title: "Mess Counter",
    desc: "Daily meal sessions, counter handout verification, and proxy pickup delegation.",
  },
  {
    icon: Gamepad2,
    title: "Sports & Equipment",
    desc: "Catalog, checkout requests, issue desk, damage fines, and return ledger.",
  },
  {
    icon: LifeBuoy,
    title: "Complaints Desk",
    desc: "Tickets with SLA priorities, staff assignment, comments, and resident ratings.",
  },
  {
    icon: BellRing,
    title: "Notice Board",
    desc: "Official circulars from the warden's office with audience targeting.",
  },
  {
    icon: ShieldCheck,
    title: "Roles & Audit",
    desc: "Nine-role RBAC from student to super admin with a full audit trail.",
  },
]

export default async function LandingPage() {
  // Signed-in residents skip the landing and go straight to their portal.
  const identity = await getSessionIdentity()
  if (identity) {
    if (identity.status === "PENDING") redirect("/pending")
    if (identity.status === "REJECTED" || identity.status === "SUSPENDED") redirect("/login")
    const roles = await getEffectiveRoles(identity)
    redirect(roles.length === 1 && roles[0] === "STUDENT" ? "/student" : "/admin")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandMark compactOnMobile />
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1.5">
                Register <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute -right-20 -top-20 size-72 rounded-full bg-primary-foreground/10" />
        <div className="absolute -bottom-24 -left-12 size-64 rounded-full bg-primary-foreground/10" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <Badge variant="secondary" className="mb-4 font-mono text-[10px] uppercase tracking-wider">
              Session 2025–2026 · Rono Hills
            </Badge>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Your hostel life, managed in one place.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed opacity-90 sm:text-base">
              Apply for admission, track your room, collect mess meals, borrow sports gear,
              raise complaints, and read official notices — all from your Panyor Hall account.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link href="/signup" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full gap-1.5 sm:w-auto">
                  Apply for admission <ArrowRight className="size-4" />
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:w-auto">
                  Resident sign in
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-3">
            {[
              { icon: Building2, k: "Double", v: "occupancy rooms" },
              { icon: UtensilsCrossed, k: "Daily", v: "mess counter" },
              { icon: Gamepad2, k: "Sports", v: "issue & return" },
              { icon: LifeBuoy, k: "24×7", v: "complaint desk" },
            ].map((s) => (
              <div key={s.v} className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-sm">
                <s.icon className="size-5" />
                <p className="mt-2 text-lg font-bold leading-none">{s.k}</p>
                <p className="mt-1 text-[11px] opacity-80">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Everything the hostel office does, online</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Separate portals for residents, wardens, caretakers, mess staff, and committees —
            each with exactly the permissions its role needs.
          </p>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <span className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <CardTitle className="text-base">{f.title}</CardTitle>
                <CardDescription className="text-[13px] leading-relaxed">{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Admission strip */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:px-6 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">New to Panyor Hall?</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Register with your university roll number. The warden&apos;s office verifies every
              application — most approvals complete within a day.
            </p>
          </div>
          <Link href="/signup" className="w-full sm:w-auto">
            <Button size="lg" className="w-full gap-1.5 sm:w-auto">
              Start application <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="font-semibold text-foreground">Panyor Hall of Residence</p>
          <p>{BRAND_SUB}</p>
        </div>
      </footer>
    </div>
  )
}
