/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * PaperRouter local ranking: no API key, no network.
 * Learns from items already filed in each collection:
 *   - collection profile: TF-IDF cosine against the words of everything filed there
 *   - nearest neighbours: which already-filed papers look most like this one
 *   - collection name match
 * Pure functions + an in-memory index, so it is cheap to rebuild and easy to test.
 */
var PaperRouterLocalRank = (function () {
	'use strict';

	var STOP = new Set(('a an and are as at be been but by for from has have in into is it its of on or our s such ' +
		'than that the their then there these this those to was we were what when where which while who will with within ' +
		'without using use used based via toward towards new novel paper study studies approach approaches case ' +
		'can could may might not no do does did how why also both each other more most between across over under ' +
		'et al vs versus per upon').split(/\s+/));

	var RUN_RE = /[\u3400-\u9fff]+|(?:(?![\u3400-\u9fff])[\p{L}\p{N}])+/gu;
	var HAN_RE = /^[\u3400-\u9fff]/;

	function stem(w) {
		if (w.length < 4) return w;
		if (/ies$/.test(w)) w = w.slice(0, -3) + 'y';
		else if (/sses$/.test(w)) w = w.slice(0, -2);
		else if (/[^su]s$/.test(w)) w = w.slice(0, -1);
		if (w.length > 5 && /ing$/.test(w)) w = w.slice(0, -3);
		else if (w.length > 5 && /ed$/.test(w)) w = w.slice(0, -2);
		if (w.length > 3 && /(.)\1$/.test(w) && !/(ll|ss)$/.test(w)) w = w.slice(0, -1);
		if (w.length > 4 && /e$/.test(w)) w = w.slice(0, -1);
		return w;
	}

	// Words (stemmed, stopwords dropped) + character bigrams for Chinese runs.
	function tokenize(text) {
		var out = [];
		if (!text) return out;
		var runs = String(text).toLowerCase().match(RUN_RE) || [];
		runs.forEach(function (run) {
			if (HAN_RE.test(run)) flushHan(run, out);
			else pushWord(run, out);
		});
		return out;
	}
	function pushWord(tok, out) {
		if (tok.length < 2 || STOP.has(tok) || /^\d+$/.test(tok)) return;
		out.push(stem(tok));
	}
	function flushHan(run, out) {
		if (!run) return;
		if (run.length === 1) { out.push(run); return; }
		for (var i = 0; i < run.length - 1; i++) out.push(run.substr(i, 2));
	}

	// Weighted, sublinear term frequencies for a set of fields: [{text, weight}]
	function termWeights(fields) {
		var tf = new Map();
		fields.forEach(function (f) {
			tokenize(f.text).forEach(function (t) { tf.set(t, (tf.get(t) || 0) + f.weight); });
		});
		tf.forEach(function (v, k) { tf.set(k, 1 + Math.log(v)); });
		return tf;
	}

	var W_ITEM = { title: 3, tags: 3, venue: 1, abstract: 1 };
	var W_NAME = 4;

	function itemFields(it) {
		return [
			{ text: it.title, weight: W_ITEM.title },
			{ text: (it.tags || []).join(' '), weight: W_ITEM.tags },
			{ text: it.venue, weight: W_ITEM.venue },
			{ text: it.abstract, weight: W_ITEM.abstract }
		];
	}

	/**
	 * data: {
	 *   collections: [{id, name}],
	 *   items: [{id, title, abstract, tags[], venue, collectionIds[]}]
	 * }
	 */
	function buildIndex(data) {
		var idx = {
			items: [],           // {id, vec:Map(term->tfidf), norm, cids}
			itemById: new Map(),
			postings: new Map(), // term -> [[itemIdx, weight], ...]
			idf: new Map(),
			colls: new Map(),    // cid -> {sum:Map, norm, name:Map, nameNorm, count}
			builtAt: Date.now()
		};
		var raw = [];
		var df = new Map();
		data.items.forEach(function (it) {
			var tf = termWeights(itemFields(it));
			if (!tf.size) return;
			raw.push({ it: it, tf: tf });
			tf.forEach(function (_, t) { df.set(t, (df.get(t) || 0) + 1); });
		});
		var N = Math.max(1, raw.length);
		df.forEach(function (d, t) { idx.idf.set(t, Math.log(1 + N / (1 + d))); });

		data.collections.forEach(function (c) {
			idx.colls.set(c.id, { name: c.name, sum: new Map(), norm: 0, nameVec: new Map(), nameNorm: 0, count: 0 });
		});

		raw.forEach(function (r, i) {
			var vec = new Map(), n2 = 0;
			r.tf.forEach(function (w, t) {
				var v = w * idx.idf.get(t);
				vec.set(t, v);
				n2 += v * v;
				var p = idx.postings.get(t);
				if (!p) { p = []; idx.postings.set(t, p); }
				p.push([i, v]);
			});
			var rec = { id: r.it.id, vec: vec, norm: Math.sqrt(n2) || 1, cids: r.it.collectionIds || [], tf: r.tf };
			idx.items.push(rec);
			idx.itemById.set(r.it.id, rec);
			rec.cids.forEach(function (cid) {
				var c = idx.colls.get(cid);
				if (!c) return;
				c.count++;
				r.tf.forEach(function (w, t) { c.sum.set(t, (c.sum.get(t) || 0) + w); });
			});
		});

		idx.colls.forEach(function (c) {
			c.norm = profileNorm(c.sum, idx.idf);
			var nt = termWeights([{ text: c.name, weight: 1 }]);
			var n2 = 0;
			nt.forEach(function (w, t) {
				if (!idx.idf.has(t)) idx.idf.set(t, Math.log(1 + N));   // name-only words stay matchable
				var v = w * idx.idf.get(t);
				c.nameVec.set(t, v);
				n2 += v * v;
			});
			c.nameNorm = Math.sqrt(n2);
		});
		return idx;
	}

	function profileNorm(sum, idf) {
		var n2 = 0;
		sum.forEach(function (w, t) { var v = w * (idf.get(t) || 0); n2 += v * v; });
		return Math.sqrt(n2);
	}

	/**
	 * Score every collection for one item. Returns Map(cid -> 0..1).
	 * item: {title, abstract, tags[], venue}; excludeItemId: leave this item out of the evidence.
	 */
	function score(idx, item, excludeItemId) {
		var out = new Map();
		var qtf = termWeights(itemFields(item));
		var q = new Map(), qn2 = 0;
		qtf.forEach(function (w, t) {
			var idf = idx.idf.get(t);
			if (idf === undefined) return;      // unseen word: no evidence either way
			var v = w * idf;
			q.set(t, v);
			qn2 += v * v;
		});
		var qnorm = Math.sqrt(qn2);

		// --- nearest neighbours via the inverted index
		var sims = new Map();
		if (qnorm > 0) {
			q.forEach(function (qv, t) {
				var posts = idx.postings.get(t);
				if (!posts) return;
				for (var i = 0; i < posts.length; i++) {
					sims.set(posts[i][0], (sims.get(posts[i][0]) || 0) + qv * posts[i][1]);
				}
			});
		}
		var neigh = [];
		sims.forEach(function (dot, i) {
			var rec = idx.items[i];
			if (excludeItemId != null && rec.id === excludeItemId) return;
			neigh.push({ rec: rec, sim: dot / (qnorm * rec.norm) });
		});
		neigh.sort(function (a, b) { return b.sim - a.sim; });
		neigh = neigh.slice(0, 15).filter(function (n) { return n.sim > 0.04; });
		var simTotal = neigh.reduce(function (s, n) { return s + n.sim; }, 0);
		var topSim = neigh.length ? neigh[0].sim : 0;
		var knn = new Map();
		neigh.forEach(function (n) {
			n.rec.cids.forEach(function (cid) { knn.set(cid, (knn.get(cid) || 0) + n.sim); });
		});

		var excl = excludeItemId != null ? idx.itemById.get(excludeItemId) : null;

		idx.colls.forEach(function (c, cid) {
			// profile cosine (subtract the excluded item from its own collections)
			var P = 0;
			if (qnorm > 0 && c.count > 0) {
				var sum = c.sum, norm = c.norm;
				if (excl && excl.cids.indexOf(cid) !== -1) {
					sum = new Map(c.sum);
					excl.tf.forEach(function (w, t) { sum.set(t, (sum.get(t) || 0) - w); });
					norm = profileNorm(sum, idx.idf);
				}
				if (norm > 0) {
					var dot = 0;
					q.forEach(function (qv, t) {
						var w = sum.get(t);
						if (w > 0) dot += qv * w * idx.idf.get(t);
					});
					P = dot / (qnorm * norm);
				}
			}
			var K = simTotal > 0 && knn.has(cid) ? (knn.get(cid) / simTotal) * topSim : 0;
			var Nm = 0;
			if (qnorm > 0 && c.nameNorm > 0) {
				var nd = 0;
				c.nameVec.forEach(function (nv, t) { if (q.has(t)) nd += nv * q.get(t); });
				Nm = nd / (qnorm * c.nameNorm);
			}
			// A collection with no filed items can only be judged by its name.
			var s = c.count > 0 ? 0.45 * P + 0.40 * K + 0.30 * Nm : 0.60 * Nm;
			out.set(cid, Math.max(0, Math.min(1, s)));
		});
		return out;
	}

	var api = { tokenize: tokenize, stem: stem, buildIndex: buildIndex, score: score };
	if (typeof module !== 'undefined' && module.exports) module.exports = api;
	return api;
})();
