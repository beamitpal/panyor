"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useNavItems } from "./nav-items"

export function Sidebar() {
  const pathname = usePathname()
  const { items: accessibleItems, currentUser, studentSection } = useNavItems()

  const renderItem = (item: (typeof accessibleItems)[number]) => {
    const Icon = item.icon
    // Section indexes ("/", "/student") match exactly; deeper pages
    // match exactly or on a path boundary so siblings never light up.
    const isActive =
      item.href === "/" || item.href === "/student"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`)

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={cn("size-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
          <span className="truncate">{item.title}</span>
        </div>
        {item.badge && (
          <Badge variant="secondary" size="sm" className="text-[9px] py-0 px-1 font-mono">
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col justify-between border-r border-border bg-card/60 p-4 min-h-[calc(100vh-3.5rem)]">
      <div className="space-y-4">
        {/* Active Persona Banner */}
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Current Session
            </span>
            <span className="flex size-2 rounded-full bg-emerald-500" />
          </div>
          <p className="text-xs font-semibold text-foreground truncate">{currentUser.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">{currentUser.roles?.join(" + ") || currentUser.role}</p>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1" aria-label="Primary">
          {accessibleItems.map(renderItem)}
          {studentSection.length > 0 && (
            <>
              <p className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                My Student Portal
              </p>
              {studentSection.map(renderItem)}
            </>
          )}
        </nav>
      </div>

      {/* University Footer Note */}
      <div className="pt-4 border-t border-border/60">
        <div className="rounded-lg bg-muted/30 p-2.5 text-[11px] text-muted-foreground">
          <p className="font-semibold text-foreground text-[10px] uppercase tracking-wider">Panyor Hall</p>
          <p className="text-[10px] leading-tight text-muted-foreground mt-0.5">
            Rajiv Gandhi University, Doimukh
          </p>
        </div>
      </div>
    </aside>
  )
}
