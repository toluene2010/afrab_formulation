/* ================================================================
   AFRAB Formulation Studio — Frontend (v3)
   Fixes: yield calc, product-stage tiles, trial dispositions
   ================================================================ */
const API_URL  = 'https://script.google.com/macros/s/AKfycbxptzrN30F71GJ-ZqHpo6wL9WdnHLH2eVBNlknreDod_yY3Yk9srIWqz2ySBW98XrB6/exec';
const API_TOKEN = 'afrab-secret-2026-change-me';
const CURRENCY = '₦';

const DOSAGE_FORMS = [
  { name:'Tablet / Caplet', short:'TABLET', sub:'Tablet' },
  { name:'Capsule', short:'CAPSULE', sub:'Capsule / Softgel' },
  { name:'Oral Liquid / Syrup', short:'SYRUP', sub:'Syrup / Elixir' },
  { name:'Suspension / Emulsion', short:'SUSPENSION', sub:'Suspension / Emulsion' },
  { name:'Cream / Ointment / Gel', short:'SEMI_SOLID', sub:'Cream / Ointment / Gel' },
  { name:'Dry Powder / Sachet / Drops', short:'DRY_POWDER', sub:'Reconstitutable Dry Powder' },
  { name:'Injection / Sterile', short:'INJECTION', sub:'Injection / Sterile' }
];
const STAGES = ['Lab Bench','Pilot Scale','Stability','Commercial'];
const STATUSES = ['PASS','FAIL','ON HOLD','IN PROGRESS'];
const FAIL_CATS = ['Phase Separation','Assay OOS','Dissolution Fail','pH Out of Range',
  'Appearance','Microbial','Stability','Hardness / Friability','Reconstitution',
  'Weight Variation','Sedimentation','Viscosity Drift','Other'];
const PRODUCT_STATUSES = ['Pilot Trial / Formulation','Pilot Batch Trial',
  'Stability Testing','Commercial / Active','On Hold','Discontinued'];

/* Trial dispositions — NOT batch dispositions */
const TRIAL_DISPOSITIONS = [
  'APPROVED FOR NEXT STAGE',
  'REWORK REQUIRED',
  'REJECTED AT TRIAL',
  'ON HOLD',
  'ARCHIVED'
];

const $ = id => document.getElementById(id);
const state = {
  users:[], materials:[], products:[], versions:[], recipes:[],
  trends:{}, stages:{}, currentUser:null,
  tab:'bmr', activeProduct:'', activeVersion:'', batchVolume:1000,
  calc:null, steps:[], stepsVersion:'', editingRecipe:null, matFilter:''
};

function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function money(n){ if(n==null || isNaN(n)) return '—';
  return CURRENCY + Number(n).toLocaleString(undefined,
    {minimumFractionDigits:2, maximumFractionDigits:2}); }
function statusPill(s){ s=s||'';
  if (/pass|approv|releas|conform/i.test(s)) return '<span class="pill pill-pass">'+esc(s)+'</span>';
  if (/fail|reject|discontinu|rework/i.test(s)) return '<span class="pill pill-fail">'+esc(s)+'</span>';
  return '<span class="pill pill-warn">'+esc(s)+'</span>'; }
function stagePill(s){ s=s||'';
  if (/commercial/i.test(s)) return '<span class="pill pill-pass">'+esc(s)+'</span>';
  return '<span class="pill pill-stage">'+esc(s)+'</span>'; }
function setStatus(msg, isErr){
  const el=$('status'); if(!el) return;
  el.textContent = msg || '';
  el.classList.toggle('error', !!isErr); }

function detectForm(formName){
  const f = String(formName||'').toLowerCase();
  for (const d of DOSAGE_FORMS) {
    const k = d.short.toLowerCase();
    if (k === 'tablet' && /tablet|caplet/.test(f)) return d;
    if (k === 'capsule' && /capsule/.test(f)) return d;
    if (k === 'syrup' && /syrup|elixir|solution|liquid/.test(f)) return d;
    if (k === 'suspension' && /suspension|emulsion/.test(f)) return d;
    if (k === 'semi_solid' && /cream|ointment|gel|paste|semi/.test(f)) return d;
    if (k === 'dry_powder' && /powder|sachet|drop/.test(f)) return d;
    if (k === 'injection' && /inject|vial|ampoule/.test(f)) return d;
  }
  return DOSAGE_FORMS[0];
}

/* Doc ref only when a version exists */
function docRefFor(productId){
  const vs = state.versions.filter(v => v.productId === productId);
  if (!vs.length) return null;
  const latest = vs[vs.length - 1];
  const code = /pilot/i.test(latest.stage) ? 'PLT'
             : /commercial/i.test(latest.stage) ? 'COM'
             : /stability/i.test(latest.stage) ? 'STB'
             : 'LAB';
  return 'BMR-' + code + '-' + productId.replace('PRD-','PRD') + '-' +
         String(vs.length).padStart(2,'0');
}

