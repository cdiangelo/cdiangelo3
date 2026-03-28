// ── Unified Pivot Analysis ──
// Consolidates employee roster pivot + vendor spend pivot into one tab.

import { state } from '../lib/state.js';
import { fmt, CURRENT_YEAR, FUNCTIONS, COUNTRIES } from '../lib/constants.js';
import { getMonthlyComp, getMonthlyCapEx } from '../lib/proration.js';

const getChartColors = () => window.getChartColors();
const hexToRgba = (...a) => window.hexToRgba(...a);
const getEmpProject = (...a) => window.getEmpProject ? window.getEmpProject(...a) : null;

let pivotChart = null;

// ── Employee dimension helpers ──
const EMP_DIMS = {
  'function':  { label: 'Function',  get: e => e.function || 'Unknown' },
  'seniority': { label: 'Seniority', get: e => e.seniority || 'Unknown' },
  'country':   { label: 'Country',   get: e => e.country || 'Unknown' },
  'category':  { label: 'Product Category', get: e => { const p = getEmpProject(e); return p ? p.category || 'Unassigned' : 'Unassigned'; } },
  'product':   { label: 'Product', get: e => { const p = getEmpProject(e); return p ? p.product || 'Unassigned' : 'Unassigned'; } },
  'bizline':   { label: 'Business Line', get: e => e.bizLine || 'Unassigned' },
};

const EMP_METRICS = {
  'hc':    { label: 'Headcount',  get: () => 1, isCurrency: false },
  'comp':  { label: 'Total Comp', get: e => { let s=0; for(let m=0;m<12;m++) s+=getMonthlyComp(e,m); return s; }, isCurrency: true },
  'opex':  { label: 'OpEx',       get: e => { let c=0,x=0; for(let m=0;m<12;m++){c+=getMonthlyComp(e,m);x+=getMonthlyCapEx(e,m)} return c-x; }, isCurrency: true },
  'capex': { label: 'CapEx',      get: e => { let s=0; for(let m=0;m<12;m++) s+=getMonthlyCapEx(e,m); return s; }, isCurrency: true },
};

// ── Vendor dimension helpers ──
const VENDOR_DIMS = {
  'vendorType':   { label: 'Vendor Type',   get: r => r.vendorType || 'Unknown' },
  'parentCo':     { label: 'Parent Company', get: r => r.parentCo || 'Unknown' },
  'businessUnit': { label: 'Business Unit',  get: r => r.businessUnit || 'Unknown' },
  'bizLine':      { label: 'Business Line',  get: r => r.bizLine || 'Unknown' },
  'market':       { label: 'Market',         get: r => r.market || 'Unknown' },
  'acctDesc':     { label: 'Account',        get: r => r.acctDesc || 'Unknown' },
  'vendorName':   { label: 'Vendor Name',    get: r => r.vendorName || 'Unknown' },
};

// ── Populate dimension dropdowns based on source ──
function populateDims() {
  const src = document.getElementById('pivotSource').value;
  const rowSel = document.getElementById('pivotRowDim');
  const colSel = document.getElementById('pivotColDim');
  const metricWrap = document.getElementById('pivotMetricWrap');
  const bandWrap = document.getElementById('pivotBandWrap');
  const dims = src === 'employees' ? EMP_DIMS : VENDOR_DIMS;

  rowSel.innerHTML = Object.entries(dims).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');
  colSel.innerHTML = Object.entries(dims).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');

  // Default: first two different dims
  const keys = Object.keys(dims);
  if (keys.length > 1) colSel.value = keys[1];

  // Show metric selector for employees, band selector for vendor
  metricWrap.style.display = src === 'employees' ? '' : 'none';
  bandWrap.style.display = src === 'vendor' ? '' : 'none';
}

// ── Build pivot data ──
function buildPivotData() {
  const src = document.getElementById('pivotSource').value;
  const rowDim = document.getElementById('pivotRowDim').value;
  const colDim = document.getElementById('pivotColDim').value;
  const pivot = {}; // pivot[rowVal][colVal] = number
  const rowTotals = {};
  const colSet = new Set();

  if (src === 'employees') {
    const metric = document.getElementById('pivotMetric').value;
    const metricFn = EMP_METRICS[metric] || EMP_METRICS.hc;
    const dimRow = EMP_DIMS[rowDim] || EMP_DIMS['function'];
    const dimCol = EMP_DIMS[colDim] || EMP_DIMS['seniority'];

    (state.employees || []).forEach(e => {
      if (e.termDate) {
        const td = new Date(e.termDate);
        if (td.getFullYear() <= CURRENT_YEAR && td.getMonth() < 11) return;
      }
      const rk = dimRow.get(e);
      const ck = dimCol.get(e);
      const val = metricFn.get(e);
      colSet.add(ck);
      if (!pivot[rk]) pivot[rk] = {};
      pivot[rk][ck] = (pivot[rk][ck] || 0) + val;
      rowTotals[rk] = (rowTotals[rk] || 0) + val;
    });

    return { pivot, rowTotals, cols: [...colSet].sort(), isCurrency: metricFn.isCurrency };
  }

  // Vendor source
  const band = document.querySelector('#pivotBandBtns .btn.active')?.dataset.band || 'all';
  const dimRow = VENDOR_DIMS[rowDim] || VENDOR_DIMS['vendorType'];
  const dimCol = VENDOR_DIMS[colDim] || VENDOR_DIMS['businessUnit'];

  (state.vendorRows || []).forEach(r => {
    let fy = 0;
    for (let m = 0; m < 12; m++) fy += (r[['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'][m]] || 0);
    if (fy === 0) return;

    // Band filter
    if (band !== 'all') {
      const parts = band.split('-');
      const lo = parseInt(parts[0]) || 0;
      const hi = parts[1] ? parseInt(parts[1]) : Infinity;
      if (fy < lo || fy >= hi) return;
    }

    const rk = dimRow.get(r);
    const ck = dimCol.get(r);
    colSet.add(ck);
    if (!pivot[rk]) pivot[rk] = {};
    pivot[rk][ck] = (pivot[rk][ck] || 0) + fy;
    rowTotals[rk] = (rowTotals[rk] || 0) + fy;
  });

  return { pivot, rowTotals, cols: [...colSet].sort(), isCurrency: true };
}

