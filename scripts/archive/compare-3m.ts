import { chromium } from 'playwright'
import * as path from 'path'
import * as fs from 'fs'

const AUDIT_DIR = path.resolve(__dirname, '../.audit/3m-comparison')
fs.mkdirSync(AUDIT_DIR, { recursive: true })

async function main() {
  const browser = await chromium.launch({ headless: true })
  const viewport = { width: 1280, height: 900 }

  // Old site
  const ctx1 = await browser.newContext({ viewport })
  const oldPage = await ctx1.newPage()
  await oldPage.goto('https://www.goinvo.com/work/3m-coderyte/', { waitUntil: 'load', timeout: 60000 })

  // Auto-scroll
  await oldPage.evaluate(`
    (async function() {
      await new Promise(function(resolve) {
        var totalHeight = 0;
        var distance = 500;
        var timer = setInterval(function() {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 80);
      });
    })()
  `)
  await oldPage.waitForTimeout(2000)
  await oldPage.screenshot({ path: path.join(AUDIT_DIR, 'old-full.png'), fullPage: true })

  // Take viewport-sized screenshots at different scroll positions
  const oldHeight = await oldPage.evaluate('document.body.scrollHeight') as number
  for (let i = 0; i < Math.min(8, Math.ceil(oldHeight / viewport.height)); i++) {
    await oldPage.evaluate(`window.scrollTo(0, ${i * viewport.height})`)
    await oldPage.waitForTimeout(300)
    await oldPage.screenshot({ path: path.join(AUDIT_DIR, `old-${i+1}.png`) })
  }

  // New site
  const ctx2 = await browser.newContext({ viewport })
  const newPage = await ctx2.newPage()
  await newPage.goto('http://localhost:3001/work/3m-coderyte', { waitUntil: 'load', timeout: 60000 })

  await newPage.evaluate(`
    (async function() {
      await new Promise(function(resolve) {
        var totalHeight = 0;
        var distance = 500;
        var timer = setInterval(function() {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 80);
      });
    })()
  `)
  await newPage.waitForTimeout(2000)
  await newPage.screenshot({ path: path.join(AUDIT_DIR, 'new-full.png'), fullPage: true })

  const newHeight = await newPage.evaluate('document.body.scrollHeight') as number
  for (let i = 0; i < Math.min(8, Math.ceil(newHeight / viewport.height)); i++) {
    await newPage.evaluate(`window.scrollTo(0, ${i * viewport.height})`)
    await newPage.waitForTimeout(300)
    await newPage.screenshot({ path: path.join(AUDIT_DIR, `new-${i+1}.png`) })
  }

  console.log(`Old page height: ${oldHeight}px, New page height: ${newHeight}px`)
  console.log(`Screenshots saved to ${AUDIT_DIR}`)

  await browser.close()
}

main()
