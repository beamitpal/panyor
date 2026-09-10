"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-none rounded-md bg-background p-1 hover:bg-acritious/60",
  {
    variants: {
      variant: {
        default: "",
        secondary: "bg-acritious/60",
        destructive: "bg-destructive/60",
        outline: "border border-input bg-transparent",
        link: "underline text-link hover:text-primary-foreground",
      },
      size: {
        default: "",
        sm: "h-8 px-2 text-xs",
        lg: "h-10 px-3 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ToggleProps {
  variant?: "default" | "secondary" | "destructive" | "outline" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export function Toggle({ variant, size, className }: ToggleProps) {
  return (
    <div
      role="button"
      className={cn(toggleVariants({ variant, size, className }))}
      tabIndex={0}
    />
  )
}

export interface ToggleGroupProps {
  type?: "single" | "multiple"
  className?: string
  children: React.ReactNode
}

export function ToggleGroup({
  type = "single",
  className,
  children,
}: ToggleGroupProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {React.Children.toArray(children)}
    </div>
  )
}