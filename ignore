/* ================================================================
   AFRAB Formulation Studio — Frontend
   Talks to Apps Script REST API via fetch()
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
  { name:'Dry Powder / Sachet / Drops', short:'DRY_POWDER', sub:'Dry Powder / Sachet' },
  { name:'Injection / Sterile', short:'INJECTION', sub:'Injection / Sterile' }
];
const STAGES = ['Lab Bench','Pilot Scale','Stability','Commercial'];
const STATUSES = ['PASS','FAIL','ON HOLD','IN PROGRESS'];
const FAIL_CATS = ['Phase Separation','Assay OOS','Dissolution Fail','pH Out of Range',
  'Appearance','Microbial','Stability','Hardness / Friability','Reconstitution',
  'Weight Variation','Sedimentation','Viscosity Drift','Other'];
const PRODUCT_STATUSES = ['Pilot Trial / Formulation','Pilot Batch Trial',
  'Stability Testing','Commercial / Active','On Hold','Discontinued'];

/* ---------- state ---------- */
const $ = id => document.getElementById(id);
const state = {
  users: [], materials: [], products: [], versions: [], recipes: [],
  trends: {}, stages: {},
  currentUser: null,
  tab: 'formulation',
  activeProduct: '', activeVersion: '', batchVolume: 1000,
  calc: null, steps: [], stepsVersion: '',
  editingRecipe: null, matFilter: ''
};

/* ---------- helpers ---------- */
function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function money(n){ if(n==null || isNaN(n)) return '—';
  return CURRENCY + Number(n).toLocaleString(undefined,
    {minimumFractionDigits:2, maximumFractionDigits:2}); }
function statusPill(s){ s=s||'';
  if (/pass|approv|releas|conform/i.test(s)) return `<span class="pill pill-ok">${esc(s)}</span>`;
  if (/fail|reject|discontinu/i.test(s)) return `<span class="pill pill-fail">${esc(s)}</span>`;
  return `<span class="pill pill-warn">${esc(s)}</span>`; }
function stagePill(s){ s=s||'';
  if (/commercial/i.test(s)) return `<span class="pill pill-ok">${esc(s)}</span>`;
  return `<span class="pill pill-stage">${esc(s)}</span>`; }
function setStatus(msg, isErr){
  const el=$('status'); if(!el) return;
  el.textContent = msg || '';
  el.classList.toggle('error', !!isErr); }

/* ---------- API ---------- */
async function api(action, payload) {
  const body = { action, token: API_TOKEN, payload: payload || {} };
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json.data;
}

/* ---------- nav ---------- */
$('nav').addEventListener('click', e => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.tab = btn.dataset.tab;
  render();
});

/* ---------- boot ---------- */
(async function boot(){
  try {
    setStatus('Loading…');
    const d = await api('getAppData');
    state.users = d.users || [];
    state.materials = d.materials || [];
    state.products = d.products || [];
    state.versions = d.versions || [];
    state.recipes = d.recipes || [];
    state.trends = d.trends || {};
    state.stages = d.stages || {};
    state.currentUser = state.users[0] || null;
    $('userBadge').textContent = state.currentUser
      ? state.currentUser.name + ' — ' + (state.currentUser.role || '')
      : 'No users';
    if (state.products.length) {
      state.activeProduct = state.products[0].id;
      state.activeVersion = state.activeProduct + '-V1.0';
    }
    setStatus(`${state.products.length} products • ${state.materials.length} materials • ${state.versions.length} versions`);
    render();
  } catch (e) {
    setStatus('Failed to load: ' + e.message, true);
  }
})();

/* ================================================================
   ROUTER
   ================================================================ */
function render() {
  setStatus('');
  switch (state.tab) {
    case 'dashboard':   return renderDashboard();
    case 'materials':   return renderMaterials();
    case 'products':    return renderProducts();
    case 'formulation': return renderFormulation();
    case 'trials':      return renderTrials();
    case 'steps':       return renderSteps();
    case 'bmr':         return renderBmr();
    case 'archive':     return renderArchive();
  }
}

/* ================================================================
   DASHBOARD
   ================================================================ */
function renderDashboard() {
  const t = state.trends || { total:0, passed:0, failed:0, byCategory:{} };
  const s = state.stages || { lab:0, stability:0, pilot:0, commercial:0 };
  const total = Object.values(t.byCategory).reduce((a,b)=>a+b,0) || 1;

  $('view').innerHTML = `
    <div class="kpi-grid">
      <div class="kpi"><div class="n">${state.products.length}</div><div class="l">Products</div></div>
      <div class="kpi"><div class="n">${state.materials.length}</div><div class="l">Raw Materials</div></div>
      <div class="kpi"><div class="n">${t.total||0}</div><div class="l">Trial Versions</div></div>
      <div class="kpi"><div class="n">${t.passed||0}</div><div class="l">Passing</div></div>
      <div class="kpi"><div class="n">${t.failed||0}</div><div class="l">Failed</div></div>
    </div>

    <div class="card">
      <h2>Stage Pipeline</h2>
      <div class="kpi-grid" style="margin-bottom:0">
        <div class="kpi"><div class="n">${s.lab||0}</div><div class="l">LAB</div></div>
        <div class="kpi"><div class="n">${s.pilot||0}</div><div class="l">PLT</div></div>
        <div class="kpi"><div class="n">${s.stability||0}</div><div class="l">STB</div></div>
        <div class="kpi"><div class="n">${s.commercial||0}</div><div class="l">COM</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Failure Trends</h2>
      ${t.failed === 0
        ? '<p class="muted">No failures logged.</p>'
        : Object.entries(t.byCategory).sort((a,b)=>b[1]-a[1]).map(([c,n]) => `
            <div style="margin-bottom:10px">
              <div style="font-size:12px;font-weight:600;margin-bottom:3px">${esc(c)} — ${n}</div>
              <div style="height:20px;background:#eef3f2;border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${(n/total*100).toFixed(0)}%;
                            background:var(--warn);border-radius:4px"></div>
              </div>
            </div>`).join('')}
    </div>`;
}

