"use client"

import * as React from "react"
import { Plus, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"

const STUDENT_ASSIGNABLE_ROLES = [
  "PRESIDENT",
  "MESS_COMMITTEE",
  "SPORTS_COMMITTEE",
] as const


/**
 * Additional-role manager for the multi-role model: one person, one
 * account, many roles (e.g. STUDENT + PRESIDENT + MESS_COMMITTEE).
 * The primary role is shown locked; extras can be granted/revoked
 * through /api/admin/users/[id]/roles (users.manage permission).
 */
export function RoleManager({
  userId,
  primaryRole,
  initialRoles,
  onChanged,
}: {
  userId: string
  primaryRole: string
  initialRoles?: string[]
  onChanged?: () => void
}) {
  const { data, reload } = useApi<{ roles: string[]; primaryRole: string }>(`/api/admin/users/${userId}/roles`)
  const roles = data?.roles ?? initialRoles ?? [primaryRole]
  const [pending, setPending] = React.useState(false)
  const [choice, setChoice] = React.useState<string>("")

  const grant = async () => {
    if (!choice) return
    setPending(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: choice }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to grant role.")
      toast.success(`Role ${choice.replaceAll("_", " ")} granted.`)
      setChoice("")
      reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to grant role.")
    } finally {
      setPending(false)
    }
  }

  const revoke = async (role: string) => {
    setPending(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Unable to revoke role.")
      toast.success(`Role ${role.replaceAll("_", " ")} revoked.`)
      reload()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to revoke role.")
    } finally {
      setPending(false)
    }
  }

  const assignableRoles = STUDENT_ASSIGNABLE_ROLES
  const available = assignableRoles.filter((r) => !roles.includes(r))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {roles.map((r) => (
          <Badge
            key={r}
            variant={r === primaryRole ? "default" : "secondary"}
            className="gap-1 font-mono text-[10px]"
          >
            {r.replaceAll("_", " ")}
            {r !== primaryRole && (
              <button
                type="button"
                aria-label={`Revoke ${r}`}
                disabled={pending}
                onClick={() => void revoke(r)}
                className="ml-0.5 rounded-full hover:text-destructive disabled:opacity-50"
              >
                <X className="size-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>
      {available.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center items-stretch gap-2">
          <Select value={choice} onValueChange={(v) => setChoice(v ?? "")}>
            <SelectTrigger className="h-8 flex-1 text-xs">
              <SelectValue placeholder="Grant additional role…" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {available.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 gap-1 text-xs" disabled={!choice || pending} onClick={() => void grant()}>
            <Plus className="size-3.5" />
            Grant
          </Button>
        </div>
      )}
    </div>
  )
}
