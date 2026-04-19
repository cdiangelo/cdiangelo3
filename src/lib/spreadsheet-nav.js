// ── Spreadsheet-style navigation for monthly input grids ──
// Attach to any tbody with monthly input cells for Tab/Enter/Arrow navigation,
// Shift+Click range selection, Ctrl+Click multi-select, and multi-cell copy/paste.

const ACTIVE_CLASS = 'spreadsheet-active';
const SELECTED_CLASS = 'spreadsheet-selected';

// Global selection state (shared across all grids)
let _selAnchor = null;   // {tbody, row, col} — first cell of a range
let _selCells = [];      // [{tbody, row, col, input}] — all selected cells

function getMonthInputs(tbody, moClass) {
  const rows = Array.from(tbody.querySelectorAll('tr'));
  return rows.map(tr => Array.from(tr.querySelectorAll('.' + moClass)));
}

function findPos(grid, input) {
  for (let r = 0; r < grid.length; r++) {
    const c = grid[r].indexOf(input);
    if (c !== -1) return [r, c];
  }
  return null;
}

function clearSelection() {
  document.querySelectorAll('.' + ACTIVE_CLASS).forEach(el => el.classList.remove(ACTIVE_CLASS));
  document.querySelectorAll('.' + SELECTED_CLASS).forEach(el => el.classList.remove(SELECTED_CLASS));
  _selCells = [];
}

function markSelected(input) {
  input.classList.add(ACTIVE_CLASS);
  const td = input.closest('td');
  if (td) td.classList.add(SELECTED_CLASS);
}

function selectCell(input, tbody, grid) {
  clearSelection();
  markSelected(input);
  const pos = findPos(grid, input);
  if (pos) {
    _selAnchor = { tbody, row: pos[0], col: pos[1] };
    _selCells = [{ tbody, row: pos[0], col: pos[1], input }];
  }
  input.focus();
  input.select();
}

function selectRange(tbody, grid, fromRow, fromCol, toRow, toCol) {
  const r1 = Math.min(fromRow, toRow), r2 = Math.max(fromRow, toRow);
  const c1 = Math.min(fromCol, toCol), c2 = Math.max(fromCol, toCol);
  clearSelection();
  for (let r = r1; r <= r2; r++) {
    if (!grid[r]) continue;
    for (let c = c1; c <= c2; c++) {
      const inp = grid[r]?.[c];
      if (inp && !inp.readOnly && !inp.disabled) {
        markSelected(inp);
        _selCells.push({ tbody, row: r, col: c, input: inp });
      }
    }
  }
  _selAnchor = { tbody, row: fromRow, col: fromCol };
}

function moveToCell(grid, row, col, tbody) {
  if (row < 0 || row >= grid.length) return;
  const r = grid[row];
  if (!r || col < 0 || col >= r.length) return;
  const target = r[col];
  if (target && !target.readOnly && !target.disabled) {
    selectCell(target, tbody, grid);
  }
}

