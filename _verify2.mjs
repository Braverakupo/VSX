// Verify hero-switch re-framing + short-window cover behavior via CDP
import { spawn } from 'node:child_process'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9338
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
    } catch { }
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

const snap = `(() => {
  const img = document.querySelector('.cs-art img')
  const art = document.querySelector('.cs-art')
  if (!img || !art) return null
  const ab = art.getBoundingClientRect()
  const ib = img.getBoundingClientRect()
  return {
    hero: (document.querySelector('.cs-name-big') || {}).textContent || null,
    art: { w: Math.round(ab.width), h: Math.round(ab.height) },
    img: { w: Math.round(ib.width), h: Math.round(ib.height),
           left: Math.round(ib.left - ab.left), top: Math.round(ib.top - ab.top) },
    covers: ib.left <= ab.left + 0.5 && ib.top <= ab.top + 0.5 &&
            ib.right >= ab.right - 0.5 && ib.bottom >= ab.bottom - 0.5
  }
})()`

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: URL })
await sleep(7000)

const step = async (label, expr) => {
  const { result } = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
  console.log(label, JSON.stringify(result.value, null, 2))
}

await step('INITIAL (Ashbeam):', snap)

// switch to Voltkin via sidebar button
await send('Runtime.evaluate', {
  expression: `(() => { const b = [...document.querySelectorAll('.cs-char')].find(x => x.textContent.includes('Voltkin')); if (b) b.click(); return !!b })()`,
  returnByValue: true
})
await sleep(2500)
await step('AFTER VOLTKIN:', snap)

// switch to Kailin
await send('Runtime.evaluate', {
  expression: `(() => { const b = [...document.querySelectorAll('.cs-char')].find(x => x.textContent.includes('Kailin')); if (b) b.click(); return !!b })()`,
  returnByValue: true
})
await sleep(2500)
await step('AFTER KAILIN:', snap)

// short window: 780x480 viewport
await send('Emulation.setDeviceMetricsOverride', { width: 780, height: 480, deviceScaleFactor: 1, mobile: false })
await sleep(2000)
await step('SHORT WINDOW 780x480 (Kailin):', snap)

ws.close()
chrome.kill()
process.exit(0)
