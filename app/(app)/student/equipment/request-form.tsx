"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

interface RequestFormItem {
  id: string
  name: string
  availableQuantity: number
}

interface RequestFormProps {
  profileId: string
  items: RequestFormItem[]
}

function defaultReturnDate(): string {
  const d = new Date(Date.now() + 7 * 24 * 3600 * 1000)
  return d.toISOString().split("T")[0] ?? ""
}

export default function RequestForm({ profileId, items }: RequestFormProps) {
  const router = useRouter()
  const [equipmentId, setEquipmentId] = React.useState("")
  const [quantity, setQuantity] = React.useState("1")
  const [expectedReturnDate, setExpectedReturnDate] = React.useState(defaultReturnDate)
  const [purpose, setPurpose] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  if (!profileId) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!equipmentId) {
      toast.error("Please select an equipment item.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/equipment/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProfileId: profileId,
          equipmentId,
          quantity: Number(quantity),
          purpose: purpose.trim() || undefined,
          expectedReturnDate: expectedReturnDate
            ? new Date(expectedReturnDate).toISOString()
            : undefined,
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error || "Unable to submit request.")
      toast.success("Equipment request submitted.")
      setEquipmentId("")
      setQuantity("1")
      setExpectedReturnDate(defaultReturnDate())
      setPurpose("")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to submit request.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="eq-item">Equipment item</FieldLabel>
          <Select value={equipmentId} onValueChange={(v: string | null) => setEquipmentId(v ?? "")}>
            <SelectTrigger id="eq-item">
              <SelectValue placeholder="Select equipment" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} ({item.availableQuantity} available)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="eq-qty">Quantity</FieldLabel>
          <Input
            id="eq-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="eq-return">Expected return date</FieldLabel>
          <Input
            id="eq-return"
            type="date"
            value={expectedReturnDate}
            onChange={(e) => setExpectedReturnDate(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="eq-purpose">Purpose</FieldLabel>
          <Textarea
            id="eq-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Why do you need this equipment?"
          />
        </Field>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit request"}
        </Button>
      </FieldGroup>
    </form>
  )
}
