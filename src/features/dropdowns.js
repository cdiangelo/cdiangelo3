// ── POPULATE DROPDOWNS ──
// Extracted from index.html lines 4636–4692

function populateSelect(el, items, addAll) {
  const v = el.value;
  const opts = addAll ? ['<option value="">All</option>'] : ['<option value="">Select…</option>'];
  items.forEach(i => opts.push(`<option value="${i}">${i}</option>`));
  el.innerHTML = opts.join('');
  if (v) el.value = v;
}
function getUniqueValues(arr, key) { return [...new Set(arr.map(i => i[key]).filter(Boolean))].sort() }
function populateMarketSelect(el, addAll) {
  const v = el.value;
  const opts = addAll ? ['<option value="">All</option>'] : ['<option value="">Select…</option>'];
  window.state.markets.forEach(m => opts.push(`<option value="${m.code}">${m.code} — ${m.name}</option>`));
  el.innerHTML = opts.join('');
  if (v) el.value = v;
}
function populateBizLineSelect(el, addAll) {
  const v = el.value;
  const opts = addAll ? ['<option value="">All</option>'] : ['<option value="">Select…</option>'];
  window.state.bizLines.forEach(b => opts.push(`<option value="${b.code}">${b.code} — ${b.name}</option>`));
  el.innerHTML = opts.join('');
  if (v) el.value = v;
}
function getBizLineName(code) {
  if (!code) return '—';
  const b = window.state.bizLines.find(x => x.code === code);
  return b ? `${b.code} — ${b.name}` : code;
}
function getMarketName(code) {
  if (!code) return '—';
  const m = window.state.markets.find(x => x.code === code);
  return m ? `${m.code} — ${m.name}` : code;
}
function initDropdowns() {
  populateSelect(document.getElementById('dashCountry'), window.COUNTRIES, true);
  populateSelect(document.getElementById('dashSeniority'), window.SENIORITY, true);
  populateSelect(document.getElementById('dashFunction'), window.FUNCTIONS, true);
  populateSelect(document.getElementById('empCountry'), window.COUNTRIES);
  populateSelect(document.getElementById('empSeniority'), window.SENIORITY);
  populateSelect(document.getElementById('empFunction'), window.FUNCTIONS);
  populateBizLineSelect(document.getElementById('empBusinessLine'));
  populateMarketSelect(document.getElementById('projMarket'));
  refreshProjectDropdown();
  refreshProjectFilters();
}
function refreshProjectFilters() {
  const cats = getUniqueValues(window.state.projects, 'category');
  const prods = getUniqueValues(window.state.projects, 'product');
  const codes = getUniqueValues(window.state.projects, 'code');
  populateSelect(document.getElementById('dashProdCat'), cats, true);
  populateSelect(document.getElementById('dashProduct'), prods, true);
  populateSelect(document.getElementById('dashProject'), codes, true);
}
function refreshProjectDropdown() {
  // No standalone project dropdown — projects assigned via allocations
}

// Assign to window for other modules
window.initDropdowns = initDropdowns;
window.populateSelect = populateSelect;
window.getUniqueValues = getUniqueValues;
window.populateMarketSelect = populateMarketSelect;
window.populateBizLineSelect = populateBizLineSelect;
window.getBizLineName = getBizLineName;
window.getMarketName = getMarketName;
window.refreshProjectFilters = refreshProjectFilters;
window.refreshProjectDropdown = refreshProjectDropdown;

export {
  populateSelect,
  getUniqueValues,
  populateMarketSelect,
  populateBizLineSelect,
  getBizLineName,
  getMarketName,
  initDropdowns,
  refreshProjectFilters,
  refreshProjectDropdown
};