/* ================================================================
   MATERIALS
   ================================================================ */
function renderMaterials() {
  $('view').innerHTML = `
    <div class="card">
      <h2>Raw Materials Database
        <button class="btn btn-primary btn-sm" onclick="openMaterialForm()">+ New Material</button>
      </h2>
      ${state.materials.length === 0
        ? '<div class="empty-state"><h3>No materials yet</h3><p>Click + New Material to add your first.</p></div>'
        : `<input id="matFilter" placeholder="Filter…" style="width:100%;margin-bottom:12px;
                padding:8px 11px;border:1px solid var(--line);border-radius:6px"
                oninput="state.matFilter=this.value; paintMaterials()">
           <div id="matTable"></div>`}
    </div>
    <div id="panelSlot"></div>`;
  if (state.materials.length) paintMaterials();
}

function paintMaterials() {
  const q = (state.matFilter||'').toLowerCase();
  const list = state.materials.filter(m =>
    !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
       || (m.category||'').toLowerCase().includes(q));
  $('matTable').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Limit</th>
        <th>Density</th><th>Cost ${CURRENCY}/kg</th><th></th></tr></thead>
      <tbody>
        ${list.map(m => `
          <tr>
            <td>${esc(m.id)}</td>
            <td><b>${esc(m.name)}</b></td>
            <td><small>${esc(m.category)}</small></td>
            <td>${esc(m.limit)}</td>
            <td>${m.density||'—'}</td>
            <td>${m.cost ? money(m.cost) : '—'}</td>
            <td><button class="btn btn-outline btn-xs"
                  onclick='openMaterialForm(${JSON.stringify(m).replace(/'/g,"&#39;")})'>Edit</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function openMaterialForm(m) {
  m = m || { id:'', name:'', form:'', category:'', limit:'', density:'', cost:'', storage:'' };
  $('panelSlot').innerHTML = `
    <div class="panel">
      <h3>${m.id ? 'Edit' : 'New'} Raw Material</h3>
      <div class="grid">
        <div class="field"><label>Material ID</label><input id="mf_id" value="${esc(m.id)}" placeholder="auto"></div>
        <div class="field"><label>Name</label><input id="mf_name" value="${esc(m.name)}"></div>
        <div class="field"><label>Chemical Form</label><input id="mf_form" value="${esc(m.form)}"></div>
        <div class="field"><label>Category</label><input id="mf_cat" value="${esc(m.category)}"></div>
        <div class="field"><label>Max Limit</label><input id="mf_limit" value="${esc(m.limit)}" placeholder="e.g. 500 mg/day"></div>
        <div class="field"><label>Density (g/mL)</label><input id="mf_den" type="number" step="0.01" value="${m.density||''}"></div>
        <div class="field"><label>Cost (${CURRENCY}/kg)</label><input id="mf_cost" type="number" step="0.01" value="${m.cost||''}"></div>
        <div class="field" style="grid-column:1/-1"><label>Storage</label><textarea id="mf_storage">${esc(m.storage)}</textarea></div>
      </div>
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button class="btn btn-outline" onclick="$('panelSlot').innerHTML=''">Cancel</button>
        <button class="btn btn-green" onclick="submitMaterial()">Save</button>
      </div>
    </div>`;
}

async function submitMaterial() {
  const m = {
    id: $('mf_id').value.trim(), name: $('mf_name').value.trim(),
    form: $('mf_form').value.trim(), category: $('mf_cat').value.trim(),
    limit: $('mf_limit').value.trim(),
    density: parseFloat($('mf_den').value)||0,
    cost: parseFloat($('mf_cost').value)||0,
    storage: $('mf_storage').value.trim()
  };
  if (!m.name) return alert('Name required');
  try {
    setStatus('Saving…');
    await api('saveMaterial', { mat: m, user: state.currentUser?.id||'' });
    $('panelSlot').innerHTML = '';
    await reload();
  } catch (e) { setStatus('Save failed: ' + e.message, true); }
}

/* ================================================================
   PRODUCTS
   ================================================================ */
function renderProducts() {
  $('view').innerHTML = `
    <div class="card">
      <h2>Product Master
        <button class="btn btn-primary btn-sm" onclick="openProductForm()">+ New Product</button>
      </h2>
      ${state.products.length === 0
        ? '<div class="empty-state"><h3>No products yet</h3></div>'
        : `<div id="prodTable"></div>`}
    </div>
    <div id="panelSlot"></div>`;
  if (state.products.length) paintProducts();
}

function paintProducts() {
  $('prodTable').innerHTML = `
    <table>
      <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Dosage Form</th>
        <th>Shelf Life</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${state.products.map(p => `
          <tr>
            <td>${esc(p.id)}</td>
            <td><b>${esc(p.name)}</b></td>
            <td>${esc(p.category)}</td>
            <td>${esc(p.form)}</td>
            <td>${p.shelfLife} mo</td>
            <td>${statusPill(p.status)}</td>
            <td>
              <button class="btn btn-outline btn-xs"
                onclick='openProductForm(${JSON.stringify(p).replace(/'/g,"&#39;")})'>Edit</button>
              <button class="btn btn-outline btn-xs"
                onclick="useForFormulation('${p.id}')">Formulate</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function openProductForm(p) {
  p = p || { id:'', name:'', category:'', form:DOSAGE_FORMS[0].name, delivery:'',
            packSize:'', shelfLife:24, storage:'', status:PRODUCT_STATUSES[0] };
  $('panelSlot').innerHTML = `
    <div class="panel">
      <h3>${p.id ? 'Edit' : 'New'} Product</h3>
      <div class="grid">
        <div class="field"><label>Product ID</label><input id="pf_id" value="${esc(p.id)}" placeholder="auto"></div>
        <div class="field"><label>Name</label><input id="pf_name" value="${esc(p.name)}"></div>
        <div class="field"><label>Category</label><input id="pf_cat" value="${esc(p.category)}"></div>
        <div class="field"><label>Dosage Form</label>
          <select id="pf_form">${DOSAGE_FORMS.map(d =>
            `<option ${d.name===p.form?'selected':''}>${d.name}</option>`).join('')}</select></div>
        <div class="field"><label>Delivery Spec</label><input id="pf_del" value="${esc(p.delivery)}"></div>
        <div class="field"><label>Pack Size</label><input id="pf_pack" value="${esc(p.packSize)}"></div>
        <div class="field"><label>Shelf Life (months)</label><input id="pf_shelf" type="number" value="${p.shelfLife||24}"></div>
        <div class="field" style="grid-column:1/-1"><label>Storage</label><input id="pf_storage" value="${esc(p.storage)}"></div>
        <div class="field"><label>Status</label>
          <select id="pf_status">${PRODUCT_STATUSES.map(s =>
            `<option ${s===p.status?'selected':''}>${s}</option>`).join('')}</select></div>
      </div>
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button class="btn btn-outline" onclick="$('panelSlot').innerHTML=''">Cancel</button>
        <button class="btn btn-green" onclick="submitProduct()">Save</button>
      </div>
    </div>`;
}

async function submitProduct() {
  const p = {
    id: $('pf_id').value.trim(), name: $('pf_name').value.trim(),
    category: $('pf_cat').value.trim(), form: $('pf_form').value,
    delivery: $('pf_del').value.trim(), packSize: $('pf_pack').value.trim(),
    shelfLife: parseFloat($('pf_shelf').value)||24,
    storage: $('pf_storage').value.trim(), status: $('pf_status').value
  };
  if (!p.name) return alert('Name required');
  try {
    setStatus('Saving…');
    await api('saveProduct', { product: p, user: state.currentUser?.id||'' });
    $('panelSlot').innerHTML = '';
    await reload();
  } catch (e) { setStatus('Save failed: ' + e.message, true); }
}

function useForFormulation(pid) {
  state.activeProduct = pid;
  state.activeVersion = pid + '-V1.0';
  state.tab = 'formulation';
  document.querySelectorAll('#nav button').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === 'formulation'));
  render();
}

/* ================================================================
   FORMULATION
   ================================================================ */
function renderFormulation() {
  if (!state.products.length) {
    $('view').innerHTML = '<div class="card"><div class="empty-state"><h3>No products yet</h3><p>Add a product first.</p></div></div>';
    return;
  }
  const product = state.products.find(p => p.id === state.activeProduct) || state.products[0];
  state.activeProduct = product.id;
  if (!state.activeVersion) state.activeVersion = product.id + '-V1.0';

  const profile = dosageProfile(product.form);

  $('view').innerHTML = `
    <div class="card">
      <h2>Formulation Builder
        <span>
          <button class="btn btn-outline btn-sm" onclick="recalc()">Recalculate</button>
          <button class="btn btn-primary btn-sm" onclick="openPicker()">+ Add Ingredients</button>
        </span>
      </h2>
      <div class="grid">
        <div class="field"><label>Product</label>
          <select onchange="onProductChange(this.value)">
            ${state.products.map(p =>
              `<option value="${p.id}" ${p.id===product.id?'selected':''}>${esc(p.id)} — ${esc(p.name)}</option>`).join('')}
          </select></div>
        <div class="field"><label>Version</label>
          <input value="${esc(state.activeVersion)}" onchange="state.activeVersion=this.value; recalc()"></div>
        <div class="field"><label>Batch Volume (${profile.isLiquid?'L':'kg'})</label>
          <input type="number" value="${state.batchVolume}" onchange="state.batchVolume=parseFloat(this.value)||1000; recalc()"></div>
        <div class="field"><label>Dosage Form</label>
          <input value="${esc(product.form)}" readonly></div>
      </div>
      <div class="callout info" style="margin-top:14px">
        <b>Basis:</b> ${esc(profile.basis)} — ${esc(profile.kind)} • <b>Yield unit:</b> ${esc(profile.yieldUnit)}
      </div>
      <div id="calcSlot"></div>
    </div>
    <div id="pickerSlot"></div>`;
  recalc();
}

function onProductChange(pid) {
  state.activeProduct = pid;
  state.activeVersion = pid + '-V1.0';
  renderFormulation();
}

async function recalc() {
  const slot = $('calcSlot');
  if (!slot) return;
  slot.innerHTML = '<p class="muted">Calculating…</p>';
  try {
    const c = await api('calculate', {
      productId: state.activeProduct,
      versionId: state.activeVersion,
      batchVolume: state.batchVolume
    });
    state.calc = c;
    paintCalc(c);
  } catch (e) { slot.innerHTML = `<p class="status error">${esc(e.message)}</p>`; }
}

function paintCalc(c) {
  const over = c.lines.filter(l => l.overLimit);
  $('calcSlot').innerHTML = `
    ${over.length ? `<div class="callout fail"><b>⚠ ${over.length} line(s) exceed daily limit</b>
      ${over.map(l => `<br>• ${esc(l.ingredient)} — ${l.dailyDose} mg/day vs ${esc(l.matLimit)}`).join('')}
    </div>` : ''}
    ${!c.balanced && c.lines.length ? `<div class="callout warn"><b>Not balanced:</b> ${c.totalPct}% (target 100%)</div>` : ''}
    <div class="grid" style="margin-top:12px">
      <div class="field"><label>Theoretical Yield</label><input value="${c.theoreticalYield.toLocaleString()} ${esc(c.yieldUnit)}" readonly></div>
      <div class="field"><label>Total %</label><input value="${c.totalPct}%" readonly></div>
      <div class="field"><label>Total Cost</label><input value="${money(c.totalCost)}" readonly></div>
      <div class="field"><label>Balance</label><input value="${c.balanced?'✓ Balanced':'⚠ Check'}" readonly></div>
    </div>
    <table style="margin-top:14px">
      <thead><tr>
        <th>ID</th><th>Ingredient</th><th>Phase</th>
        <th>Unit Qty</th><th>% w/w</th><th>Batch (kg)</th>
        <th>Cost</th><th>Daily Dose</th><th>Limit</th><th>Check</th><th></th>
      </tr></thead>
      <tbody>
        ${c.lines.length === 0
          ? '<tr><td colspan="11" class="muted" style="text-align:center;padding:20px">No lines yet. Click + Add Ingredients.</td></tr>'
          : c.lines.map(l => `
            <tr>
              <td>${esc(l.recipeId)}</td>
              <td><b>${esc(l.ingredient)}</b></td>
              <td><small>${esc(l.phase)}</small></td>
              <td>${l.unitQty} ${esc(l.unit)}</td>
              <td>${l.pct}%</td>
              <td>${l.batchKg}</td>
              <td>${l.costPerBatch ? money(l.costPerBatch) : '—'}</td>
              <td>${l.dailyDose}</td>
              <td><small>${esc(l.matLimit)}</small></td>
              <td>${l.overLimit ? '<span class="pill pill-fail">OVER</span>' : '<span class="pill pill-ok">OK</span>'}</td>
              <td><button class="btn btn-danger btn-xs" onclick="deleteRecipe('${l.recipeId}')">✕</button></td>
            </tr>`).join('')}
        ${c.lines.length ? `
          <tr class="total-row">
            <td colspan="4">TOTAL</td>
            <td>${c.totalPct}%</td>
            <td>${c.lines.reduce((s,l)=>s+l.batchKg,0).toFixed(3)}</td>
            <td>${money(c.totalCost)}</td>
            <td colspan="4">${c.balanced?'Balanced':'Adjust q.s.'}</td>
          </tr>` : ''}
      </tbody>
    </table>`;
}

function openPicker() {
  const phases = ['Phase A (API Active Blending)','Phase B (Pre-mix)',
    'Phase C (Bulk Make-up)','Phase D (q.s. / Adjust)',
    'Stage 1 (Dispensing)','Stage 2 (Processing)','Stage 3 (Packaging)'];
  const sorted = state.materials.slice().sort((a,b) => a.name.localeCompare(b.name));

  $('pickerSlot').innerHTML = `
    <div class="panel">
      <h3>Add Ingredients — Multi-Pick</h3>
      <div class="grid" style="margin-bottom:14px">
        <div class="field"><label>Default Phase</label>
          <select id="bulkPhase">${phases.map(p=>`<option>${p}</option>`).join('')}</select></div>
        <div class="field"><label>Filter</label>
          <input id="pickFilter" placeholder="Type to filter…" oninput="filterPicker(this.value)"></div>
      </div>
      <div class="picker-wrap">
        <table>
          <thead><tr>
            <th style="width:34px"></th><th>ID</th><th>Name</th><th>Category</th><th>Limit</th>
            <th style="width:100px">Qty</th><th style="width:80px">Unit</th>
            <th style="width:70px">Over %</th><th>Notes</th>
          </tr></thead>
          <tbody>
            ${sorted.map(m => `
              <tr data-name="${esc(m.name.toLowerCase())}" data-cat="${esc((m.category||'').toLowerCase())}">
                <td><input type="checkbox" class="pick" data-mat="${esc(m.name)}" onchange="toggleRow(this)"></td>
                <td>${esc(m.id)}</td>
                <td><b>${esc(m.name)}</b></td>
                <td><small>${esc(m.category)}</small></td>
                <td><small>${esc(m.limit)}</small></td>
                <td><input type="number" class="qty" step="0.001" disabled></td>
                <td><select class="unit" disabled>${['mg','g','mL','IU','mcg'].map(u=>`<option>${u}</option>`).join('')}</select></td>
                <td><input type="number" class="ov" value="0" step="0.1" disabled></td>
                <td><input type="text" class="notes" disabled></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="row" style="margin-top:14px;justify-content:flex-end">
        <span id="pickCount" class="muted" style="font-size:12.5px"></span>
        <button class="btn btn-outline" onclick="$('pickerSlot').innerHTML=''">Cancel</button>
        <button class="btn btn-green" onclick="submitBulk()">Save All Selected</button>
      </div>
    </div>`;
}

function toggleRow(cb) {
  const row = cb.closest('tr');
  row.querySelectorAll('input:not(.pick), select').forEach(el => el.disabled = !cb.checked);
  updateCount();
}
function updateCount() {
  const picks = document.querySelectorAll('.pick:checked');
  let ready = 0;
  picks.forEach(cb => {
    const row = cb.closest('tr');
    if ((parseFloat(row.querySelector('.qty').value)||0) > 0) ready++;
  });
  const el = $('pickCount');
  if (el) el.textContent = picks.length ? `${ready} of ${picks.length} ready` : 'Nothing selected';
}
function filterPicker(q) {
  q = (q||'').toLowerCase();
  document.querySelectorAll('.picker-wrap tbody tr').forEach(row => {
    const n = row.getAttribute('data-name') || '';
    const c = row.getAttribute('data-cat') || '';
    row.style.display = (!q || n.includes(q) || c.includes(q)) ? '' : 'none';
  });
}

async function submitBulk() {
  const picks = document.querySelectorAll('.pick:checked');
  if (!picks.length) return alert('Tick at least one ingredient.');
  const phase = $('bulkPhase').value;
  const product = state.products.find(p => p.id === state.activeProduct);
  const lines = [];
  for (const cb of picks) {
    const row = cb.closest('tr');
    const qty = parseFloat(row.querySelector('.qty').value)||0;
    if (!qty) return alert('Missing qty for ' + cb.getAttribute('data-mat'));
    lines.push({
      recipeId: '', version: state.activeVersion,
      productId: product.id, product: product.name,
      ingredient: cb.getAttribute('data-mat'),
      phase: phase, unitQty: qty,
      unit: row.querySelector('.unit').value,
      overage: parseFloat(row.querySelector('.ov').value)||0,
      notes: row.querySelector('.notes').value.trim(),
      date: new Date().toISOString()
    });
  }
  try {
    setStatus('Saving ' + lines.length + ' line(s)…');
    await api('saveRecipeBulk', { lines, user: state.currentUser?.id||'' });
    $('pickerSlot').innerHTML = '';
    setStatus('Saved ' + lines.length + ' line(s).');
    await recalc();
  } catch (e) { setStatus('Save failed: ' + e.message, true); }
}

async function deleteRecipe(rid) {
  if (!confirm('Delete line ' + rid + '?')) return;
  try {
    await api('deleteRecipe', { recipeId: rid, user: state.currentUser?.id||'' });
    await recalc();
  } catch (e) { setStatus('Delete failed: ' + e.message, true); }
}

/* ================================================================
   TRIALS
   ================================================================ */
function renderTrials() {
  if (!state.products.length) { $('view').innerHTML = '<div class="card"><div class="empty-state"><h3>Add a product first</h3></div></div>'; return; }
  const product = state.products.find(p => p.id === state.activeProduct) || state.products[0];
  state.activeProduct = product.id;
  const vs = state.versions.filter(v => v.productId === product.id);

  $('view').innerHTML = `
    <div class="card">
      <h2>Trial Versions
        <button class="btn btn-primary btn-sm" onclick="openVersionForm()">+ New Version</button>
      </h2>
      ${vs.length === 0 ? '<p class="muted">No versions yet.</p>'
        : `<table>
            <thead><tr><th>Version</th><th>Stage</th><th>Status</th>
              <th>Failure</th><th>Date</th><th></th></tr></thead>
            <tbody>
              ${vs.slice().reverse().map(v => `
                <tr>
                  <td><b>${esc(v.versionId)}</b></td>
                  <td>${stagePill(v.stage)}</td>
                  <td>${statusPill(v.status)}</td>
                  <td>${esc(v.failureCategory||'—')}</td>
                  <td>${esc(String(v.date).slice(0,10))}</td>
                  <td>
                    <button class="btn btn-outline btn-xs" onclick='openVersionForm(${JSON.stringify(v).replace(/'/g,"&#39;")})'>Edit</button>
                    <button class="btn btn-danger btn-xs" onclick="deleteVersion('${v.versionId}')">✕</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>`}
    </div>
    <div id="panelSlot"></div>`;
}

function openVersionForm(v) {
  const isNew = !v;
  v = v || { versionId:'', productId: state.activeProduct, version:'1.0',
            stage:'Lab Bench', status:'IN PROGRESS', failureCategory:'',
            failureReason:'', observedValue:'', expectedValue:'',
            correctiveAction:'', loggedBy:'', date:'' };
  if (isNew) {
    const existing = state.versions.filter(x => x.productId === v.productId);
    const next = existing.length
      ? (Math.max(...existing.map(x => parseFloat(String(x.version).split('.')[1]||0))) + 1).toFixed(1)
      : '1.0';
    v.versionId = v.productId + '-V' + next;
    v.version = next;
  }
  $('panelSlot').innerHTML = `
    <div class="panel">
      <h3>${isNew ? 'New' : 'Edit'} Trial Version</h3>
      <div class="grid">
        <div class="field"><label>Version ID</label><input id="vf_id" value="${esc(v.versionId)}" ${isNew?'':'readonly'}></div>
        <div class="field"><label>Stage</label>
          <select id="vf_stage">${STAGES.map(s => `<option ${s===v.stage?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>Status</label>
          <select id="vf_status" onchange="toggleFail()">${STATUSES.map(s => `<option ${s===v.status?'selected':''}>${s}</option>`).join('')}</select></div>
        <div class="field"><label>Failure Category</label>
          <select id="vf_cat"><option value="">—</option>${FAIL_CATS.map(c => `<option ${c===v.failureCategory?'selected':''}>${c}</option>`).join('')}</select></div>
      </div>
      <div class="grid" style="margin-top:12px">
        <div class="field" style="grid-column:1/-1"><label>Failure Reason (min 20 chars on FAIL)</label>
          <textarea id="vf_reason">${esc(v.failureReason)}</textarea></div>
        <div class="field"><label>Observed</label><input id="vf_obs" value="${esc(v.observedValue)}"></div>
        <div class="field"><label>Expected</label><input id="vf_exp" value="${esc(v.expectedValue)}"></div>
        <div class="field" style="grid-column:1/-1"><label>CAPA (min 10 chars on FAIL)</label>
          <textarea id="vf_capa">${esc(v.correctiveAction)}</textarea></div>
      </div>
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button class="btn btn-outline" onclick="$('panelSlot').innerHTML=''">Cancel</button>
        <button class="btn btn-green" onclick="submitVersion()">Save Version</button>
      </div>
    </div>`;
  toggleFail();
}

function toggleFail() {
  const fail = $('vf_status').value === 'FAIL';
  ['vf_cat','vf_reason','vf_obs','vf_exp','vf_capa'].forEach(id => {
    const el = $(id); if (el) { el.disabled = !fail; el.style.opacity = fail ? '1' : '.5'; }
  });
}

async function submitVersion() {
  const v = {
    versionId: $('vf_id').value.trim(),
    productId: state.activeProduct,
    version: $('vf_id').value.split('-V')[1] || '1.0',
    stage: $('vf_stage').value, status: $('vf_status').value,
    failureCategory: $('vf_cat').value, failureReason: $('vf_reason').value.trim(),
    observedValue: $('vf_obs').value.trim(), expectedValue: $('vf_exp').value.trim(),
    correctiveAction: $('vf_capa').value.trim(),
    loggedBy: state.currentUser?.id||'', date: new Date().toISOString()
  };
  try {
    setStatus('Saving version…');
    await api('saveVersion', { version: v, user: state.currentUser?.id||'' });
    $('panelSlot').innerHTML = '';
    await reload();
  } catch (e) { setStatus('Save failed: ' + e.message, true); }
}

async function deleteVersion(vid) {
  if (!confirm('Delete ' + vid + '?')) return;
  try { await api('deleteVersion', { versionId: vid, user: state.currentUser?.id||'' }); await reload(); }
  catch (e) { setStatus('Delete failed: ' + e.message, true); }
}

/* ================================================================
   STEPS
   ================================================================ */
function renderSteps() {
  if (!state.versions.length) { $('view').innerHTML = '<div class="card"><div class="empty-state"><h3>No versions yet</h3></div></div>'; return; }
  const vid = state.stepsVersion || state.versions[0].versionId;
  state.stepsVersion = vid;
  $('view').innerHTML = `
    <div class="card">
      <h2>Production Steps
        <button class="btn btn-primary btn-sm" onclick="openStepForm()">+ Add Step</button>
      </h2>
      <div class="field" style="margin-bottom:14px;max-width:400px">
        <label>Version</label>
        <select onchange="state.stepsVersion=this.value; loadSteps()">
          ${state.versions.map(v => `<option value="${v.versionId}" ${v.versionId===vid?'selected':''}>${esc(v.versionId)}</option>`).join('')}
        </select>
      </div>
      <div id="stepsList">Loading…</div>
    </div>
    <div id="panelSlot"></div>`;
  loadSteps();
}

async function loadSteps() {
  try {
    const steps = await api('getSteps', { versionId: state.stepsVersion });
    state.steps = steps;
    const el = $('stepsList');
    if (!steps.length) { el.innerHTML = '<p class="muted">No steps yet.</p>'; return; }
    el.innerHTML = steps.map(s => `
      <div style="background:#f0f9f7;border:1px solid var(--line);border-radius:8px;
                  padding:12px 14px;margin-bottom:10px">
        <b style="color:var(--brand-dark)">Step ${s.step} — ${esc(s.stage||'')}</b>
        <p style="margin:6px 0">${esc(s.instruction)}</p>
        <div class="grid">
          <div class="field"><label>Equipment</label><input value="${esc(s.equipment||'—')}" readonly></div>
          <div class="field"><label>Target</label><input value="${esc(s.target||'—')}" readonly></div>
          <div class="field"><label>IPC</label><input value="${esc(s.ipc||'—')}" readonly></div>
          <div class="field"><label>Duration</label><input value="${esc(s.duration||'—')}" readonly></div>
        </div>
        <div class="row" style="margin-top:8px">
          <button class="btn btn-outline btn-xs" onclick='openStepForm(${JSON.stringify(s).replace(/'/g,"&#39;")})'>Edit</button>
          <button class="btn btn-danger btn-xs" onclick="deleteStep(${s.step})">Delete</button>
        </div>
      </div>`).join('');
  } catch (e) { $('stepsList').innerHTML = `<p class="status error">${esc(e.message)}</p>`; }
}

function openStepForm(s) {
  const next = s ? s.step : (state.steps.length ? Math.max(...state.steps.map(x=>x.step))+1 : 1);
  s = s || { step: next, stage:'', instruction:'', equipment:'', target:'', ipc:'', duration:'' };
  $('panelSlot').innerHTML = `
    <div class="panel">
      <h3>${s.instruction ? 'Edit' : 'New'} Step</h3>
      <div class="grid">
        <div class="field"><label>Step #</label><input id="sf_step" type="number" value="${s.step}"></div>
        <div class="field"><label>Stage</label><input id="sf_stage" value="${esc(s.stage)}"></div>
        <div class="field" style="grid-column:1/-1"><label>Instruction *</label>
          <textarea id="sf_inst" style="min-height:80px">${esc(s.instruction)}</textarea></div>
        <div class="field"><label>Equipment</label><input id="sf_eq" value="${esc(s.equipment)}"></div>
        <div class="field"><label>Target Spec</label><input id="sf_target" value="${esc(s.target)}"></div>
        <div class="field"><label>IPC Check</label><input id="sf_ipc" value="${esc(s.ipc)}"></div>
        <div class="field"><label>Duration</label><input id="sf_dur" value="${esc(s.duration)}"></div>
      </div>
      <div class="row" style="margin-top:16px;justify-content:flex-end">
        <button class="btn btn-outline" onclick="$('panelSlot').innerHTML=''">Cancel</button>
        <button class="btn btn-green" onclick="submitStep()">Save Step</button>
      </div>
    </div>`;
}

async function submitStep() {
  const s = {
    versionId: state.stepsVersion,
    step: parseInt($('sf_step').value,10)||1,
    stage: $('sf_stage').value.trim(),
    instruction: $('sf_inst').value.trim(),
    equipment: $('sf_eq').value.trim(),
    target: $('sf_target').value.trim(),
    ipc: $('sf_ipc').value.trim(),
    duration: $('sf_dur').value.trim()
  };
  try {
    await api('saveStep', { step: s, user: state.currentUser?.id||'' });
    $('panelSlot').innerHTML = '';
    loadSteps();
  } catch (e) { setStatus('Save failed: ' + e.message, true); }
}

async function deleteStep(step) {
  if (!confirm('Delete step ' + step + '?')) return;
  try { await api('deleteStep', { versionId: state.stepsVersion, step, user: state.currentUser?.id||'' }); loadSteps(); }
  catch (e) { setStatus('Delete failed: ' + e.message, true); }
}

/* ================================================================
   BMR
   ================================================================ */
function renderBmr() {
  if (!state.versions.length) { $('view').innerHTML = '<div class="card"><div class="empty-state"><h3>No versions yet</h3></div></div>'; return; }
  const vid = state.stepsVersion || state.versions[0].versionId;
  state.stepsVersion = vid;
  $('view').innerHTML = `
    <div class="card">
      <h2>BMR Compose</h2>
      <div class="grid">
        <div class="field"><label>Version</label>
          <select onchange="state.stepsVersion=this.value; loadBmr()">
            ${state.versions.map(v => `<option value="${v.versionId}" ${v.versionId===vid?'selected':''}>${esc(v.versionId)}</option>`).join('')}
          </select></div>
        <div class="field"><label>Batch No</label><input id="b_batch" value="B-XXX-0000-01"></div>
        <div class="field"><label>Batch Volume</label><input id="b_vol" type="number" value="${state.batchVolume}"></div>
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn btn-primary" onclick="loadBmr()">Generate</button>
        <button class="btn btn-outline" onclick="window.print()">🖨 Print</button>
        <button class="btn btn-green" onclick="logIssuance()">Save to Archive</button>
      </div>
    </div>
    <div id="bmrOut">Loading…</div>`;
  loadBmr();
}

async function loadBmr() {
  const vid = state.stepsVersion;
  const productId = vid.split('-V')[0];
  const vol = parseFloat($('b_vol').value)||1000;
  state.batchVolume = vol;
  try {
    const p = await api('getBmrPayload', { productId, versionId: vid, batchVolume: vol });
    paintBmr(p, vid);
  } catch (e) { $('bmrOut').innerHTML = `<p class="status error">${esc(e.message)}</p>`; }
}

function paintBmr(p, vid) {
  const c = p.calc;
  const vm = p.versionMeta || {};
  const batchNo = $('b_batch').value || 'B-XXX-0000-01';
  const findUser = role => p.users.find(u =>
    (u.role||'').toLowerCase().includes(role.toLowerCase())) || {};

  $('bmrOut').innerHTML = `
    <div class="card">
      <div style="text-align:center;padding-bottom:14px;border-bottom:2px solid var(--brand);
                  margin-bottom:16px">
        <b style="font-size:16px">AFRAB CHEM LIMITED</b><br>
        <span class="muted">Quality Assurance &amp; Manufacturing Division</span><br>
        <span style="font-size:11px;letter-spacing:1px">BATCH MANUFACTURING RECORD • cGMP COMPLIANT</span>
      </div>
      <div class="grid" style="margin-bottom:14px">
        <div class="field"><label>Document Ref</label><input value="${esc(p.docRef)}" readonly style="font-family:monospace"></div>
        <div class="field"><label>Version</label><input value="${esc(vid)}" readonly></div>
        <div class="field"><label>Stage</label><input value="${esc(vm.stage||'—')}" readonly></div>
        <div class="field"><label>Status</label><input value="${esc(vm.status||'—')}" readonly></div>
      </div>

      ${vm.status === 'FAIL' ? `<div class="callout fail">
        <b>⚠ FAILED TRIAL — not for production</b><br>
        Category: ${esc(vm.failureCategory||'—')}<br>
        Reason: ${esc(vm.failureReason||'—')}<br>
        CAPA: ${esc(vm.correctiveAction||'—')}
      </div>` : ''}

      <h3 style="margin:16px 0 10px;font-size:13px;color:var(--brand-dark)">1. Product Identification</h3>
      <div class="grid">
        <div class="field"><label>Product ID</label><input value="${esc(c.product.id)}" readonly></div>
        <div class="field"><label>Name</label><input value="${esc(c.product.name)}" readonly></div>
        <div class="field"><label>Dosage Form</label><input value="${esc(c.product.form)}" readonly></div>
        <div class="field"><label>Therapeutic</label><input value="${esc(c.product.category)}" readonly></div>
        <div class="field"><label>Pack Size</label><input value="${esc(c.product.packSize||'—')}" readonly></div>
        <div class="field"><label>Shelf Life</label><input value="${c.product.shelfLife} months" readonly></div>
      </div>

      <h3 style="margin:16px 0 10px;font-size:13px;color:var(--brand-dark)">2. Batch Scale</h3>
      <div class="grid">
        <div class="field"><label>Batch No</label><input value="${esc(batchNo)}" readonly></div>
        <div class="field"><label>Volume</label><input value="${c.batchVolume} ${c.isLiquid?'L':'kg'}" readonly></div>
        <div class="field"><label>Theoretical Yield</label><input value="${c.theoreticalYield.toLocaleString()} ${esc(c.yieldUnit)}" readonly></div>
        <div class="field"><label>Basis</label><input value="${esc(c.basis)}" readonly></div>
      </div>

      <h3 style="margin:16px 0 10px;font-size:13px;color:var(--brand-dark)">3. Bill of Materials</h3>
      <table>
        <thead><tr><th>Item #</th><th>Ingredient</th><th>Phase</th><th>Unit Dose</th><th>% w/w</th><th>Batch (kg)</th></tr></thead>
        <tbody>
          ${c.lines.map(l => `
            <tr>
              <td>${esc(l.recipeId)}</td>
              <td><b>${esc(l.ingredient)}</b></td>
              <td><small>${esc(l.phase)}</small></td>
              <td>${l.unitQty} ${esc(l.unit)}</td>
              <td>${l.pct}%</td>
              <td>${l.batchKg}</td>
            </tr>`).join('')}
          <tr class="total-row">
            <td colspan="4">TOTAL</td>
            <td>${c.totalPct}%</td>
            <td>${c.lines.reduce((s,l)=>s+l.batchKg,0).toFixed(3)}</td>
          </tr>
        </tbody>
      </table>

      <h3 style="margin:16px 0 10px;font-size:13px;color:var(--brand-dark)">4. Process Instructions</h3>
      ${p.steps.length === 0 ? '<p class="muted">No steps defined.</p>'
        : `<table><thead><tr><th>#</th><th>Stage</th><th>Instruction</th><th>Equipment</th><th>Target</th><th>IPC</th><th>Duration</th></tr></thead>
            <tbody>
              ${p.steps.map(s => `
                <tr>
                  <td>${s.step}</td>
                  <td><small>${esc(s.stage)}</small></td>
                  <td>${esc(s.instruction)}</td>
                  <td><small>${esc(s.equipment)}</small></td>
                  <td><small>${esc(s.target)}</small></td>
                  <td><small>${esc(s.ipc)}</small></td>
                  <td><small>${esc(s.duration)}</small></td>
                </tr>`).join('')}
            </tbody></table>`}

      <h3 style="margin:16px 0 10px;font-size:13px;color:var(--brand-dark)">5. cGMP Sign-Off</h3>
      <table>
        <thead><tr><th>Role</th><th>Name</th><th>Title</th><th>Sign-off</th><th>Date</th><th>Disposition</th></tr></thead>
        <tbody>
          <tr><td>Lead Formulator</td><td>${esc(findUser('Formulator').name||'—')}</td>
            <td>${esc(findUser('Formulator').title||'—')}</td>
            <td>${esc(findUser('Formulator').signoff||'—')}</td>
            <td>${new Date().toLocaleDateString()}</td>
            <td>${vm.status==='PASS'?'<span class="pill pill-ok">APPROVED</span>':'<span class="pill pill-warn">PENDING</span>'}</td></tr>
          <tr><td>QA Reviewer</td><td>${esc(findUser('QA').name||'—')}</td>
            <td>${esc(findUser('QA').title||'—')}</td>
            <td>${esc(findUser('QA').signoff||'—')}</td>
            <td>${new Date().toLocaleDateString()}</td>
            <td>${vm.status==='PASS'?'<span class="pill pill-ok">APPROVED</span>':'<span class="pill pill-warn">PENDING</span>'}</td></tr>
          <tr><td>Authorizing Director</td><td>${esc(findUser('Director').name||'—')}</td>
            <td>${esc(findUser('Director').title||'—')}</td>
            <td>${esc(findUser('Director').signoff||'—')}</td>
            <td>${new Date().toLocaleDateString()}</td>
            <td>${vm.status==='PASS'?'<span class="pill pill-ok">RELEASED</span>':'<span class="pill pill-warn">PENDING</span>'}</td></tr>
        </tbody>
      </table>
    </div>`;
}

async function logIssuance() {
  const vid = state.stepsVersion;
  const productId = vid.split('-V')[0];
  const rec = {
    docRef: 'BMR-' + productId.replace('PRD-','PRD') + '-V' + (vid.split('V')[1]||'1'),
    versionId: vid, productId,
    batchNo: $('b_batch').value,
    yieldAchieved: '', disposition: 'RELEASED', notes: ''
  };
  try {
    await api('logIssuance', { record: rec, user: state.currentUser?.id||'' });
    setStatus('BMR issuance logged to Archive.');
  } catch (e) { setStatus('Failed: ' + e.message, true); }
}

/* ================================================================
   ARCHIVE
   ================================================================ */
async function renderArchive() {
  $('view').innerHTML = '<div class="card"><h2>BMR Archive</h2><div id="archTable">Loading…</div></div>';
  try {
    const rows = await api('getArchive');
    if (!rows.length) { $('archTable').innerHTML = '<p class="muted">No BMRs issued yet.</p>'; return; }
    $('archTable').innerHTML = `
      <table>
        <thead><tr><th>Doc Ref</th><th>Version</th><th>Product</th><th>Batch No</th>
          <th>Issued By</th><th>Issued At</th><th>Yield</th><th>Disposition</th></tr></thead>
        <tbody>
          ${rows.slice().reverse().map(r => `
            <tr>
              <td><span style="font-family:monospace">${esc(r.docRef)}</span></td>
              <td>${esc(r.versionId)}</td>
              <td>${esc(r.productId)}</td>
              <td>${esc(r.batchNo)}</td>
              <td>${esc(r.issuedBy)}</td>
              <td>${esc(String(r.issuedAt).slice(0,19))}</td>
              <td>${esc(r.yieldAchieved)}</td>
              <td>${statusPill(r.disposition)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  } catch (e) { $('archTable').innerHTML = `<p class="status error">${esc(e.message)}</p>`; }
}

/* ================================================================
   RELOAD
   ================================================================ */
async function reload() {
  try {
    const d = await api('getAppData');
    state.users = d.users || [];
    state.materials = d.materials || [];
    state.products = d.products || [];
    state.versions = d.versions || [];
    state.recipes = d.recipes || [];
    state.trends = d.trends || {};
    state.stages = d.stages || {};
    render();
  } catch (e) { setStatus('Reload failed: ' + e.message, true); }
}

/* ---------- helpers ---------- */
function dosageProfile(form) {
  const f = String(form||'').toLowerCase();
  if (/tablet|caplet|film/.test(f))   return { kind:'solid', basis:'mg/unit', yieldUnit:'tablets', isLiquid:false };
  if (/capsule/.test(f))              return { kind:'solid', basis:'mg/unit', yieldUnit:'capsules', isLiquid:false };
  if (/sachet|powder/.test(f))        return { kind:'solid', basis:'g/sachet', yieldUnit:'sachets', isLiquid:false };
  if (/syrup|elixir|solution|liquid/.test(f)) return { kind:'liquid', basis:'mg/5 mL', yieldUnit:'mL', isLiquid:true };
  if (/suspension|emulsion/.test(f))  return { kind:'liquid', basis:'mg/5 mL', yieldUnit:'mL', isLiquid:true };
  if (/cream|lotion|gel|ointment/.test(f)) return { kind:'semisolid', basis:'% w/w', yieldUnit:'g', isLiquid:false };
  if (/inject|vial/.test(f))          return { kind:'liquid', basis:'mg/mL', yieldUnit:'mL', isLiquid:true };
  return { kind:'solid', basis:'mg/unit', yieldUnit:'units', isLiquid:false };
}

window.recalc = recalc;
window.openPicker = openPicker;
window.submitBulk = submitBulk;
window.deleteRecipe = deleteRecipe;
window.onProductChange = onProductChange;
window.openMaterialForm = openMaterialForm;
window.submitMaterial = submitMaterial;
window.openProductForm = openProductForm;
window.submitProduct = submitProduct;
window.useForFormulation = useForFormulation;
window.openVersionForm = openVersionForm;
window.submitVersion = submitVersion;
window.deleteVersion = deleteVersion;
window.toggleFail = toggleFail;
window.loadSteps = loadSteps;
window.openStepForm = openStepForm;
window.submitStep = submitStep;
window.deleteStep = deleteStep;
window.loadBmr = loadBmr;
window.logIssuance = logIssuance;
