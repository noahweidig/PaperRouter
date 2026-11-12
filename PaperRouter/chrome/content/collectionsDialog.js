/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * PaperRouter collection picker dialog.
 * Result contract (window.arguments[0]): selectedCollections [{key,id,name,confidence}],
 * sendToCollections, blacklistChanges [{collectionId,isBlacklisted}].
 */
var HTMLNS = 'http://www.w3.org/1999/xhtml';
var BEST_COUNT = 8;

var S = {
	args: null,
	nodes: new Map(),      // id -> rec
	roots: [],
	selected: new Set(),
	auto: new Set(),       // ids picked automatically (uncheck = rejection feedback)
	existing: new Set(),
	blacklist: new Set(),
	changes: [],
	max: 4,
	itemName: '',
	rows: new Map(),       // id -> [{cb,label}]
	busy: false,
	query: ''
};

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

function getRouter() {
	var tries = [
		function () { return typeof PaperRouter !== 'undefined' ? PaperRouter : null; },
		function () { return typeof TidyUp !== 'undefined' ? TidyUp : null; },
		function () { return typeof Zotero !== 'undefined' ? (Zotero.PaperRouter || Zotero.TidyUp) : null; },
		function () { return window.opener && window.opener.Zotero ? (window.opener.Zotero.PaperRouter || window.opener.Zotero.TidyUp) : null; }
	];
	for (var i = 0; i < tries.length; i++) {
		try { var r = tries[i](); if (r) return r; } catch (e) {}
	}
	return null;
}

// ---------- data ----------

function ingest(collections) {
	S.nodes.clear();
	function walk(list, parent, path) {
		return list.map(function (n) {
			var id = parseInt(n.id, 10);
			var rec = {
				id: id, key: n.key, name: n.name || 'Unnamed', conf: n.confidence || 0,
				type: n.collectionType || null, why: n.why || null, parent: parent, path: path, children: []
			};
			S.nodes.set(id, rec);
			rec.children = walk(n.children || [], rec, path.concat(rec.name));
			return rec;
		});
	}
	S.roots = walk(collections, null, []);
}

// Types are rule-based on the name: resolve once, in parallel, without touching the Zotero DB.
async function resolveTypes() {
	var router = getRouter();
	var todo = [];
	S.nodes.forEach(function (rec) { if (!rec.type) todo.push(rec); });
	await Promise.all(todo.map(async function (rec) {
		try {
			rec.type = router && router.classifyCollectionType ? await router.classifyCollectionType(rec.name, '', []) : 'default';
		} catch (e) { rec.type = 'default'; }
	}));
}

function pushChange(id, isBlacklisted) {
	S.changes.push({ collectionId: id, isBlacklisted: isBlacklisted });
}

// ---------- selection ----------

function atLimit() { return S.selected.size >= S.max; }

function setSelected(id, on, user) {
	if (on) {
		if (!S.selected.has(id) && atLimit()) return false;
		S.selected.add(id);
		if (S.blacklist.has(id)) {
			S.blacklist.delete(id);
			pushChange(id, false);
		}
	} else {
		S.selected.delete(id);
		// Only rejecting an auto-suggestion counts as feedback; removing a real membership does not.
		if (user && S.auto.has(id) && !S.existing.has(id) && !S.blacklist.has(id)) {
			S.blacklist.add(id);
			pushChange(id, true);
		}
	}
	refresh();
	return true;
}

// Pick the best `room` new collections by confidence (>= threshold when given).
function autoSelect(threshold) {
	S.selected.forEach(function (id) { if (!S.existing.has(id)) S.selected.delete(id); });
	S.auto.clear();
	var room = Math.max(0, S.max - S.selected.size);
	if (!room) return refresh();
	var cands = [];
	S.nodes.forEach(function (r) {
		if (!S.blacklist.has(r.id) && !S.existing.has(r.id) && r.conf > 0 && (threshold == null || r.conf >= threshold)) cands.push(r);
	});
	cands.sort(function (a, b) { return b.conf - a.conf; });
	cands.slice(0, room).forEach(function (r) { S.selected.add(r.id); S.auto.add(r.id); });
	refresh();
}

// ---------- rendering ----------

