// ── Styles ──
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/themes.css';
import './styles/mobile.css';
import './styles/features/dashboard.css';
import './styles/features/employees.css';
import './styles/features/landing.css';
import './styles/features/milestones.css';
import './styles/features/scenario.css';
import './styles/features/sticky-notes.css';
import './styles/features/vendor.css';

// ── Core libraries (order matters) ──
import './lib/api.js';            // Installs fetch wrapper — must be first
import './lib/constants.js';
import './lib/state.js';
import './lib/proration.js';
import './lib/chart-utils.js';

// ── Feature modules ──
import './features/session.js';
import './features/undo.js';
import './features/nav.js';
import './features/dropdowns.js';
import './features/dashboard.js';
import './features/employees.js';
import './features/employee-pivot.js';
import './features/projects.js';
import './features/market-codes.js';
import './features/business-lines.js';
import './features/bonus-benefits.js';
import './features/monthly-spread.js';
import './features/scratch-pad.js';
import './features/forecast.js';
import './features/export-import.js';
import './features/dark-mode.js';
import './features/workspaces.js';
import './features/exec-view.js';
import './features/scenario.js';
import './features/data-panel.js';
import './features/vendor.js';
import './features/depreciation.js';
import './features/assets-capex.js';
import './features/revenue.js';
import './features/landing.js';
import './features/sticky-notes.js';
import './features/teams-links.js';
import './features/fun-mode.js';
import './features/milestones.js';
