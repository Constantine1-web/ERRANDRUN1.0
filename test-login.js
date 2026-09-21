const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  try {
    console.log('Navigating to https://errandrun-1-0.vercel.app/login ...');
    await page.goto('https://errandrun-1-0.vercel.app/login', { waitUntil: 'networkidle2', timeout: 30000 });
    const bodyText = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
    console.log('BODY HTML:', bodyText);
  } catch(e) {
    console.log('Error on goto:', e.message);
  }

  console.log('Done.');
  await browser.close();
})();
