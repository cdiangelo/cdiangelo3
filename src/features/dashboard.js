// ── DASHBOARD ──
// Extracted from index.html lines 4693–5325

let dashChart = null;
let fteChart = null;
let groupBy = 'month', stackBy = 'category', compView = 'total';
function getFilteredEmployees() {
  let emps = window.state.employees;
  const c = document.getElementById('dashCountry').value;
  const s = document.getElementById('dashSeniority').value;
  const f = document.getElementById('dashFunction').value;
  const pc = document.getElementById('dashProdCat').value;
  const pr = document.getElementById('dashProduct').value;
  const pj = document.getElementById('dashProject').value;
  if (c) emps = emps.filter(e => e.country === c);
  if (s) emps = emps.filter(e => e.seniority === s);
  if (f) emps = emps.filter(e => e.function === f);
  if (pc || pr || pj) {
    const matchProjIds = new Set(window.state.projects.filter(p => {
      if (pc && p.category !== pc) return false;
      if (pr && p.product !== pr) return false;
      if (pj && p.code !== pj) return false;
      return true;
    }).map(p => p.id));
    emps = emps.filter(e => e.allocations && e.allocations.some(a => matchProjIds.has(a.projId)));
  }
  return emps;
}
function renderStats(emps) {
  const totalHC = emps.length;
  const totalBase = emps.reduce((a, e) => a + window.getProratedBase(e), 0);
  const avgBase = totalHC ? Math.round(emps.reduce((a, e) => a + e.salary, 0) / totalHC) : 0;
  const totalBonus = emps.reduce((a, e) => a + window.getProratedBonus(e), 0);
  const totalBenefits = emps.reduce((a, e) => a + window.getProratedBenefits(e), 0);
  const totalComp = emps.reduce((a, e) => a + window.getProratedComp(e), 0);
  const totalCapEx = emps.reduce((a, e) => a + window.getProratedCapEx(e), 0);
  const totalOpEx = totalComp - totalCapEx;
  const svc = getStatValueColor();
  document.getElementById('dashStatCards').innerHTML = `
    <div class="stat-card"><div class="label">Headcount</div><div class="value" style="color:${svc}">${totalHC}</div></div>
    <div class="stat-card"><div class="label">Base Cost</div><div class="value" style="color:${svc}">${window.fmt(totalBase)}</div></div>
    <div class="stat-card"><div class="label">Avg Base</div><div class="value" style="color:${svc}">${window.fmt(avgBase)}</div></div>
    <div class="stat-card"><div class="label">Bonus</div><div class="value" style="color:${svc}">${window.fmt(totalBonus)}</div></div>
    <div class="stat-card"><div class="label">Benefits</div><div class="value" style="color:${svc}">${window.fmt(totalBenefits)}</div></div>
    <div class="stat-card"><div class="label">Total Comp</div><div class="value" style="color:${svc}">${window.fmt(totalComp)}</div></div>
    <div class="stat-card"><div class="label">CapEx Offset</div><div class="value" style="color:${svc}">${window.fmt(totalCapEx)}</div></div>
    <div class="stat-card"><div class="label">C&B OpEx</div><div class="value" style="color:${svc};font-weight:800">${window.fmt(totalOpEx)}</div></div>`;
}
const CHART_COLORS = ['#8b5e5e', '#6b8da3', '#a38b5e', '#7a6b8d', '#5e8b6b', '#8d6b7a', '#5e7a8b', '#8b7a5e', '#6b8b7a', '#7a8b5e'];
const CHART_COLORS_MUTED_DARK = ['#c4a0a0', '#a0b8c8', '#c8b8a0', '#b0a0c0', '#a0c0a0', '#c0a0b0', '#a0b0c0', '#c0b0a0', '#a0c0b0', '#b0c0a0'];
const CHART_COLORS_NEON = ['#ff2a6d', '#00fff0', '#ffe600', '#00b4ff', '#39ff14', '#ff6b00', '#e040fb', '#00ddff', '#ff4444', '#c8ff00'];
const CHART_COLORS_CRISP = ['#222222', '#888888', '#bbbbbb', '#555555', '#999999', '#333333', '#aaaaaa', '#666666', '#cccccc', '#444444'];
const CHART_COLORS_CRISP_DARK = ['#8a8a8a', '#6a6a6a', '#555555', '#7a7a7a', '#606060', '#909090', '#505050', '#6e6e6e', '#484848', '#858585'];
// Unified tag/label color palette — draws from all schemes for consistency regardless of active color scheme
const TAG_COLORS_LIGHT = ['#1a1a1a', '#8b5e5e', '#6b8da3', '#3a7d44', '#7a6b8d', '#a38b5e', '#2a3a6a', '#b83030', '#5e8b6b', '#8d6b7a', '#555555', '#0088aa'];
const TAG_COLORS_DARK = ['#ffffff', '#c4a0a0', '#a0b8c8', '#5ab866', '#b0a0c0', '#c8b8a0', '#7a8aff', '#e06060', '#a0c0a0', '#c0a0b0', '#999999', '#00b4cc'];
let chartColorScheme = 'crisp';
// Crisp pattern helpers — clean digital lines and simple dots
function drawCrispPattern(ctx, px, py, pw, ph, patIdx, fg) {
  ctx.save(); ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
  ctx.strokeStyle = fg; ctx.fillStyle = fg; ctx.lineWidth = 0.8;
  const pt = patIdx % 6;
  if (pt === 0) {/* thin horizontal lines */for (let y2 = py + 4; y2 < py + ph; y2 += 8) { ctx.beginPath(); ctx.moveTo(px, y2); ctx.lineTo(px + pw, y2); ctx.stroke() } }
  else if (pt === 1) {/* small dots grid */for (let y2 = py + 5; y2 < py + ph; y2 += 8) for (let x2 = px + 5; x2 < px + pw; x2 += 8) { ctx.beginPath(); ctx.arc(x2, y2, 0.9, 0, Math.PI * 2); ctx.fill() } }
  else if (pt === 2) {/* thin vertical lines */for (let x2 = px + 4; x2 < px + pw; x2 += 8) { ctx.beginPath(); ctx.moveTo(x2, py); ctx.lineTo(x2, py + ph); ctx.stroke() } }
  else if (pt === 3) {/* diagonal lines — single direction, widely spaced */for (let i = -ph; i < pw + ph; i += 10) { ctx.beginPath(); ctx.moveTo(px + i, py + ph); ctx.lineTo(px + i + ph, py); ctx.stroke() } }
  else if (pt === 4) {/* sparse dots */for (let y2 = py + 6; y2 < py + ph; y2 += 10) for (let x2 = px + 6; x2 < px + pw; x2 += 10) { ctx.beginPath(); ctx.arc(x2, y2, 0.7, 0, Math.PI * 2); ctx.fill() } }
  else {/* dashed horizontal */ctx.setLineDash([3, 4]); for (let y2 = py + 4; y2 < py + ph; y2 += 8) { ctx.beginPath(); ctx.moveTo(px, y2); ctx.lineTo(px + pw, y2); ctx.stroke() } ctx.setLineDash([]) }
  ctx.restore();
}
const crispPatternPlugin = {
  id: 'crispPatterns',
  _patternMode(chart) {
    if (chartColorScheme !== 'crisp') return null;
    let barCount = 0, filledLineCount = 0;
    chart.data.datasets.forEach((ds, i) => { const m = chart.getDatasetMeta(i); if (m.hidden) return; if (m.type !== 'line') barCount++; else if (ds.fill != null && ds.fill !== false) filledLineCount++ });
    if (barCount > 3) return 'bar';
    if (filledLineCount > 1) return 'area';
    return null;
  },
  afterDatasetsDraw(chart) {
    const mode = this._patternMode(chart);
    if (!mode) return;
    const isDark = document.documentElement.classList.contains('dark');
    const ctx = chart.ctx;
    if (mode === 'bar') {
      const fg = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)';
      chart.data.datasets.forEach((ds, dsi) => {
        const meta = chart.getDatasetMeta(dsi);
        if (meta.hidden || meta.type === 'line') return;
        meta.data.forEach(el => {
          const { x, y, width, height, base } = el.getProps(['x', 'y', 'width', 'height', 'base']);
          if (width === undefined || base === undefined) return;
          const bY = Math.min(y, base), bH = Math.abs(base - y), bW = width;
          if (bH < 2 || bW < 2) return;
          drawCrispPattern(ctx, x - bW / 2, bY, bW, bH, dsi, fg);
        });
      });
    } else if (mode === 'area') {
      const fg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';
      const yScale = chart.scales.y;
      const baseline = yScale ? yScale.getPixelForValue(0) : chart.chartArea.bottom;
      let prevPoints = null;
      chart.data.datasets.forEach((ds, dsi) => {
        const meta = chart.getDatasetMeta(dsi);
        if (meta.hidden || meta.type !== 'line' || ds.fill == null || ds.fill === false) { return }
        const points = meta.data.map(pt => ({ x: pt.x, y: pt.y }));
        if (!points.length) { prevPoints = points; return }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let j = 1; j < points.length; j++) ctx.lineTo(points[j].x, points[j].y);
        if (prevPoints && prevPoints.length === points.length) {
          for (let j = points.length - 1; j >= 0; j--) ctx.lineTo(prevPoints[j].x, prevPoints[j].y);
        } else {
          ctx.lineTo(points[points.length - 1].x, baseline);
          ctx.lineTo(points[0].x, baseline);
        }
        ctx.closePath();
        ctx.clip();
        const xs = points.map(p => p.x);
        const allY = points.map(p => p.y).concat(prevPoints ? prevPoints.map(p => p.y) : [baseline]);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...allY), maxY = Math.max(...allY);
        if (maxX - minX > 2 && maxY - minY > 2) drawCrispPattern(ctx, minX, minY, maxX - minX, maxY - minY, dsi, fg);
        ctx.restore();
        prevPoints = points;
      });
    }
  },
  afterDraw(chart) {
    const mode = this._patternMode(chart);
    if (!mode) return;
    const isDark = document.documentElement.classList.contains('dark');
    const fg = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)';
    const legend = chart.legend;
    if (!legend || !legend.legendItems) return;
    const ctx = chart.ctx;
    const chartArea = chart.chartArea;
    legend.legendItems.forEach((item, i) => {
      if (item.hidden) return;
      const dsi = item.datasetIndex != null ? item.datasetIndex : i;
      const meta = chart.getDatasetMeta(dsi);
      if (mode === 'bar' && meta.type === 'line') return;
      if (mode === 'area' && meta.type !== 'line') return;
      const bw = legend.options.labels.boxWidth || 40;
      const bh = legend.options.labels.boxHeight || Math.min((item.height || 12), 12);
      const bx = item.left;
      const by = item.top;
      if (bx == null || by == null) return;
      if (bx < 0 || by < 0 || bx > chart.width || by > chart.height) return;
      if (bw > 0 && bh > 0) drawCrispPattern(ctx, bx, by, bw, bh, dsi, fg);
    });
  }
};
if (typeof Chart !== 'undefined') Chart.register(crispPatternPlugin);
// Soft-bar plugin: apply gentle opacity to all bar dataset backgrounds
const softBarPlugin = { id: 'softBar', beforeUpdate(chart) {
  if (chart.config.type !== 'bar') return;
  const isNeon = (typeof chartColorScheme !== 'undefined' && chartColorScheme === 'neon');
  const isCrisp = (typeof chartColorScheme !== 'undefined' && chartColorScheme === 'crisp');
  const alpha = isCrisp ? 0.82 : isNeon ? 0.55 : 0.72;
  chart.data.datasets.forEach(ds => {
    if (ds._softBarApplied) return;
    const bg = ds.backgroundColor;
    if (typeof bg === 'string' && bg.charAt(0) === '#') {
      ds.backgroundColor = hexToRgba(bg, alpha);
      ds.borderColor = isCrisp ? (document.documentElement.classList.contains('dark') ? '#555' : '#ccc') : bg;
      ds.borderWidth = isCrisp ? 1 : (ds.borderWidth || 1);
    } else if (typeof bg === 'string' && bg.startsWith('rgba')) {
      // Already rgba — reduce further if needed
      const m = bg.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
      if (m) { const curA = parseFloat(m[4]); if (curA > alpha) ds.backgroundColor = `rgba(${m[1]},${m[2]},${m[3]},${Math.round(curA * alpha * 100) / 100})` }
    }
    ds._softBarApplied = true;
  });
} };
if (typeof Chart !== 'undefined') Chart.register(softBarPlugin);
function getChartColors() {
  const isDark = document.documentElement.classList.contains('dark');
  if (chartColorScheme === 'neon') return CHART_COLORS_NEON;
  if (chartColorScheme === 'crisp') return isDark ? CHART_COLORS_CRISP_DARK : CHART_COLORS_CRISP;
  return isDark ? CHART_COLORS_MUTED_DARK : CHART_COLORS;
}
function getCrispDatalabelColor(section) {
  if (chartColorScheme !== 'crisp') return null;
  const dk = document.documentElement.classList.contains('dark');
  return dk ? '#ffffff' : '#111111';
}
function getSparkColor(type) {
  // type: 'primary' (HC, Comp, OpEx), 'danger' (CapEx)
  const isDark = document.documentElement.classList.contains('dark');
  if (chartColorScheme === 'neon') return type === 'danger' ? '#ff2a6d' : '#00fff0';
  if (chartColorScheme === 'crisp') return isDark ? '#a0a0a0' : '#222222';
  // muted
  if (isDark) return type === 'danger' ? '#e0a8a8' : '#a0c8b0';
  return type === 'danger' ? '#8b2020' : '#3a7d44';
}
function getStatValueColor() {
  const isDark = document.documentElement.classList.contains('dark');
  if (chartColorScheme === 'neon') return isDark ? '#00fff0' : '#0088aa';
  if (chartColorScheme === 'crisp') return isDark ? '#c0c0c0' : '#111111';
  return isDark ? '#c8b0b0' : 'var(--accent)';
}
function hexToRgba(hex, alpha) {
  if (hex.startsWith('rgba')) return hex.replace(/,[\d.]+\)$/, ',' + alpha + ')');
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16); return `rgba(${r},${g},${b},${alpha})`
}
const FTE_TOOLTIP = {
  mode: 'index', intersect: false,
  callbacks: {
    label(ctx) { return `${ctx.dataset.label}: ${ctx.parsed.y} FTEs` },
    afterBody(items) {
      if (!items.length) return '';
      const chart = items[0].chart;
      const idx = items[0].dataIndex;
      let total = 0;
      chart.data.datasets.forEach(ds => { const v = ds.data[idx]; if (typeof v === 'number') total += v });
      return `\nTotal: ${Math.round(total * 10) / 10} FTEs`;
    }
  }
};
function fmtShort(n) { const abs = Math.abs(n); if (abs >= 1e6) return (n < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(1) + 'M'; if (abs >= 1e3) return (n < 0 ? '-' : '') + '$' + (abs / 1e3).toFixed(0) + 'K'; return window.fmt(n) }
function stackedBarDatalabels(datasets, tickColor, fontSize, crispSection) {
  const isCrispDl = chartColorScheme === 'crisp';
  const fs = fontSize || (isCrispDl ? 13 : 11);
  const dlColor = getCrispDatalabelColor(crispSection) || tickColor;
  // Show total label on topmost positive bar and bottommost negative bar per x-index
  const posStacks = datasets.filter(d => !d.stack || d.stack === 'pos');
  const negStacks = datasets.filter(d => d.stack === 'neg');
  const topPosIdx = posStacks.length ? datasets.indexOf(posStacks[posStacks.length - 1]) : -1;
  const bottomNegIdx = negStacks.length ? datasets.indexOf(negStacks[negStacks.length - 1]) : -1;
  datasets.forEach((ds, i) => {
    if (i === topPosIdx) {
      ds.datalabels = { display: true, anchor: 'end', align: 'end', color: dlColor, font: { size: fs, weight: 'bold' },
        formatter: (_, ctx) => {
          let sum = 0; posStacks.forEach(d => { const val = d.data[ctx.dataIndex]; if (val > 0) sum += val });
          return sum ? fmtShort(sum) : '';
        } };
    } else if (i === bottomNegIdx) {
      ds.datalabels = { display: true, anchor: 'start', align: 'start', color: dlColor, font: { size: fs, weight: 'bold' },
        formatter: (_, ctx) => {
          let sum = 0; negStacks.forEach(d => { sum += d.data[ctx.dataIndex] });
          return sum < 0 ? fmtShort(sum) : '';
        } };
    } else {
      ds.datalabels = { display: false };
    }
  });
}
// Y/Y % change arrows plugin for forecast bar charts
const yoyArrowsPlugin = {
  id: 'yoyArrows',
  afterDraw(chart) {
    if (!chart.options.plugins.yoyArrows) return;
    const opts = chart.options.plugins.yoyArrows;
    const ctx = chart.ctx;
    const area = chart.chartArea;
    const datasets = chart.data.datasets;
    const nLabels = chart.data.labels.length;
    if (nLabels < 2) return;
    // Sum visible stacked values per x-index (respects legend toggle)
    const totals = [];
    const yPositions = []; // actual values for y-positioning (may be negative)
    for (let i = 0; i < nLabels; i++) {
      let sumPos = 0, sumNeg = 0;
      datasets.forEach((ds, di) => {
        const meta = chart.getDatasetMeta(di);
        if (meta.hidden) return;
        const v = ds.data[i]; if (typeof v !== 'number') return;
        if (ds.stack === 'neg') { sumNeg += v }
        else if (v > 0) sumPos += v;
      });
      if (sumPos > 0) {
        totals.push(sumPos);
        yPositions.push(sumPos);
      } else {
        totals.push(Math.abs(sumNeg));
        yPositions.push(sumNeg); // keep negative for correct y-positioning
      }
    }
    // Find first visible dataset for bar positions
    let visMetaIdx = 0;
    for (let di = 0; di < datasets.length; di++) { if (!chart.getDatasetMeta(di).hidden) { visMetaIdx = di; break } }
    // Responsive font: scale with chart width
    const chartW = area.right - area.left;
    const baseFontSize = Math.max(9, Math.min(13, chartW / (nLabels * 6)));
    const fontSize = opts.fontSize || baseFontSize;
    const arrowColor = opts.color || (document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.35)');
    const textColor = opts.textColor || (document.documentElement.classList.contains('dark') ? 'rgba(255,255,255,.7)' : 'rgba(0,0,0,.6)');
    ctx.save();
    for (let i = 0; i < nLabels - 1; i++) {
      const prev = totals[i], cur = totals[i + 1];
      if (!prev) continue;
      const pct = ((cur - prev) / Math.abs(prev)) * 100;
      const pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
      // Get bar positions from first visible dataset meta
      const meta0 = chart.getDatasetMeta(visMetaIdx);
      if (!meta0 || !meta0.data[i] || !meta0.data[i + 1]) continue;
      const barL = meta0.data[i];
      const barR = meta0.data[i + 1];
      // Y position: map value to pixel using y scale
      const yScale = chart.scales.y;
      const y1 = yScale.getPixelForValue(yPositions[i]);
      const y2 = yScale.getPixelForValue(yPositions[i + 1]);
      const halfW = barL.width ? barL.width / 2 : 12;
      const x1 = barL.x + halfW + 2;
      const x2 = barR.x - halfW - 2;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      // Draw arrow line
      ctx.beginPath();
      ctx.strokeStyle = arrowColor;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 2]);
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLen = 6;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
      ctx.strokeStyle = arrowColor; ctx.lineWidth = 1.5; ctx.stroke();
      // Label background + text
      ctx.font = `600 ${fontSize}px -apple-system,BlinkMacSystemFont,sans-serif`;
      const tw = ctx.measureText(pctStr).width;
      const pad = 3;
      const bgColor = pct >= 0 ? (document.documentElement.classList.contains('dark') ? 'rgba(60,120,60,.6)' : 'rgba(58,125,68,.12)') : (document.documentElement.classList.contains('dark') ? 'rgba(140,50,50,.6)' : 'rgba(184,48,48,.12)');
      const labelColor = pct >= 0 ? (document.documentElement.classList.contains('dark') ? '#7adf7a' : '#2a6a2a') : (document.documentElement.classList.contains('dark') ? '#ff8a8a' : '#a03030');
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      const rx = midX - tw / 2 - pad, ry = midY - fontSize / 2 - pad - 2, rw = tw + pad * 2, rh = fontSize + pad * 2;
      ctx.roundRect ? ctx.roundRect(rx, ry, rw, rh, 3) : ctx.rect(rx, ry, rw, rh);
      ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(pctStr, midX, midY - 1);
    }
    ctx.restore();
  }
};
function renderDashboard() {
  const emps = getFilteredEmployees();
  const avgBase = emps.length ? Math.round(emps.reduce((a, e) => a + e.salary, 0) / emps.length) : 0;
  const avgCapPct = emps.length ? Math.round(emps.reduce((a, e) => a + window.getCapPct(e), 0) / emps.length) : 0;
  const totalComp = emps.reduce((a, e) => a + window.getProratedComp(e), 0);
  const totalCapEx = emps.reduce((a, e) => a + window.getProratedCapEx(e), 0);
  const svc = getStatValueColor();
  const cbOpEx = totalComp - totalCapEx;
  document.getElementById('dashStatCards').innerHTML =
    `<div class="stat-card"><div class="label">Headcount</div><div class="value" style="color:${svc}">${emps.length}</div></div>` +
    `<div class="stat-card"><div class="label">Avg Base</div><div class="value" style="color:${svc}">${window.fmt(avgBase)}</div></div>` +
    `<div class="stat-card"><div class="label">Total Comp</div><div class="value" style="color:${svc}">${window.fmt(totalComp)}</div></div>` +
    `<div class="stat-card"><div class="label">CapEx Offset</div><div class="value" style="color:${svc}">${window.fmt(totalCapEx)}</div></div>` +
    `<div class="stat-card"><div class="label">Avg Cap %</div><div class="value" style="color:${svc}">${avgCapPct}%</div></div>` +
    `<div class="stat-card"><div class="label">C&B OpEx</div><div class="value" style="color:${svc};font-weight:800">${window.fmt(cbOpEx)}</div></div>`;
  const showPeriod = (groupBy === 'month' || groupBy === 'quarter');
  document.getElementById('periodToggleWrap').style.display = showPeriod ? '' : 'none';
  document.getElementById('curMonthWrapDash').style.display = showPeriod ? '' : 'none';
  const isDark = document.documentElement.classList.contains('dark');
  const tickColor = isDark ? (chartColorScheme === 'crisp' ? '#c0c0c0' : chartColorScheme === 'neon' ? '#88ccdd' : '#ffffff') : (chartColorScheme === 'crisp' ? '#333333' : chartColorScheme === 'neon' ? '#006680' : '#5a5a5a');
  const gridColor = isDark ? 'rgba(255,255,255,.08)' : '#ddd';
  let labels, groups;
  if (groupBy === 'month') {
    const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    labels = MONTH_SHORT;
    groups = {};
    MONTH_SHORT.forEach(m => groups[m] = []);
    // For month grouping, each "group" holds {emp, monthIdx} pairs
    emps.forEach(e => MONTH_SHORT.forEach((m, mi) => { groups[m].push({ emp: e, mi }) }));
  } else if (groupBy === 'quarter') {
    const Q_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];
    labels = Q_LABELS;
    groups = {};
    Q_LABELS.forEach(q => groups[q] = []);
    // Each quarter holds {emp, mi} pairs for its 3 months
    emps.forEach(e => {
      Q_LABELS.forEach((q, qi) => {
        for (let m = qi * 3; m < qi * 3 + 3; m++) { groups[q].push({ emp: e, mi: m }) }
      });
    });
  } else {
    const groupKey = groupBy === 'function' ? 'function' : groupBy === 'seniority' ? 'seniority' : 'country';
    const groupLabels = groupBy === 'function' ? window.FUNCTIONS : groupBy === 'seniority' ? window.SENIORITY : window.COUNTRIES;
    groups = {};
    groupLabels.forEach(l => groups[l] = []);
    emps.forEach(e => { if (groups[e[groupKey]]) groups[e[groupKey]].push(e) });
    labels = groupLabels.filter(l => groups[l].length > 0 || emps.length === 0);
  }
  let datasets = [];
  const isMonth = groupBy === 'month' || groupBy === 'quarter';
  // Helper: get comp for a group entry depending on mode
  const compVal = (entry) => isMonth ? window.getMonthlyComp(entry.emp, entry.mi) : window.getProratedComp(entry);
  const baseVal = (entry) => isMonth ? window.getMonthlyBase(entry.emp, entry.mi) : window.getProratedBase(entry);
  const bonusVal = (entry) => isMonth ? window.getMonthlyBonus(entry.emp, entry.mi) : window.getProratedBonus(entry);
  const benVal = (entry) => isMonth ? window.getMonthlyBenefits(entry.emp, entry.mi) : window.getProratedBenefits(entry);
  const empOf = (entry) => isMonth ? entry.emp : entry;

  const capExVal = (entry) => isMonth ? window.getMonthlyCapEx(empOf(entry), entry.mi) : window.getProratedCapEx(entry);

  if (stackBy === 'country') {
    const opexAdjComp = (x) => compView === 'opex' ? compVal(x) - capExVal(x) : compVal(x);
    window.COUNTRIES.forEach((c, i) => {
      const data = labels.map(l => groups[l].filter(x => empOf(x).country === c).reduce((a, x) => a + opexAdjComp(x), 0));
      if (data.some(v => v > 0)) datasets.push({ label: c, data, backgroundColor: getChartColors()[i % getChartColors().length], stack: 'pos' });
    });
    if (compView === 'opex') {
      window.COUNTRIES.forEach((c, i) => {
        const data = labels.map(l => -groups[l].filter(x => empOf(x).country === c).reduce((a, x) => a + capExVal(x), 0));
        if (data.some(v => v < 0)) datasets.push({ label: c + ' (CapEx)', data, backgroundColor: hexToRgba(getChartColors()[i % getChartColors().length], 0.35), stack: 'neg' });
      });
    }
  } else if (stackBy === 'category') {
    function getEffectiveAllocs(e) {
      if (e.allocations && e.allocations.length) return e.allocations;
      return [];
    }
    const opexAdjComp2 = (x) => compView === 'opex' ? compVal(x) - capExVal(x) : compVal(x);
    const cats = [...new Set(window.state.projects.map(p => p.category).filter(Boolean))];
    cats.forEach((cat, i) => {
      const catProjIds = new Set(window.state.projects.filter(p => p.category === cat).map(p => p.id));
      const data = labels.map(l => groups[l].reduce((a, x) => {
        const allocs = getEffectiveAllocs(empOf(x));
        if (!allocs.length) return a;
        const allocPct = allocs.filter(al => catProjIds.has(al.projId)).reduce((s, al) => s + al.pct, 0) / 100;
        return a + Math.round(opexAdjComp2(x) * allocPct);
      }, 0));
      if (data.some(v => v > 0)) datasets.push({ label: cat, data, backgroundColor: getChartColors()[i % getChartColors().length], stack: 'pos' });
    });
    const unData = labels.map(l => groups[l].reduce((a, x) => {
      const allocs = getEffectiveAllocs(empOf(x));
      if (!allocs.length) return a + opexAdjComp2(x);
      const allocPct = allocs.reduce((s, al) => s + al.pct, 0) / 100;
      if (allocPct >= 1) return a;
      return a + Math.round(opexAdjComp2(x) * (1 - allocPct));
    }, 0));
    if (unData.some(v => v > 0)) datasets.push({ label: 'Unallocated', data: unData, backgroundColor: getChartColors()[cats.length % getChartColors().length], stack: 'pos' });
    if (compView === 'opex') {
      cats.forEach((cat, i) => {
        const catProjIds2 = new Set(window.state.projects.filter(p => p.category === cat).map(p => p.id));
        const data = labels.map(l => -groups[l].reduce((a, x) => {
          const allocs = getEffectiveAllocs(empOf(x));
          if (!allocs.length) return a;
          const allocPct = allocs.filter(al => catProjIds2.has(al.projId)).reduce((s, al) => s + al.pct, 0) / 100;
          return a + Math.round(capExVal(x) * allocPct);
        }, 0));
        if (data.some(v => v < 0)) datasets.push({ label: cat + ' (CapEx)', data, backgroundColor: hexToRgba(getChartColors()[i % getChartColors().length], 0.35), stack: 'neg' });
      });
    }
  } else {
    const opexAdjComp3 = (x) => compView === 'opex' ? compVal(x) - capExVal(x) : compVal(x);
    window.SENIORITY.forEach((s, i) => {
      const data = labels.map(l => groups[l].filter(x => empOf(x).seniority === s).reduce((a, x) => a + opexAdjComp3(x), 0));
      if (data.some(v => v > 0)) datasets.push({ label: s, data, backgroundColor: getChartColors()[i % getChartColors().length], stack: 'pos' });
    });
    if (compView === 'opex') {
      window.SENIORITY.forEach((s, i) => {
        const data = labels.map(l => -groups[l].filter(x => empOf(x).seniority === s).reduce((a, x) => a + capExVal(x), 0));
        if (data.some(v => v < 0)) datasets.push({ label: s + ' (CapEx)', data, backgroundColor: hexToRgba(getChartColors()[i % getChartColors().length], 0.35), stack: 'neg' });
      });
    }
  }
  // Apply cumulative transform for QTD/YTD when grouped by month
  if (groupBy === 'month' && periodMode !== 'mtd') {
    datasets.forEach(ds => {
      const cumul = [];
      ds.data.forEach((v, i) => {
        if (periodMode === 'ytd') {
          cumul.push((cumul[i - 1] || 0) + v);
        } else {
          // QTD: reset at quarter boundaries (0,3,6,9)
          const qi = i % 3;
          cumul.push(qi === 0 ? v : (cumul[i - 1] || 0) + v);
        }
      });
      ds.data = cumul;
    });
  }
  // Apply YTD cumulative for quarter grouping
  if (groupBy === 'quarter' && periodMode === 'ytd') {
    datasets.forEach(ds => {
      const cumul = [];
      ds.data.forEach((v, i) => { cumul.push((cumul[i - 1] || 0) + v) });
      ds.data = cumul;
    });
  }
  if (typeof Chart !== 'undefined') {
    if (dashChart) dashChart.destroy();
    stackedBarDatalabels(datasets, tickColor, null, 'budget');
    dashChart = new Chart(document.getElementById('dashChart'), {
      type: 'bar',
      data: { labels: labels.map(l => l.length > 18 ? l.slice(0, 16) + '…' : l), datasets },
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 18 } }, plugins: { legend: { labels: { color: tickColor } }, datalabels: {} }, scales: {
        x: { stacked: true, ticks: { color: tickColor }, grid: { color: gridColor } },
        y: { stacked: true, ticks: { color: tickColor, callback: v => '$' + v.toLocaleString() }, grid: { color: gridColor } }
      } }
    });
    // ── FTE sparkline chart ──
    if (fteChart) fteChart.destroy();
    const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    // Build stacked area datasets grouped by stackBy dimension
    function empFte(e, mi) {
      const mf = window.getMonthFactor(e, mi); if (mf <= 0) return 0;
      const allocTotal = e.allocations && e.allocations.length ? e.allocations.reduce((s, a) => s + a.pct, 0) / 100 : 0;
      return mf * allocTotal;
    }
    let fteDatasets = [];
    if (stackBy === 'seniority') {
      window.SENIORITY.forEach((s, i) => {
        const segEmps = emps.filter(e => e.seniority === s);
        if (!segEmps.length) return;
        const data = MONTH_SHORT.map((_, mi) => Math.round(segEmps.reduce((a, e) => a + empFte(e, mi), 0) * 10) / 10);
        fteDatasets.push({ label: s, data, borderColor: getChartColors()[i % getChartColors().length], backgroundColor: hexToRgba(getChartColors()[i % getChartColors().length], 0.25), fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 });
      });
    } else if (stackBy === 'country') {
      window.COUNTRIES.forEach((c, i) => {
        const segEmps = emps.filter(e => e.country === c);
        if (!segEmps.length) return;
        const data = MONTH_SHORT.map((_, mi) => Math.round(segEmps.reduce((a, e) => a + empFte(e, mi), 0) * 10) / 10);
        fteDatasets.push({ label: c, data, borderColor: getChartColors()[i % getChartColors().length], backgroundColor: hexToRgba(getChartColors()[i % getChartColors().length], 0.25), fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 });
      });
    } else if (stackBy === 'category') {
      const cats = [...new Set(window.state.projects.map(p => p.category).filter(Boolean))];
      cats.forEach((cat, i) => {
        const catProjIds = new Set(window.state.projects.filter(p => p.category === cat).map(p => p.id));
        const data = MONTH_SHORT.map((_, mi) => {
          let fte = 0;
          emps.forEach(e => {
            const mf = window.getMonthFactor(e, mi); if (mf <= 0) return;
            if (!e.allocations) return;
            e.allocations.forEach(a => { if (catProjIds.has(a.projId)) fte += mf * a.pct / 100 });
          });
          return Math.round(fte * 10) / 10;
        });
        fteDatasets.push({ label: cat, data, borderColor: getChartColors()[i % getChartColors().length], backgroundColor: hexToRgba(getChartColors()[i % getChartColors().length], 0.25), fill: true, tension: 0.4, pointRadius: 0, borderWidth: 1.5 });
      });
    } else {
      // default: single area
      const data = MONTH_SHORT.map((_, mi) => Math.round(emps.reduce((a, e) => a + empFte(e, mi), 0) * 10) / 10);
      fteDatasets = [{ label: 'Allocated FTEs', data, borderColor: getChartColors()[0], backgroundColor: hexToRgba(getChartColors()[0], 0.15), fill: true, tension: 0.4, pointRadius: 2, borderWidth: 2 }];
    }
    // Add total data label on topmost FTE dataset
    fteDatasets.forEach((ds, i) => {
      if (i === fteDatasets.length - 1) {
        ds.datalabels = { display: true, anchor: 'end', align: 'end', color: getCrispDatalabelColor('fte') || tickColor, font: { size: chartColorScheme === 'crisp' ? 13 : 11, weight: 'bold' },
          formatter: (_, ctx) => {
            let sum = 0; fteDatasets.forEach(d => { const v = d.data[ctx.dataIndex]; if (typeof v === 'number') sum += v });
            return sum ? Math.round(sum * 10) / 10 : '';
          } };
      } else {
        ds.datalabels = { display: false };
      }
    });
    fteChart = new Chart(document.getElementById('fteChart'), {
      type: 'line',
      data: { labels: MONTH_SHORT, datasets: fteDatasets },
      options: { responsive: true, maintainAspectRatio: false, layout: { padding: { top: 18 } },
        plugins: { legend: { display: fteDatasets.length > 1, labels: { color: tickColor, boxWidth: 14, font: { size: 13 } } }, datalabels: {}, tooltip: FTE_TOOLTIP },
        scales: {
          x: { ticks: { color: tickColor, font: { size: 12 } }, grid: { display: false }, stacked: true },
          y: { beginAtZero: true, stacked: true, ticks: { color: tickColor, font: { size: 12 } }, grid: { color: gridColor }, title: { display: true, text: 'Allocated FTEs', color: tickColor, font: { size: 12 } } }
        }
      }
    });
    // ── Comp breakdown sub-charts (Base / Bonus / Benefits) ──
    if (document.getElementById('dashCompBreakdown').style.display !== 'none') {
      renderDashBreakdownCharts(labels, groups, isMonth, baseVal, bonusVal, benVal, empOf, capExVal, tickColor, gridColor);
    }
  }
}
let dashBaseChart = null, dashBonusChart = null, dashBenefitsChart = null;
function renderDashBreakdownCharts(labels, groups, isMonth, baseVal, bonusVal, benVal, empOf, capExVal, tickColor, gridColor) {
  const cc = getChartColors();
  const shortLabels = labels.map(l => l.length > 10 ? l.slice(0, 8) + '…' : l);
  const chartOpts = (title) => ({ responsive: true, maintainAspectRatio: false, layout: { padding: { top: 14 } },
    plugins: { legend: { display: false }, datalabels: { display: true, anchor: 'end', align: 'end', color: getCrispDatalabelColor('breakdown') || tickColor, font: { size: chartColorScheme === 'crisp' ? 12 : 10, weight: 'bold' }, formatter: v => v >= 1000 ? '$' + (v / 1000).toFixed(0) + 'K' : '$' + Math.round(v) } },
    scales: { x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor } }, y: { beginAtZero: true, ticks: { color: tickColor, font: { size: 10 }, callback: v => '$' + v.toLocaleString() }, grid: { color: gridColor } } }
  });
  function makeData(valFn) {
    if (compView === 'opex') {
      return [
        { label: 'OpEx', data: labels.map(l => groups[l].reduce((a, x) => a + valFn(x) - Math.round(valFn(x) * window.getCapPct(empOf(x)) / 100), 0)), backgroundColor: cc[0], stack: 'pos' },
        { label: 'CapEx', data: labels.map(l => -groups[l].reduce((a, x) => a + Math.round(valFn(x) * window.getCapPct(empOf(x)) / 100), 0)), backgroundColor: hexToRgba(cc[0], 0.35), stack: 'neg' }
      ];
    }
    return [{ label: 'Total', data: labels.map(l => groups[l].reduce((a, x) => a + valFn(x), 0)), backgroundColor: cc[0] }];
  }
  if (dashBaseChart) dashBaseChart.destroy();
  if (dashBonusChart) dashBonusChart.destroy();
  if (dashBenefitsChart) dashBenefitsChart.destroy();
  dashBaseChart = new Chart(document.getElementById('dashBaseChart'), { type: 'bar', data: { labels: shortLabels, datasets: makeData(baseVal) }, options: chartOpts('Base') });
  const bonusDs = makeData(bonusVal); bonusDs.forEach(d => d.backgroundColor = d.stack === 'neg' ? hexToRgba(cc[1], 0.35) : cc[1]);
  dashBonusChart = new Chart(document.getElementById('dashBonusChart'), { type: 'bar', data: { labels: shortLabels, datasets: bonusDs }, options: chartOpts('Bonus') });
  const benDs = makeData(benVal); benDs.forEach(d => d.backgroundColor = d.stack === 'neg' ? hexToRgba(cc[2], 0.35) : cc[2]);
  dashBenefitsChart = new Chart(document.getElementById('dashBenefitsChart'), { type: 'bar', data: { labels: shortLabels, datasets: benDs }, options: chartOpts('Benefits') });
}
document.getElementById('dashCompBreakdownToggle').addEventListener('click', function() {
  const wrap = document.getElementById('dashCompBreakdown');
  const vis = wrap.style.display !== 'none';
  wrap.style.display = vis ? 'none' : '';
  this.innerHTML = vis ? '&#9654; Base / Bonus / Benefits' : '&#9660; Base / Bonus / Benefits';
  if (!vis) renderDashboard();
});
document.querySelectorAll('#groupToggle .btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#groupToggle .btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); groupBy = b.dataset.group; renderDashboard();
}));
document.querySelectorAll('#compViewToggle .btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#compViewToggle .btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); compView = b.dataset.view; renderDashboard();
}));
document.querySelectorAll('#stackToggle .btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#stackToggle .btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); stackBy = b.dataset.stack; renderDashboard();
}));
['dashCountry', 'dashSeniority', 'dashFunction', 'dashProdCat', 'dashProduct', 'dashProject'].forEach(id => document.getElementById(id).addEventListener('change', renderDashboard));
let periodMode = 'mtd';
let currentMonth = new Date().getMonth(); // 0-based, global "as of" month for MTD/QTD/YTD
function syncMonthSelectors() {
  document.getElementById('curMonthSelDash').value = currentMonth;
  document.getElementById('curMonthSelExec').value = currentMonth;
}
document.querySelectorAll('#periodToggle .btn').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#periodToggle .btn').forEach(x => x.classList.remove('active')); b.classList.add('active'); periodMode = b.dataset.period;
  renderDashboard();
}));
document.getElementById('curMonthSelDash').addEventListener('change', function() {
  currentMonth = parseInt(this.value); syncMonthSelectors(); renderDashboard(); window.renderExecView();
});
document.getElementById('curMonthSelExec').addEventListener('change', function() {
  currentMonth = parseInt(this.value); syncMonthSelectors(); renderDashboard(); window.renderExecView();
});
syncMonthSelectors();

