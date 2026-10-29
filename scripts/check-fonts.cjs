// Verify Tailwind default fonts in light and dark themes; no web-font downloads.
// Run against a ready app: PROFILE_BASE_URL=http://127.0.0.1:4173 node scripts/check-fonts.cjs
const path = require('path')
const BASE = process.env.PROFILE_BASE_URL || 'http://127.0.0.1:4190'

let chromium
try {
  chromium = require('playwright').chromium
} catch {
  console.error('需要 playwright')
  process.exit(2)
}

const EDGE_CANDIDATES = [
  path.join(process.env['ProgramFiles(x86)'] || 'C:/Program Files (x86)', 'Microsoft/Edge/Application/msedge.exe'),
  path.join(process.env.ProgramFiles || 'C:/Program Files', 'Microsoft/Edge/Application/msedge.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
]
const EDGE = process.env.PROFILE_EDGE || EDGE_CANDIDATES.find((p) => require('fs').existsSync(p))

const checks = []
function check(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail })
}

async function main() {
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: process.env.PROFILE_HEADLESS !== '0',
  })
  const page = await browser.newPage()

  const failed = []
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText || ''}`))
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
  })
  const fontRequests = []
  page.on('response', (r) => {
    if (/\.woff2?(\?|$)/.test(r.url())) fontRequests.push(`${r.status()} ${r.url().split('/').pop()}`)
  })

  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(String(e)))

  await page.goto(BASE, { waitUntil: 'domcontentloaded' })
  // 等字体表就绪，否则 FontFaceSet 里可能还没登记。
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(800)


  for (const dark of [false, true]) {
    const probe = await page.evaluate((dark) => {
      document.documentElement.classList.toggle('dark', dark)
      const body = getComputedStyle(document.body)
      const hero = document.querySelector('.new-thread-hero')
      return {
        family: body.fontFamily,
        sans: body.getPropertyValue('--font-sans').trim(),
        hero: hero ? getComputedStyle(hero).fontFamily : null,
        faces: [...document.fonts].map((f) => f.family),
      }
    }, dark)
    const theme = dark ? 'dark' : 'light'
    check(theme + ': body uses Tailwind default sans', probe.family.replace(/["']/g, '') === probe.sans.replace(/["']/g, '').replace(/\s+/g, ' '), probe.family)
    check(theme + ': no custom font faces', probe.faces.length === 0, probe.faces.join(', '))
    check(theme + ': hero inherits body font', probe.hero === probe.family, probe.hero || 'hero missing')
  }
  check('No font downloads', fontRequests.length === 0, fontRequests.join(', '))
  check('No page errors', pageErrors.length === 0, pageErrors.join(' | '))
  check('No failed requests', failed.length === 0, failed.join(' | '))

  console.log('字体契约检查')
  console.log(`  目标 ${BASE}`)
  console.log(`  浏览器 ${EDGE}`)
  console.log(`  woff2 请求 ${fontRequests.length} 条：${fontRequests.join(', ') || '（均为缓存命中或未触发）'}`)
  console.log('')
  let bad = 0
  for (const c of checks) {
    if (!c.pass) bad++
    console.log(`  ${c.pass ? 'ok  ' : 'FAIL'}  ${c.name}${c.detail ? `  (${c.detail})` : ''}`)
  }
  console.log('')
  console.log(bad ? `${bad}/${checks.length} 项失败` : `全部通过  (${checks.length}/${checks.length})`)
  await browser.close()
  process.exit(bad ? 1 : 0)
}

main().catch((e) => {
  console.error('ERR', e.message)
  process.exit(1)
})
