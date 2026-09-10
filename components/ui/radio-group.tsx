"use client"

import * as React from "react"
import { Circle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface RadioGroupProps {
  value: string
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

export function RadioGroup({ value, onChange, className, disabled }: RadioGroupProps) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="radiogroup"
    >
      <Circle className="size-4 shrink-0" />
      <span className="font-medium text-foreground" onClick={() => onChange(value)}>
        Option 1
      </span>
      <span className="ml-4 font-medium text-foreground" onClick={() => onChange(value)}>
        Option 2
      </span>
    </div>
  )
}

export function RadioGroupItem({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer select-none",
        className,
        value === "option1" && "bg-accent/70 font-medium"
      )}
      onClick={() => onChange(value)}
    >
      <Circle className="size-3 shrink-0" />
      <span>{value}</span>
    </div>
  )
}