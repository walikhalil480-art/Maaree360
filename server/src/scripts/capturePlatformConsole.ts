import puppeteer from 'puppeteer-core'
import path from 'path'

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const page = await browser.newPage()
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' })
  await page.waitForSelector('input[type="email"]')
  await page.type('input[type="email"]', 'owner@maaree360.com')
  await page.type('input[type="password"]', 'Maaree360@Admin2026!')
  await page.click('button[type="submit"]')

  await new Promise((r) => setTimeout(r, 2500))
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 2000))

  const shotPath =
    'C:\\Users\\khali\\.gemini\\antigravity\\brain\\e2a1559b-b520-4417-a265-2fc5b57090b3\\maaree360_platform_console_overview.png'
  await page.screenshot({ path: shotPath, fullPage: false })
  console.log('Saved:', shotPath)

  await browser.close()
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
