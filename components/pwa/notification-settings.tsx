"use client"

import * as React from "react"
import { BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  getMealReminders,
  getNotifyPermission,
  isLocalNotifyEnabled,
  isNotificationSupported,
  requestNotifyPermission,
  sendTestNotification,
  setLocalNotifyEnabled,
  setMealReminders,
  type MealReminder,
} from "@/lib/notifications/local"
import { InstallButton } from "@/components/pwa/install-button"
import { toast } from "sonner"

/** Device notification preferences: permission, master toggle, meal times, test + PWA install. */
export function NotificationSettings() {
  const supported = isNotificationSupported()
  const [permission, setPermission] = React.useState<string>(
    () => (typeof window !== "undefined" ? getNotifyPermission() : "default")
  )
  const [enabled, setEnabled] = React.useState(() =>
    typeof window !== "undefined" ? isLocalNotifyEnabled() : false
  )
  const [meals, setMeals] = React.useState<MealReminder[]>(() =>
    typeof window !== "undefined" ? getMealReminders() : []
  )

  const enable = async (on: boolean) => {
    if (on) {
      const p = await requestNotifyPermission()
      setPermission(p)
      if (p !== "granted") {
        toast.error("Browser blocked notifications. Allow them in site settings first.")
        return
      }
    }
    setEnabled(on)
    setLocalNotifyEnabled(on)
    toast.success(on ? "Device alerts enabled." : "Device alerts muted.")
  }

  const updateMeal = (idx: number, time: string) => {
    const next = meals.map((m, i) => (i === idx ? { ...m, time } : m))
    setMeals(next)
    setMealReminders(next)
  }

  return (
    <FieldGroup className="gap-4">
      {!supported ? (
        <p className="text-xs text-muted-foreground">This browser does not support notifications.</p>
      ) : (
        <>
          <Field orientation="horizontal">
            <BellRing className="size-4 text-muted-foreground" />
            <div className="flex flex-1 flex-col gap-0.5">
              <FieldLabel htmlFor="notify-toggle">Meal & hostel alerts</FieldLabel>
              <FieldDescription>
                {permission === "granted"
                  ? "Daily mess reminders and hostel alerts on this device."
                  : "Permission status: " + permission + ". Enable to request access."}
              </FieldDescription>
            </div>
            <Switch id="notify-toggle" checked={enabled} onCheckedChange={(v) => void enable(v)} />
          </Field>

          {enabled && (
            <div className="flex flex-col gap-2">
              {meals.map((m, i) => (
                <Field key={m.meal} orientation="horizontal">
                  <FieldLabel className="flex-1">{m.meal}</FieldLabel>
                  <Input
                    type="time"
                    value={m.time}
                    onChange={(e) => updateMeal(i, e.target.value)}
                    className="h-8 w-28 text-xs"
                  />
                </Field>
              ))}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void sendTestNotification().then((ok) =>
                      ok ? toast.success("Test alert sent.") : toast.error("Could not send test alert.")
                    )
                  }}
                >
                  Send test alert
                </Button>
                <InstallButton />
              </div>
            </div>
          )}
        </>
      )}
    </FieldGroup>
  )
}