function tierOf(c) { return c >= 0.7 ? 'high' : (c >= 0.4 ? 'medium' : 'low'); }
function whyText(w) {
	if (!w) return '';
	var out = '';
	if (w.terms && w.terms.length) out += '\n' + _s('why-terms', { terms: w.terms.join(', ') });
	if (w.similar && w.similar.length) out += '\n' + _s('why-similar', { titles: w.similar.join(' | ') });
	return out;
}

function pct(conf) { return Math.max(0, Math.min(100, Math.round(conf * 100))); }

function makeRow(rec, withPath) {
	var label = h('label', 'row');
	var cb = h('input');
	cb.type = 'checkbox';
	cb.addEventListener('change', function () {
		if (!setSelected(rec.id, cb.checked, true)) cb.checked = false;
	});
	label.appendChild(cb);
	label.appendChild(h('span', 'name', rec.name));
	if (withPath && rec.path.length) label.appendChild(h('span', 'path', rec.path.join(' › ')));
	else label.appendChild(h('span', 'grow'));
	if (rec.type === 'internal' || rec.type === 'external') {
		label.appendChild(h('span', 'pill ' + rec.type, _s(rec.type === 'internal' ? 'dialog-type-internal' : 'dialog-type-external').replace(/[\[\]]/g, '')));
	}
	var conf = h('span', 'conf');
	var bar = h('span', 'bar');
	var fill = h('i');
	fill.style.width = pct(rec.conf) + '%';
	bar.appendChild(fill);
	conf.appendChild(bar);
	var tier = tierOf(rec.conf);
	conf.appendChild(h('span', 'tier ' + (tier === 'low' ? 'low' : ''), rec.conf > 0 ? _s('tier-' + tier) : ''));
	label.title = rec.path.concat(rec.name).join(' › ') + '  ·  ' + _s('dialog-conf-label') + ' ' + rec.conf.toFixed(2) + whyText(rec.why);
	label.appendChild(conf);
	if (!S.rows.has(rec.id)) S.rows.set(rec.id, []);
	S.rows.get(rec.id).push({ cb: cb, label: label });
	return label;
}

function section(parent, title) {
	parent.appendChild(h('h3', 'sec', title));
}

function renderAll() {
	S.rows.clear();
	var root = $('scroll');
	root.textContent = '';
	if (!S.nodes.size) {
		root.appendChild(h('div', 'empty', _s('dialog-no-collections')));
		return;
	}

	var existing = [];
	S.existing.forEach(function (id) { if (S.nodes.has(id)) existing.push(S.nodes.get(id)); });
	var bestWrap = h('div');
	bestWrap.id = 'best-wrap';
	if (existing.length) {
		section(bestWrap, _s('dialog-current'));
		existing.forEach(function (r) { bestWrap.appendChild(wrapLine(makeRow(r, true))); });
	}
	var best = [];
	S.nodes.forEach(function (r) { if (!S.existing.has(r.id) && !S.blacklist.has(r.id) && r.conf > 0) best.push(r); });
	best.sort(function (a, b) { return b.conf - a.conf; });
	if (best.length) {
		section(bestWrap, _s('dialog-best'));
		best.slice(0, BEST_COUNT).forEach(function (r) { bestWrap.appendChild(wrapLine(makeRow(r, true))); });
	}
	root.appendChild(bestWrap);

	section(root, _s('dialog-all'));
	var tree = h('div');
	tree.id = 'tree';
	root.appendChild(tree);
	(function build(list, parentEl) {
		list.forEach(function (rec) {
			var node = h('div', 'node');
			node.dataset.id = rec.id;
			var line = h('div', 'line');
			var chev = h('button', rec.children.length ? 'chev' : 'chev none');
			chev.type = 'button';
			if (rec.children.length) chev.addEventListener('click', function () { node.classList.toggle('collapsed'); });
			line.appendChild(chev);
			line.appendChild(makeRow(rec, false));
			node.appendChild(line);
			if (rec.children.length) {
				var kids = h('div', 'kids');
				kids.style.marginLeft = '18px';
				build(rec.children, kids);
				node.appendChild(kids);
			}
			rec.el = node;
			parentEl.appendChild(node);
		});
	})(S.roots, tree);
}

function wrapLine(label) {
	var line = h('div', 'line');
	line.appendChild(label);
	return line;
}

