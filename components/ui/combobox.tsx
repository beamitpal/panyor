"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Button } from "./button"
import { Badge } from "./badge"

export interface ComboboxOption {
  value: string
  label: string
  sublabel?: string
  badge?: string
  extra?: string
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  searchPlaceholder = "Type to search...",
  emptyText = "No results found.",
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const selected = options.find((opt) => opt.value === value)

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(query.toLowerCase()) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(query.toLowerCase())) ||
      (opt.extra && opt.extra.toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between text-xs font-normal h-9", className)}
          >
            {selected ? (
              <span className="flex items-center gap-2 truncate">
                <span className="font-medium text-foreground">{selected.label}</span>
                {selected.sublabel && <span className="text-muted-foreground text-[11px]">({selected.sublabel})</span>}
              </span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 size-3.5 shrink-0 opacity-50" />
          </Button>
        }
      />
      <PopoverContent className="w-[320px] max-w-[calc(100vw-2rem)] p-2 bg-popover text-popover-foreground shadow-lg border rounded-lg">
        <div className="flex items-center border-b border-border px-2 pb-2 mb-1">
          <Search className="mr-2 size-3.5 shrink-0 opacity-50" />
          <input
            type="text"
            className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-[220px] overflow-y-auto space-y-1">
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">{emptyText}</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  "flex cursor-pointer select-none items-center justify-between rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
                  opt.value === value && "bg-accent/60 font-medium"
                )}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-foreground">{opt.label}</span>
                    {opt.badge && (
                      <Badge variant="outline" size="sm" className="text-[9px] py-0 px-1">
                        {opt.badge}
                      </Badge>
                    )}
                  </div>
                  {opt.sublabel && <span className="text-[10px] text-muted-foreground truncate">{opt.sublabel}</span>}
                </div>
                {opt.value === value && <Check className="size-3.5 shrink-0 text-primary" />}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
