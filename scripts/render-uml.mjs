// Renders docs/uml/*.mmd to SVG + PNG with Mermaid in headless Chromium.
// Dev-only tool (not needed for npm test). Usage:
//   node scripts/render-uml.mjs <path-to-mermaid.min.js>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { loadPlaywright } from './playwright.js';

const { chromium } = await loadPlaywright();
const mermaidJs = readFileSync(process.argv[2], 'utf8');
const dir = new URL('../docs/uml/', import.meta.url);
const browser = await chromium.launch();
const config = {
  startOnLoad: false, theme: 'neutral', securityLevel: 'strict',
  themeVariables: { fontFamily: 'Inter, Helvetica, Arial, sans-serif', fontSize: '14px', noteBkgColor: '#fff6c7', noteTextColor: '#222222', noteBorderColor: '#c9b458' },
  class: { useMaxWidth: false }, flowchart: { useMaxWidth: false }, sequence: { useMaxWidth: false },
};
for (const f of readdirSync(dir).filter((x) => x.endsWith('.mmd')).sort()) {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 5000, height: 3000 } });
  await page.setContent('<!doctype html><html><body style="margin:0;background:#fff"><div id="out" style="display:inline-block;padding:16px;background:#fff"></div></body></html>');
  await page.addScriptTag({ content: mermaidJs });
  const svg = await page.evaluate(async ([cfg, code]) => {
    window.mermaid.initialize(cfg);
    const { svg } = await window.mermaid.render('d' + Math.random().toString(36).slice(2), code);
    const out = document.getElementById('out');
    out.innerHTML = svg;
    const el = out.querySelector('svg');
    const vb = el.viewBox.baseVal;
    el.setAttribute('width', Math.ceil(vb.width));
    el.setAttribute('height', Math.ceil(vb.height));
    el.style.maxWidth = 'none';
    el.style.backgroundColor = '#ffffff';
    return el.outerHTML;
  }, [config, readFileSync(new URL(f, dir), 'utf8')]);
  writeFileSync(new URL(f.replace('.mmd', '.svg'), dir), svg);
  await (await page.$('#out')).screenshot({ path: new URL(f.replace('.mmd', '.png'), dir).pathname });
  await page.close();
  console.log('rendered', f);
}
await browser.close();
