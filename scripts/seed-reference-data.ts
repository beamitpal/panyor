import "dotenv/config"
import { getDb } from "../db/server"
import { complaintCategories, equipmentCategories, messItems } from "../db/schema"

/**
 * Seeds reference data that the admin portal depends on:
 * complaint categories, equipment categories, and mess menu items.
 * Idempotent — only inserts when the table is empty.
 */
const db = getDb()

const complaints = [
  { name: "Electricity", icon: "Zap", description: "Power cuts, faulty wiring, switches and lighting", defaultPriority: "HIGH" as const },
  { name: "Water Supply", icon: "Droplets", description: "No water, leakage, taps and plumbing", defaultPriority: "HIGH" as const },
  { name: "Room Maintenance", icon: "BedDouble", description: "Doors, windows, furniture and fixtures", defaultPriority: "MEDIUM" as const },
  { name: "Cleanliness", icon: "Sparkles", description: "Washrooms, corridors and common areas", defaultPriority: "MEDIUM" as const },
  { name: "Internet & Wi-Fi", icon: "Wifi", description: "Connectivity issues in rooms and study halls", defaultPriority: "MEDIUM" as const },
  { name: "Mess & Food", icon: "UtensilsCrossed", description: "Food quality, hygiene and dining hall", defaultPriority: "MEDIUM" as const },
  { name: "Security", icon: "ShieldAlert", description: "Gate, visitors and safety concerns", defaultPriority: "URGENT" as const },
  { name: "Other", icon: "AlertCircle", description: "Anything else", defaultPriority: "LOW" as const },
]

const equipmentCats = [
  { name: "Cricket", icon: "Trophy", description: "Bats, balls, stumps and guards" },
  { name: "Football", icon: "Trophy", description: "Footballs, cones and bibs" },
  { name: "Badminton", icon: "Trophy", description: "Rackets and shuttlecocks" },
  { name: "Table Tennis", icon: "Trophy", description: "Bats, balls and nets" },
  { name: "Chess & Carrom", icon: "Trophy", description: "Board games for the common room" },
  { name: "Volleyball & Basketball", icon: "Trophy", description: "Balls and court gear" },
]

const messMenu = [
  { name: "Veg Thali", category: "VEG" as const, description: "Rice, dal, seasonal veg, roti, salad" },
  { name: "Chicken Curry & Rice", category: "NON_VEG" as const, description: "Chicken curry with steamed rice" },
  { name: "Paneer Butter Masala", category: "PANEER" as const, description: "Paneer curry with roti and rice" },
  { name: "Boiled Eggs (2)", category: "EGGS" as const, description: "Protein add-on with breakfast" },
  { name: "Special Sunday Meal", category: "SPECIAL" as const, description: "Rotating weekly special" },
]

if ((await db.select().from(complaintCategories)).length === 0) {
  await db.insert(complaintCategories).values(complaints.map((c) => ({ id: crypto.randomUUID(), ...c })))
  console.log(`Seeded ${complaints.length} complaint categories`)
} else {
  console.log("Complaint categories already present, skipping")
}

if ((await db.select().from(equipmentCategories)).length === 0) {
  await db.insert(equipmentCategories).values(equipmentCats.map((c) => ({ id: crypto.randomUUID(), ...c })))
  console.log(`Seeded ${equipmentCats.length} equipment categories`)
} else {
  console.log("Equipment categories already present, skipping")
}

if ((await db.select().from(messItems)).length === 0) {
  await db.insert(messItems).values(messMenu.map((m) => ({ id: crypto.randomUUID(), ...m })))
  console.log(`Seeded ${messMenu.length} mess menu items`)
} else {
  console.log("Mess menu already present, skipping")
}

process.exit(0)
