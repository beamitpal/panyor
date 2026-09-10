import fs from "node:fs"
import path from "node:path"

// Builds a real .ico (PNG-compressed entry, supported by all modern
// browsers) from the unified mark so the tab icon matches the app logo.
const png = fs.readFileSync(path.join(process.cwd(), "public", "icons", "favicon-32.png"))

const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: icon
header.writeUInt16LE(1, 4) // one image

const entry = Buffer.alloc(16)
entry.writeUInt8(32, 0) // width
entry.writeUInt8(32, 1) // height
entry.writeUInt8(0, 2) // colors
entry.writeUInt8(0, 3) // reserved
entry.writeUInt16LE(1, 4) // planes
entry.writeUInt16LE(32, 6) // bit depth
entry.writeUInt32LE(png.length, 8) // data size
entry.writeUInt32LE(6 + 16, 12) // data offset

fs.writeFileSync(
  path.join(process.cwd(), "app", "favicon.ico"),
  Buffer.concat([header, entry, png])
)
console.log("wrote app/favicon.ico")
