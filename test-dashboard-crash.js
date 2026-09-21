const puppeteer = require('puppeteer');
const crypto = require('crypto');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  try {
    console.log('Navigating to http://localhost:3000/signup ...');
    await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.log('Goto warning:', e.message));
    
    // Fill signup form
    const testEmail = `test_${crypto.randomBytes(4).toString('hex')}@uniuyo.edu.ng`;
    console.log(`Creating account: ${testEmail}`);
    
    await page.waitForSelector('input[placeholder="e.g. Emmanuel Okon"]');
    
    await page.type('input[placeholder="e.g. Emmanuel Okon"]', 'Test User');
    await page.type('input[placeholder="e.g. emmanuel@gmail.com"]', testEmail);
    await page.type('input[placeholder="e.g. 21/ENG/012 or 21/MS/CO/123"]', '18/EG/ME/123');
    await page.type('input[placeholder="e.g. 08123456789"]', '08012345678');
    
    // Passwords
    const passwordInputs = await page.$$('input[type="password"]');
    await passwordInputs[0].type('Password123!');
    await passwordInputs[1].type('Password123!');
    
    // Submit form
    console.log('Submitting signup...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for navigation to dashboard...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('Nav warning:', e.message));
    
    console.log('Current URL:', page.url());
    
    // Wait a bit for dynamic content to trigger any errors
    await new Promise(r => setTimeout(r, 2000));
    const bodyText = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('BODY HTML:', bodyText);
    
  } catch(e) {
    console.log('Error:', e.message);
  }

  await browser.close();
})();
