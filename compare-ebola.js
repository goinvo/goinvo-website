const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });

  async function extractPageData(page, url) {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));

    return page.evaluate(() => {
      const data = {};

      data.headings = [...document.querySelectorAll('h1, h2, h3, h4')].map(h => ({
        tag: h.tagName,
        text: h.textContent.trim().substring(0, 80),
        fontSize: getComputedStyle(h).fontSize,
        fontWeight: getComputedStyle(h).fontWeight,
        fontFamily: getComputedStyle(h).fontFamily.substring(0, 30),
      }));

      data.images = [...document.querySelectorAll('img')].map(img => ({
        src: (img.src || '').split('/').pop().substring(0, 50),
        width: Math.round(img.getBoundingClientRect().width),
        height: Math.round(img.getBoundingClientRect().height),
      })).filter(i => i.width > 50);

      const paras = [...document.querySelectorAll('p')];
      data.paragraphCount = paras.length;
      data.firstParagraphs = paras.slice(0, 5).map(p => p.textContent.trim().substring(0, 100));

      data.lists = {
        ul: document.querySelectorAll('ul').length,
        ol: document.querySelectorAll('ol').length,
        li: document.querySelectorAll('li').length,
      };

      data.videos = document.querySelectorAll('video').length;
      data.iframes = [...document.querySelectorAll('iframe')].map(f => f.src.substring(0, 80));
      data.sups = document.querySelectorAll('sup').length;
      data.blockquotes = document.querySelectorAll('blockquote').length;
      data.bodyTextLength = document.body.innerText.length;

      // Check for key sections
      const bodyText = document.body.innerText;
      data.hasAuthorSection = bodyText.includes('Eric Benoit') || bodyText.includes('Written by');
      data.hasReferences = bodyText.includes('References') && (document.querySelector('#references') !== null || bodyText.match(/References[\s\S]*\d+\./));
      data.hasNewsletter = !!document.querySelector('[class*=newsletter], [class*=subscribe], [class*=mailerlite], [id*=mailerlite]');

      // Background sections
      data.bgSections = [...document.querySelectorAll('div, section')].filter(el => {
        const bg = getComputedStyle(el).backgroundColor;
        return bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)';
      }).map(el => ({
        className: (el.className || '').substring(0, 60),
        bgColor: getComputedStyle(el).backgroundColor,
        height: Math.round(el.getBoundingClientRect().height),
      })).filter(s => s.height > 50);

      // All internal links
      data.internalLinks = [...document.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && (h.startsWith('/') || h.includes('goinvo')))
        .filter(h => !h.includes('.css') && !h.includes('.js'));

      return data;
    });
  }

  const pg = await browser.newPage();
  const pn = await browser.newPage();

  const [gatsbyData, nextData] = await Promise.all([
    extractPageData(pg, 'https://goinvo.com/features/ebola/'),
    extractPageData(pn, 'http://localhost:3000/vision/understanding-ebola'),
  ]);

  // Screenshots (viewport only)
  await pg.screenshot({ path: 'c:/tmp/gatsby-ebola.png' });
  await pn.screenshot({ path: 'c:/tmp/nextjs-ebola.png' });

  console.log('=== STRUCTURAL COMPARISON ===');
  const compare = [
    ['Headings', gatsbyData.headings.length, nextData.headings.length],
    ['Images (>50px)', gatsbyData.images.length, nextData.images.length],
    ['Paragraphs', gatsbyData.paragraphCount, nextData.paragraphCount],
    ['UL lists', gatsbyData.lists.ul, nextData.lists.ul],
    ['OL lists', gatsbyData.lists.ol, nextData.lists.ol],
    ['LI items', gatsbyData.lists.li, nextData.lists.li],
    ['Superscripts', gatsbyData.sups, nextData.sups],
    ['Blockquotes', gatsbyData.blockquotes, nextData.blockquotes],
    ['Iframes', gatsbyData.iframes.length, nextData.iframes.length],
    ['Videos', gatsbyData.videos, nextData.videos],
    ['Body text length', gatsbyData.bodyTextLength, nextData.bodyTextLength],
    ['Author section', gatsbyData.hasAuthorSection, nextData.hasAuthorSection],
    ['References', gatsbyData.hasReferences, nextData.hasReferences],
    ['Newsletter', gatsbyData.hasNewsletter, nextData.hasNewsletter],
    ['BG sections', gatsbyData.bgSections.length, nextData.bgSections.length],
  ];

  for (const [name, gatsby, next] of compare) {
    const match = gatsby === next ? 'PASS' : 'FAIL';
    console.log(`${match} ${name}: Gatsby=${gatsby} Next=${next}`);
  }

  console.log('\n=== GATSBY HEADINGS ===');
  gatsbyData.headings.forEach((h, i) => console.log(`  ${i}: ${h.tag} "${h.text}" size=${h.fontSize} weight=${h.fontWeight}`));

  console.log('\n=== NEXT.JS HEADINGS ===');
  nextData.headings.forEach((h, i) => console.log(`  ${i}: ${h.tag} "${h.text}" size=${h.fontSize} weight=${h.fontWeight}`));

  console.log('\n=== GATSBY IMAGES ===');
  gatsbyData.images.forEach((img, i) => console.log(`  ${i}: ${img.width}x${img.height} ${img.src}`));

  console.log('\n=== NEXT.JS IMAGES ===');
  nextData.images.forEach((img, i) => console.log(`  ${i}: ${img.width}x${img.height} ${img.src}`));

  console.log('\n=== GATSBY BG SECTIONS ===');
  gatsbyData.bgSections.forEach(s => console.log(`  ${s.bgColor} h=${s.height} ${s.className}`));

  console.log('\n=== NEXT.JS BG SECTIONS ===');
  nextData.bgSections.forEach(s => console.log(`  ${s.bgColor} h=${s.height} ${s.className}`));

  console.log('\n=== GATSBY FIRST PARAGRAPHS ===');
  gatsbyData.firstParagraphs.forEach(p => console.log(`  ${p}`));

  console.log('\n=== NEXT.JS FIRST PARAGRAPHS ===');
  nextData.firstParagraphs.forEach(p => console.log(`  ${p}`));

  console.log('\n=== GATSBY IFRAMES ===');
  gatsbyData.iframes.forEach(f => console.log(`  ${f}`));

  console.log('\n=== NEXT.JS IFRAMES ===');
  nextData.iframes.forEach(f => console.log(`  ${f}`));

  console.log('\nScreenshots: c:/tmp/gatsby-ebola.png, c:/tmp/nextjs-ebola.png');

  await browser.close();
})();
