"use client"

import * as React from "react"
import { PreviewCard as HoverCardPrimitive } from "@base-ui/react/preview-card"
import { cn } from "@/lib/utils"

const HoverCard = HoverCardPrimitive.Root
const HoverCardTrigger = HoverCardPrimitive.Trigger
const HoverCardPortal = HoverCardPrimitive.Portal

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: HoverCardPrimitive.Popup.Props & { align?: "start" | "center" | "end"; sideOffset?: number }) {
  return (
    <HoverCardPortal>
      <HoverCardPrimitive.Popup
        className={cn(
          "z-50 w-64 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </HoverCardPortal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
