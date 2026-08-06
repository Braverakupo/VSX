// Minimal PNG decoder (8-bit, color types 0/2/3/4/6) + art-region analysis
import { readFileSync } from 'node:fs'
import zlib from 'node:zlib'

const buf = readFileSync(process.argv[2])
let off = 8
let w = 0, h = 0, bitDepth = 0, colorType = 0
const idat = []
while (off < buf.length) {
  const len = buf.readUInt32BE(off)
  const type = buf.toString('ascii', off + 4, off + 8)
  const data = buf.subarray(off + 8, off + 8 + len)
  if (type === 'IHDR') {
    w = data.readUInt32BE(0); h = data.readUInt32BE(4)
    bitDepth = data[8]; colorType = data[9]
  } else if (type === 'IDAT') idat.push(data)
  else if (type === 'IEND') break
  off += 12 + len
}
const raw = zlib.inflateSync(Buffer.concat(idat))
const bpp = [0, 1, 3, 1, 2, 0, 4][colorType] * (bitDepth / 8)
const stride = w * bpp
const px = Buffer.alloc(w * h * 4)
let p = 0
const prev = Buffer.alloc(stride)
for (let y = 0; y < h; y++) {
  const filter = raw[p++]
  const line = raw.subarray(p, p + stride)
  const recon = Buffer.alloc(stride)
  for (let x = 0; x < stride; x++) {
    const a = x >= bpp ? recon[x - bpp] : 0
    const b = prev[x]
    const c = x >= bpp ? prev[x - bpp] : 0
    let v = line[x]
    if (filter === 1) v += a
    else if (filter === 2) v += b
    else if (filter === 3) v += (a + b) >> 1
    else if (filter === 4) {
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c)
      v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
    }
    recon[x] = v & 0xff
  }
  if (colorType === 6) {
    for (let x = 0; x < w; x++) {
      px[(y * w + x) * 4 + 0] = recon[x * 4 + 0]
      px[(y * w + x) * 4 + 1] = recon[x * 4 + 1]
      px[(y * w + x) * 4 + 2] = recon[x * 4 + 2]
      px[(y * w + x) * 4 + 3] = recon[x * 4 + 3]
    }
  } else if (colorType === 2) {
    for (let x = 0; x < w; x++) {
      px[(y * w + x) * 4 + 0] = recon[x * 3 + 0]
      px[(y * w + x) * 4 + 1] = recon[x * 3 + 1]
      px[(y * w + x) * 4 + 2] = recon[x * 3 + 2]
      px[(y * w + x) * 4 + 3] = 255
    }
  } else if (colorType === 3 || colorType === 0 || colorType === 4) {
    // grayscale / palette / gray+alpha → grayscale luminance
    for (let x = 0; x < w; x++) {
      const g = colorType === 4 ? recon[x * 2] : recon[x * bpp]
      px[(y * w + x) * 4 + 0] = g
      px[(y * w + x) * 4 + 1] = g
      px[(y * w + x) * 4 + 2] = g
      px[(y * w + x) * 4 + 3] = colorType === 4 ? recon[x * 2 + 1] : 255
    }
  }
  recon.copy(prev)
  p += stride
}

// ── Analysis: center band between sidebar (122px) and dossier (212px) ──
const x0 = 150, x1 = w - 220 // horizontal band
const lum = (i) => 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
const THRESH = 28 // above ≈black
let minX = w, maxX = 0, minY = h, maxY = 0
let count = 0
for (let y = 0; y < h; y++) {
  for (let x = x0; x < x1; x++) {
    if (lum((y * w + x) * 4) > THRESH) {
      count++
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
}
const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
console.log(`image: ${w}x${h}`)
console.log(`bright bbox in band x[${x0}..${x1}): x ${minX}..${maxX}  y ${minY}..${maxY}  (${maxX - minX + 1}x${maxY - minY + 1})`)
console.log(`center: (${Math.round(cx)}, ${Math.round(cy)})  frame center: (${Math.round((x0 + x1) / 2)}, ${Math.round(h / 2)})`)
console.log(`offset from frame center: dx=${Math.round(cx - (x0 + x1) / 2)}  dy=${Math.round(cy - h / 2)}  brightPx=${count}`)
// vertical fill check per row band
const rows = [0, 64, 100, 200, 400, 600, 700, 780]
for (const y of rows) {
  let lit = 0
  for (let x = x0; x < x1; x++) if (lum((y * w + x) * 4) > THRESH) lit++
  console.log(`row y=${y}: lit px=${lit}/${x1 - x0} (${Math.round((lit / (x1 - x0)) * 100)}%)`)
}
