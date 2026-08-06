// Measure the characters-tab layout geometry via CDP
import { spawn } from 'node:child_process'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9333
const URL = process.argv[2] || 'http://localhost:5174/VSX/'

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
await sleep(6000) // let app boot + art load

const expr = `(() => {
  const r = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const b = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { top: Math.round(b.top), bottom: Math.round(b.bottom),
             height: Math.round(b.height), width: Math.round(b.width),
             position: cs.position, zIndex: cs.zIndex, overflow: cs.overflow }
  }
  const img = document.querySelector('.cs-art img')
  const pin = document.querySelector('.cs-pin')
  return {
    viewport: { w: innerWidth, h: innerHeight },
    header: r('.header'),
    contentRow: r('.content-row'),
    csPage: r('.cs-page'),
    csPin: r('.cs-pin'),
    csArt: r('.cs-art'),
    img: img ? {
      rendered: { w: img.clientWidth, h: img.clientHeight },
      natural: { w: img.naturalWidth, h: img.naturalHeight },
      objectFit: getComputedStyle(img).objectFit,
      objectPosition: getComputedStyle(img).objectPosition,
      src: img.getAttribute('src')
    } : null,
    pinBottomVsHeader: pin ? Math.round(pin.getBoundingClientRect().top - document.querySelector('.header').getBoundingClientRect().bottom) : null,
    bodyScrollH: document.body.scrollHeight
  }
})()`

const { result } = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
console.log(JSON.stringify(result.value, null, 2))
ws.close()
chrome.kill()
process.exit(0)
