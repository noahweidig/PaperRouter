/* Regenerate docs/og.png (1200x630 social card). Needs Playwright. Run from the repo root: node scripts/make-og.js */
const path = require('node:path');
const { chromium } = require('playwright');
const glyph = '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="M12 10v6"/><path d="m15 13-3 3-3-3"/>';
const html = `<body style="margin:0;width:1200px;height:630px;background:radial-gradient(60% 55% at 50% 0%,#1d3a4f,#0e1116 70%);font-family:Inter,system-ui,Segoe UI,Helvetica,Arial,sans-serif;color:#f4f5f8;text-align:center;position:relative">
<div style="position:absolute;left:544px;top:98px;width:112px;height:112px;border-radius:26px;background:linear-gradient(135deg,#1fa6b8,#0b5f8a);display:grid;place-items:center;box-shadow:0 14px 40px rgba(31,166,184,.35)">
<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg></div>
<div style="position:absolute;top:240px;width:100%;font-size:80px;font-weight:800;line-height:1.08;letter-spacing:-0.02em">Where does this paper go?<br>One right-click.</div>
<div style="position:absolute;top:440px;width:100%;font-size:28px;line-height:1.5;color:#a3a8b8">Ranked Zotero collections for every paper, offline<br>or with an LLM, filed in one batch.</div>
<div style="position:absolute;left:58px;bottom:36px;font-size:22px;font-weight:700">PaperRouter</div>
<div style="position:absolute;right:58px;bottom:36px;font-size:22px;color:#a3a8b8">noahweidig.com/PaperRouter</div></body>`;
(async () => {
	const b = await chromium.launch();
	const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
	await p.setContent(html);
	await p.screenshot({ path: path.join(__dirname, '..', 'docs', 'og.png') });
	await b.close();
	console.log('docs/og.png written');
})().catch(e => { console.error(e); process.exit(1); });
