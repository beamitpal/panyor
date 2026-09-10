"use client"

import * as React from "react"
import { BellRing, Search, Plus, Download, Calendar, User } from "lucide-react"
import { useRole } from "@/components/layout/role-context"
import type { NoticeWithDetails, NoticeCategory, NoticePriority, NoticeAudience } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ExportModal } from "@/components/shared/export-modal"
import { Empty } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import { useApi } from "@/hooks/use-api"

export default function NoticesPage() {
  const { currentUser, can } = useRole()
  const { data, error, loading, reload: load } = useApi<{ notices: NoticeWithDetails[] }>("/api/notices")
  const notices = React.useMemo(() => data?.notices ?? [], [data])
  const [search, setSearch] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL")
  const [audienceFilter, setAudienceFilter] = React.useState<string>("ALL")
  const [createNoticeModalOpen, setCreateNoticeModalOpen] = React.useState(false)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [formTitle, setFormTitle] = React.useState("")
  const [formContent, setFormContent] = React.useState("")
  const [formCategory, setFormCategory] = React.useState<NoticeCategory>("GENERAL")
  const [formPriority, setFormPriority] = React.useState<NoticePriority>("NORMAL")
  const [targetAudiences, setTargetAudiences] = React.useState<NoticeAudience[]>(["ALL"])

  // loaded via useApi above

  const filteredNotices = React.useMemo(() => {
    let list = [...notices]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.authorName.toLowerCase().includes(q))
    }
    if (categoryFilter !== "ALL") list = list.filter((n) => n.category === categoryFilter)
    if (audienceFilter !== "ALL") list = list.filter((n) => n.targetAudiences.includes("ALL") || n.targetAudiences.includes(audienceFilter as NoticeAudience))
    return list
  }, [search, categoryFilter, audienceFilter, notices])

  const handleAudienceToggle = (aud: NoticeAudience) => {
    if (aud === "ALL") { setTargetAudiences(["ALL"]); return }
    let updated: NoticeAudience[] = targetAudiences.filter((a) => a !== "ALL")
    updated = updated.includes(aud) ? updated.filter((a) => a !== aud) : [...updated, aud]
    if (updated.length === 0) updated = ["ALL"]
    setTargetAudiences(updated)
  }

  const handleCreateNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formContent.trim()) { toast.error("Please enter notice title and circular content."); return }
    try {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formTitle, content: formContent, category: formCategory, priority: formPriority, targetAudiences }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to publish notice.")
      toast.success("Hostel Notice published successfully.")
      setCreateNoticeModalOpen(false)
      setFormTitle("")
      setFormContent("")
      setTargetAudiences(["ALL"])
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish notice.")
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Hostel Notice Board & Circulars</h1>
          <p className="text-xs text-muted-foreground">Official announcements, mess circulars, maintenance advisories & warden decrees.</p>
        </div>
        <div className="flex items-center gap-2">
          {can("reports.export") && (
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="h-9 gap-1.5 text-xs">
              <Download className="size-3.5" /> Export Notices
            </Button>
          )}
          {can("notices.create") && (
            <Button size="sm" onClick={() => setCreateNoticeModalOpen(true)} className="h-9 gap-1.5 text-xs">
              <Plus className="size-3.5" /> Publish Notice
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input placeholder="Search circulars by keyword, topic, author..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
            </div>
            <div className="sm:col-span-3">
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "")}>
<SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
<SelectContent><SelectGroup><SelectItem value="ALL">All Categories</SelectItem><SelectItem value="GENERAL">General Notice</SelectItem><SelectItem value="MESS">Mess & Dining</SelectItem><SelectItem value="DISCIPLINE">Discipline & Code of Conduct</SelectItem><SelectItem value="MAINTENANCE">Hostel Maintenance</SelectItem><SelectItem value="EVENT">Sports & Cultural Event</SelectItem><SelectItem value="EMERGENCY">Emergency Advisory</SelectItem></SelectGroup></SelectContent>
</Select>
            </div>
            <div className="sm:col-span-3">
              <Select value={audienceFilter} onValueChange={(v) => setAudienceFilter(v ?? "")}>
<SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All Audiences" /></SelectTrigger>
<SelectContent><SelectGroup><SelectItem value="ALL">All Audiences</SelectItem><SelectItem value="STUDENTS">Residents / Students</SelectItem><SelectItem value="WARDEN">Wardens</SelectItem><SelectItem value="CARETAKER">Caretakers</SelectItem><SelectItem value="MESS_COMMITTEE">Mess Committee</SelectItem></SelectGroup></SelectContent>
</Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card><CardContent className="p-6 space-y-3"><Skeleton className="h-5 w-1/3" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card>
      ) : error ? (
        <Card><CardContent className="p-6 space-y-3"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert><Button variant="outline" size="sm" onClick={load}>Retry</Button></CardContent></Card>
      ) : filteredNotices.length === 0 ? (
        <Empty title="No notices found" description="No circulars match your search and filters." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNotices.map((notice) => {
            const isCritical = notice.priority === "CRITICAL"
            const isHigh = notice.priority === "HIGH"
            return (
              <Card key={notice.id} className={`flex flex-col justify-between transition-all hover:shadow-sm ${isCritical ? "border-destructive/40 bg-destructive/5" : isHigh ? "border-amber-500/40 bg-amber-500/5" : "border-border"}`}>
                <CardHeader className="p-5 pb-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={isCritical ? "destructive" : isHigh ? "warning" : "outline"} size="sm" className="font-mono text-[9px] py-0 px-1.5">{notice.priority}</Badge>
                      <Badge variant="secondary" size="sm" className="font-mono text-[9px] py-0 px-1.5">{notice.category}</Badge>
                    </div>
                    <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                      <Calendar className="size-3" />{notice.publishedAt ? new Date(notice.publishedAt).toLocaleDateString() : "—"}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground leading-snug">{notice.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-xs leading-relaxed text-foreground whitespace-pre-line">{notice.content}</CardContent>
                <CardFooter className="p-5 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground bg-muted/20">
                  <div className="flex items-center gap-2">
                    <User className="size-3 text-muted-foreground" />
                    <span className="font-medium text-foreground">{notice.authorName}</span>
                    <span>({notice.authorRole})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono">Target: {notice.targetAudiences.join(", ")}</span>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={createNoticeModalOpen} onOpenChange={setCreateNoticeModalOpen}>
        <DialogContent className="sm:max-w-xl max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BellRing className="size-5 text-primary" /> Publish Hostel Notice & Circular</DialogTitle>
            <DialogDescription>Broadcast official notice to residents, mess staff, caretakers, and wardens.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNoticeSubmit}><FieldGroup className="space-y-4 py-2 text-xs">
            <Field><FieldLabel>Circular Title / Subject<span className="text-destructive"> *</span></FieldLabel>
              <Input required placeholder="e.g. Mandatory Hostel Roll Call & Inspection" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </Field>
            <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field><FieldLabel>Category<span className="text-destructive"> *</span></FieldLabel>
                <Select value={formCategory} onValueChange={(v) => setFormCategory((v ?? "") as NoticeCategory)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent><SelectGroup><SelectItem value="GENERAL">General Notice</SelectItem><SelectItem value="MESS">Mess & Dining</SelectItem><SelectItem value="DISCIPLINE">Discipline & Code</SelectItem><SelectItem value="MAINTENANCE">Maintenance</SelectItem><SelectItem value="EVENT">Hostel Event / Sports</SelectItem><SelectItem value="EMERGENCY">Emergency Advisory</SelectItem></SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field><FieldLabel>Priority Level<span className="text-destructive"> *</span></FieldLabel>
                <Select value={formPriority} onValueChange={(v) => setFormPriority((v ?? "") as NoticePriority)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent><SelectGroup><SelectItem value="LOW">Low</SelectItem><SelectItem value="NORMAL">Normal</SelectItem><SelectItem value="HIGH">High Priority</SelectItem><SelectItem value="CRITICAL">Critical Emergency</SelectItem></SelectGroup></SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <Field><FieldLabel>Target Audience</FieldLabel>
              <div className="flex flex-wrap gap-2 pt-1">
                {(["ALL", "STUDENTS", "WARDEN", "CARETAKER", "MESS_COMMITTEE"] as NoticeAudience[]).map((aud) => {
                  const isSelected = targetAudiences.includes(aud)
                  return (
                    <button key={aud} type="button" onClick={() => handleAudienceToggle(aud)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${isSelected ? "bg-primary text-primary-foreground border-primary font-medium" : "border-border bg-card hover:bg-muted text-muted-foreground"}`}>
                      {aud}
                    </button>
                  )
                })}
              </div>
            </Field>
            <Field><FieldLabel>Official Announcement Body<span className="text-destructive"> *</span></FieldLabel>
              <Textarea required placeholder="Type the full text of the circular..." value={formContent} onChange={(e) => setFormContent(e.target.value)} className="min-h-[140px]" />
            </Field>
            <DialogFooter>
              <Button variant="outline" size="sm" type="button" onClick={() => setCreateNoticeModalOpen(false)}>Cancel</Button>
              <Button size="sm" type="submit" disabled={!formTitle.trim() || !formContent.trim()}>Publish Circular</Button>
            </DialogFooter>
          </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        title="Hostel Circulars & Notices Archive"
        filename="panyor_hostel_notices"
        data={filteredNotices.map((n) => ({ title: n.title, category: n.category, priority: n.priority, author: n.authorName, role: n.authorRole, publishedAt: n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : "—", content: n.content }))}
        columns={[
          { header: "Subject", key: "title", width: 28 },
          { header: "Category", key: "category", width: 14 },
          { header: "Priority", key: "priority", width: 12 },
          { header: "Author", key: "author", width: 20 },
          { header: "Role", key: "role", width: 14 },
          { header: "Date Published", key: "publishedAt", width: 14 },
        ]}
        summaryStats={[
          { label: "Total Circulars", value: notices.length },
          { label: "Emergency Advisories", value: notices.filter((n) => n.priority === "CRITICAL").length },
        ]}
        currentRole={currentUser.role}
      />
    </div>
  )
}

