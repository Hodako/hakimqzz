const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Windows\\.gemini\\antigravity\\brain\\84400e86-7aba-434e-8c6d-479f5719d789\\screenshots';

if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const targets = [
    { label: 'dreamfashion', port: 8080 },
    { label: 'classicworld', port: 8081 }
  ];

  const pagesToTest = [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'expenses', path: '/expenses' },
    { name: 'sales', path: '/sales' },
    { name: 'bank', path: '/bank' },
    { name: 'invoices', path: '/invoices' },
  ];

  const viewports = [
    { label: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
    { label: 'desktop', width: 1280, height: 850, isMobile: false, hasTouch: false }
  ];

  for (const target of targets) {
    for (const vp of viewports) {
      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.isMobile, hasTouch: vp.hasTouch });

      // Prime localStorage and cookies
      try {
        await page.goto(`http://localhost:${target.port}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
        
        await page.evaluate(() => {
          const demoUser = {
            id: 'demo_owner_123',
            email: 'demo@dreamfashion.com',
            full_name: 'Dream Fashion POS',
            business_name: 'Dream Fashion POS',
            business_phone_numbers: '+8801700000000',
            business_address: 'Main Market, Dhaka',
            role: 'owner',
            activated: true,
            updatedAt: Date.now(),
            permissions: {
              dashboard: true,
              sales: true,
              products: true,
              purchases: true,
              expenses: true,
              parties: true,
              reports: true,
              cashbox: true,
              settings: true,
            }
          };
          localStorage.setItem('hz-auth-profile', JSON.stringify(demoUser));
          localStorage.setItem('classicworld_auth_profile', JSON.stringify(demoUser));
          localStorage.setItem('auth_token', 'demo_token_123');
          localStorage.setItem('auth_user', JSON.stringify(demoUser));
          localStorage.setItem('hz-brand', JSON.stringify({ name: 'Dream Fashion', logo_url: '', updatedAt: Date.now() }));
          document.cookie = 'auth_token=demo_token_123; path=/; max-age=86400';
          document.cookie = 'hz_session=demo_token_123; path=/; max-age=86400';
        });
      } catch (e) {
        console.warn('Initial prime error:', e.message);
      }

      for (const p of pagesToTest) {
        try {
          const url = `http://localhost:${target.port}${p.path}`;
          console.log(`Capturing [${target.label}] ${p.name} [${vp.label}] from ${url}...`);
          await page.goto(url, { waitUntil: 'networkidle0', timeout: 10000 }).catch(async () => {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
          });
          await new Promise(res => setTimeout(res, 1000));

          const filePath = path.join(ARTIFACT_DIR, `${target.label}_${p.name}_${vp.label}.png`);
          await page.screenshot({ path: filePath, fullPage: false });
          console.log(`Saved screenshot: ${filePath}`);
        } catch (err) {
          console.error(`Failed ${target.label} ${p.name} [${vp.label}]:`, err.message);
        }
      }
      await page.close();
    }
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch(console.error);