function refresh() {
	S.rows.forEach(function (list, id) {
		var on = S.selected.has(id);
		var rejected = S.blacklist.has(id);
		var existing = S.existing.has(id);
		var blocked = !on && atLimit();
		list.forEach(function (r) {
			r.cb.checked = on;
			r.cb.disabled = blocked;
			r.label.classList.toggle('checked', on);
			r.label.classList.toggle('rejected', rejected);
			r.label.classList.toggle('existing', existing);
			r.label.classList.toggle('disabled', blocked);
		});
	});
	var n = S.selected.size;
	var count = $('count');
	count.textContent = _s('dialog-selected-count', { n: n, max: S.max });
	count.classList.toggle('full', n >= S.max);
	$('btn-ok').disabled = S.busy || n === 0;
	updateTip();
}

function updateTip() {
	var ex = S.existing.size;
	var allowed = Math.max(0, S.max - ex);
	var msg;
	if (ex >= S.max) msg = _s('dialog-tip-limit-reached', { max: S.max });
	else if (ex > 0) msg = _s('dialog-tip-has-existing', { existing: ex, allowed: allowed });
	else msg = _s('dialog-tip-max-select', { max: S.max });
	$('tip').textContent = msg;
	$('tip').title = msg;
}

// Collapse branches with no selection, expand those with one.
function autoExpand() {
	function walk(rec) {
		var has = S.selected.has(rec.id);
		rec.children.forEach(function (c) { if (walk(c)) has = true; });
		if (rec.children.length && rec.el) rec.el.classList.toggle('collapsed', !has);
		return has;
	}
	S.roots.forEach(walk);
}

// ---------- search / filter ----------

function applyFilter() {
	var q = S.query.trim().toLowerCase();
	var hideZero = $('hide-zero').checked;
	var hits = 0;
	function walk(rec) {
		var self = !q || rec.name.toLowerCase().indexOf(q) !== -1;
		var kidVisible = false;
		rec.children.forEach(function (c) { if (walk(c)) kidVisible = true; });
		var zeroOk = !hideZero || rec.conf > 0 || S.existing.has(rec.id);
		var visible = (self && zeroOk) || kidVisible;
		var isHit = !!q && self;
		if (isHit) hits++;
		if (rec.el) {
			rec.el.classList.toggle('hidden', !visible);
			if (q && kidVisible) rec.el.classList.remove('collapsed');
		}
		var rows = S.rows.get(rec.id) || [];
		rows.forEach(function (r) { r.label.classList.toggle('hit', isHit); });
		return visible;
	}
	S.roots.forEach(walk);
	var bw = $('best-wrap');
	if (bw) bw.style.display = q ? 'none' : '';
	$('search-status').textContent = q ? (hits ? _s('dialog-search-found', { count: hits }) : _s('dialog-search-not-found')) : '';
}

// ---------- actions ----------

function saveChanges() {
	if (S.args) S.args.blacklistChanges = S.changes;
}

function onAccept() {
	if (S.busy || !S.selected.size) return;
	var out = [];
	S.nodes.forEach(function (r) {
		if (S.selected.has(r.id)) out.push({ key: r.key, id: String(r.id), name: r.name, confidence: r.conf });
	});
	S.args.selectedCollections = out;
	S.args.sendToCollections = true;
	saveChanges();
	window.close();
}

function onCancel() {
	if (S.args) {
		S.args.selectedCollections = null;
		S.args.sendToCollections = false;
		saveChanges();
	}
	window.close();
}

function setBusy(on) {
	S.busy = on;
	['btn-retry', 'btn-ok', 'thr'].forEach(function (id) { $(id).disabled = on; });
}

async function build(collections, initial) {
	ingest(collections);
	await resolveTypes();
	renderAll();
	autoSelect(null);
	// Slider starts at the weakest auto-pick so it reflects the current selection.
	var min = null;
	S.auto.forEach(function (id) { var c = S.nodes.get(id).conf; if (min == null || c < min) min = c; });
	var v = min == null ? 70 : Math.floor(pct(min));
	var fixed = S.args && S.args.minConfidence > 0 ? S.args.minConfidence : 0;
	if (fixed) { v = fixed; autoSelect(fixed / 100); }
	$('thr').value = v;
	$('thr-val').textContent = v + '%';
	autoExpand();
	applyFilter();
}

