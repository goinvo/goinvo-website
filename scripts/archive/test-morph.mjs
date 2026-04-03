import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox']
});

const page = await browser.newPage();
const logs = [];
page.on('console', msg => {
  if (msg.text().startsWith('[CardMorph]') || msg.text().startsWith('[SectionMorph]')) {
    logs.push(msg.text());
  }
});

console.log('Navigating to /work...');
await page.goto('http://localhost:3000/work', { waitUntil: 'networkidle2', timeout: 30000 });
await page.waitForSelector('[data-card-image]', { timeout: 10000 });

// Wait for hydration
await new Promise(r => setTimeout(r, 3000));

const cards = await page.$$('a[href^="/work/"]');
console.log('Total card links found:', cards.length);

// Click the first card
console.log('\n--- Clicking card 1 ---');
await cards[0].click();
await new Promise(r => setTimeout(r, 1500));
console.log('Logs:', JSON.stringify(logs));
logs.length = 0;

// Go back and wait
await page.goBack({ waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3000));

// Click the third card
console.log('\n--- Clicking card 3 ---');
const cards2 = await page.$$('a[href^="/work/"]');
console.log('Cards available after back:', cards2.length);
if (cards2.length > 2) {
  await cards2[2].click();
  await new Promise(r => setTimeout(r, 1500));
  console.log('Logs:', JSON.stringify(logs));
  logs.length = 0;
}

// Go back and click 5th card
await page.goBack({ waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 3000));

console.log('\n--- Clicking card 5 ---');
const cards3 = await page.$$('a[href^="/work/"]');
if (cards3.length > 4) {
  await cards3[4].click();
  await new Promise(r => setTimeout(r, 1500));
  console.log('Logs:', JSON.stringify(logs));
}

await browser.close();
console.log('\nDone');
