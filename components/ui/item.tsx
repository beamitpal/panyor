import * as React from "react"
import { cn } from "@/lib/utils"

export interface ItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  disabled?: boolean
}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
  ({ className, active, disabled, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-xs transition-colors hover:bg-muted/40",
          active && "border-primary/40 bg-accent/30",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        {...props}
      />
    )
  }
)
Item.displayName = "Item"

const ItemContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-1 flex-col gap-0.5 min-w-0", className)} {...props} />
  )
)
ItemContent.displayName = "ItemContent"

const ItemTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h4 ref={ref} className={cn("text-xs font-semibold leading-tight text-foreground truncate", className)} {...props} />
  )
)
ItemTitle.displayName = "ItemTitle"

const ItemDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-[11px] text-muted-foreground truncate", className)} {...props} />
  )
)
ItemDescription.displayName = "ItemDescription"

const ItemActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-1.5 shrink-0", className)} {...props} />
  )
)
ItemActions.displayName = "ItemActions"

export { Item, ItemContent, ItemTitle, ItemDescription, ItemActions }
