import { spawn } from 'node:child_process'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9341
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
const EXPECTED = {
  Ashbeam: [-368, -99], Voltkin: [-337, -75], Crypsis: [-236, -59],
  Spectra: [-259, -54], Hellshift: [-360, -40], Kailin: [-354, -44]
}
const snap = `(() => {
  const img = document.querySelector('.cs-art img')
  const art = document.querySelector('.cs-art')
  const ib = img.getBoundingClientRect(), ab = art.getBoundingClientRect()
  const hero = document.querySelector('.cs-name-big').textContent
  return { hero, left: Math.round(ib.left - ab.left), top: Math.round(ib.top - ab.top),
           covers: ib.left <= ab.left + 0.5 && ib.top <= ab.top + 0.5 && ib.right >= ab.right - 0.5 && ib.bottom >= ab.bottom - 0.5 }
})()`
console.log('initial:', JSON.stringify(await evalJs(snap)))
for (const [hero, want] of Object.entries(EXPECTED)) {
  await evalJs(`(() => { const b=[...document.querySelectorAll('.cs-char')].find(x=>x.textContent.includes('${hero}')); if (b && !b.classList.contains('active')) b.click() })()`)
  await sleep(2200)
  const s = await evalJs(snap)
  const ok = s.left === want[0] && s.top === want[1]
  console.log(`${ok ? 'OK ' : 'BAD'} ${hero}: ${s.left} ${s.top} covers=${s.covers} (want ${want[0]} ${want[1]})`)
}
ws.close(); chrome.kill(); process.exit(0)