export function attachSpreadsheetNav(tbodyId, moClass) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.addEventListener('keydown', (e) => {
    const input = e.target;
    if (!input.classList.contains(moClass)) return;

    const grid = getMonthInputs(tbody, moClass);
    const pos = findPos(grid, input);
    if (!pos) return;
    const [row, col] = pos;

    // Shift+Arrow extends selection
    if (e.shiftKey && ['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const anchor = _selAnchor || { tbody, row, col };
      let toR = row, toC = col;
      // Find the current extent edge
      const selRows = _selCells.map(s => s.row);
      const selCols = _selCells.map(s => s.col);
      const curMaxR = Math.max(...selRows, row);
      const curMinR = Math.min(...selRows, row);
      const curMaxC = Math.max(...selCols, col);
      const curMinC = Math.min(...selCols, col);

      if (e.key === 'ArrowRight') toC = curMaxC + 1;
      else if (e.key === 'ArrowLeft') toC = curMinC - 1;
      else if (e.key === 'ArrowDown') toR = curMaxR + 1;
      else if (e.key === 'ArrowUp') toR = curMinR - 1;

      toR = Math.max(0, Math.min(toR, grid.length - 1));
      toC = Math.max(0, Math.min(toC, (grid[0]?.length || 1) - 1));
      selectRange(tbody, grid, anchor.row, anchor.col, toR, toC);
      return;
    }

    switch (e.key) {
      case 'Tab': {
        e.preventDefault();
        const dir = e.shiftKey ? -1 : 1;
        let newCol = col + dir;
        let newRow = row;
        if (newCol >= grid[row].length) { newCol = 0; newRow++; }
        if (newCol < 0) { newRow--; if (newRow >= 0) newCol = grid[newRow].length - 1; }
        moveToCell(grid, newRow, newCol, tbody);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        moveToCell(grid, row + (e.shiftKey ? -1 : 1), col, tbody);
        break;
      }
      case 'ArrowRight': {
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          moveToCell(grid, row, col + 1, tbody);
        }
        break;
      }
      case 'ArrowLeft': {
        if (input.selectionStart === 0) {
          e.preventDefault();
          moveToCell(grid, row, col - 1, tbody);
        }
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        moveToCell(grid, row + 1, col, tbody);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        moveToCell(grid, row - 1, col, tbody);
        break;
      }
      case 'Escape': {
        clearSelection();
        input.blur();
        break;
      }
      case 'Delete':
      case 'Backspace': {
        if (_selCells.length > 1) {
          e.preventDefault();
          _selCells.forEach(s => {
            s.input.value = '0';
            s.input.dataset.raw = '0';
            s.input.dispatchEvent(new Event('input', { bubbles: true }));
            s.input.dispatchEvent(new Event('change', { bubbles: true }));
          });
        } else if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
          e.preventDefault();
          input.value = '0';
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.select();
        }
        break;
      }
    }
  });

  // Click: select one cell; Shift+Click: range; Ctrl+Click: toggle
  tbody.addEventListener('mousedown', (e) => {
    const input = e.target.closest('.' + moClass);
    if (!input || input.readOnly) return;

    const grid = getMonthInputs(tbody, moClass);
    const pos = findPos(grid, input);
    if (!pos) return;

    if (e.shiftKey && _selAnchor && _selAnchor.tbody === tbody) {
      e.preventDefault();
      selectRange(tbody, grid, _selAnchor.row, _selAnchor.col, pos[0], pos[1]);
    } else if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const already = _selCells.findIndex(s => s.input === input);
      if (already >= 0) {
        input.classList.remove(ACTIVE_CLASS);
        input.closest('td')?.classList.remove(SELECTED_CLASS);
        _selCells.splice(already, 1);
      } else {
        markSelected(input);
        _selCells.push({ tbody, row: pos[0], col: pos[1], input });
      }
      if (!_selAnchor) _selAnchor = { tbody, row: pos[0], col: pos[1] };
    } else {
      selectCell(input, tbody, grid);
    }
  });

  // Copy: all selected cells as tab-separated (single row) or tab+newline (multi-row)
  tbody.addEventListener('copy', (e) => {
    if (_selCells.length <= 1) {
      const input = document.activeElement;
      if (input && input.classList.contains(moClass)) {
        e.clipboardData.setData('text/plain', input.dataset.raw || input.value);
        e.preventDefault();
      }
      return;
    }
    e.preventDefault();
    const rows = {};
    _selCells.forEach(s => {
      if (!rows[s.row]) rows[s.row] = {};
      rows[s.row][s.col] = s.input.dataset.raw || s.input.value;
    });
    const rowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);
    const minCol = Math.min(..._selCells.map(s => s.col));
    const maxCol = Math.max(..._selCells.map(s => s.col));
    const lines = rowKeys.map(rk => {
      const parts = [];
      for (let c = minCol; c <= maxCol; c++) parts.push(rows[rk]?.[c] ?? '');
      return parts.join('\t');
    });
    e.clipboardData.setData('text/plain', lines.join('\n'));
  });

  // Paste support
  tbody.addEventListener('paste', (e) => {
    const input = document.activeElement;
    if (!input || !input.classList.contains(moClass)) return;

    const text = e.clipboardData.getData('text/plain').trim();
    if (!text) return;

    e.preventDefault();
    const grid = getMonthInputs(tbody, moClass);
    const pos = findPos(grid, input);
    if (!pos) return;
    const [startRow, startCol] = pos;
    const pasteRows = text.split(/\r?\n/).map(line => line.split('\t'));
    let pasteCount = 0;

    for (let r = 0; r < pasteRows.length; r++) {
      for (let c = 0; c < pasteRows[r].length; c++) {
        const targetRow = startRow + r;
        const targetCol = startCol + c;
        if (targetRow >= grid.length || targetCol >= grid[targetRow].length) continue;
        const target = grid[targetRow][targetCol];
        if (target && !target.readOnly && !target.disabled) {
          const val = parseFloat(pasteRows[r][c].replace(/[$,]/g, ''));
          if (!isNaN(val)) {
            target.value = val;
            target.dataset.raw = val;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
            const td = target.closest('td');
            if (td) { td.classList.remove('paste-flash'); void td.offsetWidth; td.classList.add('paste-flash'); }
            pasteCount++;
          }
        }
      }
    }
    if (pasteCount > 0) {
      let toast = document.getElementById('paste-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'paste-toast';
        toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:6px 18px;border-radius:8px;background:var(--accent);color:#fff;font-size:.78rem;font-weight:600;z-index:9999;opacity:0;transition:opacity .3s;pointer-events:none';
        document.body.appendChild(toast);
      }
      toast.textContent = `Pasted ${pasteCount} cell${pasteCount > 1 ? 's' : ''}`;
      toast.style.opacity = '1';
      clearTimeout(toast._t);
      toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 1500);
    }
  });
}