// ── Render chart ──
function renderPivotChart(data) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('pivotChart');
  if (!canvas) return;
  if (pivotChart) pivotChart.destroy();

  const { pivot, rowTotals, cols, isCurrency } = data;
  const rows = Object.keys(rowTotals).sort((a, b) => rowTotals[b] - rowTotals[a]);
  const colors = getChartColors();

  const datasets = rows.map((rk, i) => ({
    label: rk.length > 20 ? rk.slice(0, 18) + '…' : rk,
    data: cols.map(ck => (pivot[rk] && pivot[rk][ck]) || 0),
    backgroundColor: hexToRgba(colors[i % colors.length], 0.7),
    borderColor: colors[i % colors.length],
    borderWidth: 1,
  }));

  pivotChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: cols, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12 } },
        datalabels: { display: false },
        yoyArrows: false,
      },
      scales: {
        x: { stacked: true, ticks: { font: { size: 11 } } },
        y: {
          stacked: true,
          ticks: {
            font: { size: 11 },
            callback: v => isCurrency ? '$' + (Math.abs(v) / 1e6).toFixed(1) + 'M' : v
          }
        }
      }
    }
  });
}

// ── Render table ──
function renderPivotTable(data) {
  const thead = document.getElementById('pivotThead');
  const tbody = document.getElementById('pivotTbody');
  if (!thead || !tbody) return;

  const { pivot, rowTotals, cols, isCurrency } = data;
  const rows = Object.keys(rowTotals).sort((a, b) => rowTotals[b] - rowTotals[a]);
  const colors = getChartColors();
  const fmtVal = v => {
    if (!v) return '—';
    if (isCurrency) return fmt(v);
    return Math.round(v * 10) / 10;
  };

  // Header
  thead.innerHTML = `<tr>
    <th style="position:sticky;left:0;z-index:3;background:var(--bg-elevated);min-width:160px"></th>
    ${cols.map(c => `<th style="text-align:right;min-width:80px">${c}</th>`).join('')}
    <th style="text-align:right;font-weight:700;min-width:80px">Total</th>
  </tr>`;

  // Body
  tbody.innerHTML = rows.map((rk, i) => {
    const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[i % colors.length]};margin-right:6px"></span>`;
    const cells = cols.map(ck => {
      const v = (pivot[rk] && pivot[rk][ck]) || 0;
      return `<td style="text-align:right;font-variant-numeric:tabular-nums">${fmtVal(v)}</td>`;
    }).join('');
    return `<tr>
      <td style="position:sticky;left:0;z-index:1;background:var(--panel);font-weight:500">${dot}${rk}</td>
      ${cells}
      <td style="text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${fmtVal(rowTotals[rk])}</td>
    </tr>`;
  }).join('');

  // Total row
  const grandTotal = Object.values(rowTotals).reduce((a, b) => a + b, 0);
  const colTotals = cols.map(ck => {
    let sum = 0;
    rows.forEach(rk => { sum += (pivot[rk] && pivot[rk][ck]) || 0; });
    return sum;
  });
  tbody.innerHTML += `<tr style="font-weight:700;border-top:2px solid var(--accent)">
    <td style="position:sticky;left:0;z-index:1;background:var(--panel)">Total</td>
    ${colTotals.map(v => `<td style="text-align:right;font-variant-numeric:tabular-nums">${fmtVal(v)}</td>`).join('')}
    <td style="text-align:right;font-variant-numeric:tabular-nums">${fmtVal(grandTotal)}</td>
  </tr>`;
}

// ── Main render ──
function renderPivot() {
  const data = buildPivotData();
  renderPivotChart(data);
  renderPivotTable(data);
}

// ── Init ──
function initPivot() {
  const srcEl = document.getElementById('pivotSource');
  if (!srcEl) return;

  populateDims();
  srcEl.addEventListener('change', () => { populateDims(); renderPivot(); });
  document.getElementById('pivotRowDim').addEventListener('change', renderPivot);
  document.getElementById('pivotColDim').addEventListener('change', renderPivot);
  document.getElementById('pivotMetric').addEventListener('change', renderPivot);
  document.getElementById('pivotRefresh').addEventListener('click', renderPivot);

  // Band buttons
  document.querySelectorAll('#pivotBandBtns .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pivotBandBtns .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPivot();
    });
  });
}

window.initPivot = initPivot;
window.renderPivot = renderPivot;

// Auto-init when module loads
initPivot();