async function onRetry() {
	saveChanges();
	setBusy(true);
	var root = $('scroll');
	root.textContent = '';
	root.appendChild(h('div', 'empty', _s('dialog-recalculating')));
	try {
		var router = getRouter();
		if (!router) throw new Error('PaperRouter not found');
		var fresh = await router.SortCollectionsByItemName(S.itemName, new Set(S.blacklist), S.args.itemAbstract || '', S.args.itemExtra || null);
		await build(fresh);
	} catch (e) {
		root.textContent = '';
		root.appendChild(h('div', 'error', _s('dialog-error', { msg: e.message })));
	} finally {
		setBusy(false);
		refresh();
	}
}

async function onLoad() {
	document.documentElement.setAttribute('title', _s('dialog-title'));
	$('item-label').textContent = _s('dialog-selected-item').replace(/[:：]\s*$/, '');
	$('search').placeholder = _s('dialog-search-placeholder');
	PRIcons.setButton($('btn-retry'), 'refresh', _s('dialog-retry'));
	$('thr-label').textContent = _s('dialog-min-conf');
	$('hide-zero-label').textContent = _s('dialog-hide-zero');
	PRIcons.setButton($('btn-expand'), 'expand', _s('dialog-expand-all'));
	PRIcons.setButton($('btn-collapse'), 'collapse', _s('dialog-collapse-all'));
	PRIcons.setButton($('btn-clear'), 'clear', _s('dialog-deselect-all'));
	PRIcons.setButton($('btn-ok'), 'check', _s('dialog-ok'));
	$('btn-cancel').textContent = _s('dialog-cancel');

	var args = window.arguments && window.arguments[0];
	if (!args) {
		$('scroll').appendChild(h('div', 'error', _s('dialog-error-no-args')));
		return;
	}
	S.args = args;
	S.itemName = args.itemName || '';
	S.max = args.maxCollectionNum || 4;
	S.blacklist = new Set((args.blacklist || []).map(Number));
	S.existing = new Set((args.existingCollections || []).map(Number));
	S.existing.forEach(function (id) { S.selected.add(id); });
	$('item-name').textContent = S.itemName;
	$('item-name').title = S.itemName;

	$('btn-ok').addEventListener('click', onAccept);
	$('btn-cancel').addEventListener('click', onCancel);
	$('btn-retry').addEventListener('click', onRetry);
	$('btn-expand').addEventListener('click', function () {
		S.nodes.forEach(function (r) { if (r.el) r.el.classList.remove('collapsed'); });
	});
	$('btn-collapse').addEventListener('click', function () {
		S.nodes.forEach(function (r) { if (r.el && r.children.length) r.el.classList.add('collapsed'); });
	});
	$('btn-clear').addEventListener('click', function () {
		S.selected.clear();
		S.auto.clear();
		refresh();
	});
	$('thr').addEventListener('input', function () {
		var v = parseInt($('thr').value, 10) || 0;
		$('thr-val').textContent = v + '%';
		autoSelect(v / 100);
		autoExpand();
	});
	$('hide-zero').addEventListener('change', applyFilter);
	var timer = null;
	$('search').addEventListener('input', function () {
		clearTimeout(timer);
		timer = setTimeout(function () { S.query = $('search').value; applyFilter(); }, 80);
	});
	document.addEventListener('keydown', function (e) {
		var tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : '';
		if (e.key === 'Escape') {
			if (tag === 'input' && e.target.id === 'search' && e.target.value) {
				e.target.value = ''; S.query = ''; applyFilter();
			} else onCancel();
			e.preventDefault();
		} else if (e.key === 'Enter' && !(tag === 'input' && e.target.type === 'search') && tag !== 'button') {
			onAccept();
			e.preventDefault();
		} else if ((e.key === 'f' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && tag !== 'input')) {
			$('search').focus();
			e.preventDefault();
		}
	});

	var collections = args.collections;
	if (!collections || !collections.length) {
		$('scroll').appendChild(h('div', 'empty', _s('dialog-no-collections')));
		refresh();
		return;
	}
	setBusy(true);
	try {
		await build(collections, true);
	} finally {
		setBusy(false);
		refresh();
	}
	$('search').focus();
}
