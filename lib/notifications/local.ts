"use client"

/**
 * Local (on-device) notifications for the PWA: meal reminders, mess
 * session alerts, and notice pings. Everything stays on the device —
 * no push server needed. Preferences persist in localStorage.
 */

const PREF_KEY = "panyor.notify.enabled"
const MEALS_KEY = "panyor.notify.meals"

export type MealReminder = { meal: string; time: string } // time "HH:MM" 24h

export const DEFAULT_MEALS: MealReminder[] = [
  { meal: "Breakfast", time: "07:30" },
  { meal: "Lunch", time: "12:00" },
  { meal: "Snacks", time: "16:30" },
  { meal: "Dinner", time: "19:30" },
]

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window
}

export function getNotifyPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported"
  return Notification.permission
}

export async function requestNotifyPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported"
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function isLocalNotifyEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === "1"
  } catch {
    return false
  }
}

export function setLocalNotifyEnabled(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? "1" : "0")
  } catch {}
}

export function getMealReminders(): MealReminder[] {
  try {
    const raw = localStorage.getItem(MEALS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MealReminder[]
      if (Array.isArray(parsed)) return parsed
    }
  } catch {}
  return DEFAULT_MEALS
}

export function setMealReminders(reminders: MealReminder[]) {
  try {
    localStorage.setItem(MEALS_KEY, JSON.stringify(reminders))
  } catch {}
}

export async function showLocalNotification(title: string, body: string, url = "/") {
  if (!isNotificationSupported() || Notification.permission !== "granted") return false
  const options: NotificationOptions & { data?: { url: string } } = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `panyor-${Date.now()}`,
    data: { url },
  }
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, options)
    } else {
      new Notification(title, options)
    }
    return true
  } catch {
    return false
  }
}

/** Fire a one-off test notification (used by the settings UI). */
export function sendTestNotification() {
  return showLocalNotification(
    "Panyor Hall — notifications on",
    "You will get meal reminders and hostel alerts on this device.",
    "/"
  )
}
