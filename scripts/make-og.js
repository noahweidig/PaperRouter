/* Regenerate docs/og.png (1200x630 social card). Needs Playwright. Run from the repo root: node scripts/make-og.js */
const path = require('node:path');
const { chromium } = require('playwright');
const glyph = '<path fill-rule="evenodd" d="M15 3H9L8.276 1.553C8.107 1.214 7.761 1 7.382 1H3.618C3.239 1 2.893 1.214 2.724 1.553L2 3H1C0.448 3 0 3.448 0 4V6V14C0 14.552 0.448 15 1 15H15C15.552 15 16 14.552 16 14V6V4C16 3.448 15.552 3 15 3ZM15 14H1V6H15V14ZM1 5V4H2C2.379 4 2.725 3.786 2.894 3.447L3.618 2H7.382L8.106 3.447C8.275 3.786 8.621 4 9 4H15V5H1Z"/>';
const html = `<body style="margin:0;width:1200px;height:630px;background:radial-gradient(60% 55% at 50% 0%,#1d3a4f,#0e1116 70%);font-family:Inter,system-ui,Segoe UI,Helvetica,Arial,sans-serif;color:#f4f5f8;text-align:center;position:relative">
<div style="position:absolute;left:544px;top:98px;width:112px;height:112px;border-radius:26px;background:linear-gradient(135deg,#1fa6b8,#0b5f8a);display:grid;place-items:center;box-shadow:0 14px 40px rgba(31,166,184,.35)">
<svg width="56" height="56" viewBox="0 0 16 16" fill="#fff">${glyph}</svg></div>
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
