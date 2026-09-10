import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/auth"
import { getDb } from "@/db/server"
import { complaintCategories } from "@/db/schema"

/** Active complaint categories for the student complaint form (any signed-in user). */
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
    const db = getDb()
    const categories = await db.select().from(complaintCategories)
    return NextResponse.json({ categories })
  } catch {
    return NextResponse.json({ error: "Unable to load categories." }, { status: 500 })
  }
}
