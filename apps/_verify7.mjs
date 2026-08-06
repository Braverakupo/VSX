import { spawn } from 'node:child_process'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9343
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
  return { imgW: Math.round(ib.width), imgH: Math.round(ib.height),
           artW: Math.round(ab.width), artH: Math.round(ab.height),
           left: Math.round(ib.left - ab.left), top: Math.round(ib.top - ab.top),
           touchAction: getComputedStyle(art).touchAction,
           covers: ib.left <= ab.left+0.5 && ib.top <= ab.top+0.5 && ib.right >= ab.right-0.5 && ib.bottom >= ab.bottom-0.5 }
})()`
console.log('INITIAL:', JSON.stringify(await evalJs(snap)))
// drag vertically +100 (up) and horizontally -80 (left), with clamps
await evalJs(`(() => {
  const art = document.querySelector('.cs-art')
  const r = art.getBoundingClientRect()
  const o = { bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }
  art.dispatchEvent(new PointerEvent('pointerdown', o))
  art.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: r.left + r.width/2 - 80, clientY: r.top + r.height/2 - 100 }))
  art.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: r.left + r.width/2 - 80, clientY: r.top + r.height/2 - 100 }))
})()`)
await sleep(300)
console.log('AFTER DRAG (-80,-100):', JSON.stringify(await evalJs(snap)))
// drag far down (+500) → should clamp at top 0
await evalJs(`(() => {
  const art = document.querySelector('.cs-art')
  const r = art.getBoundingClientRect()
  const o = { bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }
  art.dispatchEvent(new PointerEvent('pointerdown', o))
  art.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: r.left + r.width/2, clientY: r.top + r.height/2 + 500 }))
  art.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: r.left + r.width/2, clientY: r.top + r.height/2 + 500 }))
})()`)
await sleep(300)
console.log('AFTER DRAG DOWN +500 (clamped):', JSON.stringify(await evalJs(snap)))
ws.close(); chrome.kill(); process.exit(0)
