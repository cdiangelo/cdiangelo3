// ── Seed Data Generator ──
// Creates realistic starting data for new plans: 100 employees, vendor/T&E/contractor rows
import {
  COUNTRIES, SENIORITY, FUNCTIONS, COUNTRY_BU,
  SENIORITY_BASE, FUNCTION_MULT, COUNTRY_MULT,
  DEFAULT_BONUS, DEFAULT_BENEFITS, BENEFITS_COUNTRY_MULT,
  DEFAULT_MARKETS, DEFAULT_BIZ_LINES, VENDOR_TYPES, EXPENSE_TYPES,
  DEFAULT_ACCOUNTS
} from './constants.js';

function uid(){return 'p'+Date.now()+Math.random().toString(36).slice(2,6)}

// Distribution tables — how to spread 80 existing + 20 new hires
const FUNC_DIST=[
  {fn:'Software Engineering',count:18,nhCount:5},
  {fn:'Data Engineering',count:8,nhCount:2},
  {fn:'DevOps/SRE',count:7,nhCount:2},
  {fn:'Product Management',count:8,nhCount:2},
  {fn:'QA Engineering',count:5,nhCount:1},
  {fn:'Data Science',count:6,nhCount:2},
  {fn:'IT Operations',count:6,nhCount:1},
  {fn:'Security Engineering',count:5,nhCount:2},
  {fn:'Cloud Architecture',count:4,nhCount:1},
  {fn:'Technical Program Management',count:5,nhCount:1},
  {fn:'Other',count:8,nhCount:1}
];

const SEN_WEIGHTS={Junior:12,'Mid-Level':22,Senior:25,Staff:10,Principal:3,Manager:12,Director:8,'VP/Head':3};
const COUNTRY_WEIGHTS={'United States':50,'United Kingdom':8,Canada:6,Germany:5,India:5,Australia:2,Singapore:2,Netherlands:1,Brazil:1,Poland:0};

function pickWeighted(weights){
  const entries=Object.entries(weights);
  const total=entries.reduce((s,[,w])=>s+w,0);
  let r=Math.random()*total;
  for(const [k,w] of entries){r-=w;if(r<=0)return k}
  return entries[entries.length-1][0];
}

function pickRandom(arr){return arr[Math.floor(Math.random()*arr.length)]}

// NH start months: spread across Jan-Dec with a slight ramp
const NH_START_MONTHS=[0,0,1,2,2,3,3,4,5,5,6,6,7,7,8,8,9,9,10,11];

function benchmark(sen,fn,country){
  return Math.round((SENIORITY_BASE[sen]||120000)*(FUNCTION_MULT[fn]||1)*(COUNTRY_MULT[country]||1));
}

export function generateSeedProjects(){
  const ids={
    'PRJ-001':uid(),'PRJ-002':uid(),'PRJ-003':uid(),
    'PRJ-004':uid(),'PRJ-005':uid(),'GEN-000':uid()
  };
  const projects=[
    {id:ids['GEN-000'],code:'GEN-000',product:'General',category:'Overhead',marketCode:'GL0000',bizLineCode:'700000',description:'General allocation'},
    {id:ids['PRJ-001'],code:'PRJ-001',product:'Platform Core',category:'Engineering',marketCode:'US0001',bizLineCode:'100000',description:'Core platform development'},
    {id:ids['PRJ-002'],code:'PRJ-002',product:'Analytics Suite',category:'Product',marketCode:'US0001',bizLineCode:'400000',description:'Data analytics product'},
    {id:ids['PRJ-003'],code:'PRJ-003',product:'Client Portal',category:'Engineering',marketCode:'UK0002',bizLineCode:'200000',description:'Client-facing portal'},
    {id:ids['PRJ-004'],code:'PRJ-004',product:'Infrastructure',category:'Operations',marketCode:'US0001',bizLineCode:'500000',description:'Cloud infrastructure'},
    {id:ids['PRJ-005'],code:'PRJ-005',product:'Security',category:'Operations',marketCode:'US0001',bizLineCode:'600000',description:'Security & compliance'}
  ];
  return {projects,projectIds:ids};
}