async function api(action, payload){
  const res = await fetch(API_URL, {
    method:'POST',
    headers:{ 'Content-Type':'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: action, token: API_TOKEN, payload: payload || {} })
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json.data;
}

/* -------- Delegated click handler -------- */
const ACTIONS = {
  goDashboard: () => { state.tab='dashboard'; render(); },
  goCompose:   () => { state.tab='bmr';       render(); },
  goPipeline:  () => { state.tab='pipeline';  render(); },
  goTrials:    () => { state.tab='trials';    render(); },
  goProducts:  () => { state.tab='products';  render(); },
  goMaterials: () => { state.tab='materials'; render(); },
  goSteps:     () => { state.tab='steps';     render(); },
  goArchive:   () => { state.tab='archive';   render(); },
  goSetup:     () => { state.tab='setup';     render(); },

  newMaterial:  () => openMaterialForm(),
  editMaterial: (p) => openMaterialForm(p.material),
  saveMaterial: () => submitMaterial(),

  newProduct:   () => openProductForm(),
  editProduct:  (p) => openProductForm(p.product),
  saveProduct:  () => submitProduct(),

  openPicker:   () => openPicker(),
  saveBulk:     () => submitBulk(),
  deleteRecipe: (p) => deleteRecipe(p.recipeId),

  newVersion:   () => openVersionForm(),
  saveVersion:  () => submitVersion(),
  deleteVersion:(p) => deleteVersion(p.versionId),
  goStepsFor:   (p) => { state.stepsVersion = p.versionId; state.tab='steps'; render(); },

  addStep:      () => openStepForm(),
  saveStep:     () => submitStep(),
  deleteStep:   (p) => deleteStep(p.step),

  changeDosageForm:(p) => changeDosageForm(p.form),

  loadTemplate: () => loadTemplate(),
  aiAssistant:  () => aiAssistant(),
  resetForm:    () => resetForm(),

  openIssue:    () => openIssueForm(),
  submitIssue:  () => submitIssue(),
  reload:       () => reload()
};
window.ACTIONS = ACTIONS;

document.addEventListener('click', function(e){
  const btn = e.target.closest && e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const payloadRaw = btn.getAttribute('data-payload');
  let payload = null;
  if (payloadRaw) { try { payload = JSON.parse(payloadRaw); } catch(err){} }
  const fn = ACTIONS[action];
  if (typeof fn === 'function') {
    e.preventDefault(); e.stopPropagation();
    try { fn(payload, btn); }
    catch(err){ setStatus('Action error (' + action + '): ' + err.message, true); }
  }
}, true);

/* -------- Boot -------- */
async function boot(){
  try {
    setStatus('Loading…');
    const d = await api('getAppData');
    Object.assign(state, {
      users: d.users || [], materials: d.materials || [],
      products: d.products || [], versions: d.versions || [],
      recipes: d.recipes || [], trends: d.trends || {}, stages: d.stages || {}
    });
    state.currentUser = state.users[0] || null;
    $('userBadge').textContent = state.currentUser
      ? state.currentUser.name + ' — ' + (state.currentUser.role || '')
      : 'No users yet';
    if (state.products.length) {
      state.activeProduct = state.products[0].id;
      state.activeVersion = state.activeProduct + '-V1.0';
    }
    updateHeroPills();
    render();
  } catch(e){ setStatus('Failed to load: ' + e.message, true); }
}

function updateHeroPills(){
  $('pillProducts').textContent = 'Product Master (' + state.products.length + ')';
  $('pillVersions').textContent = 'BMR Trials Log (' + state.versions.length + ')';
  const sc = Object.values(state.stages||{}).reduce((s,v)=>s+v,0);
  $('pillStages').textContent = 'Stage Pipeline (' + sc + ')';
}

function render(){
  setStatus('');
  updateHeroPills();
  switch (state.tab) {
    case 'dashboard': return renderDashboard();
    case 'bmr':       return renderCompose();
    case 'pipeline':  return renderPipeline();
    case 'trials':    return renderTrials();
    case 'products':  return renderProducts();
    case 'materials': return renderMaterials();
    case 'steps':     return renderSteps();
    case 'archive':   return renderArchive();
    case 'setup':     return renderSetup();
  }
}

function navRow(active){
  const items = [
    { id:'bmr',       label:'BMR Tracking & Compose', action:'goCompose' },
    { id:'pipeline',  label:'Stage Pipeline',          action:'goPipeline' },
    { id:'trials',    label:'BMR Trials Log',          action:'goTrials' },
    { id:'products',  label:'Product Master',          action:'goProducts' },
    { id:'materials', label:'Raw Materials',           action:'goMaterials' },
    { id:'dashboard', label:'Dashboard',               action:'goDashboard' },
    { id:'steps',     label:'Production Steps',        action:'goSteps' },
    { id:'archive',   label:'BMR Archive',             action:'goArchive' },
    { id:'setup',     label:'Setup',                   action:'goSetup' }
  ];
  return '<div class="nav-row">' + items.map(function(it){
    return '<button class="nav-pill ' + (active===it.id?'active':'') +
           '" data-action="' + it.action + '">' + esc(it.label) + '</button>';
  }).join('') + '</div>';
}

/* Stage tiles — count PRODUCTS by status */
function stageTiles(s){
  s = s || {lab:0,stability:0,pilot:0,commercial:0};
  return '<div class="stage-tiles">' +
    '<div class="stage-tile lab"><div class="badge">LAB</div>' +
      '<div class="num">' + (s.lab||0) + '</div>' +
      '<div class="title">Pre-formulation</div>' +
      '<div class="sub">' + (s.lab||0) + ' product(s) in formulation</div></div>' +
    '<div class="stage-tile stb"><div class="badge">STB</div>' +
      '<div class="num">' + (s.stability||0) + '</div>' +
      '<div class="title">Stability Testing</div>' +
      '<div class="sub">' + (s.stability||0) + ' product(s) in stability</div></div>' +
    '<div class="stage-tile plt"><div class="badge">PLT</div>' +
      '<div class="num">' + (s.pilot||0) + '</div>' +
      '<div class="title">Pilot Batch</div>' +
      '<div class="sub">' + (s.pilot||0) + ' product(s) at pilot scale</div></div>' +
    '<div class="stage-tile com"><div class="badge">COM</div>' +
      '<div class="num">' + (s.commercial||0) + '</div>' +
      '<div class="title">Commercial Scale-up</div>' +
      '<div class="sub">' + (s.commercial||0) + ' commercial product(s)</div></div>' +
  '</div>';
}

/* Dashboard */
function renderDashboard(){
  const t = state.trends || {total:0,passed:0,failed:0,byCategory:{}};
  const s = state.stages || {lab:0,stability:0,pilot:0,commercial:0};
  const total = Object.values(t.byCategory||{}).reduce((a,b)=>a+b,0) || 1;
  $('view').innerHTML = navRow('dashboard') + stageTiles(s) +
    '<div class="kpi-grid">' +
      '<div class="kpi"><div class="n">' + state.products.length + '</div><div class="l">Products</div></div>' +
      '<div class="kpi"><div class="n">' + state.materials.length + '</div><div class="l">Materials</div></div>' +
      '<div class="kpi"><div class="n">' + (t.total||0) + '</div><div class="l">Trial Versions</div></div>' +
      '<div class="kpi"><div class="n">' + (t.passed||0) + '</div><div class="l">Passing</div></div>' +
      '<div class="kpi"><div class="n">' + (t.failed||0) + '</div><div class="l">Failed</div></div>' +
    '</div>' +
    '<div class="bmr-card"><div class="eyebrow">Failure Trend Analysis</div>' +
      (t.failed === 0 ? '<p class="muted" style="margin-top:10px">No failures logged.</p>'
        : Object.entries(t.byCategory).sort((a,b)=>b[1]-a[1]).map(function(x){
            return '<div style="margin-bottom:10px;margin-top:10px">' +
              '<div style="font-size:12.5px;font-weight:600;margin-bottom:4px">' +
              esc(x[0]) + ' — ' + x[1] + '</div>' +
              '<div class="bar"><div style="width:' + (x[1]/total*100).toFixed(0) + '%"></div>' +
              '<span>' + (x[1]/total*100).toFixed(0) + '%</span></div></div>';
          }).join('')) +
    '</div>';
}

/* Compose — the main tab */
function renderCompose(){
  if (!state.products.length) {
    $('view').innerHTML = navRow('bmr') +
      '<div class="empty-state"><h3>No products yet</h3><p>Add a product first.</p></div>';
    return;
  }
  if (!state.materials.length) {
    $('view').innerHTML = navRow('bmr') +
      '<div class="empty-state"><h3>No raw materials yet</h3><p>Add materials first.</p></div>';
    return;
  }
  const product = state.products.find(p => p.id === state.activeProduct) || state.products[0];
  state.activeProduct = product.id;
  if (!state.activeVersion) state.activeVersion = product.id + '-V1.0';
  const formProfile = detectForm(product.form);
  const stages = state.stages || {lab:0,stability:0,pilot:0,commercial:0};
  const dref = docRefFor(product.id);

  // Yield preview based on product unit weight / fill volume
  const isLiquid = /liquid|syrup|drop|solution|suspension|emulsion|inject/i.test(product.form || '');
  let yieldNote = '';
  if (isLiquid) {
    yieldNote = product.fillVolumeMl > 0
      ? 'Will count bottles/units (' + product.fillVolumeMl + ' mL fill)'
      : 'No fill volume set — add it in Product Master to count units';
  } else {
    yieldNote = product.unitWeightMg > 0
      ? 'Will count units (' + product.unitWeightMg + ' mg unit weight)'
      : 'No unit weight set — add it in Product Master to count units';
  }

  $('view').innerHTML =
    navRow('bmr') + stageTiles(stages) +
    '<div class="bmr-card">' +
      '<div class="top">' +
        '<div class="left">' +
          '<div class="eyebrow">Batch Manufacturing Record (BMR)</div>' +
          '<h2>' + (dref ? esc(dref) : '<span class="muted" style="font-family:inherit;font-size:14px">No version logged yet</span>') + '</h2>' +
          '<div class="bmr-meta">' +
            '<span class="meta-chip">Stage: Pilot Batch Trial</span>' +
            '<span class="meta-chip outline">' + esc(product.form) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="right">' +
          '<button class="btn btn-purple" data-action="aiAssistant">✦ AI Assistant</button>' +
          '<button class="btn btn-outline" data-action="resetForm">↻ Reset</button>' +
          '<button class="btn btn-outline" onclick="window.print()">⬇ PDF</button>' +
          '<button class="btn btn-outline" onclick="window.print()">🖨 Print</button>' +
          (dref ? '<button class="btn btn-green" data-action="openIssue">💾 Save BMR</button>' : '') +
        '</div>' +
      '</div>' +
      '<div class="engine-head">' +
        '<div><h3>⚙ Dosage Formulation Engine</h3>' +
        '<p>Switch dosage category to configure units, density, unit weight, and CPP test criteria.</p></div>' +
        '<div class="engine-actions">' +
          '<button class="btn btn-purple" data-action="aiAssistant">✦ Auto-Formulate</button>' +
          '<button class="btn btn-outline" data-action="loadTemplate">Load Standard Template</button>' +
        '</div>' +
      '</div>' +
      '<div class="form-chips">' +
        DOSAGE_FORMS.map(function(d){
          const active = d.short === formProfile.short;
          return '<button class="form-chip ' + (active?'active':'') + '" ' +
            'data-action="changeDosageForm" ' +
            'data-payload=\'' + JSON.stringify({form: d.name}).replace(/'/g,"&#39;") + '\'>' +
            '<div class="chip-title">' + esc(d.short) + '</div>' +
            '<div class="chip-sub">' + esc(d.sub) + '</div></button>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<div class="bmr-card">' +
      '<div class="eyebrow">Formulation Record</div>' +
      '<div class="field-row" style="margin-top:14px">' +
        '<div class="field"><label>Product</label>' +
          '<select onchange="state.activeProduct=this.value;state.activeVersion=this.value+\'-V1.0\';renderCompose()">' +
          state.products.map(function(p){
            return '<option value="' + p.id + '" ' + (p.id===product.id?'selected':'') + '>' +
              esc(p.id) + ' — ' + esc(p.name) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="field"><label>Formulation Version</label>' +
          '<input value="' + esc(state.activeVersion) + '" onchange="state.activeVersion=this.value;recalc()"></div>' +
        '<div class="field"><label>Batch Volume (' + (isLiquid?'L':'kg') + ')</label>' +
          '<input type="number" value="' + state.batchVolume + '" onchange="state.batchVolume=parseFloat(this.value)||1000;recalc()"></div>' +
      '</div>' +
      '<div class="callout info" style="margin-top:10px">' + esc(yieldNote) + '</div>' +
      '<div class="row-between" style="margin-bottom:14px">' +
        '<div class="muted" style="font-size:12.5px"><b>Form:</b> ' + esc(product.form) + '</div>' +
        '<div class="row">' +
          '<button class="btn btn-primary" onclick="recalc()">↻ Recalculate</button>' +
          '<button class="btn btn-primary" data-action="openPicker">+ Add Ingredients</button>' +
        '</div>' +
      '</div>' +
      '<div id="calcSlot"></div>' +
    '</div>' +
    '<div id="pickerSlot"></div>' +
    '<div id="panelSlot"></div>';

  recalc();
}

async function recalc(){
  const slot = $('calcSlot'); if (!slot) return;
  slot.innerHTML = '<p class="muted">Calculating…</p>';
  try {
    const c = await api('calculate', {
      productId: state.activeProduct,
      versionId: state.activeVersion,
      batchVolume: state.batchVolume
    });
    state.calc = c;
    paintCalc(c);
  } catch(e){
    slot.innerHTML = '<p class="status-strip error">' + esc(e.message) + '</p>';
  }
}

function paintCalc(c){
  const over = c.lines.filter(l => l.overLimit);
  const yieldLabel = c.yieldUnit === 'units' ? 'Theoretical Units' : 'Theoretical Mass';

  $('calcSlot').innerHTML =
    (over.length ? '<div class="callout fail"><b>⚠ ' + over.length +
      ' line(s) exceed the daily limit</b>' +
      over.map(l => '<br>• ' + esc(l.ingredient) + ' — ' + l.dailyDose +
        ' mg/day vs ' + esc(l.matLimit)).join('') + '</div>' : '') +
    (c.lines.length && !c.balanced ? '<div class="callout warn"><b>Not balanced:</b> ' +
      c.totalPct + '% (target 100.00%)</div>' : '') +
    '<div class="field-row" style="margin-top:14px">' +
      '<div class="field"><label>Dosage Form</label><input value="' + esc(c.product.form) + '" readonly></div>' +
      '<div class="field"><label>Basis</label><input value="' + esc(c.basis) + '" readonly></div>' +
      '<div class="field"><label>Batch Volume</label><input value="' + c.batchVolume + (c.isLiquid?' L':' kg') + '" readonly></div>' +
      '<div class="field"><label>' + yieldLabel + '</label><input value="' +
        c.theoreticalYield.toLocaleString() + ' ' + esc(c.yieldUnit) + '" readonly></div>' +
      '<div class="field" style="grid-column:span 2"><label>Yield Formula</label>' +
        '<input value="' + esc(c.yieldReason||'') + '" readonly></div>' +
      '<div class="field"><label>Total %</label><input value="' + c.totalPct + '%" readonly></div>' +
      '<div class="field"><label>Total Cost</label><input value="' + money(c.totalCost) + '" readonly></div>' +
    '</div>' +
    '<div style="overflow-x:auto;margin-top:12px">' +
    '<table><thead><tr>' +
      '<th>Recipe ID</th><th>Ingredient</th><th>Phase</th><th>Category</th>' +
      '<th>Unit Qty</th><th>Overage</th><th>% w/w</th><th>Batch (kg)</th>' +
      '<th>Cost ' + CURRENCY + '</th><th>Daily Dose</th><th>Limit</th><th>Check</th><th></th>' +
    '</tr></thead><tbody>' +
    (c.lines.length === 0
      ? '<tr><td colspan="13" class="muted" style="text-align:center;padding:22px">' +
        'No ingredients yet. Click <b>+ Add Ingredients</b>.</td></tr>'
      : c.lines.map(function(l){
          return '<tr>' +
            '<td><span style="font-family:monospace">' + esc(l.recipeId) + '</span></td>' +
            '<td><b>' + esc(l.ingredient) + '</b></td>' +
            '<td><small>' + esc(l.phase) + '</small></td>' +
            '<td><small>' + esc(l.matCategory) + '</small></td>' +
            '<td>' + l.unitQty + ' ' + esc(l.unit) + '</td>' +
            '<td>' + (l.overage||0) + '</td>' +
            '<td>' + l.pct + '%</td>' +
            '<td>' + l.batchKg + '</td>' +
            '<td>' + (l.costPerBatch ? money(l.costPerBatch) : '—') + '</td>' +
            '<td>' + l.dailyDose + '</td>' +
            '<td><small>' + esc(l.matLimit) + '</small></td>' +
            '<td>' + (l.overLimit ? '<span class="pill pill-fail">OVER</span>' :
                       '<span class="pill pill-ok">OK</span>') + '</td>' +
            '<td><button class="btn btn-danger btn-xs" data-action="deleteRecipe" ' +
              'data-payload=\'' + JSON.stringify({recipeId: l.recipeId}).replace(/'/g,"&#39;") +
              '\'>✕</button></td>' +
          '</tr>';
        }).join('')) +
    (c.lines.length ?
      '<tr class="total-row"><td colspan="6">TOTAL</td>' +
      '<td>' + c.totalPct + '%</td>' +
      '<td>' + c.lines.reduce((s,l)=>s+l.batchKg,0).toFixed(3) + '</td>' +
      '<td>' + money(c.totalCost) + '</td>' +
      '<td colspan="4">' + (c.balanced?'Balanced':'Adjust q.s.') + '</td></tr>' : '') +
    '</tbody></table></div>';
}

/* Ingredient picker — same as before */
function openPicker(){
  const product = state.products.find(p => p.id === state.activeProduct);
  if (!product) return alert('Pick a product first');
  if (!state.materials.length) return alert('Add raw materials first');
  const phases = ['Phase A (API Active Blending)','Phase B (Pre-mix)',
    'Phase C (Bulk Make-up)','Phase D (q.s. / Adjust)',
    'Stage 1 (Dispensing)','Stage 2 (Processing)','Stage 3 (Packaging)'];
  const sorted = state.materials.slice().sort((a,b) => a.name.localeCompare(b.name));
  $('pickerSlot').innerHTML =
    '<div class="panel"><div class="row-between" style="margin-bottom:14px">' +
      '<h3 style="margin:0">Add Ingredients — Multi-Pick</h3>' +
      '<div class="row">' +
        '<button class="btn btn-green" data-action="saveBulk">💾 Save All Selected</button>' +
        '<button class="btn btn-outline" onclick="$(\'pickerSlot\').innerHTML=\'\'">Cancel</button>' +
      '</div></div>' +
      '<div class="callout info">Tick ingredients, enter quantities, then Save All Selected.</div>' +
      '<div class="field-row" style="margin-bottom:14px">' +
        '<div class="field"><label>Default Phase</label><select id="bulkPhase">' +
          phases.map(p => '<option>'+p+'</option>').join('') + '</select></div>' +
        '<div class="field"><label>Filter</label>' +
          '<input placeholder="Type to filter…" oninput="filterPicker(this.value)"></div>' +
      '</div>' +
      '<div class="picker-wrap"><table><thead><tr>' +
        '<th style="width:34px"></th><th>ID</th><th>Name</th><th>Category</th>' +
        '<th>Limit</th><th style="width:100px">Unit Qty</th><th style="width:80px">Unit</th>' +
        '<th style="width:70px">Over%</th><th>Notes</th>' +
      '</tr></thead><tbody>' +
      sorted.map(function(m){
        return '<tr data-name="' + esc(m.name.toLowerCase()) + '" data-cat="' +
          esc((m.category||'').toLowerCase()) + '">' +
          '<td><input type="checkbox" class="pick" data-mat="' + esc(m.name) +
            '" onchange="toggleRow(this)"></td>' +
          '<td>' + esc(m.id) + '</td>' +
          '<td><b>' + esc(m.name) + '</b></td>' +
          '<td><small>' + esc(m.category||'') + '</small></td>' +
          '<td><small>' + esc(m.limit||'') + '</small></td>' +
          '<td><input type="number" class="qty" step="0.001" disabled></td>' +
          '<td><select class="unit" disabled>' +
            ['mg','g','mL','IU','mcg'].map(u => '<option>'+u+'</option>').join('') +
          '</select></td>' +
          '<td><input type="number" class="ov" value="0" step="0.1" disabled></td>' +
          '<td><input type="text" class="notes" disabled></td>' +
        '</tr>';
      }).join('') + '</tbody></table></div>' +
      '<div style="text-align:right;margin-top:14px"><span id="pickCount" class="muted" style="font-size:12.5px"></span></div>' +
    '</div>';
  updateCount();
}
function toggleRow(cb){
  const row = cb.closest('tr');
  row.querySelectorAll('input:not(.pick), select').forEach(el => el.disabled = !cb.checked);
  updateCount();
}
function updateCount(){
  const picks = document.querySelectorAll('.pick:checked');
  let ready = 0;
  picks.forEach(cb => {
    const row = cb.closest('tr');
    if ((parseFloat(row.querySelector('.qty').value)||0) > 0) ready++;
  });
  const el = $('pickCount');
  if (el) el.textContent = picks.length ? ready + ' of ' + picks.length + ' ready' : 'Nothing selected';
}
function filterPicker(q){
  q = (q||'').toLowerCase();
  document.querySelectorAll('.picker-wrap tbody tr').forEach(function(row){
    const n = row.getAttribute('data-name') || '';
    const c = row.getAttribute('data-cat') || '';
    row.style.display = (!q || n.indexOf(q) >= 0 || c.indexOf(q) >= 0) ? '' : 'none';
  });
}
async function submitBulk(){
  const picks = document.querySelectorAll('.pick:checked');
  if (!picks.length) return alert('Tick at least one ingredient.');
  const phase = $('bulkPhase').value;
  const product = state.products.find(p => p.id === state.activeProduct);
  const lines = [];
  for (const cb of picks) {
    const row = cb.closest('tr');
    const qty = parseFloat(row.querySelector('.qty').value) || 0;
    if (!qty) return alert('Missing qty for ' + cb.getAttribute('data-mat'));
    lines.push({
      recipeId:'', version: state.activeVersion, productId: product.id,
      product: product.name, ingredient: cb.getAttribute('data-mat'),
      phase: phase, unitQty: qty, unit: row.querySelector('.unit').value,
      overage: parseFloat(row.querySelector('.ov').value)||0,
      notes: row.querySelector('.notes').value.trim(),
      date: new Date().toISOString()
    });
  }
  try {
    setStatus('Saving ' + lines.length + ' line(s)…');
    await api('saveRecipeBulk', {lines:lines, user: state.currentUser ? state.currentUser.id : ''});
    $('pickerSlot').innerHTML = '';
    setStatus('Saved ' + lines.length + ' line(s).');
    recalc();
  } catch(e){ setStatus('Failed: ' + e.message, true); }
}
async function deleteRecipe(rid){
  if (!confirm('Delete ' + rid + '?')) return;
  try {
    await api('deleteRecipe', {recipeId: rid, user: state.currentUser ? state.currentUser.id : ''});
    recalc();
  } catch(e){ setStatus('Failed: ' + e.message, true); }
}

/* Products — with new unit weight + fill volume fields */
function renderProducts(){
  $('view').innerHTML =
    navRow('products') +
    '<div class="bmr-card"><div class="row-between">' +
      '<div><div class="eyebrow">Product Master</div>' +
      '<h2 style="font-family:inherit;font-size:17px;color:var(--teal-dark);letter-spacing:0;margin-top:4px">' +
      state.products.length + ' product(s)</h2></div>' +
      '<button class="btn btn-primary" data-action="newProduct">+ New Product</button>' +
    '</div>' +
    (state.products.length === 0
      ? '<p class="muted" style="margin-top:14px">No products yet.</p>'
      : '<table style="margin-top:16px"><thead><tr>' +
        '<th>ID</th><th>Name</th><th>Form</th><th>Unit Wt</th><th>Fill Vol</th><th>Status</th><th></th>' +
        '</tr></thead><tbody>' +
        state.products.map(function(p){
          return '<tr><td>' + esc(p.id) + '</td><td><b>' + esc(p.name) + '</b></td>' +
            '<td>' + esc(p.form) + '</td>' +
            '<td>' + (p.unitWeightMg ? p.unitWeightMg + ' mg' : '—') + '</td>' +
            '<td>' + (p.fillVolumeMl ? p.fillVolumeMl + ' mL' : '—') + '</td>' +
            '<td>' + statusPill(p.status) + '</td>' +
            '<td><button class="btn btn-outline btn-xs" data-action="editProduct" ' +
              'data-payload=\'' + JSON.stringify({product:p}).replace(/'/g,"&#39;") +
              '\'>Edit</button></td></tr>';
        }).join('') + '</tbody></table>') +
    '</div><div id="panelSlot"></div>';
}

function openProductForm(p){
  p = p || { id:'', name:'', category:'', form:DOSAGE_FORMS[0].name, delivery:'',
            packSize:'', shelfLife:24, storage:'', status:PRODUCT_STATUSES[0],
            unitWeightMg:0, fillVolumeMl:0 };
  $('panelSlot').innerHTML =
    '<div class="panel"><h3>' + (p.id?'Edit':'New') + ' Product</h3>' +
    '<div class="field-row">' +
      '<div class="field"><label>Product ID</label><input id="pf_id" value="' + esc(p.id) + '" placeholder="auto"></div>' +
      '<div class="field"><label>Name</label><input id="pf_name" value="' + esc(p.name) + '"></div>' +
      '<div class="field"><label>Category</label><input id="pf_cat" value="' + esc(p.category) + '"></div>' +
      '<div class="field"><label>Dosage Form</label><select id="pf_form">' +
        DOSAGE_FORMS.map(d => '<option ' + (d.name===p.form?'selected':'') + '>' + d.name + '</option>').join('') +
      '</select></div>' +
    '</div>' +
    '<div class="field-row">' +
      '<div class="field"><label>Unit Weight (mg) — for solids</label>' +
        '<input id="pf_unit" type="number" step="0.1" value="' + (p.unitWeightMg||'') + '" placeholder="e.g. 500"></div>' +
      '<div class="field"><label>Fill Volume (mL) — for liquids</label>' +
        '<input id="pf_fill" type="number" step="0.1" value="' + (p.fillVolumeMl||'') + '" placeholder="e.g. 100"></div>' +
      '<div class="field"><label>Pack Size</label><input id="pf_pack" value="' + esc(p.packSize) + '"></div>' +
      '<div class="field"><label>Shelf Life (months)</label><input id="pf_shelf" type="number" value="' + (p.shelfLife||24) + '"></div>' +
      '<div class="field"><label>Status</label><select id="pf_status">' +
        PRODUCT_STATUSES.map(s => '<option ' + (s===p.status?'selected':'') + '>' + s + '</option>').join('') +
      '</select></div>' +
    '</div>' +
    '<div class="callout info">Fill in <b>Unit Weight</b> for tablets/capsules, or <b>Fill Volume</b> for liquids. ' +
    'The app uses these to convert your batch mass into unit counts.</div>' +
    '<div class="row" style="margin-top:16px;justify-content:flex-end">' +
      '<button class="btn btn-outline" onclick="$(\'panelSlot\').innerHTML=\'\'">Cancel</button>' +
      '<button class="btn btn-green" data-action="saveProduct">Save Product</button>' +
    '</div></div>';
}
async function submitProduct(){
  const p = {
    id: $('pf_id').value.trim(), name: $('pf_name').value.trim(),
    category: $('pf_cat').value.trim(), form: $('pf_form').value,
    delivery:'', packSize: $('pf_pack').value.trim(),
    shelfLife: parseFloat($('pf_shelf').value)||24, storage:'',
    status: $('pf_status').value,
    unitWeightMg: parseFloat($('pf_unit').value)||0,
    fillVolumeMl: parseFloat($('pf_fill').value)||0
  };
  if (!p.name) return alert('Name required');
  try {
    setStatus('Saving…');
    await api('saveProduct', {product: p, user: state.currentUser ? state.currentUser.id : ''});
    $('panelSlot').innerHTML = '';
    await reload();
  } catch(e){ setStatus('Failed: ' + e.message, true); }
}

/* Materials */
function renderMaterials(){
  $('view').innerHTML = navRow('materials') +
    '<div class="bmr-card"><div class="row-between">' +
      '<div><div class="eyebrow">Raw Materials</div>' +
      '<h2 style="font-family:inherit;font-size:17px;color:var(--teal-dark);letter-spacing:0;margin-top:4px">' +
      state.materials.length + ' material(s)</h2></div>' +
      '<button class="btn btn-primary" data-action="newMaterial">+ New Material</button></div>' +
      (state.materials.length === 0
        ? '<p class="muted" style="margin-top:14px">No materials yet.</p>'
        : '<div style="margin-top:16px">' +
          '<input placeholder="Filter…" style="width:100%;padding:8px 11px;border:1px solid var(--line);border-radius:8px;margin-bottom:12px" ' +
          'oninput="state.matFilter=this.value;paintMaterials()" value="' + esc(state.matFilter||'') + '">' +
          '<div id="matTable"></div></div>') +
    '</div><div id="panelSlot"></div>';
  if (state.materials.length) paintMaterials();
}
function paintMaterials(){
  const q = (state.matFilter||'').toLowerCase();
  const list = state.materials.filter(m => !q ||
    m.name.toLowerCase().indexOf(q) >= 0 ||
    m.id.toLowerCase().indexOf(q) >= 0 ||
    (m.category||'').toLowerCase().indexOf(q) >= 0);
  $('matTable').innerHTML =
    '<table><thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Limit</th>' +
    '<th>Cost ' + CURRENCY + '/kg</th><th></th></tr></thead><tbody>' +
    list.map(m => '<tr><td>' + esc(m.id) + '</td><td><b>' + esc(m.name) + '</b></td>' +
      '<td><small>' + esc(m.category) + '</small></td><td>' + esc(m.limit) + '</td>' +
      '<td>' + (m.cost ? money(m.cost) : '—') + '</td>' +
      '<td><button class="btn btn-outline btn-xs" data-action="editMaterial" ' +
      'data-payload=\'' + JSON.stringify({material:m}).replace(/'/g,"&#39;") +
      '\'>Edit</button></td></tr>').join('') + '</tbody></table>';
}
function openMaterialForm(m){
  m = m || { id:'', name:'', form:'', category:'', limit:'', density:'', cost:'', storage:'' };
  $('panelSlot').innerHTML =
    '<div class="panel"><h3>' + (m.id?'Edit':'New') + ' Material</h3>' +
    '<div class="field-row">' +
      '<div class="field"><label>ID</label><input id="mf_id" value="' + esc(m.id) + '" placeholder="auto"></div>' +
      '<div class="field"><label>Name</label><input id="mf_name" value="' + esc(m.name) + '"></div>' +
      '<div class="field"><label>Form</label><input id="mf_form" value="' + esc(m.form) + '"></div>' +
      '<div class="field"><label>Category</label><input id="mf_cat" value="' + esc(m.category) + '"></div>' +
      '<div class="field"><label>Max Limit</label><input id="mf_limit" value="' + esc(m.limit) + '"></div>' +
      '<div class="field"><label>Density</label><input id="mf_den" type="number" step="0.01" value="' + (m.density||'') + '"></div>' +
      '<div class="field"><label>Cost ' + CURRENCY + '/kg</label><input id="mf_cost" type="number" step="0.01" value="' + (m.cost||'') + '"></div>' +
    '</div>' +
    '<div class="field-row"><div class="field" style="grid-column:1/-1"><label>Storage</label>' +
      '<textarea id="mf_storage">' + esc(m.storage) + '</textarea></div></div>' +
    '<div class="row" style="margin-top:16px;justify-content:flex-end">' +
      '<button class="btn btn-outline" onclick="$(\'panelSlot\').innerHTML=\'\'">Cancel</button>' +
      '<button class="btn btn-green" data-action="saveMaterial">Save Material</button>' +
    '</div></div>';
}
async function submitMaterial(){
  const m = { id:$('mf_id').value.trim(), name:$('mf_name').value.trim(),
    form:$('mf_form').value.trim(), category:$('mf_cat').value.trim(),
    limit:$('mf_limit').value.trim(), density:parseFloat($('mf_den').value)||0,
    cost:parseFloat($('mf_cost').value)||0, storage:$('mf_storage').value.trim() };
  if (!m.name) return alert('Name required');
  try { setStatus('Saving…');
    await api('saveMaterial', {mat:m, user: state.currentUser ? state.currentUser.id : ''});
    $('panelSlot').innerHTML = '';
    await reload();
  } catch(e){ setStatus('Failed: ' + e.message, true); }
}

/* Trials — same as before with new dispositions in the issue form */
function renderTrials(){
  if (!state.products.length) {
    $('view').innerHTML = navRow('trials') +
      '<div class="empty-state"><h3>No products yet</h3></div><div id="panelSlot"></div>';
    return;
  }
  const product = state.products.find(p => p.id === state.activeProduct) || state.products[0];
  state.activeProduct = product.id;
  const vs = state.versions.filter(v => v.productId === product.id);
  $('view').innerHTML = navRow('trials') +
    '<div class="bmr-card"><div class="row-between">' +
      '<div><div class="eyebrow">BMR Trials Log</div>' +
      '<h2 style="font-family:inherit;font-size:17px;color:var(--teal-dark);letter-spacing:0;margin-top:4px">' +
      esc(product.id) + ' — ' + esc(product.name) + '</h2></div>' +
      '<button class="btn btn-primary" data-action="newVersion">+ New Version</button></div>' +
      (vs.length === 0
        ? '<p class="muted" style="margin-top:14px">No versions yet.</p>'
        : '<table style="margin-top:16px"><thead><tr>' +
          '<th>Version</th><th>Stage</th><th>Status</th><th>Failure</th><th>Date</th><th></th>' +
          '</tr></thead><tbody>' +
          vs.slice().reverse().map(v => '<tr>' +
            '<td><span style="font-family:monospace"><b>' + esc(v.versionId) + '</b></span></td>' +
            '<td>' + stagePill(v.stage) + '</td><td>' + statusPill(v.status) + '</td>' +
            '<td>' + esc(v.failureCategory||'—') + '</td>' +
            '<td>' + esc(String(v.date).slice(0,10)) + '</td>' +
            '<td><button class="btn btn-outline btn-xs" data-action="goStepsFor" ' +
              'data-payload=\'' + JSON.stringify({versionId: v.versionId}).replace(/'/g,"&#39;") +
              '\'>Steps</button> ' +
            '<button class="btn btn-danger btn-xs" data-action="deleteVersion" ' +
              'data-payload=\'' + JSON.stringify({versionId: v.versionId}).replace(/'/g,"&#39;") +
              '\'>✕</button></td></tr>').join('') +
          '</tbody></table>') +
    '</div><div id="panelSlot"></div>';
}
function openVersionForm(){
  const existing = state.versions.filter(x => x.productId === state.activeProduct);
  const next = existing.length
    ? (Math.max.apply(null, existing.map(x => parseFloat(String(x.version).split('.')[1]||0))) + 1).toFixed(1)
    : '1.0';
  const vid = state.activeProduct + '-V' + next;
  $('panelSlot').innerHTML = '<div class="panel"><h3>New Trial Version</h3>' +
    '<div class="callout info">Version ID follows <b>PRD-XXX-Vmajor.minor</b>.</div>' +
    '<div class="field-row">' +
      '<div class="field"><label>Version ID</label><input id="vf_id" value="' + esc(vid) + '" readonly></div>' +
      '<div class="field"><label>Stage</label><select id="vf_stage">' +
        STAGES.map(s => '<option>'+s+'</option>').join('') + '</select></div>' +
      '<div class="field"><label>Status</label><select id="vf_status" onchange="toggleFail()">' +
        STATUSES.map(s => '<option>'+s+'</option>').join('') + '</select></div>' +
      '<div class="field"><label>Failure Category</label><select id="vf_cat"><option value="">—</option>' +
        FAIL_CATS.map(c => '<option>'+c+'</option>').join('') + '</select></div>' +
    '</div>' +
    '<div class="field-row">' +
      '<div class="field" style="grid-column:1/-1"><label>Failure Reason (min 20 on FAIL)</label>' +
        '<textarea id="vf_reason"></textarea></div>' +
      '<div class="field"><label>Observed</label><input id="vf_obs"></div>' +
      '<div class="field"><label>Expected</label><input id="vf_exp"></div>' +
      '<div class="field" style="grid-column:1/-1"><label>CAPA (min 10 on FAIL)</label>' +
        '<textarea id="vf_capa"></textarea></div>' +
    '</div>' +
    '<div class="row" style="margin-top:16px;justify-content:flex-end">' +
      '<button class="btn btn-outline" onclick="$(\'panelSlot\').innerHTML=\'\'">Cancel</button>' +
      '<button class="btn btn-green" data-action="saveVersion">Save Version</button>' +
    '</div></div>';
  toggleFail();
}
function toggleFail(){
  const el = $('vf_status'); if (!el) return;
  const fail = el.value === 'FAIL';
  ['vf_cat','vf_reason','vf_obs','vf_exp','vf_capa'].forEach(function(id){
    const x = $(id); if (x) { x.disabled = !fail; x.style.opacity = fail ? '1' : '.5'; }
  });
}
async function submitVersion(){
  const v = {
    versionId: $('vf_id').value.trim(), productId: state.activeProduct,
    version: $('vf_id').value.split('-V')[1] || '1.0',
    stage: $('vf_stage').value, status: $('vf_status').value,
    failureCategory: $('vf_cat').value, failureReason: $('vf_reason').value.trim(),
    observedValue: $('vf_obs').value.trim(), expectedValue: $('vf_exp').value.trim(),
    correctiveAction: $('vf_capa').value.trim(),
    loggedBy: state.currentUser ? state.currentUser.id : '',
    date: new Date().toISOString()
  };
  try { setStatus('Saving…');
    await api('saveVersion', {version: v, user: state.currentUser ? state.currentUser.id : ''});
    $('panelSlot').innerHTML = '';
    await reload();
  } catch(e){ setStatus('Failed: ' + e.message, true); }
}
async function deleteVersion(vid){
  if (!confirm('Delete ' + vid + '?')) return;
  try { await api('deleteVersion', {versionId: vid, user: state.currentUser ? state.currentUser.id : ''}); await reload(); }
  catch(e){ setStatus('Failed: ' + e.message, true); }
}

/* Steps */
function renderSteps(){
  if (!state.versions.length) {
    $('view').innerHTML = navRow('steps') + '<div class="empty-state"><h3>No versions yet</h3></div><div id="panelSlot"></div>';
    return;
  }
  const vid = state.stepsVersion || state.versions[0].versionId;
  state.stepsVersion = vid;
  $('view').innerHTML = navRow('steps') +
    '<div class="bmr-card"><div class="row-between">' +
      '<div><div class="eyebrow">Production Steps</div>' +
      '<h2 style="font-family:monospace;font-size:17px;color:var(--teal-dark);letter-spacing:0;margin-top:4px">' +
      esc(vid) + '</h2></div>' +
      '<button class="btn btn-primary" data-action="addStep">+ Add Step</button></div>' +
      '<div class="field-row" style="margin-top:16px"><div class="field"><label>Version</label>' +
      '<select onchange="state.stepsVersion=this.value;loadSteps()">' +
        state.versions.map(v => '<option value="' + v.versionId + '" ' +
          (v.versionId===vid?'selected':'') + '>' + esc(v.versionId) +
          ' • ' + esc(v.stage) + ' • ' + esc(v.status) + '</option>').join('') +
      '</select></div></div>' +
      '<div id="stepsList" style="margin-top:16px">Loading…</div>' +
    '</div><div id="panelSlot"></div>';
  loadSteps();
}
async function loadSteps(){
  try {
    const steps = await api('getSteps', {versionId: state.stepsVersion});
    state.steps = steps;
    const el = $('stepsList');
    if (!steps.length) { el.innerHTML = '<p class="muted">No steps yet.</p>'; return; }
    el.innerHTML = steps.map(s => '<div style="background:var(--teal-soft);border:1px solid var(--line);' +
      'border-radius:10px;padding:14px 16px;margin-bottom:12px">' +
      '<div style="font-weight:700;color:var(--teal-dark);font-size:13.5px;margin-bottom:6px">' +
      'Step ' + s.step + ' — ' + esc(s.stage||'') + '</div>' +
      '<p style="margin:6px 0 10px">' + esc(s.instruction) + '</p>' +
      '<button class="btn btn-danger btn-xs" data-action="deleteStep" ' +
      'data-payload=\'' + JSON.stringify({step:s.step}).replace(/'/g,"&#39;") + '\'>Delete</button>' +
      '</div>').join('');
  } catch(e){ $('stepsList').innerHTML = '<p class="status-strip error">' + esc(e.message) + '</p>'; }
}
function openStepForm(){
  const next = state.steps.length ? Math.max.apply(null, state.steps.map(x => x.step)) + 1 : 1;
  $('panelSlot').innerHTML = '<div class="panel"><h3>New Step</h3>' +
    '<div class="field-row">' +
      '<div class="field"><label>Step #</label><input id="sf_step" type="number" value="' + next + '"></div>' +
      '<div class="field"><label>Stage</label><input id="sf_stage"></div>' +
    '</div>' +
    '<div class="field-row"><div class="field" style="grid-column:1/-1">' +
      '<label>Instruction *</label><textarea id="sf_inst" style="min-height:80px"></textarea></div></div>' +
    '<div class="field-row">' +
      '<div class="field"><label>Equipment</label><input id="sf_eq"></div>' +
      '<div class="field"><label>Target</label><input id="sf_target"></div>' +
      '<div class="field"><label>IPC</label><input id="sf_ipc"></div>' +
      '<div class="field"><label>Duration</label><input id="sf_dur"></div>' +
    '</div>' +
    '<div class="row" style="margin-top:16px;justify-content:flex-end">' +
      '<button class="btn btn-outline" onclick="$(\'panelSlot\').innerHTML=\'\'">Cancel</button>' +
      '<button class="btn btn-green" data-action="saveStep">Save Step</button>' +
    '</div></div>';
}
async function submitStep(){
  const s = { versionId: state.stepsVersion, step: parseInt($('sf_step').value,10)||1,
    stage: $('sf_stage').value.trim(), instruction: $('sf_inst').value.trim(),
    equipment: $('sf_eq').value.trim(), target: $('sf_target').value.trim(),
    ipc: $('sf_ipc').value.trim(), duration: $('sf_dur').value.trim() };
  try { await api('saveStep', {step:s, user: state.currentUser ? state.currentUser.id : ''});
    $('panelSlot').innerHTML = ''; loadSteps();
  } catch(e){ setStatus('Failed: ' + e.message, true); }
}
async function deleteStep(step){
  if (!confirm('Delete step ' + step + '?')) return;
  try { await api('deleteStep', {versionId: state.stepsVersion, step: step, user: state.currentUser ? state.currentUser.id : ''}); loadSteps(); }
  catch(e){ setStatus('Failed: ' + e.message, true); }
}

/* Archive */
async function renderArchive(){
  $('view').innerHTML = navRow('archive') +
    '<div class="bmr-card"><div class="eyebrow">BMR Archive</div>' +
    '<div id="archTable" style="margin-top:14px">Loading…</div></div>';
  try {
    const rows = await api('getArchive');
    if (!rows.length) { $('archTable').innerHTML = '<p class="muted">No BMRs issued yet.</p>'; return; }
    $('archTable').innerHTML = '<table><thead><tr><th>Doc Ref</th><th>Version</th><th>Product</th>' +
      '<th>Batch No</th><th>Issued At</th><th>Disposition</th></tr></thead><tbody>' +
      rows.slice().reverse().map(r => '<tr>' +
        '<td><span style="font-family:monospace">' + esc(r.docRef) + '</span></td>' +
        '<td>' + esc(r.versionId) + '</td><td>' + esc(r.productId) + '</td>' +
        '<td>' + esc(r.batchNo) + '</td>' +
        '<td>' + esc(String(r.issuedAt).slice(0,19)) + '</td>' +
        '<td>' + statusPill(r.disposition) + '</td></tr>').join('') +
      '</tbody></table>';
  } catch(e){ $('archTable').innerHTML = '<p class="status-strip error">' + esc(e.message) + '</p>'; }
}

/* Pipeline */
function renderPipeline(){
  const s = state.stages || {lab:0,stability:0,pilot:0,commercial:0};
  $('view').innerHTML = navRow('pipeline') + stageTiles(s) +
    '<div class="bmr-card"><div class="eyebrow">Pipeline Overview</div>' +
    '<p style="margin-top:12px;font-size:13.5px">' +
    'Products by development stage: <b>' + (s.lab||0) + '</b> in Lab, ' +
    '<b>' + (s.pilot||0) + '</b> at Pilot, <b>' + (s.stability||0) + '</b> in Stability, ' +
    '<b>' + (s.commercial||0) + '</b> Commercial. Update each product\'s ' +
    '<b>Development Status</b> in Product Master to move it between tiles.</p></div>';
}

/* Setup */
function renderSetup(){
  $('view').innerHTML = navRow('setup') +
    '<div class="bmr-card"><div class="eyebrow">Setup &amp; Health</div>' +
    '<div class="callout info" style="margin-top:14px">' +
      '<b>Backend:</b> ' + esc(API_URL) + '<br>' +
      '<b>Currency:</b> ' + CURRENCY + '<br>' +
      '<b>Products:</b> ' + state.products.length + '<br>' +
      '<b>Materials:</b> ' + state.materials.length + '<br>' +
      '<b>Versions:</b> ' + state.versions.length + '<br>' +
      '<b>Users:</b> ' + state.users.length +
    '</div>' +
    '<div class="row" style="margin-top:16px">' +
      '<button class="btn btn-primary" data-action="reload">↻ Reload all data</button>' +
    '</div></div>';
}

/* AI + Template + Reset + Issue */
function aiAssistant(){
  alert('AI Assistant and Auto-Formulate are visual placeholders. ' +
        'Wire up an API key in Apps Script Script Properties to enable them.');
}
function loadTemplate(){
  const product = state.products.find(p => p.id === state.activeProduct);
  if (!product) return alert('Pick a product first');
  const form = detectForm(product.form);
  const templates = {
    TABLET: ['Active','Cellulose','Lactose','Povidone','Magnesium Stearate','Water'],
    CAPSULE: ['Active','Lactose','Magnesium Stearate'],
    SYRUP: ['Active','Sucrose','Glycerin','Methyl Paraben','Propyl Paraben','Polysorbate','Water'],
    SUSPENSION: ['Active','Xanthan','Polysorbate','Methyl Paraben','Propyl Paraben','Water'],
    SEMI_SOLID: ['Active','Petrolatum','Mineral Oil','Cetyl','Methyl Paraben','Water'],
    DRY_POWDER: ['Active','Lactose','Silicon Dioxide'],
    INJECTION: ['Active','Sodium Chloride','Water']
  };
  const wanted = templates[form.short] || [];
  const available = state.materials.map(m => m.name.toLowerCase());
  const matched = wanted.filter(w => available.some(a => a.indexOf(w.toLowerCase()) >= 0));
  if (!matched.length) { alert('No matching materials for ' + form.short); return; }
  openPicker();
  setTimeout(function(){
    document.querySelectorAll('.pick').forEach(function(cb){
      const n = cb.getAttribute('data-mat').toLowerCase();
      if (matched.some(w => n.indexOf(w.toLowerCase()) >= 0)) { cb.checked = true; toggleRow(cb); }
    });
    setStatus('Template loaded — ' + matched.length + ' ingredient(s) pre-selected.');
  }, 150);
}
function resetForm(){
  state.activeVersion = state.activeProduct + '-V1.0';
  state.batchVolume = 1000;
  renderCompose();
}
function changeDosageForm(form){
  const product = state.products.find(p => p.id === state.activeProduct);
  if (!product) return;
  api('saveProduct', {product: Object.assign({}, product, { form: form }),
    user: state.currentUser ? state.currentUser.id : ''})
    .then(function(){ setStatus('Dosage form set to ' + form); reload(); })
    .catch(function(e){ setStatus('Failed: ' + e.message, true); });
}
function openIssueForm(){
  const product = state.products.find(p => p.id === state.activeProduct);
  if (!product) return alert('Pick a product first');
  const dref = docRefFor(product.id);
  if (!dref) return alert('Log at least one trial version first before saving a BMR.');
  $('panelSlot').innerHTML = '<div class="panel"><h3>Save BMR / Log Trial Outcome</h3>' +
    '<div class="callout info">This is a <b>trial</b> record, not a batch release. ' +
    'Choose what should happen next to this formulation attempt.</div>' +
    '<div class="field-row">' +
      '<div class="field"><label>Doc Ref</label><input value="' + esc(dref) + '" readonly></div>' +
      '<div class="field"><label>Version</label><input value="' + esc(state.activeVersion) + '" readonly></div>' +
      '<div class="field"><label>Batch / Trial No</label><input id="if_batch" value="B-XXX-0000-01"></div>' +
    '</div>' +
    '<div class="field-row">' +
      '<div class="field"><label>Yield Achieved</label><input id="if_yield" placeholder="e.g. 98.6%"></div>' +
      '<div class="field"><label>Trial Outcome</label><select id="if_disp">' +
        TRIAL_DISPOSITIONS.map(d => '<option>' + d + '</option>').join('') +
      '</select></div>' +
    '</div>' +
    '<div class="field-row"><div class="field" style="grid-column:1/-1"><label>Notes</label>' +
      '<textarea id="if_notes"></textarea></div></div>' +
    '<div class="row" style="margin-top:16px;justify-content:flex-end">' +
      '<button class="btn btn-outline" onclick="$(\'panelSlot\').innerHTML=\'\'">Cancel</button>' +
      '<button class="btn btn-green" data-action="submitIssue">Log Trial Outcome</button>' +
    '</div></div>';
}
async function submitIssue(){
  const product = state.products.find(p => p.id === state.activeProduct);
  const rec = {
    docRef: docRefFor(product.id), versionId: state.activeVersion,
    productId: product.id, batchNo: $('if_batch').value,
    yieldAchieved: $('if_yield').value.trim(),
    disposition: $('if_disp').value, notes: $('if_notes').value.trim()
  };
  try {
    await api('logIssuance', {record: rec, user: state.currentUser ? state.currentUser.id : ''});
    $('panelSlot').innerHTML = '';
    setStatus('Trial outcome logged to Archive.');
  } catch(e){ setStatus('Failed: ' + e.message, true); }
}

async function reload(){
  try {
    const d = await api('getAppData');
    Object.assign(state, {
      users: d.users || [], materials: d.materials || [],
      products: d.products || [], versions: d.versions || [],
      recipes: d.recipes || [], trends: d.trends || {}, stages: d.stages || {}
    });
    render();
  } catch(e){ setStatus('Reload failed: ' + e.message, true); }
}

boot();
window.recalc = recalc;
window.toggleRow = toggleRow;
window.filterPicker = filterPicker;
window.loadSteps = loadSteps;
window.toggleFail = toggleFail;
window.renderCompose = renderCompose;
window.paintMaterials = paintMaterials;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function(){});
}