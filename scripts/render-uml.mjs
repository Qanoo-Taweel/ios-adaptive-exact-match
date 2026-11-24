// Renders docs/uml/*.mmd to SVG + PNG with Mermaid in headless Chromium.
// Dev-only tool (not needed for npm test). Usage:
//   node scripts/render-uml.mjs <path-to-mermaid.min.js>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';

const mermaidJs = readFileSync(process.argv[2], 'utf8');
const dir = new URL('../docs/uml/', import.meta.url);
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setContent('<html><body style="margin:0;background:#fff"><div id="c"></div></body></html>');
await page.addScriptTag({ content: mermaidJs });
await page.evaluate(() => window.mermaid.initialize({
  startOnLoad: false, theme: 'neutral', securityLevel: 'strict',
  themeVariables: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '14px' },
  class: { useMaxWidth: false }, flowchart: { useMaxWidth: false }, sequence: { useMaxWidth: false },
}));
for (const f of readdirSync(dir).filter((f) => f.endsWith('.mmd')).sort()) {
  const src = readFileSync(new URL(f, dir), 'utf8');
  const svg = await page.evaluate(async ([id, code]) => (await window.mermaid.render(id, code)).svg, [f.replace(/\W/g, ''), src]);
  writeFileSync(new URL(f.replace('.mmd', '.svg'), dir), svg);
  await page.setContent(`<html><body style="margin:0;background:#fff;display:inline-block;padding:16px">${svg}</body></html>`);
  const el = await page.$('svg');
  await el.screenshot({ path: new URL(f.replace('.mmd', '.png'), dir).pathname, omitBackground: false });
  await page.setContent('<html><body><div id="c"></div></body></html>');
  await page.addScriptTag({ content: mermaidJs });
  await page.evaluate(() => window.mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'strict', themeVariables: { fontFamily: 'Helvetica, Arial, sans-serif', fontSize: '14px' }, class: { useMaxWidth: false }, flowchart: { useMaxWidth: false }, sequence: { useMaxWidth: false } }));
  console.log('rendered', f);
}
await browser.close();
