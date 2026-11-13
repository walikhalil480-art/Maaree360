import puppeteer from 'puppeteer-core'
import path from 'path'

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  const artifactDir = 'C:\\Users\\khali\\.gemini\\antigravity\\brain\\e2a1559b-b520-4417-a265-2fc5b57090b3'
  const page = await browser.newPage()

  console.log('1. Logging in as Business Owner (owner@shabeele.com)...')
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' })
  await page.type('input[type="email"]', 'owner@shabeele.com')
  await page.type('input[type="password"]', 'Shabeele@2026!')
  await page.click('button[type="submit"]')

  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
  await new Promise((r) => setTimeout(r, 2000))

  // Screenshot 1: Business Workspace with prominent Business Name before search bar
  const headerShotPath = path.join(artifactDir, 'maaree360_header_shabeele_business.png')
  await page.screenshot({ path: headerShotPath, fullPage: false })
  console.log('Saved:', headerShotPath)

  // Screenshot 2: Click on Business Name to open the store-switcher dropdown
  try {
    const bizButton = await page.$('button[title*="Active Store"]')
    if (bizButton) {
      await bizButton.click()
      await new Promise((r) => setTimeout(r, 600))
      const switcherShotPath = path.join(artifactDir, 'maaree360_header_store_switcher.png')
      await page.screenshot({ path: switcherShotPath, fullPage: false })
      console.log('Saved:', switcherShotPath)
    }
  } catch (e) {
    console.error('Switcher dropdown click error:', e)
  }

  // Screenshot 3: Business Owner tries to navigate directly to /admin -> Access Restricted (403)
  console.log('2. Navigating to /admin as Business Owner...')
  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 1000))
  const restrictedShotPath = path.join(artifactDir, 'maaree360_admin_access_restricted.png')
  await page.screenshot({ path: restrictedShotPath, fullPage: false })
  console.log('Saved:', restrictedShotPath)

  // Logout
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' })

  // Screenshot 4: Login as Platform Owner (owner@maaree360.com)
  console.log('3. Logging in as Platform Owner (owner@maaree360.com)...')
  await page.type('input[type="email"]', 'owner@maaree360.com')
  await page.type('input[type="password"]', 'Maaree360@Admin2026!')
  await page.click('button[type="submit"]')
  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {})
  await new Promise((r) => setTimeout(r, 2000))

  await page.goto('http://localhost:5173/admin', { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 1500))
  const adminConsoleShotPath = path.join(artifactDir, 'maaree360_platform_console_overview.png')
  await page.screenshot({ path: adminConsoleShotPath, fullPage: false })
  console.log('Saved:', adminConsoleShotPath)

  await browser.close()
  console.log('All screenshots captured successfully!')
}

capture()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Capture failed:', err)
    process.exit(1)
  })
