const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  console.log('Navigating to https://errandrun-1-0.vercel.app ...');
  await page.goto('https://errandrun-1-0.vercel.app', { waitUntil: 'networkidle0' });
  
  console.log('Navigating to login...');
  await page.goto('https://errandrun-1-0.vercel.app/login', { waitUntil: 'networkidle0' });

  console.log('Navigating to tracking portal...');
  await page.goto('https://errandrun-1-0.vercel.app/track/1234567890123456', { waitUntil: 'networkidle0' });

  console.log('Done.');
  await browser.close();
})();
