"use client"

import * as React from "react"
import { getMealReminders, isLocalNotifyEnabled, isNotificationSupported, showLocalNotification } from "@/lib/notifications/local"

const FIRED_KEY = "panyor.notify.fired"

/** Background engine: fires daily meal reminders while the app is open. */
export function ReminderEngine() {
  React.useEffect(() => {
    if (!isNotificationSupported()) return
    const tick = () => {
      try {
        if (!isLocalNotifyEnabled() || Notification.permission !== "granted") return
        const now = new Date()
        const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
        const today = now.toISOString().split("T")[0]
        const fired = JSON.parse(localStorage.getItem(FIRED_KEY) ?? "{}") as Record<string, string>
        for (const r of getMealReminders()) {
          if (r.time === hhmm && fired[r.meal] !== today) {
            fired[r.meal] = today
            localStorage.setItem(FIRED_KEY, JSON.stringify(fired))
            void showLocalNotification(
              `${r.meal} at Panyor Mess`,
              `${r.meal} distribution is starting. Carry your hostel ID card.`,
              "/student/mess"
            )
          }
        }
      } catch {}
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])
  return null
}