// Map functions to projects for realistic allocation
const FUNC_PROJECT_MAP={
  'Software Engineering':['PRJ-001','PRJ-003'],
  'Data Engineering':['PRJ-002','PRJ-001'],
  'DevOps/SRE':['PRJ-004','PRJ-001'],
  'Product Management':['PRJ-001','PRJ-002','PRJ-003'],
  'QA Engineering':['PRJ-001','PRJ-003'],
  'Data Science':['PRJ-002'],
  'IT Operations':['PRJ-004'],
  'Security Engineering':['PRJ-005'],
  'Cloud Architecture':['PRJ-004','PRJ-001'],
  'Technical Program Management':['PRJ-001','PRJ-002','PRJ-003'],
  'Finance':['GEN-000'],'HR':['GEN-000'],'Legal':['GEN-000'],
  'Marketing':['GEN-000'],'Operations':['PRJ-004']
};

export function generateSeedEmployees(projectIds){
  const employees=[];
  let empNum=1,nhNum=1;

  function assignProject(fn){
    const codes=FUNC_PROJECT_MAP[fn]||['PRJ-001'];
    const code=pickRandom(codes);
    return projectIds[code]||projectIds['PRJ-001'];
  }

  // Existing employees (EMP#1 – EMP#80)
  FUNC_DIST.forEach(({fn,count})=>{
    for(let i=0;i<count;i++){
      const sen=pickWeighted(SEN_WEIGHTS);
      const country=pickWeighted(COUNTRY_WEIGHTS);
      const bu=COUNTRY_BU[country]||'US001';
      const bl=pickRandom(DEFAULT_BIZ_LINES);
      const actualFn=fn==='Other'?pickRandom(['Finance','HR','Legal','Marketing','Operations']):fn;
      const base=benchmark(sen,actualFn,country);
      const adjBase=Math.round(base*(0.9+Math.random()*0.2));
      const projId=assignProject(actualFn);
      employees.push({
        id:uid(),name:'EMP#'+empNum,function:actualFn,seniority:sen,country,
        businessUnit:bu,businessLine:bl.code,baseSalary:adjBase,
        bonusPct:DEFAULT_BONUS[sen]||10,benefitsPct:DEFAULT_BENEFITS[sen]||20,
        startMonth:0,isNewHire:false,
        allocations:[{projId,pct:100}],_colorTag:''
      });
      empNum++;
    }
  });

  // New hires (NH#1 – NH#20)
  const nhSenWeights={Junior:30,'Mid-Level':35,Senior:20,Staff:5,Principal:0,Manager:5,Director:3,'VP/Head':2};
  FUNC_DIST.forEach(({fn,nhCount})=>{
    for(let i=0;i<nhCount;i++){
      const sen=pickWeighted(nhSenWeights);
      const country=pickWeighted(COUNTRY_WEIGHTS);
      const bu=COUNTRY_BU[country]||'US001';
      const bl=pickRandom(DEFAULT_BIZ_LINES);
      const actualFn=fn==='Other'?pickRandom(['Finance','HR','Legal','Marketing','Operations']):fn;
      const base=benchmark(sen,actualFn,country);
      const adjBase=Math.round(base*(0.9+Math.random()*0.2));
      const startMo=NH_START_MONTHS[nhNum-1]||Math.floor(Math.random()*12);
      const projId=assignProject(actualFn);
      employees.push({
        id:uid(),name:'NH#'+nhNum,function:actualFn,seniority:sen,country,
        businessUnit:bu,businessLine:bl.code,baseSalary:adjBase,
        bonusPct:DEFAULT_BONUS[sen]||10,benefitsPct:DEFAULT_BENEFITS[sen]||20,
        startMonth:startMo,isNewHire:true,
        allocations:[{projId,pct:100}],_colorTag:''
      });
      nhNum++;
    }
  });

  return {employees};
}

