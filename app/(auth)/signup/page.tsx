"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import Image from "next/image"
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, GraduationCap, Loader2, Upload, UserRound } from "lucide-react"
import { authClient } from "@/lib/auth/client"
import { uploadHostelFile } from "@/lib/supabase/storage"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RGU_DEPARTMENT_NAMES, programsFor } from "@/lib/data/rgu-programs"
import { normalizeEmail, normalizePhone, PHONE_ERROR } from "@/lib/auth/normalize"
import { BrandMark } from "@/components/shared/brand"
import { toast } from "sonner"

const YEARS = [1, 2, 3, 4, 5, 6]
const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const signupSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .transform((v) => normalizeEmail(v))
    .pipe(z.string().email("Enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .min(1, "Enter your phone number.")
    .transform((v) => normalizePhone(v))
    .pipe(z.string().min(10, PHONE_ERROR)),
  password: z.string().min(8, "Password must be at least 8 characters."),
  studentId: z.string().trim().min(3, "Enter your university roll / ID."),
  enrollmentNo: z.string().trim().min(3, "Enter your enrollment number."),
  department: z.string().min(2, "Choose your department."),
  program: z.string().min(2, "Choose your program."),
  year: z.coerce.number().int().min(1).max(8),
  semester: z.coerce.number().int().min(1).max(16),
})

type SignupValues = z.infer<typeof signupSchema>

