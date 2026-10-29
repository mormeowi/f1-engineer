/**
 * Saved car setups. A preset stores the setup sheet and the race strategy (not the pilot) under a name and can be
 * loaded onto any car - the selected one. Presets are kept in this browser (localStorage); if the browser blocks
 * storage they live in memory until the page is closed.
 */
const PRESET_KEY = 'f1-engineer-setups';
let presetFallback = [];
let presetMessage = '';

function loadPresets() {
    try {
        return JSON.parse(localStorage.getItem(PRESET_KEY)) || [];
    } catch (e) {
        return presetFallback;
    }
}

function storePresets(list) {
    presetFallback = list;
    try {
        localStorage.setItem(PRESET_KEY, JSON.stringify(list));
    } catch (e) { /* memory only */ }
}

const cleanPresetName = v => v.replace(/[<>&"']/g, '').trim().slice(0, 22);

function presetsHtml() {
    const c = currentCar(), list = loadPresets(), msg = presetMessage;
    presetMessage = '';
    return `<div class="g">Сохранённые настройки</div>
<div class="row"><input type="text" id="psn" maxlength="22" value="${cleanPresetName(c.name || SERIES[c.s].t[c.t][0])} · ${TRACKS[state.tr][TRACK.NAME]}"><button onclick="savePreset()">💾 Сохранить</button></div>
<div class="row"><select id="psl">${list.length ? list.map(p => `<option value="${p.id}">${p.name}</option>`).join('') : '<option value="">нет сохранённых</option>'}</select><button onclick="applyPreset()">⬇ Загрузить</button><button onclick="deletePreset()">🗑</button></div>
<div class="mu">${msg || 'Сохраняются сетап и стратегия гонки (без пилота), хранятся в этом браузере. Загрузка применяется к выбранному болиду.'}</div>`;
}

function savePreset() {
    const c = currentCar(), name = cleanPresetName($('psn').value) || 'Настройки';
    const list = loadPresets().filter(p => p.name !== name);
    list.push({ id: Date.now(), name, su: { ...c.su }, str: JSON.parse(JSON.stringify(c.str)) });
    storePresets(list);
    presetMessage = 'Сохранено: ' + name;
    renderCarTab();
}

function applyPreset() {
    const p = loadPresets().find(x => x.id == $('psl').value);
    if (!p) return;
    const c = currentCar();
    c.su = { ...c.su, ...p.su };
    c.str = JSON.parse(JSON.stringify(p.str));
    presetMessage = 'Загружено: ' + p.name;
    renderCarTab();
}

function deletePreset() {
    const id = $('psl').value;
    const p = loadPresets().find(x => x.id == id);
    if (!p) return;
    storePresets(loadPresets().filter(x => x.id != id));
    presetMessage = 'Удалено: ' + p.name;
    renderCarTab();
}
