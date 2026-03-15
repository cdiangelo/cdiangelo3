// ── DATA ──
export const COUNTRIES = ['United States','United Kingdom','Canada','Germany','India','Australia','Singapore','Netherlands','Brazil','Poland'];
export const COUNTRY_SHORT = ['US','UK','Canada','Germany','India','Australia','Singapore','Netherlands','Brazil','Poland'];
export const SENIORITY = ['Junior','Mid-Level','Senior','Staff','Principal','Manager','Director','VP/Head'];
export const FUNCTIONS = ['Software Engineering','Data Engineering','DevOps/SRE','Product Management','QA Engineering','Data Science','IT Operations','Security Engineering','Cloud Architecture','Technical Program Management'];
export const FUNC_SHORT = ['SWE','Data Eng','DevOps','PM','QA','DS','IT Ops','SecEng','Cloud Arch','TPM'];

export let SENIORITY_BASE = {Junior:88000,'Mid-Level':118000,Senior:155000,Staff:190000,Principal:225000,Manager:178000,Director:238000,'VP/Head':310000};
export let FUNCTION_MULT = {'Software Engineering':1.00,'Data Engineering':0.97,'DevOps/SRE':0.95,'Product Management':0.93,'QA Engineering':0.75,'Data Science':1.02,'IT Operations':0.68,'Security Engineering':1.06,'Cloud Architecture':1.04,'Technical Program Management':0.88};
export let COUNTRY_MULT = {'United States':1.00,'United Kingdom':0.72,Canada:0.80,Germany:0.70,India:0.22,Australia:0.82,Singapore:0.85,Netherlands:0.72,Brazil:0.28,Poland:0.38};
export const DEFAULT_BONUS = {Junior:5,'Mid-Level':8,Senior:12,Staff:15,Principal:18,Manager:20,Director:25,'VP/Head':30};
export const DEFAULT_BENEFITS = {Junior:18,'Mid-Level':20,Senior:22,Staff:24,Principal:26,Manager:23,Director:28,'VP/Head':32};
export const BENEFITS_COUNTRY_MULT = {'United States':1.00,'United Kingdom':0.85,Canada:0.90,Germany:0.95,India:0.40,Australia:0.88,Singapore:0.75,Netherlands:0.92,Brazil:0.50,Poland:0.55};
export const COUNTRY_BU = {'United States':'US001','United Kingdom':'UK001','Canada':'CA001','Germany':'DE001','India':'IN001','Australia':'AU001','Singapore':'SG001','Netherlands':'NL001','Brazil':'BR001','Poland':'PL001'};
export let FORECAST_YEARS = [2027,2028,2029,2030,2031];
export let DISPLAY_BASE_YEAR=2026;
export function getDisplayYears(){return [DISPLAY_BASE_YEAR+1,DISPLAY_BASE_YEAR+2,DISPLAY_BASE_YEAR+3,DISPLAY_BASE_YEAR+4,DISPLAY_BASE_YEAR+5]}
export function getDisplayFcLabels(){return [String(DISPLAY_BASE_YEAR),...getDisplayYears().map(String)]}
export function displayYear(y){if(y==='Current')return String(DISPLAY_BASE_YEAR);const idx=FORECAST_YEARS.indexOf(typeof y==='string'?parseInt(y):y);return idx>=0?String(getDisplayYears()[idx]):String(y)}
export function rebuildForecastYears(){FORECAST_YEARS=[CURRENT_YEAR+1,CURRENT_YEAR+2,CURRENT_YEAR+3,CURRENT_YEAR+4,CURRENT_YEAR+5]}

export const DEFAULT_MARKETS = [
  {code:'US0001',name:'United States'},{code:'UK0002',name:'United Kingdom'},{code:'CA0003',name:'Canada'},
  {code:'DE0004',name:'Germany'},{code:'IN0005',name:'India'},{code:'AU0006',name:'Australia'},
  {code:'SG0007',name:'Singapore'},{code:'NL0008',name:'Netherlands'},{code:'BR0009',name:'Brazil'},
  {code:'PL0010',name:'Poland'},{code:'GL0000',name:'Global'}
];
export const DEFAULT_BIZ_LINES = [
  {code:'100000',name:'Platform Engineering'},
  {code:'200000',name:'Product Development'},
  {code:'300000',name:'Operations'},
  {code:'400000',name:'Data & Analytics'},
  {code:'500000',name:'Infrastructure'},
  {code:'600000',name:'Security'},
  {code:'700000',name:'Corporate'}
];

export const VENDOR_TYPES = [
  'Data & Analytics','Mapping & GIS','Valuation & Appraisal','Document Management',
  'Property Management','Market Research','Investment Analytics',
  'Dev Tools & IDE','Cloud & Infrastructure','CI/CD & DevOps','Monitoring & Observability',
  'Security & Compliance','Data Platform','Collaboration & PM',
  'CRM & Sales','ERP & Finance','HR & Payroll','Legal & Compliance','T&E & Travel','Other'
];
export const EXPENSE_TYPES = ['Airline','Hotel','Other Travel','Food/Events','Large Event','Other'];

export const DEFAULT_ACCOUNTS = [
  {code:'54000',description:'Software Licenses',category:'Software & Licenses',group:'vendor'},
  {code:'55990',description:'Research Subscriptions',category:'Data & Analytics',group:'vendor'},
  {code:'54050',description:'Application Maintenance',category:'Software & Licenses',group:'vendor'},
  {code:'54275',description:'Server Mgmt / Plugs',category:'Infrastructure',group:'vendor'},
  {code:'62000',description:'Travel & Expense',category:'T&E',group:'te'}
];

export function benchmark(s,f,c){return Math.round(SENIORITY_BASE[s]*FUNCTION_MULT[f]*COUNTRY_MULT[c])}
export function fmt(n){const v=Number(n);if(isNaN(v))return '$0';if(v<0)return '-$'+Math.abs(v).toLocaleString('en-US',{maximumFractionDigits:0});return '$'+v.toLocaleString('en-US',{maximumFractionDigits:0})}
export function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
export function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}

// Setter functions for mutable let bindings (for use by other modules)
export function setSeniorityBase(val){SENIORITY_BASE=val}
export function setFunctionMult(val){FUNCTION_MULT=val}
export function setCountryMult(val){COUNTRY_MULT=val}
export function setForecastYears(val){FORECAST_YEARS=val}
export function setDisplayBaseYear(val){DISPLAY_BASE_YEAR=val}

// CURRENT_YEAR is needed by rebuildForecastYears; also exported from proration.js
const CURRENT_YEAR = 2026;
