/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * PaperRouter batch picker: one row per selected paper, top suggestions as toggle chips.
 * Result (window.arguments[0]): sendToCollections, assignments [{itemId, collections:[{id,key,name,confidence}]}],
 * rejections [{itemId, collectionId}] (auto-picked then switched off).
 * Batch only ADDS to collections; it never removes an existing membership.
 */
var HTMLNS = 'http://www.w3.org/1999/xhtml';
var B = { args: null, rows: [], max: 4, minConf: 0 };

function _s(key, params) {
	return typeof TidyUpL10n !== 'undefined' ? TidyUpL10n.getString(key, params || {}) : key;
}
function $(id) { return document.getElementById(id); }
function h(tag, cls, text) {
	var e = document.createElementNS(HTMLNS, tag);
	if (cls) e.className = cls;
	if (text != null) e.textContent = text;
	return e;
}
if (window.arguments && window.arguments[0] && window.arguments[0].language && typeof TidyUpL10n !== 'undefined') {
	TidyUpL10n.setForcedLanguage(window.arguments[0].language);
}

function moveOut() { var c = $('move-inbox'); return !!(c && c.checked); }
// Inbox memberships stop counting toward the limit when they will be removed.
function effExisting(r) { return r.existing.length - (moveOut() ? r.inbox.length : 0); }
function room(r) { return Math.max(0, B.max - effExisting(r) - r.on.size); }
function tierOf(c) { return c >= 0.7 ? 3 : (c >= 0.4 ? 2 : 1); }
function whyText(w) {
	if (!w) return '';
	var out = '';
	if (w.terms && w.terms.length) out += '\n' + _s('why-terms', { terms: w.terms.join(', ') });
	if (w.similar && w.similar.length) out += '\n' + _s('why-similar', { titles: w.similar.join(' | ') });
	return out;
}

function renderRow(r) {
	var el = h('div', 'brow');
	el.appendChild(h('div', 'btitle', r.title));
	if (r.existing.length) {
		var meta = h('div', 'bmeta');
		meta.appendChild(h('span', null, _s('batch-in')));
		var inboxIds = new Set(r.inbox.map(function (c) { return c.id; }));
		r.existing.forEach(function (c) { meta.appendChild(h('span', 'pill in' + (inboxIds.has(c.id) ? ' inboxpill' : ''), c.name)); });
		el.appendChild(meta);
	}
	var chips = h('div', 'chips');
	if (!r.suggestions.length) chips.appendChild(h('span', 'nosug', _s('batch-none')));
	r.suggestions.forEach(function (s) {
		var b = h('button', 'chip');
		b.type = 'button';
		b.title = (s.path && s.path.length ? s.path.join(' \u203a ') + ' \u203a ' : '') + s.name + '  \u00b7  ' + _s('dialog-conf-label') + ' ' + s.confidence.toFixed(2) + whyText(s.why);
		b.appendChild(h('span', null, s.name));
		b.appendChild(h('span', 'tdot t' + tierOf(s.confidence)));
		b.addEventListener('click', function () { toggle(r, s); });
		s.el = b;
		chips.appendChild(b);
	});
	el.appendChild(chips);
	r.el = el;
	return el;
}

function toggle(r, s) {
	if (r.on.has(s.id)) {
		r.on.delete(s.id);
		if (r.auto.has(s.id)) { r.auto.delete(s.id); r.rejected.add(s.id); }
	} else {
		if (!room(r)) return;
		r.on.add(s.id);
		r.rejected.delete(s.id);
	}
	refresh();
}

function pickTop(r) {
	var thr = B.minConf > 0 ? B.minConf / 100 : 0;
	r.on.clear(); r.auto.clear();
	var s = r.suggestions[0];
	if (s && s.confidence >= thr && room(r) > 0) { r.on.add(s.id); r.auto.add(s.id); }
}

