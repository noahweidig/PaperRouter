/*
 * Regenerate the docs favicon set from the icon artwork (Zotero folder, AGPL-3.0). Needs Playwright and Python 3 (ICO packing). Run from the repo root:
 *   node scripts/make-favicons.js
 * Writes docs/favicon.svg, favicon.ico, PNGs, apple-touch-icon.png, android-chrome and
 * maskable icons, mstile, safari-pinned-tab.svg, site.webmanifest and browserconfig.xml.
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const out = path.join(__dirname, '..', 'docs');
const BLUE = '#1B8AA5';
// Zotero "folder" icon (AGPL-3.0, zotero/zotero), white on a gradient tile
const GLYPH = `<path fill-rule="evenodd" d="M15 3H9L8.276 1.553C8.107 1.214 7.761 1 7.382 1H3.618C3.239 1 2.893 1.214 2.724 1.553L2 3H1C0.448 3 0 3.448 0 4V6V14C0 14.552 0.448 15 1 15H15C15.552 15 16 14.552 16 14V6V4C16 3.448 15.552 3 15 3ZM15 14H1V6H15V14ZM1 5V4H2C2.379 4 2.725 3.786 2.894 3.447L3.618 2H7.382L8.106 3.447C8.275 3.786 8.621 4 9 4H15V5H1Z"/>`;

// A tile: rounded or full-bleed square, white glyph scaled to `scale`
const tile = ({ radius, scale, size = 24 }) => {
	const offset = (24 - 24 * scale) / 2;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">`
		+ `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1FA6B8"/><stop offset="1" stop-color="#0B5F8A"/></linearGradient></defs>`
		+ `<rect width="24" height="24" rx="${radius}" fill="url(#g)"/>`
		+ `<g transform="translate(${offset} ${offset}) scale(${scale})" fill="#FFFFFF"><g transform="scale(1.5)">${GLYPH}</g></g></svg>\n`;
};

const write = (name, data) => fs.writeFileSync(path.join(out, name), data);

(async () => {
	write('favicon.svg', tile({ radius: 5, scale: 0.65 }));
	// Single-colour mask for Safari pinned tabs
	write('safari-pinned-tab.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="#000">${GLYPH}</svg>\n`);

	// name, pixel size, tile options, transparent corners
	const pngs = [
		['favicon-16x16.png', 16, { radius: 4, scale: 0.75 }, true],
		['favicon-32x32.png', 32, { radius: 5, scale: 0.7 }, true],
		['favicon-48x48.png', 48, { radius: 5, scale: 0.68 }, true],
		['apple-touch-icon.png', 180, { radius: 0, scale: 0.62 }, false],
		['android-chrome-192x192.png', 192, { radius: 5, scale: 0.65 }, true],
		['android-chrome-512x512.png', 512, { radius: 5, scale: 0.65 }, true],
		['maskable-512x512.png', 512, { radius: 0, scale: 0.5 }, false], // glyph inside the 80% safe zone
		['mstile-150x150.png', 150, { radius: 0, scale: 0.6 }, false],
	];
	const browser = await chromium.launch();
	const page = await browser.newPage({ deviceScaleFactor: 1 });
	for (const [name, size, opts, transparent] of pngs) {
		await page.setViewportSize({ width: size, height: size });
		await page.setContent(`<body style="margin:0;background:transparent">${tile({ ...opts, size })}</body>`);
		await page.screenshot({ path: path.join(out, name), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
	}
	await browser.close();

	// favicon.ico: 16, 32 and 48 px PNG images in one container
	const sizes = [16, 32, 48];
	const images = sizes.map(s => fs.readFileSync(path.join(out, `favicon-${s}x${s}.png`)));
	const header = Buffer.alloc(6 + 16 * sizes.length);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2);
	header.writeUInt16LE(sizes.length, 4);
	let offset = header.length;
	sizes.forEach((s, i) => {
		const e = 6 + 16 * i;
		header.writeUInt8(s, e);
		header.writeUInt8(s, e + 1);
		header.writeUInt8(0, e + 2);
		header.writeUInt8(0, e + 3);
		header.writeUInt16LE(1, e + 4);
		header.writeUInt16LE(32, e + 6);
		header.writeUInt32LE(images[i].length, e + 8);
		header.writeUInt32LE(offset, e + 12);
		offset += images[i].length;
	});
	write('favicon.ico', Buffer.concat([header, ...images]));
	fs.unlinkSync(path.join(out, 'favicon-48x48.png')); // only needed inside the ICO

	write('site.webmanifest', JSON.stringify({
		name: 'PaperRouter',
		short_name: 'PaperRouter',
		description: 'Rank the Zotero collections each paper belongs to, offline or with an LLM.',
		start_url: './',
		display: 'standalone',
		theme_color: BLUE,
		background_color: '#ffffff',
		icons: [
			{ src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
			{ src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
			{ src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
			{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }
		]
	}, null, 2) + '\n');
	write('browserconfig.xml', `<?xml version="1.0" encoding="utf-8"?>\n<browserconfig><msapplication><tile><square150x150logo src="mstile-150x150.png"/><TileColor>${BLUE}</TileColor></tile></msapplication></browserconfig>\n`);
	console.log('favicons written to docs/');
})().catch(e => { console.error(e); process.exit(1); });
