"use client"

import * as React from "react"
import Link from "next/link"
import {
  Bell,
  CheckCheck,
  ChevronDown,
  Menu,
  Settings2,
} from "lucide-react"
import { useRole } from "./role-context"
import { useNavItems } from "./nav-items"
import { BrandMark } from "@/components/shared/brand"
import { authClient } from "@/lib/auth/client"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NotificationSettings } from "@/components/pwa/notification-settings"
import { Empty } from "@/components/ui/empty"

export function Header() {
  const { currentUser, notifications, unreadCount, markAsRead, markAllAsRead } = useRole()
  const { items: navItems, studentSection } = useNavItems()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
    } catch {
      // Network-level sign-out failure (e.g. stale connection): still
      // drop the client to the login screen; the server session check
      // in the app layout remains the source of truth.
    } finally {
      router.replace("/login")
      router.refresh()
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-md sm:px-6">
      {/* Brand & Hall Identity */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 md:hidden"
          aria-label="Open navigation menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="size-4" />
        </Button>
        <Link href="/" className="transition-opacity hover:opacity-90" aria-label="Panyor Hall of Residence — home">
          <BrandMark />
        </Link>
      </div>

      {/* Right Controls: Notifications + User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Notifications Popover */}
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="relative size-8 border-border/80 bg-muted/30"
                aria-label="Notifications"
              >
                <Bell className="size-3.5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-4 items-center justify-rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            }
          />
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0 shadow-xl border rounded-xl">
            <div className="flex items-center justify-between border-b border-border p-3 bg-muted/30">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" size="sm" className="text-[10px] py-0 px-1">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground font-medium"
                >
                  <CheckCheck className="size-3" />
                  Mark all read
                </button>
              )}
            </div>

            <ScrollArea className="max-h-[300px]">
              {notifications.length === 0 ? (
                <Empty title="No notifications" description="You're all caught up." className="border-0" />
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`flex flex-col gap-1 p-3 text-xs transition-colors cursor-pointer hover:bg-muted/50 ${
                        !notif.isRead ? "bg-accent/20" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground leading-none">{notif.title}</span>
                        {!notif.isRead && <span className="size-1.5 rounded-full bg-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{notif.message}</p>
                      <span className="text-[9px] text-muted-foreground/80">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="border-t border-border p-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <Settings2 className="size-3.5" />
                Alert & app settings
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Current User Avatar & Info */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" className="flex items-center gap-2 rounded-md border-l border-border/70 pl-2 pr-1 py-1 text-left hover:bg-muted/50">
                <Avatar className="size-8">
                  {currentUser.image && <AvatarImage src={currentUser.image} alt={currentUser.name} />}
                  <AvatarFallback className="text-[10px] font-bold">
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:flex flex-col">
                  <span className="text-xs font-semibold leading-tight text-foreground">{currentUser.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{currentUser.email}</span>
                </div>
                <ChevronDown className="hidden sm:block size-3 text-muted-foreground" />
              </button>
            }
          />
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>{currentUser.roles?.join(" + ") || currentUser.role}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile navigation drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-72 p-4">
          <SheetHeader className="text-left">
            <SheetTitle className="text-sm">Panyor Hall of Residence</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 flex flex-col gap-1" aria-label="Primary">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === "/" || item.href === "/student"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              )
            })}
            {studentSection.length > 0 && (
              <>
                <p className="px-3 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  My Student Portal
                </p>
                {studentSection.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    item.href === "/student"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  )
                })}
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Alert & app settings */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)]">
          <DialogHeader>
            <DialogTitle>Alerts & App</DialogTitle>
            <DialogDescription>Device notifications, meal reminders, and PWA install.</DialogDescription>
          </DialogHeader>
          <NotificationSettings />
        </DialogContent>
      </Dialog>
    </header>
  )
}