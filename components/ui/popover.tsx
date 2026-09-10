"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverPortal = PopoverPrimitive.Portal
const PopoverPositioner = PopoverPrimitive.Positioner

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props & { align?: "start" | "center" | "end"; sideOffset?: number }) {
  return (
    <PopoverPortal>
      <PopoverPositioner align={align} sideOffset={sideOffset}>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "z-50 w-72 rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className
          )}
          {...props}
        />
      </PopoverPositioner>
    </PopoverPortal>
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverPortal, PopoverPositioner }
