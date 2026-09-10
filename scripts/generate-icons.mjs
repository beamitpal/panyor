import fs from "node:fs"
import path from "node:path"
import sharp from "sharp"

const outDir = path.join(process.cwd(), "public", "icons")
fs.mkdirSync(outDir, { recursive: true })

const svg = (size, pad = 0, sub = true) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect x="${pad}" y="${pad}" width="${512 - pad * 2}" height="${512 - pad * 2}" rx="112" fill="#18181b"/>
  <rect x="${pad}" y="${pad}" width="${512 - pad * 2}" height="${512 - pad * 2}" rx="112" fill="none" stroke="#ffffff" stroke-opacity="0.22" stroke-width="10"/>
  <text x="256" y="${sub ? 300 : 340}" font-family="Arial, Helvetica, sans-serif" font-size="190" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="4">PH</text>
  ${sub ? `<text x="256" y="372" font-family="Arial, Helvetica, sans-serif" font-size="44" font-weight="600" fill="#a1a1aa" text-anchor="middle" letter-spacing="8">PANYOR HALL</text>` : ""}
</svg>`

const targets = [
  { name: "icon-192.png", size: 192, pad: 0, sub: false },
  { name: "icon-512.png", size: 512, pad: 0, sub: false },
  { name: "maskable-512.png", size: 512, pad: 52, sub: false },
  { name: "apple-touch-icon.png", size: 180, pad: 0, sub: false },
  { name: "favicon-32.png", size: 32, pad: 0, sub: false },
  { name: "mark-96.png", size: 96, pad: 0, sub: false },
]

for (const t of targets) {
  await sharp(Buffer.from(svg(t.size, t.pad, t.sub !== false)), { density: 300 })
    .resize(t.size, t.size)
    .png()
    .toFile(path.join(outDir, t.name))
  console.log("wrote", t.name)
}
