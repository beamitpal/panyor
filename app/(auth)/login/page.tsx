"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { BellRing, Building2, Eye, EyeOff, Loader2, ShieldCheck, UtensilsCrossed } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { Button } from "@/components/ui/button"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BrandMark } from "@/components/shared/brand"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
})

type LoginValues = z.infer<typeof loginSchema>

const STATUS_NOTES: Record<string, string> = {
  rejected: "Your application was rejected. Contact the warden's office for details.",
  suspended: "Your account is suspended. Contact the warden's office.",
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/"
  const statusNote = STATUS_NOTES[searchParams.get("status") ?? ""] ?? null
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
    clearErrors,
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), mode: "onTouched" })

  // Locked from the moment the credentials are accepted until the
  // redirect unmounts the page — no double-submits, no idle button.
  const busy = isSubmitting || isSubmitSuccessful

  const onSubmit = async (values: LoginValues) => {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setError("root", { message: error.message || "Sign-in failed. Check your credentials." })
      return
    }
    router.push(next)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 py-8 sm:p-6">
      <div className="grid w-full max-w-4xl min-w-0 overflow-hidden rounded-2xl border bg-card shadow-sm lg:grid-cols-2">
        {/* Branding panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-8 text-primary-foreground lg:flex">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10" />
          <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-primary-foreground/10" />
          <div className="relative flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary-foreground/15 text-sm font-extrabold tracking-wide">
              PH
            </span>
            <div>
              <p className="text-base font-bold leading-tight">Panyor Hall of Residence</p>
              <p className="text-[11px] opacity-80">Rajiv Gandhi University, Doimukh</p>
            </div>
          </div>
          <div className="relative flex flex-col gap-4">
            <h2 className="text-2xl font-bold leading-snug">
              One hostel account for rooms, mess, sports & support.
            </h2>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {[
                { icon: Building2, text: "Room allotment & double-occupancy tracking" },
                { icon: UtensilsCrossed, text: "Daily mess distribution & proxy pickup" },
                { icon: ShieldCheck, text: "Complaints, equipment & notice board" },
                { icon: BellRing, text: "Alerts for meals and hostel announcements" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-2.5">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/15">
                    <f.icon className="size-3.5" />
                  </span>
                  <span className="opacity-90">{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="relative text-[11px] opacity-70">
            Session 2025–2026 · Rono Hills, Arunachal Pradesh
          </p>
        </div>

        {/* Form panel */}
        <div className="min-w-0 p-5 sm:p-8">
          <div className="mb-1 lg:hidden">
            <BrandMark />
          </div>
          <CardHeader className="px-0 pt-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl sm:text-2xl">Welcome back</CardTitle>
              <Badge variant="secondary" className="font-mono text-[10px]">RGU</Badge>
            </div>
            <CardDescription>Sign in with your hostel account to continue.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {statusNote && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{statusNote}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@rgu.ac.in"
                    className="h-10"
                    {...register("email", { onChange: () => clearErrors("root") })}
                    aria-invalid={!!errors.email}
                  />
                  <FieldError>{errors.email?.message}</FieldError>
                </Field>
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="h-10 pr-10"
                      {...register("password", { onChange: () => clearErrors("root") })}
                      aria-invalid={!!errors.password}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <FieldError>{errors.password?.message}</FieldError>
                </Field>
                {errors.root && (
                  <Alert variant="destructive" className="min-w-0">
                    <AlertDescription className="break-words">{errors.root.message}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="h-10 w-full gap-1.5" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  {isSubmitSuccessful ? "Redirecting…" : isSubmitting ? "Verifying…" : "Sign in"}
                </Button>
              </FieldGroup>
            </form>
            <p className="mt-5 text-center text-xs text-muted-foreground">
              New resident?{" "}
              <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                Register for hostel admission
              </Link>
            </p>
          </CardContent>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <LoginForm />
    </React.Suspense>
  )
}
