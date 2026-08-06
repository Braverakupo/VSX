// Verify the copy-position button: click → clipboard, and after dragging too
import { spawn } from 'node:child_process'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = 9339
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

await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
await send('Page.enable')
await send('Runtime.enable')
await send('Browser.grantPermissions', {
  origin: 'http://localhost:5174',
  permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite']
})
await send('Page.navigate', { url: URL })
await sleep(7000)

const evalJs = async (expression) => {
  const { result } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  return result.value
}

console.log('button exists:', await evalJs(`!!document.querySelector('.cs-copy-pos')`))
console.log('button label:', await evalJs(`document.querySelector('.cs-copy-pos').textContent`))

// click it and read the clipboard
await evalJs(`document.querySelector('.cs-copy-pos').click()`)
await sleep(500)
const clip1 = await evalJs(`navigator.clipboard.readText()`)
console.log('clipboard after click:', JSON.stringify(clip1))
console.log('button after click:', await evalJs(`document.querySelector('.cs-copy-pos').textContent`))

// drag the art to a new spot, then copy again
await evalJs(`(() => {
  const art = document.querySelector('.cs-art')
  const r = art.getBoundingClientRect()
  const opts = { bubbles: true, pointerId: 1, pointerType: 'mouse', buttons: 1, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }
  art.dispatchEvent(new PointerEvent('pointerdown', opts))
  art.dispatchEvent(new PointerEvent('pointermove', { ...opts, clientX: r.left + r.width / 2 + 60, clientY: r.top + r.height / 2 + 30 }))
  art.dispatchEvent(new PointerEvent('pointerup', { ...opts, clientX: r.left + r.width / 2 + 60, clientY: r.top + r.height / 2 + 30 }))
})()`)
await sleep(300)
const afterDrag = await evalJs(`(() => {
  const img = document.querySelector('.cs-art img')
  const art = document.querySelector('.cs-art')
  const ib = img.getBoundingClientRect(), ab = art.getBoundingClientRect()
  return { left: Math.round(ib.left - ab.left), top: Math.round(ib.top - ab.top) }
})()`)
console.log('position after drag:', JSON.stringify(afterDrag))

await evalJs(`document.querySelector('.cs-copy-pos').click()`)
await sleep(500)
const clip2 = await evalJs(`navigator.clipboard.readText()`)
console.log('clipboard after drag+click:', JSON.stringify(clip2))

ws.close()
chrome.kill()
process.exit(0)
