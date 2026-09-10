"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { ComplaintCategoryDef, ComplaintPriority } from "@/types"

interface CategoriesResponse {
  categories: ComplaintCategoryDef[]
}

const PRIORITIES: ComplaintPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"]

export default function ComplaintForm({ profileId }: { profileId: string }) {
  const router = useRouter()
  const { data, error, loading } = useApi<CategoriesResponse>("/api/complaint-categories")
  const [categoryId, setCategoryId] = React.useState("")
  const [priority, setPriority] = React.useState<ComplaintPriority>("MEDIUM")
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const categories = data?.categories ?? []

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!categoryId || !title.trim() || !description.trim()) {
      toast.error("Please fill in category, title and description.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentProfileId: profileId,
          categoryId,
          priority,
          title: title.trim(),
          description: description.trim(),
        }),
      })
      const json = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(json.error ?? "Unable to submit complaint.")
      toast.success("Complaint submitted.")
      setCategoryId("")
      setPriority("MEDIUM")
      setTitle("")
      setDescription("")
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to submit complaint.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New complaint</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="complaint-category">Category</FieldLabel>
                <Select
                  value={categoryId || undefined}
                  onValueChange={(v: string | null) => setCategoryId(v ?? "")}
                  disabled={loading}
                >
                  <SelectTrigger id="complaint-category">
                    <SelectValue placeholder={loading ? "Loading…" : "Select a category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="complaint-priority">Priority</FieldLabel>
                <Select
                  value={priority}
                  onValueChange={(v: string | null) => {
                    if (v) setPriority(v as ComplaintPriority)
                  }}
                >
                  <SelectTrigger id="complaint-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="complaint-title">Title</FieldLabel>
                <Input
                  id="complaint-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief summary"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="complaint-description">Description</FieldLabel>
                <Textarea
                  id="complaint-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail"
                  rows={4}
                />
              </Field>
              <Button type="submit" disabled={submitting || loading}>
                {submitting ? "Submitting…" : "Submit complaint"}
              </Button>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
