// ── Unified P&L Pivot Analysis ──
// Full P&L accounts: EBITDA, OpEx, Total Investment, CapEx, D&A
// Combines: C&B (employees), OAO (vendor spend), D&A (depreciation)

import { state } from '../lib/state.js';
import { fmt, CURRENT_YEAR } from '../lib/constants.js';
import { getMonthlyComp, getMonthlyCapEx } from '../lib/proration.js';

const getChartColors = () => window.getChartColors();
const hexToRgba = (...a) => window.hexToRgba(...a);
const getEmpProject = (...a) => window.getEmpProject ? window.getEmpProject(...a) : null;

let pivotChart = null;
let currentAccount = 'ebitda';

// ── P&L Row dimensions (unified across all sources) ──
const PNL_DIMS = {
  'account':    { label: 'Account (C&B / OAO / D&A)', get: (type) => type },
  'function':   { label: 'Function' },
  'seniority':  { label: 'Seniority' },
  'country':    { label: 'Country' },
  'category':   { label: 'Product Category' },
  'product':    { label: 'Product' },
  'vendorType': { label: 'Vendor Type' },
  'parentCo':   { label: 'Parent Company' },
  'businessUnit':{ label: 'Business Unit' },
};

// ── Populate dimension dropdowns ──
function populateDims() {
  const rowSel = document.getElementById('pivotRowDim');
  const colSel = document.getElementById('pivotColDim');
  rowSel.innerHTML = Object.entries(PNL_DIMS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');
  colSel.innerHTML = Object.entries(PNL_DIMS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('');
  rowSel.value = 'account';
  colSel.value = 'function';
}

// ── Get employee dimension value ──
function getEmpDim(e, dim) {
  if (dim === 'function') return e.function || 'Unknown';
  if (dim === 'seniority') return e.seniority || 'Unknown';
  if (dim === 'country') return e.country || 'Unknown';
  if (dim === 'category') { const p = getEmpProject(e); return p ? p.category || 'Unassigned' : 'Unassigned'; }
  if (dim === 'product') { const p = getEmpProject(e); return p ? p.product || 'Unassigned' : 'Unassigned'; }
  if (dim === 'businessUnit') return e.businessUnit || 'Unknown';
  return 'Unknown';
}

// ── Get vendor dimension value ──
function getVendorDim(r, dim) {
  if (dim === 'vendorType') return r.vendorType || 'Unknown';
  if (dim === 'parentCo') return r.parentCo || 'Unknown';
  if (dim === 'businessUnit') return r.businessUnit || 'Unknown';
  if (dim === 'country') return r.market || 'Unknown';
  if (dim === 'category') return r.acctDesc || 'Unknown';
  if (dim === 'product') return r.vendorName || 'Unknown';
  if (dim === 'function') return r.vendorType || 'Unknown';
  if (dim === 'seniority') return r.acctDesc || 'Unknown';
  return 'Unknown';
}

// ── Build P&L pivot data ──
function buildPivotData() {
  const rowDim = document.getElementById('pivotRowDim').value;
  const colDim = document.getElementById('pivotColDim').value;
  const acct = currentAccount;
  const pivot = {};
  const rowTotals = {};
  const colSet = new Set();

  function addVal(rk, ck, val) {
    colSet.add(ck);
    if (!pivot[rk]) pivot[rk] = {};
    pivot[rk][ck] = (pivot[rk][ck] || 0) + val;
    rowTotals[rk] = (rowTotals[rk] || 0) + val;
  }

  function getDimVal(type, item, dim) {
    if (dim === 'account') return type;
    return type === 'C&B' ? getEmpDim(item, dim) : getVendorDim(item, dim);
  }

  // ── C&B from employees ──
  const includesCB = ['ebitda', 'opex', 'totinv'].includes(acct);
  const includesCapEx = ['capex', 'totinv'].includes(acct);
  if (includesCB || includesCapEx) {
    (state.employees || []).forEach(e => {
      if (e.termDate) {
        const td = new Date(e.termDate);
        if (td.getFullYear() <= CURRENT_YEAR && td.getMonth() < 11) return;
      }
      let val = 0;
      for (let m = 0; m < 12; m++) {
        const comp = getMonthlyComp(e, m);
        const capex = getMonthlyCapEx(e, m);
        if (acct === 'ebitda') val += comp; // EBITDA = total comp (before capex split)
        else if (acct === 'opex') val += comp - capex;
        else if (acct === 'totinv') val += comp;
        else if (acct === 'capex') val += capex;
      }
      if (val === 0) return;
      const rk = getDimVal('C&B', e, rowDim);
      const ck = getDimVal('C&B', e, colDim);
      addVal(rk, ck, val);
    });
  }

  // ── OAO from vendor rows ──
  const includesOAO = ['ebitda', 'opex', 'totinv'].includes(acct);
  if (includesOAO) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    (state.vendorRows || []).forEach(r => {
      let fy = 0;
      for (let m = 0; m < 12; m++) fy += (r[months[m]] || 0);
      if (fy === 0) return;
      const rk = getDimVal('OAO', r, rowDim);
      const ck = getDimVal('OAO', r, colDim);
      addVal(rk, ck, fy);
    });
  }

  // ── D&A (depreciation) ──
  if (acct === 'da' || acct === 'ebitda') {
    const daTotal = window.getDepreciationTotal ? window.getDepreciationTotal() : 0;
    if (daTotal > 0) {
      const rk = rowDim === 'account' ? 'D&A' : 'Depreciation';
      const ck = colDim === 'account' ? 'D&A' : 'Depreciation';
      addVal(rk, ck, acct === 'ebitda' ? -daTotal : daTotal); // D&A is subtracted in EBITDA
    }
  }

  return { pivot, rowTotals, cols: [...colSet].sort(), isCurrency: true };
}

// ── Render chart ──
function renderPivotChart(data) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('pivotChart');
  if (!canvas) return;
  if (pivotChart) pivotChart.destroy();

  const { pivot, rowTotals, cols, isCurrency } = data;
  const rows = Object.keys(rowTotals).sort((a, b) => Math.abs(rowTotals[b]) - Math.abs(rowTotals[a]));
  const colors = getChartColors();

  const datasets = rows.map((rk, i) => ({
    label: rk.length > 25 ? rk.slice(0, 23) + '…' : rk,
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
            callback: v => '$' + (Math.abs(v) / 1e6).toFixed(1) + 'M'
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

  const { pivot, rowTotals, cols } = data;
  const rows = Object.keys(rowTotals).sort((a, b) => Math.abs(rowTotals[b]) - Math.abs(rowTotals[a]));
  const colors = getChartColors();
  const fmtVal = v => {
    if (!v) return '—';
    return fmt(v);
  };

  thead.innerHTML = `<tr>
    <th style="position:sticky;left:0;z-index:3;background:var(--bg-elevated);min-width:160px"></th>
    ${cols.map(c => `<th style="text-align:right;min-width:80px">${c}</th>`).join('')}
    <th style="text-align:right;font-weight:700;min-width:80px">Total</th>
  </tr>`;

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
  const rowSel = document.getElementById('pivotRowDim');
  if (!rowSel) return;

  populateDims();

  // Account toggle
  document.querySelectorAll('#pivotAccountToggle .btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#pivotAccountToggle .btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAccount = btn.dataset.pacct;
      renderPivot();
    });
  });

  rowSel.addEventListener('change', renderPivot);
  document.getElementById('pivotColDim').addEventListener('change', renderPivot);
  document.getElementById('pivotRefresh').addEventListener('click', renderPivot);
}

window.initPivot = initPivot;
window.renderPivot = renderPivot;
initPivot();
