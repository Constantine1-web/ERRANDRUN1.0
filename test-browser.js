const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  console.log('Navigating to http://localhost:3000/ ...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 120000 });
  
  console.log('Navigating to Admin Dashboard...');
  await page.goto('http://localhost:3000/dashboard/admin', { waitUntil: 'networkidle0', timeout: 120000 });

  console.log('Navigating to Login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 120000 });

  console.log('Done.');
  await browser.close();
})();