// Assign to window for other modules and inline references
window.dashChart = dashChart;
window.fteChart = fteChart;
window.renderDashboard = renderDashboard;
window.renderStats = renderStats;
window.getFilteredEmployees = getFilteredEmployees;
window.getChartColors = getChartColors;
window.hexToRgba = hexToRgba;
window.getStatValueColor = getStatValueColor;
window.getSparkColor = getSparkColor;
window.getCrispDatalabelColor = getCrispDatalabelColor;
window.fmtShort = fmtShort;
window.stackedBarDatalabels = stackedBarDatalabels;
window.yoyArrowsPlugin = yoyArrowsPlugin;
window.chartColorScheme = undefined; // managed via defineProperty below
window.CHART_COLORS = CHART_COLORS;
window.CHART_COLORS_MUTED_DARK = CHART_COLORS_MUTED_DARK;
window.CHART_COLORS_NEON = CHART_COLORS_NEON;
window.CHART_COLORS_CRISP = CHART_COLORS_CRISP;
window.CHART_COLORS_CRISP_DARK = CHART_COLORS_CRISP_DARK;
window.TAG_COLORS_LIGHT = TAG_COLORS_LIGHT;
window.TAG_COLORS_DARK = TAG_COLORS_DARK;
window.periodMode = undefined;
window.currentMonth = undefined;

Object.defineProperty(window, 'chartColorScheme', {
  get() { return chartColorScheme; },
  set(v) { chartColorScheme = v; },
  configurable: true
});
Object.defineProperty(window, 'periodMode', {
  get() { return periodMode; },
  set(v) { periodMode = v; },
  configurable: true
});
Object.defineProperty(window, 'currentMonth', {
  get() { return currentMonth; },
  set(v) { currentMonth = v; },
  configurable: true
});

export {
  renderDashboard,
  renderStats,
  getFilteredEmployees,
  getChartColors,
  hexToRgba,
  getStatValueColor,
  getSparkColor,
  getCrispDatalabelColor,
  fmtShort,
  stackedBarDatalabels,
  yoyArrowsPlugin,
  CHART_COLORS,
  CHART_COLORS_MUTED_DARK,
  CHART_COLORS_NEON,
  CHART_COLORS_CRISP,
  CHART_COLORS_CRISP_DARK,
  TAG_COLORS_LIGHT,
  TAG_COLORS_DARK,
  crispPatternPlugin,
  softBarPlugin,
  drawCrispPattern,
  FTE_TOOLTIP,
  syncMonthSelectors
};