export function generateSeedVendorRows(){
  const mo=(base,variance)=>{
    const r={};
    ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].forEach(m=>{
      r[m]=Math.round(base*(0.8+Math.random()*variance*2));
    });
    return r;
  };
  return [
    {parentCo:'Acme Corp',vendorName:'Cloud Platform',vendorType:'Cloud & Infrastructure',businessUnit:'US001',bizLine:'500000',market:'US0001',project:'',acctDesc:'',notes:'AWS/Azure hosting',...mo(45000,0.15),_colorTag:''},
    {parentCo:'DataCo',vendorName:'Analytics License',vendorType:'Data & Analytics',businessUnit:'US001',bizLine:'400000',market:'US0001',project:'',acctDesc:'',notes:'Annual license',...mo(18000,0.05),_colorTag:''},
    {parentCo:'DevTools Inc',vendorName:'IDE & DevTools',vendorType:'Dev Tools & IDE',businessUnit:'US001',bizLine:'100000',market:'US0001',project:'',acctDesc:'',notes:'JetBrains, GitHub',...mo(8000,0.1),_colorTag:''},
    {parentCo:'SecureSoft',vendorName:'Security Suite',vendorType:'Security & Compliance',businessUnit:'US001',bizLine:'600000',market:'US0001',project:'',acctDesc:'',notes:'SIEM, endpoint',...mo(12000,0.08),_colorTag:''},
    {parentCo:'MonitorCo',vendorName:'Observability',vendorType:'Monitoring & Observability',businessUnit:'US001',bizLine:'500000',market:'US0001',project:'',acctDesc:'',notes:'Datadog, PagerDuty',...mo(9000,0.1),_colorTag:''},
    {parentCo:'CollabSoft',vendorName:'Collaboration Tools',vendorType:'Collaboration & PM',businessUnit:'US001',bizLine:'700000',market:'GL0000',project:'',acctDesc:'',notes:'Slack, Jira, Confluence',...mo(6000,0.05),_colorTag:''},
    {parentCo:'HR Systems',vendorName:'HR & Payroll Platform',vendorType:'HR & Payroll',businessUnit:'US001',bizLine:'700000',market:'GL0000',project:'',acctDesc:'',notes:'Workday',...mo(15000,0.03),_colorTag:''},
    {parentCo:'LegalCo',vendorName:'Legal & Compliance',vendorType:'Legal & Compliance',businessUnit:'US001',bizLine:'700000',market:'US0001',project:'',acctDesc:'',notes:'Outside counsel retainer',...mo(10000,0.2),_colorTag:''}
  ];
}

export function generateSeedTeRows(){
  return [
    {expenseType:'Airline',description:'Domestic & international travel',businessUnit:'US001',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:4000,feb:3500,mar:5000,apr:6000,may:4500,jun:5500,jul:3000,aug:4000,sep:5000,oct:6000,nov:4000,dec:2500,_colorTag:''},
    {expenseType:'Hotel',description:'Business travel lodging',businessUnit:'US001',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:3000,feb:2500,mar:4000,apr:5000,may:3500,jun:4500,jul:2000,aug:3000,sep:4000,oct:5000,nov:3000,dec:2000,_colorTag:''},
    {expenseType:'Food/Events',description:'Team meals & client entertainment',businessUnit:'US001',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:2000,feb:2000,mar:2500,apr:2500,may:3000,jun:3000,jul:2000,aug:2000,sep:2500,oct:3000,nov:3500,dec:4000,_colorTag:''},
    {expenseType:'Large Event',description:'Annual conference & offsites',businessUnit:'US001',bizLine:'',market:'',project:'',acctDesc:'',notes:'Q2 offsite, Q4 conference',jan:0,feb:0,mar:0,apr:0,may:25000,jun:0,jul:0,aug:0,sep:0,oct:0,nov:35000,dec:0,_colorTag:''},
    {expenseType:'Other',description:'Training & professional development',businessUnit:'US001',bizLine:'',market:'',project:'',acctDesc:'',notes:'',jan:2000,feb:2000,mar:3000,apr:2000,may:2000,jun:2000,jul:1500,aug:1500,sep:3000,oct:2000,nov:2000,dec:1500,_colorTag:''}
  ];
}