function refresh() {
	var total = 0, papers = 0;
	B.rows.forEach(function (r) {
		var left = room(r);
		r.suggestions.forEach(function (s) {
			var on = r.on.has(s.id);
			s.el.classList.toggle('on', on);
			s.el.disabled = !on && left === 0;
		});
		total += r.on.size;
		if (r.on.size) papers++;
	});
	$('count').textContent = _s('batch-summary', { n: papers, m: total });
	PRIcons.setButton($('btn-ok'), 'check', _s('batch-ok', { n: papers }));
	$('btn-ok').disabled = total === 0;
	$('tip').textContent = _s('batch-tip', { max: B.max });
}

function onAccept() {
	var assignments = [], rejections = [];
	B.rows.forEach(function (r) {
		var cols = r.suggestions.filter(function (s) { return r.on.has(s.id); })
			.map(function (s) { return { id: String(s.id), key: s.key, name: s.name, confidence: s.confidence }; });
		if (cols.length) assignments.push({ itemId: r.itemId, collections: cols, removeFrom: moveOut() ? r.inbox.map(function (c) { return c.id; }) : [] });
		r.rejected.forEach(function (cid) { rejections.push({ itemId: r.itemId, collectionId: cid }); });
	});
	if (!assignments.length) return;
	B.args.assignments = assignments;
	B.args.rejections = rejections;
	B.args.sendToCollections = true;
	window.close();
}

function onCancel() {
	if (B.args) { B.args.sendToCollections = false; B.args.assignments = null; B.args.rejections = []; }
	window.close();
}

function onLoad() {
	document.documentElement.setAttribute('title', _s('batch-title'));
	var args = window.arguments && window.arguments[0];
	if (!args) return;
	B.args = args;
	B.max = args.maxCollectionNum || 4;
	B.minConf = args.minConfidence || 0;
	$('item-label').textContent = _s('batch-title');
	$('item-name').textContent = _s('batch-count', { n: args.rows.length });
	$('hint').textContent = _s('batch-hint');
	PRIcons.setButton($('btn-top'), 'check', _s('batch-top-all'));
	PRIcons.setButton($('btn-clear'), 'clear', _s('batch-clear'));
	$('move-label').textContent = _s('batch-move-inbox');
	$('movebox').insertBefore(PRIcons.make('inbox', 14), $('move-inbox').nextSibling);
	$('btn-cancel').textContent = _s('dialog-cancel');

	B.rows = args.rows.map(function (r) {
		return { itemId: r.itemId, title: r.title, existing: r.existing || [], inbox: r.inbox || [], suggestions: r.suggestions || [],
			on: new Set(), auto: new Set(), rejected: new Set() };
	});
	var scroll = $('scroll');
	B.rows.forEach(function (r) { pickTop(r); scroll.appendChild(renderRow(r)); });

	if (B.rows.some(function (r) { return r.inbox.length; })) $('movebox').removeAttribute('hidden');
	$('move-inbox').addEventListener('change', function () {
		B.rows.forEach(function (r) { if (!r.on.size) pickTop(r); });
		B.rows.forEach(function (r) { while (r.on.size > 0 && room(r) < 0) { var last = Array.from(r.on).pop(); r.on.delete(last); r.auto.delete(last); } });
		refresh();
	});
	$('btn-top').addEventListener('click', function () { B.rows.forEach(pickTop); refresh(); });
	$('btn-clear').addEventListener('click', function () {
		B.rows.forEach(function (r) { r.on.clear(); r.auto.clear(); });
		refresh();
	});
	$('btn-ok').addEventListener('click', onAccept);
	$('btn-cancel').addEventListener('click', onCancel);
	document.addEventListener('keydown', function (e) {
		var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
		if (e.key === 'Escape') { onCancel(); e.preventDefault(); }
		else if (e.key === 'Enter' && tag !== 'button') { onAccept(); e.preventDefault(); }
	});
	refresh();
}
