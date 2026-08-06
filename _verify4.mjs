import { spawn } from 'node:child_process'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9340
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
// intercept writeText to capture payload
await evalJs(`(() => { window.__copied = null; navigator.clipboard.writeText = (t) => { window.__copied = t; return Promise.resolve() } })()`)
await evalJs(`document.querySelector('.cs-copy-pos').click()`)
await sleep(300)
console.log('INITIAL payload:', JSON.stringify(await evalJs('window.__copied')))
// drag + copy
await evalJs(`(() => {
  const art = document.querySelector('.cs-art')
  const r = art.getBoundingClientRect()
  const o = { bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: r.left + r.width/2, clientY: r.top + r.height/2 }
  art.dispatchEvent(new PointerEvent('pointerdown', o))
  art.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: r.left + r.width/2 + 60, clientY: r.top + r.height/2 + 30 }))
  art.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: r.left + r.width/2 + 60, clientY: r.top + r.height/2 + 30 }))
})()`)
await sleep(300)
console.log('after drag pos:', JSON.stringify(await evalJs(`(() => { const img=document.querySelector('.cs-art img'), art=document.querySelector('.cs-art'); const ib=img.getBoundingClientRect(), ab=art.getBoundingClientRect(); return { left: Math.round(ib.left-ab.left), top: Math.round(ib.top-ab.top) } })()`)))
await evalJs(`document.querySelector('.cs-copy-pos').click()`)
await sleep(300)
console.log('AFTER DRAG payload:', JSON.stringify(await evalJs('window.__copied')))
// hero switch → payload hero name
await evalJs(`(() => { const b=[...document.querySelectorAll('.cs-char')].find(x=>x.textContent.includes('Kailin')); b.click() })()`)
await sleep(2500)
await evalJs(`document.querySelector('.cs-copy-pos').click()`)
await sleep(300)
console.log('KAILIN payload:', JSON.stringify(await evalJs('window.__copied')))
ws.close(); chrome.kill(); process.exit(0)
