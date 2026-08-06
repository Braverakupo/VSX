// Measure character bbox inside each bar image via canvas in the page
const BARS = [
  ['Voltkin', 'assets/Voltkin_Bars/scene_1778877404137.png'],
  ['Hellshift', 'assets/Hellshift_Bars/post_1778878760382.png'],
  ['Kailin', 'assets/Kailin_Bars/scene_1778877350796.png'],
  ['Spectra', 'assets/Spectra_Bars/bar_1778877059432.png'],
  ['Crypsis', 'assets/Crypsis_Bars/bar_1778877003152.png'],
  ['Ashbeam', 'assets/Ashbeam_Bars/bar_1778876983518.png']
]

const expr = `(async () => {
  const out = []
  const THRESH = 28
  for (const [hero, path] of ${JSON.stringify(BARS)}) {
    try {
      const img = new Image()
      img.src = '/VSX/' + path
      await img.decode()
      const c = document.createElement('canvas')
      c.width = img.naturalWidth; c.height = img.naturalHeight
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0)
      const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height)
      let minX = width, maxX = 0, minY = height, maxY = 0, count = 0, total = 0
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4
          const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
          total += lum
          if (lum > THRESH) {
            count++
            if (x < minX) minX = x; if (x > maxX) maxX = x
            if (y < minY) minY = y; if (y > maxY) maxY = y
          }
        }
      }
      out.push({
        hero,
        w: width, h: height,
        bbox: { minX, maxX, minY, maxY },
        centerFracX: Math.round(((minX + maxX) / 2 / width) * 1000) / 1000,
        centerFracY: Math.round(((minY + maxY) / 2 / height) * 1000) / 1000,
        spanFracX: Math.round(((maxX - minX + 1) / width) * 1000) / 1000,
        spanFracY: Math.round(((maxY - minY + 1) / height) * 1000) / 1000,
        brightPx: count
      })
    } catch (e) {
      out.push({ hero, error: String(e) })
    }
  }
  return out
})()`

import { spawn } from 'node:child_process'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9334
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
  '--window-size=400,400', '--no-first-run', 'about:blank'
], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
let target
for (let i = 0; i < 40; i++) {
  try {
    const res = await fetch(`http://localhost:${PORT}/json`)
    const ts = await res.json()
    const page = ts.find(t => t.type === 'page')
    if (page) { target = page; break }
  } catch { }
  await sleep(250)
}
const ws = new WebSocket(target.webSocketDebuggerUrl)
let msgId = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++msgId
  pending.set(id, { res, rej })
  ws.send(JSON.stringify({ id, method, params }))
})
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? rej(new Error(m.error.message)) : res(m.result)
  }
}
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: 'http://localhost:5174/VSX/' })
await sleep(2000)
const { result } = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
console.log(JSON.stringify(result.value, null, 2))
ws.close()
chrome.kill()
process.exit(0)
