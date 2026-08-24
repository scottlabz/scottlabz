(function () {
'use strict';
var TEMPLATE_STYLES =
':host {' +
'  --ff-ink: #111111;' +
'  --ff-navy: #1e3a5f;' +
'  --ff-hairline: rgba(17, 17, 17, .16);' +
'  --ff-muted: #666666;' +
'  display: block;' +
'  font-family: "Source Sans Pro", Helvetica, Arial, sans-serif;' +
'}' +
'.ff-bar {' +
'  display: flex;' +
'  gap: .35rem;' +
'  flex-wrap: nowrap;' +
'  overflow-x: auto;' +
'  padding: .3rem .1rem .7rem;' +
'  margin: 0 -.1rem .4rem;' +
'  scrollbar-width: none;' +
'}' +
'.ff-bar::-webkit-scrollbar { display: none; }' +
'.ff-pill {' +
'  flex: 0 0 auto;' +
'  display: inline-flex;' +
'  align-items: center;' +
'  gap: .35rem;' +
'  padding: .35rem .65rem .35rem .5rem;' +
'  border-radius: 999px;' +
'  border: 0;' +
'  background: transparent;' +
'  box-shadow: inset 0 0 0 1px var(--ff-hairline);' +
'  color: var(--ff-ink);' +
'  font: inherit;' +
'  font-size: .62rem;' +
'  font-weight: 600;' +
'  letter-spacing: .04em;' +
'  text-transform: uppercase;' +
'  cursor: pointer;' +
'  transition: box-shadow .2s ease, background-color .2s ease, color .2s ease, transform .15s ease;' +
'  white-space: nowrap;' +
'}' +
'.ff-pill:hover { box-shadow: inset 0 0 0 1px var(--pill-color, var(--ff-navy)); color: var(--pill-color, var(--ff-navy)); }' +
'.ff-pill:active { transform: scale(.97); }' +
'.ff-pill:focus-visible { outline: 2px solid var(--pill-color, var(--ff-navy)); outline-offset: 2px; }' +
'.ff-pill.is-active { background: var(--pill-color, var(--ff-navy)); box-shadow: none; color: #ffffff; }' +
'.ff-bars { display: flex; align-items: flex-end; gap: 1px; height: 10px; }' +
'.ff-bars span {' +
'  display: block; width: 2px; border-radius: 1px;' +
'  background: rgba(17,17,17,.22);' +
'  transition: background-color .2s ease;' +
'}' +
'.ff-pill.is-active .ff-bars span { background: rgba(255,255,255,.85); }' +
'.ff-count { font-variant-numeric: tabular-nums; opacity: .6; font-weight: 600; }' +
'.ff-pill.is-active .ff-count { opacity: .85; }' +
'.ff-status {' +
'  display: flex; align-items: center; flex-wrap: wrap; gap: .75rem;' +
'  font-size: .72rem; color: var(--ff-muted);' +
'}' +
'.ff-clear {' +
'  border: 0; background: none; color: var(--ff-navy);' +
'  font-size: .7rem; font-weight: 600; cursor: pointer;' +
'  text-decoration: underline; padding: 0; font: inherit;' +
'}' +
'.ff-clear:hover { text-decoration: none; }' +
'.ff-clear[hidden] { display: none; }' +
'@media (prefers-reduced-motion: reduce) {' +
'  .ff-pill, .ff-bars span { transition: none !important; }' +
'}';
var ALL_BAR_PATTERN = [7, 10, 7];
function titleCase(key) {
return key
.replace(/[-_]+/g, ' ')
.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
}
function escapeHtml(str) {
var div = document.createElement('div');
div.textContent = str;
return div.innerHTML;
}
class ScottFilterBarElement extends HTMLElement {
constructor() {
super();
this._active = new Set();
this._root = this.attachShadow({ mode: 'open' });
}
connectedCallback() {
var targetSel = this.getAttribute('target');
if (!targetSel) {
console.warn('<scott-filter-bar> requires a "target" attribute.');
return;
}
this._target = document.querySelector(targetSel);
if (!this._target) {
console.warn('<scott-filter-bar> could not find target "' + targetSel + '".');
return;
}
this._itemSelector = this.getAttribute('item-selector') || '[data-categories]';
this._categoryAttr = this.getAttribute('category-attr') || 'data-categories';
this._allLabel = this.getAttribute('all-label') || 'All';
this._items = Array.prototype.slice.call(
this._target.querySelectorAll(this._itemSelector)
);
this._categories = this._resolveCategories();
this._counts = this._computeCounts();
this._render();
this._bind();
}
_resolveCategories() {
var configEl = this.querySelector('script[type="application/json"]');
if (configEl) {
try {
var parsed = JSON.parse(configEl.textContent);
if (Array.isArray(parsed) && parsed.length) return parsed;
} catch (err) {
console.warn(
'<scott-filter-bar> could not parse category config, falling back to auto-discovery.',
err
);
}
}
var seen = [];
var attr = this._categoryAttr;
this._items.forEach(function (item) {
(item.getAttribute(attr) || '')
.split(/\s+/)
.filter(Boolean)
.forEach(function (key) {
if (seen.indexOf(key) === -1) seen.push(key);
});
});
return seen.map(function (key) {
return { key: key, label: titleCase(key) };
});
}
_computeCounts() {
var counts = {};
var attr = this._categoryAttr;
this._items.forEach(function (item) {
(item.getAttribute(attr) || '')
.split(/\s+/)
.filter(Boolean)
.forEach(function (key) {
counts[key] = (counts[key] || 0) + 1;
});
});
return counts;
}
_render() {
var self = this;
var total = this._items.length;
var maxCount = Math.max.apply(
null,
this._categories.map(function (c) { return self._counts[c.key] || 0; }).concat([1])
);
var pillsHtml = this._categories
.map(function (cat) {
var n = self._counts[cat.key] || 0;
var scale = n / maxCount;
var pattern = [0.55, 1, 0.72].map(function (m) {
return Math.max(3, Math.round(m * scale * 10));
});
var colorAttr = cat.color ? ' style="--pill-color:' + escapeHtml(cat.color) + '"' : '';
return (
'<button type="button" class="ff-pill" data-filter="' + cat.key + '" aria-pressed="false"' + colorAttr + '>' +
'<span class="ff-bars" aria-hidden="true">' +
pattern.map(function (h) { return '<span style="height:' + h + 'px"></span>'; }).join('') +
'</span>' +
escapeHtml(cat.label) +
'<span class="ff-count">' + n + '</span>' +
'</button>'
);
})
.join('');
this._root.innerHTML =
'<style>' + TEMPLATE_STYLES + '</style>' +
'<div class="ff-bar" role="group" aria-label="Filter by category">' +
'<button type="button" class="ff-pill is-active" data-filter="__all" aria-pressed="true">' +
'<span class="ff-bars" aria-hidden="true">' +
ALL_BAR_PATTERN.map(function (h) { return '<span style="height:' + h + 'px"></span>'; }).join('') +
'</span>' +
escapeHtml(this._allLabel) +
'<span class="ff-count">' + total + '</span>' +
'</button>' +
pillsHtml +
'</div>' +
'<div class="ff-status">' +
'<span class="ff-live" aria-live="polite">Showing all</span>' +
'<button type="button" class="ff-clear" hidden>Clear filters</button>' +
'</div>';
this._pills = Array.prototype.slice.call(this._root.querySelectorAll('.ff-pill'));
this._liveEl = this._root.querySelector('.ff-live');
this._clearBtn = this._root.querySelector('.ff-clear');
}
_bind() {
var self = this;
this._pills.forEach(function (pill) {
pill.addEventListener('click', function () {
var key = pill.dataset.filter;
if (key === '__all' || (self._active.size === 1 && self._active.has(key))) {
self._active.clear();
} else {
self._active.clear();
self._active.add(key);
}
self._update();
});
});
this._clearBtn.addEventListener('click', function () {
self._active.clear();
self._update();
});
}
_update() {
var self = this;
var attr = this._categoryAttr;
this._pills.forEach(function (pill) {
var key = pill.dataset.filter;
var isActive = key === '__all' ? self._active.size === 0 : self._active.has(key);
pill.classList.toggle('is-active', isActive);
pill.setAttribute('aria-pressed', String(isActive));
});
var visible = 0;
this._items.forEach(function (item) {
var cats = (item.getAttribute(attr) || '').split(/\s+/).filter(Boolean);
var matches = self._active.size === 0 || cats.some(function (c) { return self._active.has(c); });
var isHidden = item.classList.contains('ff-hide');
if (matches) {
visible++;
if (isHidden) {
item.classList.remove('ff-hide');
item.classList.add('ff-entering');
requestAnimationFrame(function () {
requestAnimationFrame(function () { item.classList.remove('ff-entering'); });
});
}
} else if (!isHidden) {
item.classList.add('ff-leaving');
setTimeout(function () {
item.classList.add('ff-hide');
item.classList.remove('ff-leaving');
}, 160);
}
});
this._liveEl.textContent =
this._active.size === 0 ? 'Showing all' : 'Showing ' + visible + ' of ' + this._items.length;
this._clearBtn.hidden = this._active.size === 0;
this.dispatchEvent(
new CustomEvent('scott-filter-change', {
bubbles: true,
composed: true,
detail: { active: Array.from(this._active), visible: visible, total: this._items.length }
})
);
}
}
if (!customElements.get('scott-filter-bar')) {
customElements.define('scott-filter-bar', ScottFilterBarElement);
}
})();
