import { spawn } from 'node:child_process'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9342
const URL = 'http://localhost:5174/VSX/'
const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--hide-scrollbars',`--remote-debugging-port=${PORT}`,'--window-size=780,900','--no-first-run','about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function getTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json`)
      const ts = await res.json()
      const page = ts.find(t => t.type === 'page')
      if (page) return page
    } catch {}
    await sleep(250)
  }
  throw new Error('no target')
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
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(m.error.message)) : resolve(m.result)
  }
}
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: URL })
await sleep(7000)
const evalJs = async (expression) => {
  const { result } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return result.value
}
const snap = `(() => {
  const img = document.querySelector('.cs-art img')
  const art = document.querySelector('.cs-art')
  if (!img || !art) return null
  const ib = img.getBoundingClientRect(), ab = art.getBoundingClientRect()
  return { hero: document.querySelector('.cs-name-big').textContent,
           imgW: Math.round(ib.width), imgH: Math.round(ib.height),
           left: Math.round(ib.left - ab.left), top: Math.round(ib.top - ab.top) }
})()`
console.log('INITIAL:', JSON.stringify(await evalJs(snap)))
// switch hero
await evalJs(`(() => { [...document.querySelectorAll('.cs-char')].find(x=>x.textContent.includes('Voltkin')).click() })()`)
await sleep(1500)
console.log('VOLTKIN:', JSON.stringify(await evalJs(snap)))
// drag +40/+20
await evalJs(`(() => {
  const art = document.querySelector('.cs-art')
  const r = art.getBoundingClientRect()
  const o = { bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }
  art.dispatchEvent(new PointerEvent('pointerdown', o))
  art.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: r.left + r.width/2 + 40, clientY: r.top + r.height/2 + 20 }))
  art.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: r.left + r.width/2 + 40, clientY: r.top + r.height/2 + 20 }))
})()`)
await sleep(300)
console.log('AFTER DRAG:', JSON.stringify(await evalJs(snap)))
// resize window — position must NOT change (no auto reframe)
await send('Emulation.setDeviceMetricsOverride', { width: 780, height: 650, deviceScaleFactor: 1, mobile: false })
await sleep(1500)
console.log('AFTER RESIZE (should be same left/top):', JSON.stringify(await evalJs(snap)))
// copy button payload
await evalJs(`(() => { window.__copied = null; navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve() } })()`)
await evalJs(`document.querySelector('.cs-copy-pos').click()`)
await sleep(300)
console.log('COPY PAYLOAD:', JSON.stringify(await evalJs('window.__copied')))
ws.close(); chrome.kill(); process.exit(0)
