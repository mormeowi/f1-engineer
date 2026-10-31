/**
 * "Car" tab: team selection, power characteristics and the full setup sheet.
 */

// ---------- Болид ----------
function renderCarTab() {
    const c = currentCar();
    let h = `<div class="card"><h3>Добавить болид</h3><div class="mu">Имя пилота (необязательно)</div><input type="text" id="nn" maxlength="14" style="margin-bottom:8px"><div class="mu">Пилот</div><select id="npl" style="margin-bottom:4px">${pilotOptions('')}</select><div class="mu" style="margin-bottom:8px">Пилотов создают во вкладке «Пилоты».</div><div class="row"><select id="ns" onchange="fillTeamSelect()">${Object.keys(SERIES).map(k => `<option value="${k}">${SERIES[k].n}</option>`).join('')}</select><select id="nm"></select><button class="pr" onclick="addCar()">＋ Добавить</button></div></div>`;
    if (c) {
        const e = effectiveStats(c);
        h += `<div class="card"><h3>${carLabel(c)}</h3><div class="mu">Имя</div><input type="text" maxlength="14" value="${c.name || ''}" onchange="renameCar(this.value)" style="margin-bottom:8px">${pilotSummaryHtml(c)}<div class="row"><select onchange="changeTeam(+this.value)">${optionsHtml(SERIES[c.s].t.map(t => t[0]), c.t)}</select><button onclick="duplicateCar()">Копия</button><button onclick="deleteCar()">Удалить</button></div>${presetsHtml()}
<p class="mu" id="inf"></p><div class="g">Характеристики болида${state.eq ? ' (равная мощность: значения команд не учитываются, настройки сохраняются)' : ''}</div>` + ['Силовая установка', 'Аэродинамика', 'Шасси', 'Надёжность'].map((n, i) => sliderHtml(n, i, e[i], 40, 100, 1, 'onStatInput', state.eq)).join('') + `<div class="row" style="margin-top:8px"><button class="pr" onclick="autoSetup()">⚙️ Подобрать настройки под трассу</button><button onclick="resetSetup()">Сбросить</button></div>`;
        for (const d of SETUP_PARAMS)
            h += (d[6] ? `<div class="g">${d[6]}</div>` : '') + sliderHtml(d[1], d[0], c.su[d[0]], d[2], d[3], d[4], 'onSetupInput');
        h += '</div>';
    }
    $('m').innerHTML = h;
    fillTeamSelect();
    updateCarInfo();
}

function fillTeamSelect() {
    const s = $('ns').value;
    $('nm').innerHTML = optionsHtml(SERIES[s].t.map(t => t[0]), 0);
}

function addCar() {
    const c = makeCar($('ns').value, +$('nm').value, cleanName($('nn').value));
    const pilot = pilotById($('npl').value);
    if (pilot) seatPilot(c, pilot, true);
    c.grid = 999;
    adaptStrategy(c);
    state.cars.push(c);
    normalizeGrid();
    state.a = state.cars.length - 1;
    render();
}

function renameCar(v) {
    currentCar().name = cleanName(v);
    render();
}

function changeTeam(i) {
    const c = currentCar();
    c.t = i;
    c.st = teamStats(c.s, i);
    render();
}

function duplicateCar() {
    const c = currentCar();
    const n = JSON.parse(JSON.stringify(c));
    n.id = ++nextCarId;
    if (n.name) n.name = cleanName(n.name + ' 2');
    n.grid = 999;
    state.cars.push(n);
    normalizeGrid();
    state.a = state.cars.length - 1;
    render();
}

function deleteCar() {
    state.cars.splice(state.a, 1);
    normalizeGrid();
    state.a = Math.max(0, state.a - 1);
    render();
}

function onStatInput(e) {
    currentCar().st[+e.dataset.k] = +e.value;
    e.previousElementSibling.textContent = e.value;
    updateCarInfo();
}

function onSetupInput(e) {
    currentCar().su[e.dataset.k] = +e.value;
    e.previousElementSibling.textContent = e.value;
    updateCarInfo();
}

function autoSetup() {
    const c = currentCar();
    for (const d of SETUP_PARAMS)
        c.su[d[0]] = +(Math.round(idealSetupValue(d, state.tr) / d[4]) * d[4]).toFixed(2);
    renderCarTab();
}

function resetSetup() {
    const c = currentCar();
    for (const d of SETUP_PARAMS)
        c.su[d[0]] = d[5];
    renderCarTab();
}

function updateCarInfo() {
    const c = currentCar();
    const e = $('inf');
    if (!c || !e)
        return;
    e.textContent = `${TRACKS[state.tr][TRACK.NAME]}: чистый круг ≈ ${formatTime(baseLapTime(c, state.tr))} · потери из-за настроек +${setupPenalty(c, state.tr).toFixed(2)} с · мощность ≈ ${horsepower(c)} л.с.`;
}