export function generateSeedContractorRows(){
  return [
    {name:'CTR#1',vendorName:'TechStaff Agency',hourlyRate:150,monthlyHours:160,capPct:0,businessUnit:'US001',bizLine:'100000',market:'US0001',project:'',acctDesc:'',notes:'Senior fullstack dev',_startMonth:0,_endMonth:11,_rateExpanded:false,jan:24000,feb:24000,mar:24000,apr:24000,may:24000,jun:24000,jul:24000,aug:24000,sep:24000,oct:24000,nov:24000,dec:24000,_colorTag:''},
    {name:'CTR#2',vendorName:'DesignPro',hourlyRate:125,monthlyHours:80,capPct:0,businessUnit:'US001',bizLine:'200000',market:'US0001',project:'',acctDesc:'',notes:'UX design consultant',_startMonth:0,_endMonth:8,_rateExpanded:false,jan:10000,feb:10000,mar:10000,apr:10000,may:10000,jun:10000,jul:10000,aug:10000,sep:10000,oct:0,nov:0,dec:0,_colorTag:''},
    {name:'CTR#3',vendorName:'DataWorks',hourlyRate:110,monthlyHours:120,capPct:25,businessUnit:'US001',bizLine:'400000',market:'US0001',project:'',acctDesc:'',notes:'Data pipeline engineer',_startMonth:2,_endMonth:11,_rateExpanded:false,jan:0,feb:0,mar:13200,apr:13200,may:13200,jun:13200,jul:13200,aug:13200,sep:13200,oct:13200,nov:13200,dec:13200,_colorTag:''}
  ];
}

export function generateSeedOtherRows(){
  return {
    cbOtherRows:[
      {description:'Severance',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0},
      {description:'Bonus - Discretionary',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0},
      {description:'Other C&B',jan:0,feb:0,mar:0,apr:0,may:0,jun:0,jul:0,aug:0,sep:0,oct:0,nov:0,dec:0}
    ],
    oaoOtherRows:[
      {description:'Office Supplies',jan:1500,feb:1500,mar:1500,apr:1500,may:1500,jun:1500,jul:1500,aug:1500,sep:1500,oct:1500,nov:1500,dec:1500},
      {description:'Recruiting Fees',jan:5000,feb:5000,mar:8000,apr:8000,may:6000,jun:6000,jul:4000,aug:4000,sep:6000,oct:6000,nov:4000,dec:3000},
      {description:'Insurance',jan:3000,feb:3000,mar:3000,apr:3000,may:3000,jun:3000,jul:3000,aug:3000,sep:3000,oct:3000,nov:3000,dec:3000}
    ]
  };
}

// Generate randomized actuals based on plan data (adds ±5-15% variance)
export function generateActuals(state){
  const MO=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  function vary(v,pct){return Math.round(v*(1+(Math.random()*2-1)*pct))}

  // Employee comp actuals — per month
  const empActuals=MO.map((_,mi)=>{
    let totalComp=0,totalCapex=0,hc=0;
    (state.employees||[]).forEach(e=>{
      const startMo=e.startMonth||0;
      if(mi<startMo)return;
      const base=e.baseSalary||0;
      const monthly=Math.round(base/12);
      const bonus=Math.round(base*(e.bonusPct||0)/100/12);
      const benefits=Math.round(base*(e.benefitsPct||0)/100/12);
      const comp=monthly+bonus+benefits;
      totalComp+=vary(comp,0.08);
      hc++;
    });
    return {cb:totalComp,hc};
  });

  // Vendor actuals
  const vendorActuals=MO.map(m=>{
    return (state.vendorRows||[]).reduce((s,r)=>s+vary(parseFloat(r[m])||0,0.12),0);
  });

  // T&E actuals
  const teActuals=MO.map(m=>{
    return (state.teRows||[]).reduce((s,r)=>s+vary(parseFloat(r[m])||0,0.15),0);
  });

  // Contractor actuals
  const ctrActuals=MO.map(m=>{
    return (state.contractorRows||[]).reduce((s,r)=>s+vary(parseFloat(r[m])||0,0.10),0);
  });

  return {
    months:MO.map((m,mi)=>({
      month:m,
      hc:empActuals[mi].hc,
      cb:empActuals[mi].cb,
      oao:vendorActuals[mi],
      ctr:ctrActuals[mi],
      te:teActuals[mi],
      da:0,
      capex:0
    }))
  };
}
