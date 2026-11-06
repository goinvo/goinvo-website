import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from '@tailwindcss/postcss'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

const root = process.cwd(), out = path.resolve('.audit/human-figma-assets')
const shim = path.resolve('.audit/human-preview/image.tsx')
await build({ entryPoints: ['src/components/home-story/prototypes/FigmaFrames.tsx'], outfile: '.audit/figma-frames.mjs', bundle: true, jsx: 'automatic', platform: 'node', format: 'esm', alias: { 'next/image': shim }, external: ['react', 'react-dom', 'react/jsx-runtime'] })
const frames = await import(pathToFileURL(path.resolve('.audit/figma-frames.mjs')))
const globals = path.resolve('src/app/globals.css')
const css = await postcss([tailwindcss({ optimize: true })]).process(await fs.readFile(globals, 'utf8'), { from: globals })
const fontCss = `
@font-face{font-family:'Source Sans Pro';src:url('/design-lab/human/assets/SourceSansPro-Light.woff2');font-weight:300;font-display:swap}
@font-face{font-family:'Source Sans Pro';src:url('/design-lab/human/assets/SourceSansPro-Regular.woff2');font-weight:400;font-display:swap}
@font-face{font-family:'Source Sans Pro';src:url('/design-lab/human/assets/SourceSansPro-Semibold.woff2');font-weight:600;font-display:swap}
@font-face{font-family:'Noto Sans';src:url('/design-lab/human/assets/NotoSans.ttf');font-weight:100 900;font-display:swap}
@font-face{font-family:'Noto Sans Display';src:url('/design-lab/human/assets/NotoSansDisplay.ttf');font-weight:100 900;font-display:swap}
@font-face{font-family:'Roboto';src:url('/design-lab/human/assets/Roboto.ttf');font-weight:100 900;font-display:swap}
@font-face{font-family:'Roboto';src:url('/design-lab/human/assets/Roboto-Italic.ttf');font-weight:100 900;font-style:italic;font-display:swap}
@layer base{[data-prototype-canvas] p{margin:0}[data-prototype-canvas] img{max-width:none}}
body{margin:0!important;background:transparent!important;overflow:hidden}
#prototype-root{position:absolute;left:180px;top:180px;--spread:0}
[data-prototype-canvas]{isolation:isolate}
.prototype-part,[data-prototype=flow] [data-name='Main KPIs (P&L)'],[data-prototype=flow] [data-name='Billing schedule & invoicing'],[data-prototype=flow] [data-name='Professional time (PT) Hour']{translate:calc(var(--spread)*var(--dx,0px)) calc(var(--spread)*var(--dy,0px));rotate:calc(var(--spread)*var(--angle,0deg));transition:translate .45s cubic-bezier(.22,1,.36,1),rotate .45s cubic-bezier(.22,1,.36,1);transform-origin:50% 50%}
[data-immediate=true] *{transition:none!important}
[data-prototype=prior]{background:rgb(216 225 228 / calc(1 - var(--spread)))!important}
[data-prototype=prior] [data-fragment=patient]{--dx:0px;--dy:-100px;--angle:1deg}
[data-prototype=prior] [data-fragment=request]{--dx:60px;--dy:-40px;--angle:-1deg}
[data-prototype=prior] [data-fragment=navigation]{--dx:-85px;--dy:15px;--angle:-3deg}
[data-prototype=prior] [data-fragment=history]{--dx:-100px;--dy:45px;--angle:-4deg}
[data-prototype=prior] [data-fragment=clinical]{--dx:95px;--dy:0px;--angle:3deg}
[data-prototype=prior] [data-fragment=notes]{--dx:80px;--dy:95px;--angle:-2deg}
[data-prototype=prior] :is([data-fragment=request],[data-fragment=navigation],[data-fragment=clinical]){filter:blur(calc(var(--spread)*10px));opacity:calc(1 - var(--spread)*.55);transition:translate .45s cubic-bezier(.22,1,.36,1),rotate .45s cubic-bezier(.22,1,.36,1),filter .45s,opacity .45s}
[data-prototype=flow] [data-fragment=navigation]{--dx:0px;--dy:-100px;--angle:-1deg}
[data-prototype=flow] [data-fragment=title]{--dx:-55px;--dy:-45px;--angle:1deg}
[data-prototype=flow] [data-name='Main KPIs (P&L)']{--dx:-95px;--dy:-15px;--angle:-2deg}
[data-prototype=flow] [data-name='Billing schedule & invoicing']{--dx:100px;--dy:45px;--angle:2deg}
[data-prototype=flow] [data-name='Professional time (PT) Hour']{--dx:-80px;--dy:120px;--angle:-1deg}
[data-prototype=facto] [data-node-id='1147:92683'],[data-prototype=facto] [data-node-id='1147:92790'],[data-prototype=facto] [data-node-id='1147:105419']{translate:calc(var(--spread)*var(--dx,0px)) calc(var(--spread)*var(--dy,0px));rotate:calc(var(--spread)*var(--angle,0deg));transition:translate .45s cubic-bezier(.22,1,.36,1),rotate .45s cubic-bezier(.22,1,.36,1);transform-origin:50% 50%}
[data-prototype=facto] [data-node-id='1147:92682']{overflow:visible!important}
[data-prototype=facto] [data-name='ios framing']{display:none}
[data-prototype=facto] [data-node-id='1147:92683']{--dx:-110px;--dy:-40px;--angle:-4deg}
[data-prototype=facto] [data-node-id='1147:92790']{--dx:-80px;--dy:100px;--angle:-2deg}
[data-prototype=facto] [data-node-id='1147:105419']{--dx:120px;--dy:-20px;--angle:4deg}
[data-prototype=facto] :is([data-node-id='1147:92790'],[data-node-id='1147:105419']){background-color:color-mix(in srgb,#243647 calc(var(--spread)*100%),rgb(115 115 115 / .17))}
[data-prototype=facto] [data-node-id='1147:92683']{filter:blur(calc(var(--spread)*10px));opacity:calc(1 - var(--spread)*.55);transition:translate .45s cubic-bezier(.22,1,.36,1),rotate .45s cubic-bezier(.22,1,.36,1),filter .45s,opacity .45s}
`
const flowVars = JSON.parse(await fs.readFile('.audit/figma-flow-variables.json', 'utf8'))
const escape = name => 'prototype-' + name.replace(/[^a-zA-Z0-9-]/g, '-')
const variableCss = `[data-prototype=flow]{${Object.entries(flowVars).filter(([, value]) => !value.startsWith('Font(')).map(([name, value]) => `--${escape(name)}:${/^\d+$/.test(value) ? value + 'px' : value};`).join('')}}`
await fs.writeFile(path.join(out, 'figma-frames.css'), css.css + fontCss + variableCss)
const bridge = `<script>const root=document.getElementById('prototype-root');addEventListener('message',event=>{if(event.source!==parent||event.origin!==location.origin||event.data?.type!=='goinvo-prototype-spread')return;const value=Number(event.data.value);if(!Number.isFinite(value))return;root.dataset.immediate=String(!!event.data.immediate);root.style.setProperty('--spread',String(Math.max(0,Math.min(1,value))));});</script>`
for (const [id, name, width, height] of [['prior', 'PriorFrame', 1240, 811], ['facto', 'FactoFrame', 1920, 1273], ['flow', 'FlowFrame', 1920, 1080]]) {
  const markup = renderToString(createElement(frames[name]))
  await fs.writeFile(path.join(out, `${id}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow,noarchive"><title>${id} — source reconstruction</title><link rel="stylesheet" href="/design-lab/human/assets/figma-frames.css"></head><body style="width:${width+360}px;height:${height+360}px"><div id="prototype-root" data-immediate="true">${markup}</div>${bridge}</body></html>`)
}
// This is the already scrubbed adaptation of recommendation-scenario-picker.html
// from the supplied goinvo/orphic-health repository. No original interviews,
// authentication scripts, client names or research data enter the review output.
let clinical = await fs.readFile('public/demos/clinical-evidence-engine/index.html', 'utf8')
clinical = clinical.replace(/<body([^>]*)>/, '<body$1><div id="prototype-root" class="clinical-frame" data-prototype-canvas data-prototype="clinical">').replace('</body>', `</div>${bridge}</body>`)
clinical = clinical.replace('</head>', `<style>
body{display:block!important;background:transparent!important;overflow:hidden!important;width:1640px!important;height:1220px!important}
.clinical-frame{position:absolute;left:180px;top:180px;width:1280px;height:860px;display:flex;flex-direction:column;--spread:0}
.clinical-frame .layout{overflow:visible!important;grid-template-columns:1fr 318px}
.clinical-frame .left,.clinical-frame .cue-panel,.clinical-frame .topbar-sub,.clinical-frame .topbar-sep,.clinical-frame .topbar-pill,.clinical-frame .mobile-btn,.clinical-frame .legend-btn{display:none!important}
.clinical-frame .middle,.clinical-frame .chat-scroll{overflow:visible!important}
.clinical-frame .middle{background:rgb(232 238 245 / calc(1 - var(--spread)))}
.clinical-frame .rec-card,.clinical-frame .answer-bubble-wrap,.clinical-frame .right{translate:calc(var(--spread)*var(--dx,0px)) calc(var(--spread)*var(--dy,0px));rotate:calc(var(--spread)*var(--angle,0deg));transition:translate .45s cubic-bezier(.22,1,.36,1),rotate .45s cubic-bezier(.22,1,.36,1);transform-origin:center}
.clinical-frame .rec-card{--dx:-170px;--dy:70px;--angle:-5deg}
.clinical-frame .answer-bubble-wrap{--dx:60px;--dy:0px;--angle:2deg}
.clinical-frame .right{--dx:100px;--dy:30px;--angle:4deg}
.clinical-frame :is(.topbar,.chat-prompt,.thinking-block,.slip-receipt,.exp-title,.exp-text,.sug-chip){filter:blur(calc(var(--spread)*9px));opacity:calc(1 - var(--spread)*.6);transition:filter .45s,opacity .45s}
[data-immediate=true] *{transition:none!important}
</style></head>`)
await fs.writeFile(path.join(out, 'clinical.html'), clinical)
console.log('Built addressable, live-HTML prototype frames: Clinical Evidence Engine, Prior Authorization, Facto, and Flow reference. No screenshot-based interfaces.')
