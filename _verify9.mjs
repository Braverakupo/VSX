import { spawn } from 'node:child_process'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9345
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
  const ib = img.getBoundingClientRect(), ab = art.getBoundingClientRect()
  return { art: { w: Math.round(ab.width), h: Math.round(ab.height) },
           img: { w: Math.round(ib.width), h: Math.round(ib.height) },
           left: Math.round(ib.left - ab.left), top: Math.round(ib.top - ab.top),
           covers: ib.left <= ab.left+0.5 && ib.top <= ab.top+0.5 && ib.right >= ab.right-0.5 && ib.bottom >= ab.bottom-0.5 }
})()`
console.log('DESKTOP 780x900 (k should be 1):', JSON.stringify(await evalJs(snap)))
// shorter desktop window
await send('Emulation.setDeviceMetricsOverride', { width: 780, height: 650, deviceScaleFactor: 1, mobile: false })
await sleep(1500)
console.log('SHORT 780x650:', JSON.stringify(await evalJs(snap)))
// mobile-ish
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 700, deviceScaleFactor: 1, mobile: false })
await sleep(1500)
console.log('MOBILE 390x700:', JSON.stringify(await evalJs(snap)))
// copy payload must stay reference-space
await evalJs(`(() => { window.__copied = null; navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve() } })()`)
await evalJs(`document.querySelector('.cs-copy-pos').click()`)
await sleep(300)
console.log('COPY at mobile (should be Ashbeam -471 -113 ~1.25x k):', JSON.stringify(await evalJs('window.__copied')))
// drag still 1:1 on screen at k<1
await evalJs(`(() => {
  const art = document.querySelector('.cs-art')
  const r = art.getBoundingClientRect()
  const o = { bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }
  art.dispatchEvent(new PointerEvent('pointerdown', o))
  art.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: r.left + r.width/2 + 30, clientY: r.top + r.height/2 + 20 }))
  art.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: r.left + r.width/2 + 30, clientY: r.top + r.height/2 + 20 }))
})()`)
await sleep(300)
console.log('AFTER DRAG +30/+20:', JSON.stringify(await evalJs(snap)))
ws.close(); chrome.kill(); process.exit(0)