const STEPS = [
  { id: 0, title: "Account", desc: "Login credentials", fields: ["name", "email", "phone", "password"] as const },
  { id: 1, title: "Academic", desc: "University details", fields: ["studentId", "enrollmentNo", "department", "program", "year", "semester"] as const },
  { id: 2, title: "Review", desc: "Confirm & submit", fields: [] as const },
]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = React.useState(0)
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)

  const {
    register,
    handleSubmit,
    control,
    trigger,
    getValues,
    watch,
    setValue,
    formState: { errors, isSubmitting, isSubmitSuccessful },
    setError,
  } = useForm<SignupValues>({ resolver: zodResolver(signupSchema), mode: "onTouched" })

  // Locked from acceptance until the redirect unmounts the page.
  const busy = isSubmitting || isSubmitSuccessful

  const selectedDepartment = watch("department")
  const departmentPrograms = programsFor(selectedDepartment)

  const onAvatarChange = (file: File | null) => {
    setAvatarFile(file)
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarPreview(file ? URL.createObjectURL(file) : null)
  }

  const next = async () => {
    const ok = await trigger(STEPS[step].fields, { shouldFocus: true })
    if (ok) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const onSubmit = async (values: SignupValues) => {
    let avatarUrl: string | undefined
    if (avatarFile) {
      const upload = await uploadHostelFile({
        bucket: "student-avatars",
        path: `students/pending/${crypto.randomUUID()}-${avatarFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
        file: avatarFile,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
        maxSizeBytes: 5 * 1024 * 1024,
      })
      if (upload.error) {
        // Photo is optional — never block admission over a storage hiccup
        // (e.g. bucket not provisioned yet). The profile is created photoless.
        toast.warning("Photo upload skipped — continuing without it.")
      } else {
        avatarUrl = upload.url
      }
    }

    const { error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
      phone: values.phone,
      image: avatarUrl,
    })
    // Self-heal an interrupted earlier attempt: if the mailbox already
    // exists (auth row survived a failed profile write), sign in with the
    // same credentials and finish the profile below instead of dead-ending.
    let freshSignup = !error
    if (error) {
      const msg = (error.message || "").toLowerCase()
      if (msg.includes("exist") || msg.includes("already") || msg.includes("taken")) {
        const retry = await authClient.signIn.email({ email: values.email, password: values.password })
        if (retry.error) {
          setError("root", { message: "This email is already registered. Please sign in instead." })
          return
        }
        freshSignup = false
      } else {
        setError("root", { message: error.message || "Registration failed. Try a different email." })
        return
      }
    }

    try {
      const response = await fetch("/api/students/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: values.studentId,
          enrollmentNo: values.enrollmentNo,
          department: values.department,
          program: values.program,
          year: values.year,
          semester: values.semester,
          avatarUrl,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Student profile registration failed.")
    } catch (err) {
      // Roll back a half-created account so a retry starts clean instead of
      // hitting "email already exists" with nothing visible in admin.
      if (freshSignup) {
        try {
          await fetch("/api/students/register", { method: "DELETE" })
          await authClient.signOut()
        } catch {
          // Best effort — surface the original failure below.
        }
      }
      setError("root", {
        message: err instanceof Error ? err.message : "Account created, but profile registration failed.",
      })
      return
    }

    router.push("/pending")
    router.refresh()
  }

  const values = getValues()

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background p-4 py-8 sm:p-6">
      <Card className="w-full max-w-2xl min-w-0 overflow-hidden">
        <div className="bg-primary px-6 py-5 sm:px-8">
          <BrandMark onPrimary boxClassName="size-10 text-sm" />
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-xl sm:text-2xl">Hostel Admission Registration</CardTitle>
          <CardDescription>
            A warden approves your profile before rooms and amenities are allotted.
          </CardDescription>

          <div className="pt-3">
            <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
            <ol className="mt-3 grid grid-cols-3 gap-2">
              {STEPS.map((s, i) => (
                <li key={s.id} className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      i < step
                        ? "bg-primary text-primary-foreground"
                        : i === step
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-xs font-semibold ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
                      {s.title}
                    </span>
                    <span className="hidden truncate text-[10px] text-muted-foreground sm:block">{s.desc}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 sm:pt-4">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {step === 0 && (
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="name">Full name</FieldLabel>
                  <Input id="name" autoComplete="name" placeholder="e.g. Tana Tara" {...register("name")} aria-invalid={!!errors.name} />
                  <FieldError>{errors.name?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="email">University email</FieldLabel>
                  <Input id="email" type="email" autoComplete="email" placeholder="you@rgu.ac.in" {...register("email")} aria-invalid={!!errors.email} />
                  <FieldError>{errors.email?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="phone">Phone</FieldLabel>
                  <Input id="phone" type="tel" autoComplete="tel" placeholder="+91 …" {...register("phone")} aria-invalid={!!errors.phone} />
                  <FieldError>{errors.phone?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Min 8 characters"
                      className="pr-10"
                      {...register("password")}
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
                <Field>
                  <FieldLabel htmlFor="avatar">Photo <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel>
                  <div className="flex items-center gap-3">
                    {avatarPreview ? (
                      <Image src={avatarPreview} alt="Profile preview" width={48} height={48} className="size-12 shrink-0 rounded-full border object-cover" />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
                        <UserRound className="size-5" />
                      </span>
                    )}
                    <label htmlFor="avatar" className="flex h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-xs font-medium transition-colors hover:bg-muted/60">
                      <Upload className="size-3.5" />
                      {avatarFile ? "Change photo" : "Upload photo"}
                    </label>
                    <Input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)} />
                  </div>
                  <FieldDescription>JPG, PNG or WebP · max 5 MB.</FieldDescription>
                </Field>
              </FieldGroup>
            )}

            {step === 1 && (
              <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="studentId">University roll / ID</FieldLabel>
                  <Input id="studentId" placeholder="RGU/2024/CSE/042" {...register("studentId")} aria-invalid={!!errors.studentId} />
                  <FieldError>{errors.studentId?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="enrollmentNo">Enrollment number</FieldLabel>
                  <Input id="enrollmentNo" placeholder="RGU-2024-…" {...register("enrollmentNo")} aria-invalid={!!errors.enrollmentNo} />
                  <FieldError>{errors.enrollmentNo?.message}</FieldError>
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabel>Department</FieldLabel>
                  <Controller
                    control={control}
                    name="department"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) => {
                          field.onChange(v ?? "")
                          setValue("program", "", { shouldValidate: true })
                          // Re-validate immediately so a prior error clears
                          // the moment a choice is made (Select has no blur).
                          void trigger("department")
                        }}
                      >
                        <SelectTrigger className="h-9 w-full text-xs" aria-invalid={!!errors.department}>
                          <SelectValue placeholder="Choose department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {RGU_DEPARTMENT_NAMES.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError>{errors.department?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel>Program</FieldLabel>
                  <Controller
                    control={control}
                    name="program"
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={(v) => { field.onChange(v ?? ""); void trigger("program") }} disabled={departmentPrograms.length === 0}>
                        <SelectTrigger className="h-9 w-full text-xs" aria-invalid={!!errors.program}>
                          <SelectValue placeholder={selectedDepartment ? "Choose program" : "Pick a department first"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {departmentPrograms.map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError>{errors.program?.message}</FieldError>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>Year</FieldLabel>
                    <Controller
                      control={control}
                      name="year"
                      render={({ field }) => (
                        <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => { field.onChange(Number(v)); void trigger("year") }}>
                          <SelectTrigger className="h-9 w-full text-xs" aria-invalid={!!errors.year}>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {YEARS.map((y) => (
                                <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError>{errors.year?.message}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel>Semester</FieldLabel>
                    <Controller
                      control={control}
                      name="semester"
                      render={({ field }) => (
                        <Select value={field.value ? String(field.value) : ""} onValueChange={(v) => { field.onChange(Number(v)); void trigger("semester") }}>
                          <SelectTrigger className="h-9 w-full text-xs" aria-invalid={!!errors.semester}>
                            <SelectValue placeholder="Sem" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {SEMESTERS.map((s) => (
                                <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError>{errors.semester?.message}</FieldError>
                  </Field>
                </div>
              </FieldGroup>
            )}

            {step === 2 && (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border bg-muted/30 p-4 text-xs">
                  <p className="mb-2 flex items-center gap-1.5 font-semibold text-foreground">
                    <GraduationCap className="size-4 text-primary" /> Review your application
                  </p>
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                    {[["Name", values.name], ["Email", values.email], ["Phone", values.phone], ["Roll / ID", values.studentId], ["Enrollment", values.enrollmentNo], ["Department", values.department], ["Program", values.program], ["Year / Sem", values.year && values.semester ? `Y${values.year} · S${values.semester}` : "—"]].map(([k, v]) => (
                      <div key={k} className="flex min-w-0 justify-between gap-2 border-b border-border/50 pb-1.5">
                        <dt className="shrink-0 text-muted-foreground">{k}</dt>
                        <dd className="min-w-0 truncate font-medium text-foreground">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                {errors.root && (
                  <Alert variant="destructive">
                    <AlertDescription className="break-words">{errors.root.message}</AlertDescription>
                  </Alert>
                )}
                <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-[11px] text-muted-foreground">
                  <Badge variant="secondary" className="shrink-0 font-mono text-[10px]">PENDING</Badge>
                  Your account starts as PENDING — a warden approves it before rooms are allotted.
                </div>
              </div>
            )}

            {errors.root && step !== 2 && (
              <Alert variant="destructive" className="mt-4 min-w-0">
                <AlertDescription className="break-words">{errors.root.message}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {step > 0 ? (
                <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-1.5">
                  <ArrowLeft className="size-3.5" /> Back
                </Button>
              ) : (
                <span className="hidden sm:block" />
              )}
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next} className="gap-1.5">
                  Continue <ArrowRight className="size-3.5" />
                </Button>
              ) : (
                <Button type="submit" disabled={busy} className="gap-1.5">
                  {busy && <Loader2 className="size-3.5 animate-spin" />}
                  {isSubmitSuccessful ? "Redirecting…" : isSubmitting ? "Registering…" : "Submit application"}
                </Button>
              )}
            </div>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Already registered?{" "}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
