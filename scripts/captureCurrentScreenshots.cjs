const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function capture() {
  console.log('Launching browser to capture current design screenshots...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // --- Session 1: Business Owner (Shabeele Whole Sellers) ---
  const page1 = await browser.newPage();
  console.log('Logging in as business owner (owner@shabeele.com)...');
  await page1.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });
  await page1.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page1.type('input[type="email"]', 'owner@shabeele.com');
  await page1.type('input[type="password"]', 'Shabeele@2026!');
  await page1.click('button[type="submit"]');
  await delay(3000);

  // Dashboard
  console.log('Capturing Dashboard...');
  await page1.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle2' });
  await delay(2500);
  await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'dashboard.png'), fullPage: false });

  // POS
  console.log('Capturing Point of Sale (POS)...');
  await page1.goto('http://localhost:8080/pos', { waitUntil: 'networkidle2' });
  await delay(2500);
  await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'pos.png'), fullPage: false });

  // Products
  console.log('Capturing Products Catalog...');
  await page1.goto('http://localhost:8080/products', { waitUntil: 'networkidle2' });
  await delay(3000);
  await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'products.png'), fullPage: false });

  // Inventory
  console.log('Capturing Inventory Management...');
  await page1.goto('http://localhost:8080/inventory', { waitUntil: 'networkidle2' });
  await delay(2500);
  await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'inventory.png'), fullPage: false });

  // Transactions
  console.log('Capturing Sales Transactions...');
  await page1.goto('http://localhost:8080/transactions', { waitUntil: 'networkidle2' });
  await delay(2500);
  await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'transactions.png'), fullPage: false });

  // Reports
  console.log('Capturing Financial Reports...');
  await page1.goto('http://localhost:8080/reports', { waitUntil: 'networkidle2' });
  await delay(2500);
  await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'reports.png'), fullPage: false });

  // Customers
  console.log('Capturing Customers...');
  await page1.goto('http://localhost:8080/customers', { waitUntil: 'networkidle2' });
  await delay(2500);
  await page1.screenshot({ path: path.join(SCREENSHOT_DIR, 'customers.png'), fullPage: false });

  await page1.close();

  // --- Session 2: Platform Owner (MAAREE 360 Super Admin) ---
  // Using fresh incognito context to avoid cookies from Session 1
  console.log('Creating fresh incognito context for Platform Super Admin...');
  const incognitoContext = await browser.createBrowserContext();
  const page2 = await incognitoContext.newPage();

  console.log('Logging in as Platform Owner (owner@maaree360.com)...');
  await page2.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });
  await page2.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page2.type('input[type="email"]', 'owner@maaree360.com');
  await page2.type('input[type="password"]', 'Maaree360@Admin2026!');
  await page2.click('button[type="submit"]');
  await delay(3000);

  // Platform Console Overview
  console.log('Capturing Platform Console...');
  await page2.goto('http://localhost:8080/admin', { waitUntil: 'networkidle2' });
  await delay(3000);
  await page2.screenshot({ path: path.join(SCREENSHOT_DIR, 'platform-console.png'), fullPage: false });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
