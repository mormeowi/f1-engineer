/**
 * "Pilots" tab: character creation. A pilot has a name, four ratings (EXP, RAC, AWA, PAC) and up to three traits.
 * Created pilots are kept in a library (localStorage; memory only if the browser blocks storage) and can be seated
 * in a car from this tab or from the car tab. Seating copies the pilot into the car, so later edits of the library
 * do not change cars that are already set up.
 */
const PILOTS_KEY = 'f1-engineer-pilots';
let pilotFallback = [];
let pilotMessage = '';

function loadPilots() {
    try {
        return JSON.parse(localStorage.getItem(PILOTS_KEY)) || [];
    } catch (e) {
        return pilotFallback;
    }
}

function storePilots(list) {
    pilotFallback = list;
    try {
        localStorage.setItem(PILOTS_KEY, JSON.stringify(list));
    } catch (e) { /* memory only */ }
}

const pilotById = id => loadPilots().find(p => p.id == id);
const newDraft = () => ({ id: 0, name: '', pil: { ...PILOT_DEFAULT }, traits: [] });
const draft = () => state.draft || (state.draft = newDraft());
const cleanTraits = ids => [...new Set(ids.filter(id => TRAITS[id]))].slice(0, MAX_TRAITS);

// Seats a library pilot in a car. The car keeps its own name when keepName is true and it has one.
function seatPilot(car, p, keepName) {
    if (!(keepName && car.name) && p.name) car.name = p.name;
    car.pil = { ...p.pil };
    car.traits = cleanTraits(p.traits);
}

const traitChips = ids => ids.length ? ids.map(id => `<span class="tchip" title="${TRAITS[id].desc}">${TRAITS[id].name}</span>`).join('') : '<span class="mu">Нет черт</span>';

const pilotOptions = selected => '<option value="">Стандартный пилот (70)</option>' + loadPilots().map(p => `<option value="${p.id}"${p.id == selected ? ' selected' : ''}>${p.name} · RTG ${pilotRating(p.pil)}</option>`).join('');

// Short pilot summary with a selector, shown in the car card of the car tab.
function pilotSummaryHtml(car) {
    const p = effectivePilot(car);
    return `<div class="pilot"><div class="rtg"><b>${pilotRating(p)}</b><small>RTG</small></div><div class="pst"><div class="mu">EXP ${p.exp} · RAC ${p.rac} · AWA ${p.awa} · PAC ${p.pac}</div><div>${traitChips(car.traits || [])}</div></div></div>
<div class="row" style="margin-bottom:4px"><select id="cpl">${pilotOptions('')}</select><button onclick="seatSelectedPilot()">Посадить пилота</button></div>
<div class="mu" style="margin-bottom:8px">Пилотов создают во вкладке «Пилоты».</div>`;
}

function seatSelectedPilot() {
    const p = pilotById($('cpl').value);
    Object.assign(currentCar(), p ? {} : { pil: { ...PILOT_DEFAULT }, traits: [] });
    if (p) seatPilot(currentCar(), p, false);
    renderCarTab();
}

// ---------- the tab ----------
function traitInfoHtml(ids) {
    return ids.map(id => `<div class="trait"><b>${TRAITS[id].name}</b><div class="mu">${TRAITS[id].desc}</div><ul>${TRAITS[id].effects.map(e => `<li>${e}</li>`).join('')}</ul></div>`).join('');
}

function draftPreviewHtml() {
    const d = draft(), p = effectivePilot(d);
    return d.traits.length ? `Эффективные значения с чертами: EXP ${p.exp} · RAC ${p.rac} · AWA ${p.awa} · PAC ${p.pac} · RTG ${pilotRating(p)}` : '';
}

function updateDraftPreview() {
    $('peff').textContent = draftPreviewHtml();
}

function renderPilotsTab() {
    const d = draft(), list = loadPilots(), msg = pilotMessage;
    pilotMessage = '';
    const slots = [0, 1].map(k => `<select onchange="setTraitSlot(${k}, this.value)"><option value="">— пусто —</option>${Object.entries(TRAITS).map(([id, t]) => `<option value="${id}"${d.traits[k] == id ? ' selected' : ''}>${t.name}</option>`).join('')}</select>`).join('');
    const rows = list.map(p => `<div class="prow"><div><b>${p.name}</b> <span class="mu">RTG ${pilotRating(p.pil)} · EXP ${p.pil.exp} · RAC ${p.pil.rac} · AWA ${p.pil.awa} · PAC ${p.pil.pac}</span><div>${traitChips(p.traits)}</div></div><div class="pbtn"><button onclick="editPilot(${p.id})">✏️</button><button onclick="seatLibraryPilot(${p.id})">🏎 В болид</button><button onclick="deletePilot(${p.id})">🗑</button></div></div>`).join('');
    $('m').innerHTML = `<div class="card"><h3>Создание пилота</h3>
<div class="mu">Имя пилота</div><input type="text" maxlength="14" value="${d.name}" oninput="draft().name = cleanName(this.value)" style="margin-bottom:8px">
${pilotCardHtml(d.pil, 'draft')}
<div class="mu">${PILOT_NOTE}</div>
<div class="g">Черты (до 2)</div><div class="row">${slots}</div>
${traitInfoHtml(d.traits)}
<div class="mu" id="peff">${draftPreviewHtml()}</div>
<div class="row" style="margin-top:8px"><button class="pr" onclick="savePilot()">💾 Сохранить пилота</button><button onclick="newPilot()">Новый пилот</button></div>
<div class="mu">${msg}</div></div>
<div class="card"><h3>Мои пилоты</h3>${rows || '<div class="mu">Пока нет сохранённых пилотов.</div>'}</div>`;
}

function setTraitSlot(k, id) {
    const d = draft(), t = [...d.traits];
    t[k] = id || undefined;
    d.traits = cleanTraits(t);
    renderPilotsTab();
}

function savePilot() {
    const d = draft(), list = loadPilots();
    const p = { id: d.id || Date.now(), name: cleanName(d.name) || 'Пилот', pil: { ...d.pil }, traits: cleanTraits(d.traits) };
    d.id = p.id;
    d.name = p.name;
    storePilots(list.some(x => x.id == p.id) ? list.map(x => x.id == p.id ? p : x) : [...list, p]);
    pilotMessage = 'Пилот сохранён: ' + p.name;
    renderPilotsTab();
}

function newPilot() {
    state.draft = newDraft();
    renderPilotsTab();
}

function editPilot(id) {
    const p = pilotById(id);
    if (!p) return;
    state.draft = { id: p.id, name: p.name, pil: { ...p.pil }, traits: cleanTraits(p.traits) };
    renderPilotsTab();
    window.scrollTo(0, 0);
}

function deletePilot(id) {
    const p = pilotById(id);
    if (!p) return;
    storePilots(loadPilots().filter(x => x.id != id));
    if (draft().id == id) draft().id = 0;
    pilotMessage = 'Пилот удалён: ' + p.name;
    renderPilotsTab();
}

// Seats the library pilot in the selected car (chips at the top choose the car).
function seatLibraryPilot(id) {
    const p = pilotById(id), car = state.cars[state.a];
    pilotMessage = car ? p.name + ' — посажен в болид ' : 'Нет болидов — сначала добавьте болид во вкладке «Болид».';
    if (car) {
        seatPilot(car, p, false);
        pilotMessage += carLabel(car);
    }
    render();
}
