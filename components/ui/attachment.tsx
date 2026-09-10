import * as React from "react"
import { File, Paperclip, X, Download } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number
}

function AspectRatio({ ratio = 16 / 9, className, style, children, ...props }: AspectRatioProps) {
  return (
    <div className={cn("relative w-full", className)} style={{ paddingBottom: `${(1 / ratio) * 100}%`, ...style }} {...props}>
      <div className="absolute inset-0">{children}</div>
    </div>
  )
}

export interface AttachmentProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  sizeBytes?: number
  url?: string
  onRemove?: () => void
}

function Attachment({ className, name, sizeBytes, url, onRemove, ...props }: AttachmentProps) {
  const sizeFormatted = sizeBytes ? `${(sizeBytes / 1024).toFixed(1)} KB` : null

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground",
        className
      )}
      {...props}
    >
      <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
      <span className="truncate max-w-[180px] font-medium">{name}</span>
      {sizeFormatted && <span className="text-[10px] text-muted-foreground shrink-0">({sizeFormatted})</span>}
      {url && (
        <a href={url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
          <Download className="size-3.5" />
        </a>
      )}
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

function Bubble({ className, count, ...props }: React.HTMLAttributes<HTMLSpanElement> & { count?: number }) {
  if (count === undefined || count <= 0) return null
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold leading-none text-destructive-foreground min-w-[18px]",
        className
      )}
      {...props}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}

function Marker({ className, color = "primary", ...props }: React.HTMLAttributes<HTMLSpanElement> & { color?: "primary" | "success" | "warning" | "destructive" }) {
  const colorMap = {
    primary: "bg-primary",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    destructive: "bg-destructive",
  }
  return <span className={cn("inline-block size-2 rounded-full", colorMap[color], className)} {...props} />
}

export { AspectRatio, Attachment, Bubble, Marker }
