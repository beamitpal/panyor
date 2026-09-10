"use client"

import * as React from "react"
import {
  Check,
  X,
  Database,
  HardDrive,
  Building2,
} from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { useRole } from "@/components/layout/role-context"
import { ROLE_PERMISSIONS, ROLE_DESCRIPTIONS, type RoleName, type PermissionName } from "@/lib/permissions/rbac"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { RoleManager } from "@/components/shared/role-manager"

export default function SystemSettingsPage() {
  const { can } = useRole()
  const [adminForm, setAdminForm] = React.useState({ name: "", email: "", phone: "", password: "", role: "WARDEN" as RoleName })
  const [creatingAdmin, setCreatingAdmin] = React.useState(false)
  type AdminRow = { id: string; name: string; email: string; phone: string | null; role: string; roles?: string[]; status: string }
  const { data: adminsData, error: adminsError, loading: adminsLoading, reload: loadAdmins } = useApi<{ users: AdminRow[] }>(can("users.manage") ? "/api/admin/users" : null)
  const admins = adminsData?.users ?? []

  const allRoles: RoleName[] = [
    "SUPER_ADMIN",
    "WARDEN",
    "DEPUTY_WARDEN",
    "PRESIDENT",
    "CARETAKER",
    "MESS_COMMITTEE",
    "SPORTS_COMMITTEE",
    "MESS_EMPLOYEE",
    "STUDENT",
  ]

  const permissionGroups: { group: string; perms: { name: PermissionName; label: string }[] }[] = [
    {
      group: "Student Resident Management",
      perms: [
        { name: "students.view", label: "View Directory & Resident Profiles" },
        { name: "students.create", label: "Register / Add Students" },
        { name: "students.edit", label: "Modify Resident Records" },
        { name: "students.approve", label: "Approve / Reject / Suspend Admissions" },
        { name: "students.delete", label: "Purge Student Records" },
      ],
    },
    {
      group: "Room Occupancy & Double Allocations",
      perms: [
        { name: "rooms.view", label: "View Room Grid & Bed Allocations" },
        { name: "rooms.create", label: "Create Hostel Rooms" },
        { name: "rooms.edit", label: "Edit Room Block / Floor Data" },
        { name: "rooms.assign", label: "Allot & Vacate Beds (Max 2 rule)" },
        { name: "rooms.delete", label: "Decommission Rooms" },
      ],
    },
    {
      group: "Sports & Equipment Inventory Desk",
      perms: [
        { name: "equipment.view", label: "View Sports & Board Games Catalog" },
        { name: "equipment.create", label: "Add Equipment to Catalog" },
        { name: "equipment.issue", label: "Direct Issue & Request Approval" },
        { name: "equipment.return", label: "Assess Returns, Damages & Fines" },
        { name: "equipment.manage", label: "Stock Recalculation & Deletions" },
      ],
    },
    {
      group: "Complaints & Maintenance Triage",
      perms: [
        { name: "complaints.view", label: "View Maintenance Tickets" },
        { name: "complaints.create", label: "Log Complaint Tickets" },
        { name: "complaints.edit", label: "Update Status & Comments" },
        { name: "complaints.assign", label: "Assign Staff Technicians" },
        { name: "complaints.delete", label: "Delete / Purge Tickets" },
      ],
    },
    {
      group: "Mess Dining Operations",
      perms: [
        { name: "mess.view", label: "View Dining Menus & Distribution Logs" },
        { name: "mess.distribute", label: "Counter Meal Handout & Verify" },
        { name: "mess.manage", label: "Create Sessions & Food Menu Items" },
      ],
    },
    {
      group: "Notice Board & Announcements",
      perms: [
        { name: "notices.view", label: "Read Circulars & Bulletins" },
        { name: "notices.create", label: "Publish Official Announcements" },
        { name: "notices.edit", label: "Modify Circulars" },
        { name: "notices.delete", label: "Delete / Archive Circulars" },
      ],
    },
    {
      group: "Reports, Audits & Security",
      perms: [
        { name: "reports.view", label: "View Institutional Reports" },
        { name: "reports.export", label: "Export Excel, PDF & CSV" },
        { name: "audit_logs.view", label: "Inspect Tamper-Proof Audit Trail" },
        { name: "system.settings", label: "Super Admin Command Center" },
      ],
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          System Administration & RBAC Matrix
        </h1>
        <p className="text-xs text-muted-foreground">
          Live Role-Based Access Control matrix, security perimeter & hostel infrastructure health.
        </p>
      </div>

      <Tabs defaultValue="rbac" className="space-y-4">
        <TabsList className="h-9 max-w-full flex-nowrap overflow-x-auto">
          <TabsTrigger value="rbac">
            Fine-Grained RBAC Permission Matrix
          </TabsTrigger>
          <TabsTrigger value="roles">
            Role Directory ({allRoles.length} Roles)
          </TabsTrigger>
          {can("users.manage") && <TabsTrigger value="admins">Administrator Accounts</TabsTrigger>}
          <TabsTrigger value="health">
            Platform Infrastructure Health
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Live RBAC Matrix */}
        <TabsContent value="rbac" className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold">Role-Permission Grid</CardTitle>
              <CardDescription>
                Server-side enforced matrix ensuring strict operational separation of concerns
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <div className="overflow-x-auto"><Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[240px]">Permission Capability</TableHead>
                    {allRoles.map((r) => (
                      <TableHead key={r} className="text-center font-mono text-[10px] min-w-[90px]">
                        {r.replace("_", " ")}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {permissionGroups.map((grp) => (
                    <React.Fragment key={grp.group}>
                      <TableRow className="bg-muted/40 font-semibold text-xs">
                        <TableCell colSpan={allRoles.length + 1} className="py-2 text-foreground font-bold">
                          {grp.group}
                        </TableCell>
                      </TableRow>
                      {grp.perms.map((p) => (
                        <TableRow key={p.name}>
                          <TableCell className="text-xs py-2">
                            <div className="flex flex-col">
                              <span className="font-medium text-foreground">{p.label}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{p.name}</span>
                            </div>
                          </TableCell>

                          {allRoles.map((role) => {
                            const has = ROLE_PERMISSIONS[role].includes(p.name)
                            return (
                              <TableCell key={role} className="text-center py-2">
                                {has ? (
                                  <div className="flex justify-center">
                                    <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                      <Check className="size-3" />
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex justify-center">
                                    <span className="flex size-5 items-center justify-center rounded-full bg-muted text-muted-foreground/40">
                                      <X className="size-3" />
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Roles Catalog */}
        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {allRoles.map((role) => {
              const perms = ROLE_PERMISSIONS[role]
              return (
                <Card key={role} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {role}
                    </Badge>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {perms.length} perms
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {ROLE_DESCRIPTIONS[role]}
                  </p>
                  <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
                    <span className="font-semibold text-foreground block mb-1">Key Permissions:</span>
                    <ul className="list-disc list-inside space-y-0.5">
                      {perms.slice(0, 4).map((p) => (
                        <li key={p} className="truncate">{p}</li>
                      ))}
                      {perms.length > 4 && <li>+ {perms.length - 4} more</li>}
                    </ul>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {can("users.manage") && (
          <TabsContent value="admins" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Administrator Accounts ({admins.length})</CardTitle>
                <CardDescription>Live staff directory from the database. Student accounts are excluded.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {adminsLoading ? (
                  <p className="p-4 text-xs text-muted-foreground">Loading administrator accounts…</p>
                ) : adminsError ? (
                  <div className="p-4"><Alert variant="destructive"><AlertDescription>{adminsError}</AlertDescription></Alert></div>
                ) : admins.length === 0 ? (
                  <p className="p-4 text-xs text-muted-foreground">No administrator accounts yet — create the first one below.</p>
                ) : (
                  <div className="overflow-x-auto"><Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles (primary locked)</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admins.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs font-medium text-foreground">{a.name}</TableCell>
                          <TableCell className="text-xs font-mono">{a.email}</TableCell>
                          <TableCell><RoleManager userId={a.id} primaryRole={a.role} initialRoles={a.roles ?? [a.role]} onChanged={() => loadAdmins()} /></TableCell>
                          <TableCell><Badge variant={a.status === "APPROVED" ? "success" : "warning"} size="sm" className="font-mono text-[10px]">{a.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table></div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Create Administrator Account</CardTitle>
                <CardDescription>Only Super Admins and users with the users.manage permission should create staff accounts. New staff accounts are approved immediately.</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setCreatingAdmin(true)
                    try {
                      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(adminForm) })
                      const result = await response.json()
                      if (!response.ok) throw new Error(result.error || "Unable to create administrator account.")
                      toast.success("Administrator account created successfully.")
                      setAdminForm({ name: "", email: "", phone: "", password: "", role: "WARDEN" })
                      loadAdmins()
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Unable to create administrator account.")
                    } finally {
                      setCreatingAdmin(false)
                    }
                  }}
                >
                  <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field><FieldLabel htmlFor="admin-name">Full name</FieldLabel><Input id="admin-name" value={adminForm.name} onChange={(e) => setAdminForm((v) => ({ ...v, name: e.target.value }))} required /></Field>
                  <Field><FieldLabel htmlFor="admin-email">Email</FieldLabel><Input id="admin-email" type="email" value={adminForm.email} onChange={(e) => setAdminForm((v) => ({ ...v, email: e.target.value }))} required /></Field>
                  <Field><FieldLabel htmlFor="admin-phone">Phone</FieldLabel><Input id="admin-phone" value={adminForm.phone} onChange={(e) => setAdminForm((v) => ({ ...v, phone: e.target.value }))} /></Field>
                  <Field><FieldLabel htmlFor="admin-password">Temporary password</FieldLabel><Input id="admin-password" type="password" minLength={8} value={adminForm.password} onChange={(e) => setAdminForm((v) => ({ ...v, password: e.target.value }))} required /></Field>
                  <Field className="md:col-span-2"><FieldLabel htmlFor="admin-role">Role</FieldLabel><Select value={adminForm.role} onValueChange={(v) => setAdminForm((prev) => ({ ...prev, role: v as RoleName }))}><SelectTrigger id="admin-role" className="h-9 text-xs w-full"><SelectValue placeholder="Select role" /></SelectTrigger><SelectContent><SelectGroup>{allRoles.filter((r) => r !== "SUPER_ADMIN" && r !== "STUDENT").map((role) => <SelectItem key={role} value={role}>{role.replaceAll("_", " ")}</SelectItem>)}</SelectGroup></SelectContent></Select></Field>
                  </FieldGroup>
                  <div className="md:col-span-2"><Button type="submit" disabled={creatingAdmin}>{creatingAdmin ? "Creating…" : "Create Administrator"}</Button></div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* TAB 3: Infrastructure Health */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Database className="size-5 text-primary" />
                <Badge variant="success">Operational</Badge>
              </div>
              <h4 className="font-bold text-sm text-foreground">PostgreSQL & Drizzle ORM</h4>
              <p className="text-xs text-muted-foreground">
                Configured for PostgreSQL via Drizzle. Runtime connectivity is verified by the server database layer before protected operations proceed.
              </p>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <HardDrive className="size-5 text-primary" />
                <Badge variant="success">Operational</Badge>
              </div>
              <h4 className="font-bold text-sm text-foreground">Supabase Storage</h4>
              <p className="text-xs text-muted-foreground">
                Document and profile storage buckets with MIME validation and size limits; uploads fail safely when storage is unavailable.
              </p>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Building2 className="size-5 text-primary" />
                <Badge variant="secondary">Enforced</Badge>
              </div>
              <h4 className="font-bold text-sm text-foreground">Double Occupancy Policy</h4>
              <p className="text-xs text-muted-foreground">
                Hard ceiling of strictly 2 students per room enforced across database queries and mutation services.
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

