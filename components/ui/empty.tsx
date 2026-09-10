import * as React from "react"
import { AlertCircle, Inbox, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface EmptyProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

function Empty({
  className,
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  children,
  ...props
}: EmptyProps) {
  return (
    <div
      className={cn(
        "flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border p-8 text-center animate-in fade-in-50",
        className
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mb-3">
        <Icon className="size-6" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  )
}

function Spinner({
  className,
  size = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { size?: "sm" | "default" | "lg" }) {
  const sizeClass = size === "sm" ? "size-3.5" : size === "lg" ? "size-7" : "size-5"
  return (
    <div
      role="status"
      className={cn("inline-flex items-center justify-center text-muted-foreground animate-spin", className)}
      {...props}
    >
      <RefreshCw className={sizeClass} />
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export { Empty, Spinner }
