// ── Spreadsheet-style navigation for monthly input grids ──
// Attach to any tbody with monthly input cells for Tab/Enter/Arrow navigation

const ACTIVE_CLASS = 'spreadsheet-active';
const SELECTED_CLASS = 'spreadsheet-selected';

function getMonthInputs(tbody, moClass) {
  // Build a 2D grid: rows × month columns
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

function selectCell(input) {
  // Remove previous selection
  document.querySelectorAll('.' + ACTIVE_CLASS).forEach(el => el.classList.remove(ACTIVE_CLASS));
  document.querySelectorAll('.' + SELECTED_CLASS).forEach(el => el.classList.remove(SELECTED_CLASS));
  input.classList.add(ACTIVE_CLASS);
  input.closest('td')?.classList.add(SELECTED_CLASS);
  input.focus();
  input.select();
}

function moveToCell(grid, row, col) {
  // Clamp to grid bounds
  if (row < 0 || row >= grid.length) return;
  const r = grid[row];
  if (!r || col < 0 || col >= r.length) return;
  const target = r[col];
  if (target && !target.readOnly && !target.disabled) {
    selectCell(target);
  }
}

export function attachSpreadsheetNav(tbodyId, moClass) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  // Use event delegation on the tbody
  tbody.addEventListener('keydown', (e) => {
    const input = e.target;
    if (!input.classList.contains(moClass)) return;

    const grid = getMonthInputs(tbody, moClass);
    const pos = findPos(grid, input);
    if (!pos) return;
    const [row, col] = pos;

    switch (e.key) {
      case 'Tab': {
        e.preventDefault();
        const dir = e.shiftKey ? -1 : 1;
        let newCol = col + dir;
        let newRow = row;
        // Wrap to next/prev row
        if (newCol >= grid[row].length) { newCol = 0; newRow++; }
        if (newCol < 0) { newRow--; if (newRow >= 0) newCol = grid[newRow].length - 1; }
        moveToCell(grid, newRow, newCol);
        break;
      }
      case 'Enter': {
        e.preventDefault();
        const dir = e.shiftKey ? -1 : 1;
        moveToCell(grid, row + dir, col);
        break;
      }
      case 'ArrowRight': {
        if (input.selectionStart === input.value.length) {
          e.preventDefault();
          moveToCell(grid, row, col + 1);
        }
        break;
      }
      case 'ArrowLeft': {
        if (input.selectionStart === 0) {
          e.preventDefault();
          moveToCell(grid, row, col - 1);
        }
        break;
      }
      case 'ArrowDown': {
        e.preventDefault();
        moveToCell(grid, row + 1, col);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        moveToCell(grid, row - 1, col);
        break;
      }
      case 'Escape': {
        input.blur();
        input.classList.remove(ACTIVE_CLASS);
        input.closest('td')?.classList.remove(SELECTED_CLASS);
        break;
      }
      case 'Delete':
      case 'Backspace': {
        // If full value is selected, clear and trigger change
        if (input.selectionStart === 0 && input.selectionEnd === input.value.length) {
          e.preventDefault();
          input.value = '0';
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.select();
        }
        break;
      }
    }
  });

  // Click to select cell
  tbody.addEventListener('click', (e) => {
    const input = e.target;
    if (input.classList.contains(moClass) && !input.readOnly) {
      selectCell(input);
    }
  });

  // Copy support — Ctrl+C copies current cell value
  tbody.addEventListener('copy', (e) => {
    const input = document.activeElement;
    if (input && input.classList.contains(moClass)) {
      e.clipboardData.setData('text/plain', input.value);
      e.preventDefault();
    }
  });

  // Paste support — Ctrl+V pastes into current cell, or multi-cell paste for tab-separated values
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

    // Parse pasted data — support tab-separated (columns) and newline-separated (rows)
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
            // Visual flash on pasted cell
            const td = target.closest('td');
            if (td) { td.classList.remove('paste-flash'); void td.offsetWidth; td.classList.add('paste-flash'); }
            pasteCount++;
          }
        }
      }
    }
    // Brief confirmation toast
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
