import { NextResponse } from "next/server"
import { getDb } from "@/db/server"
import { messItems } from "@/db/schema"
import { AuthError, requirePermission } from "@/lib/auth/server"
import { desc } from "drizzle-orm"
import { randomUUID } from "crypto"

function toItem(row: typeof messItems.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function GET() {
  try {
    await requirePermission("mess.view")
    const db = getDb()
    const rows = await db.select().from(messItems).orderBy(desc(messItems.createdAt))
    return NextResponse.json({ items: rows.filter((r) => r.isActive).map(toItem) })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unable to load mess items."
    return NextResponse.json({ error: message }, { status })
  }
}

const VALID_CATEGORIES = ["VEG", "NON_VEG", "PANEER", "EGGS", "SPECIAL", "OTHER"] as const

export async function POST(req: Request) {
  try {
    await requirePermission("mess.manage")
    const body = (await req.json()) as { name?: string; category?: string; description?: string }
    const name = (body.name ?? "").trim()
    if (!name) return NextResponse.json({ error: "Food item name is required." }, { status: 400 })
    const category = (body.category ?? "VEG").toUpperCase()
    if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 })
    }
    const db = getDb()
    const [row] = await db
      .insert(messItems)
      .values({
        id: randomUUID(),
        name,
        category: category as (typeof VALID_CATEGORIES)[number],
        description: body.description?.trim() || null,
        isActive: true,
      })
      .returning()
    return NextResponse.json({ item: toItem(row) }, { status: 201 })
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 500
    const message = error instanceof Error ? error.message : "Unable to create mess item."
    return NextResponse.json({ error: message }, { status })
  }
}
