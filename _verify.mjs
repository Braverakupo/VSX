// Verify the content-aware art framing on the Characters tab via CDP
import { spawn } from 'node:child_process'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9337
const URL = 'http://localhost:5174/VSX/'

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, '--window-size=780,900', '--no-first-run',
  'about:blank'
], { stdio: 'ignore' })

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json`)
      const targets = await res.json()
      const page = targets.find(t => t.type === 'page')
      if (page) return page
    } catch { /* not up yet */ }
    await sleep(250)
  }
  throw new Error('CDP target not found')
}

const target = await getTarget()
const ws = new WebSocket(target.webSocketDebuggerUrl)
let msgId = 0
const pending = new Map()

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)
  }
}

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: URL })
await sleep(7000) // boot + art load + measurement

const expr = `(async () => {
  const r = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { top: Math.round(b.top), bottom: Math.round(b.bottom),
             height: Math.round(b.height), width: Math.round(b.width) }
  }
  const img = document.querySelector('.cs-art img')
  const out = {
    viewport: { w: innerWidth, h: innerHeight },
    artArea: r('.cs-art'),
    img: img ? {
      rendered: { w: Math.round(img.clientWidth), h: Math.round(img.clientHeight) },
      natural: { w: img.naturalWidth, h: img.naturalHeight },
      styleLeft: img.style.left, styleTop: img.style.top,
      styleWidth: img.style.width, styleHeight: img.style.height
    } : null
  }
  // recompute the content bbox exactly like the component does
  if (img && img.naturalWidth) {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)
    const w = c.width, h = c.height
    let minX = w, maxX = 0, minY = h, maxY = 0
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
        if (lum > 28) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    out.contentBbox = {
      x: [minX, maxX], y: [minY, maxY],
      cx: Math.round((minX + maxX) / 2), cy: Math.round((minY + maxY) / 2),
      hFrac: Math.round(((maxY - minY + 1) / h) * 1000) / 1000
    }
  }
  return out
})()`

const { result } = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })
console.log(JSON.stringify(result.value, null, 2))
ws.close()
chrome.kill()
process.exit(0)
