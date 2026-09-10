import * as React from "react"
import { cn } from "@/lib/utils"

const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full items-center rounded-lg border border-input bg-transparent shadow-xs focus-within:ring-2 focus-within:ring-ring focus-within:border-ring",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
InputGroup.displayName = "InputGroup"

const InputGroupAddon = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: "left" | "right" }
>(({ className, align = "left", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center px-3 text-muted-foreground [&_svg]:size-4",
        align === "left" ? "pr-0" : "pl-0",
        className
      )}
      {...props}
    />
  )
})
InputGroupAddon.displayName = "InputGroupAddon"

const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex rounded-lg shadow-xs",
        orientation === "horizontal"
          ? "flex-row [&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:first-child)]:-ml-[1px]"
          : "flex-col [&>button]:rounded-none [&>button:first-child]:rounded-t-lg [&>button:last-child]:rounded-b-lg [&>button:not(:first-child)]:-mt-[1px]",
        className
      )}
      {...props}
    />
  )
})
ButtonGroup.displayName = "ButtonGroup"

export { InputGroup, InputGroupAddon, ButtonGroup }
