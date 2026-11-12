/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Small outline icon set in Zotero's 20px style. Strokes use currentColor, so they follow the theme.
 */
var PRIcons = (function () {
	'use strict';
	var NS = 'http://www.w3.org/2000/svg';
	var P = {
		search: ['M9 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11z', 'M13.2 13.2L17 17'],
		refresh: ['M16 10a6 6 0 1 1-1.8-4.3', 'M16 3.5v3.2h-3.2'],
		expand: ['M6 8l4 4 4-4'],
		collapse: ['M6 12l4-4 4 4'],
		clear: ['M6 6l8 8', 'M14 6l-8 8'],
		check: ['M5 10.5l3.5 3.5L15 6.5'],
		undo: ['M7 4.5L3.5 8 7 11.5', 'M3.5 8H12a4.25 4.25 0 0 1 0 8.5H8'],
		inbox: ['M3.5 11.5h4l1 2h3l1-2h4', 'M3.5 11.5l2-6h9l2 6v4h-13z'],
		folder: ['M2.5 5.5a1 1 0 0 1 1-1h3.6l1.6 1.8h7.8a1 1 0 0 1 1 1v7.4a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z'],
		info: ['M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14z', 'M10 9.2v4.3', 'M10 6.6v.2']
	};
	function make(name, size) {
		var svg = document.createElementNS(NS, 'svg');
		svg.setAttribute('viewBox', '0 0 20 20');
		svg.setAttribute('width', String(size || 14));
		svg.setAttribute('height', String(size || 14));
		svg.setAttribute('class', 'pri');
		(P[name] || []).forEach(function (d) {
			var p = document.createElementNS(NS, 'path');
			p.setAttribute('d', d);
			svg.appendChild(p);
		});
		return svg;
	}
	// Put an icon (and optional text) into a button element.
	function setButton(btn, name, text) {
		btn.textContent = '';
		btn.appendChild(make(name, 14));
		if (text) btn.appendChild(document.createTextNode(text));
	}
	return { make: make, setButton: setButton };
})();
