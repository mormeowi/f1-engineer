/**
 * "Test" tab: race animation (canvas), telemetry, standings and the starting grid.
 */

function renderTestTab() {
    if (!state.cars.length)
        return renderNoCar();
    const tr = TRACKS[state.tr];
    const pf = trackProfile(state.tr);
    const rs = carsByPace();
    const key = state.tr + '|' + rs.map(q => q.c.id + ':' + q.c.grid + ':' + q.t.toFixed(3) + JSON.stringify(q.c.str) + state.pct + state.human + state.dnf + JSON.stringify(q.c.pil) + JSON.stringify(q.c.traits) + state.weather).join();
    if (state.key != key) {
        state.key = key;
        state.run = false;
        initSimulation();
    }
    const c = currentCar();
    const gs = [...state.cars].sort((a, b) => a.grid - b.grid);
    $('m').innerHTML = `<div class="stage">
<div class="bcast"><span class="live"><b>F1</b>${tr[TRACK.NAME]}</span><span id="lapc"></span></div>
<div class="tools">
<button id="rb" class="pr" onclick="toggleRun()">${state.run ? '⏸' : '▶'}</button>
<button onclick="initSimulation();drawRace()">↺</button>
<button id="spb" onclick="cycleSpeed()">${state.spd}×</button>
<button onclick="zoomMap(1.4)">＋</button>
<button onclick="zoomMap(1 / 1.4)">－</button>
<button class="${state.cam ? 'on' : ''}" onclick="toggleCamera()">📹</button>
<button id="wxb" class="${state.weather != 'dry' ? 'on' : ''}" onclick="cycleWeather()">${WEATHER_MODES[state.weather].icon}</button>
<button class="${state.human ? 'on' : ''}" onclick="toggleHuman()">🧑</button>
<button class="${state.dnf ? 'on' : ''}" onclick="toggleDnf()">💥</button>
<button id="pitb" onclick="togglePitRequest()">🛠</button>
${state.sim && state.sim.done ? '<button onclick="showResults()">📊</button>' : ''}
</div>
<div class="view"><canvas id="tc"></canvas><div id="tw" class="tower"></div><canvas id="hc" class="hud"></canvas></div>
</div>
<div class="card"><h3>Телеметрия: ${carLabel(c)}</h3><div class="mu" id="tgp"></div><div class="mu" id="tpt"></div><canvas id="sp" style="height:100px;margin:8px 0"></canvas><div class="mu" id="tsc"></div></div>
<div class="card"><h3>Положение в гонке</h3><table><tr><th>#</th><th>Болид</th><th>Лидер</th><th>Впереди</th><th>км/ч</th><th>Шины</th><th>Кр.</th></tr><tbody id="lv"></tbody></table><div class="mu" id="lg"></div></div>
<div class="card"><h3>Стартовая решётка и прогноз круга</h3><table><tr><th>Старт</th><th>Болид</th><th>Круг</th><th>С1</th><th>С2</th><th>С3</th></tr>${gs.map(x => {
        const t = rs.find(q => q.c === x).t;
        return `<tr><td><select onchange="setGridPosition(${x.id},+this.value)">${optionsHtml(state.cars.map((_, j) => 'P' + (j + 1)), x.grid)}</select></td><td><span style="color:${teamColor(x)}">●</span> ${carLabel(x)}</td><td>${formatTime(t)}</td>${pf.sh.map(h => `<td>${(t * h).toFixed(3)}</td>`).join('')}</tr>`;
    }).join('')}</table>
<button style="margin-top:8px;width:100%" onclick="autoGrid()">🏁 Расставить по темпу</button></div>
<div class="mu">${weatherNote(state.tr)}</div>
<div class="mu">Кнопки: ▶ старт/пауза · ↺ сброс · скорость симуляции · ＋/－ масштаб · 📹 камера за болидом · 🌦 погода (сухо/сыро/дождь) · 🧑 реалистичная езда · 💥 аварии и DNF · 🛠 заезд в боксы · 📊 итоги. Камера следует за выбранным болидом (выбор — чипы сверху или строка таймтаблицы). Белая черта — старт/финиш, жёлтая и синяя — границы секторов, зелёная полоса — зоны DRS. Жёлтая линия — оптимальная траектория, бледная белая — реальная линия проезда. Слева у старта — питлейн с боксами (лимит 80 км/ч). Болиды заезжают в боксы по своей стратегии (вкладка «Стратегия»). Уровень пилота задаётся при добавлении болида.</div>`;
    drawRace();
}

function togglePitRequest() {
    const c = state.sim.cs.find(q => q.c === currentCar());
    if (c && !c.pit)
        c.req = !c.req;
    drawRace();
}

function setGridPosition(id, g) {
    const c = state.cars.find(x => x.id == id);
    const o = state.cars.find(x => x.grid == g);
    o.grid = c.grid;
    c.grid = g;
    renderTestTab();
}

function autoGrid() {
    carsByPace().forEach((q, i) => q.c.grid = i);
    renderTestTab();
}

function toggleRun() {
    state.run = !state.run;
    if (!state.run) engineOff();
    lastFrameTime = performance.now();
    $('rb').textContent = state.run ? '⏸' : '▶';
    if (state.run)
        requestAnimationFrame(animationLoop);
}

function animationLoop(ts) {
    if (!state.run || state.tab != 2)
        return;
    let r = Math.min(.1, (ts - lastFrameTime) / 1000) * state.spd;
    lastFrameTime = ts;
    while (r > 0) {
        const d = Math.min(.04, r);
        stepSimulation(d);
        r -= d;
    }
    drawRace();
    if (state.sim.done) {
        state.run = false;
        $('rb').textContent = '🏁 Финиш';
        showResults();
        return;
    }
    requestAnimationFrame(animationLoop);
}

// Draws the map (camera, track, pit lane, racing lines, cars, mini-map) and refreshes tables and telemetry.
// ---- Car status HUD at the bottom of the map: tyres per wheel, speed and gear, pedals, ERS, fuel, damage ----
function drawHud(c, z, L) {
    const cv = $('hc'), W = cv.width = cv.clientWidth, H = cv.height = 100, g = cv.getContext('2d');
    const car = c.c, pf = trackProfile(state.tr), f1 = car.s == 'f1';
    g.fillStyle = 'rgba(11,13,18,.8)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#e10600';
    g.fillRect(0, 0, W, 2);
    const wearColor = w => w < 60 ? '#2e9e4f' : w < 85 ? '#f0a020' : '#e53935';
    g.textAlign = 'center';
    // car seen from above; each wheel is coloured by its own wear (front tyres and the tyres loaded by the corners wear faster)
    g.save();
    g.translate(42, 54);
    g.fillStyle = c.out ? '#666' : teamColor(car);
    g.beginPath();
    g.moveTo(0, -32); g.lineTo(5, -14); g.lineTo(6, 20); g.lineTo(-6, 20); g.lineTo(-5, -14);
    g.closePath();
    g.fill();
    g.fillStyle = c.dg > 0 ? '#ff8f00' : '#d8d8d8';          // front wing turns orange when damaged
    g.fillRect(-16, -37, 32, 5);
    g.fillStyle = '#d8d8d8';
    g.fillRect(-12, 24, 24, 5);
    g.font = '700 8px system-ui';
    [[-18, -20, 1.1, 1], [6, -20, 1.1, -1], [-18, 12, .9, 1], [6, 12, .9, -1]].forEach(([x, y, k, side]) => {
        const w = clamp(c.wr * k * (1 + side * (pf.rs - .5) * .6), 0, 100);
        g.fillStyle = wearColor(w);
        g.fillRect(x, y, 12, 20);
        g.fillStyle = '#fff';
        g.fillText(Math.round(w), x + 6, y + 13);
    });
    g.restore();
    // speed, gear and status badge
    g.textAlign = 'left';
    g.fillStyle = '#fff';
    g.font = '700 30px system-ui';
    g.fillText(Math.round(c.v), 84, 44);
    g.font = '10px system-ui';
    g.fillStyle = '#9aa1ad';
    g.fillText('km/h', 86, 58);
    g.fillStyle = '#1b1f27';
    g.fillRect(84, 66, 26, 26);
    g.fillStyle = '#fff';
    g.font = '700 18px system-ui';
    g.textAlign = 'center';
    g.fillText(c.s < 0 && c.v < 3 ? 'N' : c.gr, 97, 85);
    const badge = c.out ? ['DNF', '#e53935'] : c.pit ? ['PIT', '#f0a020'] : c.req ? ['PIT REQ', '#f0a020'] : c.dr ? ['DRS', '#2e9e4f'] : null;
    if (badge) {
        g.font = '700 11px system-ui';
        g.fillStyle = badge[1];
        g.fillRect(114, 70, g.measureText(badge[0]).width + 10, 18);
        g.fillStyle = '#fff';
        g.fillText(badge[0], 114 + (g.measureText(badge[0]).width + 10) / 2, 83);
    }
    // pedals
    [[176, c.th, '#2e9e4f'], [190, c.br, '#e53935']].forEach(([x, v, col]) => {
        g.fillStyle = '#1b1f27';
        g.fillRect(x, 20, 10, 70);
        g.fillStyle = col;
        const h = 70 * clamp(v, 0, 100) / 100;
        g.fillRect(x, 90 - h, 10, h);
    });
    // horizontal bars: ERS, fuel, tyres
    const x0 = 214, bw = Math.min(360, W - x0 - 10);
    const bar = (y, label, frac, color, text) => {
        g.textAlign = 'left';
        g.font = '700 9px system-ui';
        g.fillStyle = '#9aa1ad';
        g.fillText(label, x0, y);
        g.textAlign = 'right';
        g.fillStyle = '#fff';
        g.fillText(text, x0 + bw, y);
        g.fillStyle = '#1b1f27';
        g.fillRect(x0, y + 3, bw, 8);
        g.fillStyle = color;
        g.fillRect(x0, y + 3, bw * clamp(frac, 0, 1), 8);
    };
    const fuel0 = startFuel(car, raceLaps()), fuelLeft = Math.max(0, fuel0 - fuelBurnPerLap(car) * Math.max(0, c.s) / L);
    if (f1) bar(18, 'ERS' + (c.dp ? ' ▶ DEPLOY' : ''), c.er / 100, c.dp ? '#4fc3f7' : '#1e88e5', Math.round(c.er) + '%');
    else bar(18, 'DAMAGE', c.dg > 0 ? .5 : 0, '#f0a020', c.dg > 0 ? '+' + c.dg.toFixed(1) + ' s/lap' : 'OK');
    bar(46, 'FUEL', fuelLeft / fuel0, '#ffb300', fuelLeft.toFixed(1) + ' kg');
    bar(74, 'TYRES ' + c.comp + ' · ' + c.age.toFixed(1) + ' laps', c.wr / 100, wearColor(c.wr), c.wr + '%');
    if (c.out) {
        g.fillStyle = 'rgba(11,13,18,.7)';
        g.fillRect(0, 0, W, H);
        g.textAlign = 'center';
        g.fillStyle = '#e53935';
        g.font = '700 22px system-ui';
        g.fillText('✖ DNF', W / 2, 44);
        g.font = '12px system-ui';
        g.fillStyle = '#fff';
        g.fillText(c.why, W / 2, 68);
    }
}

// ---- Broadcast overlay: lap counter in the top bar and the timing tower on the left ----
function updateBroadcast(ord, L) {
    const z = state.sim, N = raceLaps(), lead = ord[0], mode = state.gap;
    $('lapc').textContent = WEATHER_MODES[state.weather].icon + ' ' + (z.done ? '🏁 ФИНИШ' : 'КРУГ ' + Math.min(N, Math.max(1, lead.lp)) + '/' + N);
    const tower = $('tw'), sel = currentCar();
    // The rows are rebuilt only when the order, the selected car or the mode changes,
    // so taps on a row are not lost while the animation updates the numbers.
    const key = ord.map(c => c.c.id).join() + '|' + sel.id + '|' + mode;
    if (tower.dataset.key !== key) {
        tower.dataset.key = key;
        tower.innerHTML = `<div class="tw-h" onclick="toggleGapMode()">${mode == 'int' ? 'ИНТЕРВАЛ' : 'ОТРЫВ'}</div>` + ord.map((c, r) =>
            `<div class="tw-r${c.c === sel ? ' sel' : ''}" onclick="selectCar(${c.c.id})"><b>${r + 1}</b><i style="background:${teamColor(c.c)}"></i><span>${carShort(c.c)}</span><em></em><u></u></div>`).join('');
    }
    const rows = tower.querySelectorAll('.tw-r');
    ord.forEach((c, r) => {
        rows[r].children[3].textContent = c.out ? 'DNF' : c.fin ? '🏁' : c.pit ? 'ПИТ' : r ? gapText(c, mode == 'int' ? ord[r - 1] : lead, L) : 'ЛИДЕР';
        rows[r].children[4].textContent = c.comp;
        rows[r].children[4].style.color = TYRES[c.comp].c;
    });
}

function cycleSpeed() {
    state.spd = state.spd == 1 ? 5 : state.spd == 5 ? 20 : 1;
    $('spb').textContent = state.spd + '×';
}

function zoomMap(f) {
    state.z = clamp(state.z * f, .5, 4);
    drawRace();
}

function toggleCamera() {
    state.cam = !state.cam;
    state.kx = state.ky = state.ks = null;
    renderTestTab();
}

function toggleDnf() {
    state.dnf = !state.dnf;
    renderTestTab();
}

function toggleHuman() {
    state.human = !state.human;
    renderTestTab();
}

// "+0.842", "+12.4", "+1:04.2" or "+1 кр." (a lap or more behind), read from the timing loops.
function gapText(c, ref, L) {
    const laps = Math.floor((ref.s - c.s) / L + .02);
    if (laps >= 1) return '+' + laps + ' кр.';
    const d = gapSeconds(c, ref);
    return d == null ? '—' : '+' + formatGapTime(d);
}

function toggleGapMode() {
    state.gap = state.gap == 'int' ? 'gap' : 'int';
}

function selectCar(id) {
    state.a = state.cars.findIndex(c => c.id === id);
    render();
}

function drawRace() {
    const cv = $('tc');
    if (!cv || !state.sim)
        return;
    const z = state.sim;
    const pf = trackProfile(state.tr);
    const P = trackPath(state.tr);
    const L = pf.Lm;
    const N = P.length;
    const w = cv.width = cv.clientWidth;
    const h = cv.height = w < 700 ? Math.round(clamp(window.innerHeight * .6, 340, 620)) : Math.round(clamp(window.innerHeight * .64, 380, 780));
    const x = cv.getContext('2d');
    const fg = getComputedStyle(document.body).color;
    const sel = currentCar();
    const ord = raceOrder(z.cs);
    if (!pf.ppm) {
        let t = 0;
        P.forEach((q, i) => {
            const b = P[(i + 1) % N];
            t += Math.hypot(b[0] - q[0], b[1] - q[1]);
        });
        pf.ppm = t / L;
        const xs = P.map(p => p[0]);
        const ys = P.map(p => p[1]);
        pf.bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
    }
    const [bx, by, ex, ey] = pf.bb;
    const fit = Math.min((w - 30) / (ex - bx), (h - 150) / (ey - by));   // leave room for the status panel at the bottom
    const fc = z.cs.find(q => q.c === sel) || z.cs[0];
    // point and heading at a given distance along the lap
    const at = s => {
        const k = indexAtDistance(pf, s);
        const b = P[(k + 1) % N];
        const t = Math.min(1, Math.max(0, (((s % L) + L) % L - pf.D[k]) / pf.ds[k]));
        return [P[k][0] + (b[0] - P[k][0]) * t, P[k][1] + (b[1] - P[k][1]) * t, Math.atan2(b[1] - P[k][1], b[0] - P[k][0])];
    };
    // camera: follow the selected car or fit the whole track
    let tx;
    let ty;
    let ts;
    if (state.cam) {
        const f = at(fc.s);
        tx = f[0];
        ty = f[1];
        ts = Math.min(w, h) / (300 / state.z) / pf.ppm;
    }
    else {
        tx = (bx + ex) / 2;
        ts = fit;
        ty = (by + ey) / 2 + 55 / ts;                 // move the track up, away from the status panel
    }
    state.kx = state.kx == null ? tx : state.kx + (tx - state.kx) * .3;
    state.ky = state.ky == null ? ty : state.ky + (ty - state.ky) * .3;
    state.ks = state.ks == null ? ts : state.ks + (ts - state.ks) * .3;
    const sc = state.ks;
    const pt = q => [w / 2 + (q[0] - state.kx) * sc, h / 2 + (q[1] - state.ky) * sc];
    const pm = sc * pf.ppm;
    const rw = Math.max(14, Math.min(50, 14 * pm * 1.4));
    const po = (s, m) => {
        const f = at(s);
        const a = pt(f);
        return [a[0] - Math.sin(f[2]) * m * pm, a[1] + Math.cos(f[2]) * m * pm, f[2]];
    };
    const ln = a => {
        x.beginPath();
        a.forEach((q, i) => i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]));
    };
    const sm = v => {
        v = clamp(v, 0, 1);
        return v * v * (3 - 2 * v);
    };
    // ---- scenery and track surface ----
    x.fillStyle = ENVIRONMENT[state.tr].ground;
    x.fillRect(0, 0, w, h);
    const E = { i: state.tr, P, bb: pf.bb, ppm: pf.ppm, sc, cx: state.kx, cy: state.ky, w, h, pm };
    drawEnvironment(x, E);                         // sea, lakes, trees, buildings, landmarks
    const wetIdx = state.weather == 'dry' ? 0 : state.weather == 'damp' ? 1 : 2;
    x.lineJoin = 'round';
    x.lineCap = 'butt';
    const tr = () => {
        ln(P.map(pt));
        x.closePath();
    };
    const edge = ENVIRONMENT[state.tr].edge;
    x.strokeStyle = edge == 'ricard' ? '#3d6fcf' : edge == 'sand' ? 'rgba(214,190,130,.75)' : 'rgba(205,180,120,.55)';
    x.lineWidth = rw + 34;
    tr();
    x.stroke();
    if (edge == 'ricard') {                        // the blue and red run-off of Paul Ricard
        x.strokeStyle = '#d23c3c';
        x.setLineDash([rw * 2, rw * 2]);
        tr();
        x.stroke();
        x.setLineDash([]);
    }
    x.strokeStyle = '#e8e8e8';
    x.lineWidth = rw + 9;
    tr();
    x.stroke();
    x.strokeStyle = '#d32f2f';
    x.setLineDash([10, 10]);
    tr();
    x.stroke();
    x.setLineDash([]);
    x.strokeStyle = ['#3b3f45', '#33373d', '#2a2e34'][wetIdx];     // wet asphalt is darker
    x.lineWidth = rw;
    tr();
    x.stroke();
    if (wetIdx) {                                  // sheen of the water on the surface
        x.strokeStyle = 'rgba(190,210,235,.10)';
        x.lineWidth = rw * .55;
        tr();
        x.stroke();
    }
    x.strokeStyle = '#2e9e4f';
    x.lineWidth = Math.max(2, rw * .12);
    for (let k = 0; k < N; k++)
        if (pf.dr[k]) {
            const a = pt(P[k]);
            const b = pt(P[(k + 1) % N]);
            x.beginPath();
            x.moveTo(a[0], a[1]);
            x.lineTo(b[0], b[1]);
            x.stroke();
        }
    // питлейн
    drawStands(x, E, rw, at, po, L);
    // ---- pit lane and garages ----
    const pl = [];
    for (let s = L - 350; s <= L + 430; s += 10)
        pl.push(po(s, 22 * sm((s - (L - 350)) / 60) * sm((L + 430 - s) / 60)));
    x.strokeStyle = '#e8e8e8';
    x.lineWidth = Math.max(7, 11 * pm) + 3;
    ln(pl);
    x.stroke();
    x.strokeStyle = '#555a63';
    x.lineWidth = Math.max(7, 11 * pm);
    ln(pl);
    x.stroke();
    const bl = Math.max(6, 16 * pm);
    const bw = Math.max(5, 8 * pm);
    SERIES[sel.s].t.forEach((t, i) => {
        const p = po(L + 30 + i * 20, 31);
        x.save();
        x.translate(p[0], p[1]);
        x.rotate(p[2]);
        x.fillStyle = t[t.length - 1];
        x.fillRect(-bl / 2, -bw / 2, bl, bw);
        x.strokeStyle = '#fff';
        x.lineWidth = 1;
        x.strokeRect(-bl / 2, -bw / 2, bl, bw);
        x.restore();
    });
    x.font = 'bold 10px system-ui';
    x.textAlign = 'center';
    [['PIT IN', L - 350], ['PIT OUT', L + 430]].forEach(q => {
        const p = po(q[1], 36);
        x.lineWidth = 3;
        x.strokeStyle = '#000';
        x.strokeText(q[0], p[0], p[1]);
        x.fillStyle = '#fff';
        x.fillText(q[0], p[0], p[1]);
    });
    // линии: реальная (бледная) и оптимальная
    // ---- racing lines: optimal (yellow) and actual (faint) ----
    const rl = f => {
        const a = [];
        for (let k = 0; k < N; k += 2)
            a.push(po(pf.D[k], pf.off[k] * 6 * f));
        a.push(a[0]);
        ln(a);
        x.stroke();
    };
    x.strokeStyle = 'rgba(255,255,255,.3)';
    x.lineWidth = 2;
    rl(.55);
    x.strokeStyle = '#ffe600';
    x.lineWidth = 2.5;
    rl(1);
    const mk = (d, c) => {
        const f = at(d);
        const a = pt(f);
        const nx = -Math.sin(f[2]);
        const ny = Math.cos(f[2]);
        const r = rw / 2 + 5;
        x.strokeStyle = c;
        x.lineWidth = 4;
        x.beginPath();
        x.moveTo(a[0] + nx * r, a[1] + ny * r);
        x.lineTo(a[0] - nx * r, a[1] - ny * r);
        x.stroke();
    };
    mk(0, '#fff');
    mk(L / 3, '#ffd600');
    mk(2 * L / 3, '#2979ff');
    if (!pf.cn) {
        pf.cn = [];
        let c0 = 0;
        for (let k = 0; k < N; k++)
            if (pf.bp[k])
                pf.cn.push([pf.D[k], ++c0]);
    }
    x.font = 'bold 10px system-ui';
    x.textAlign = 'center';
    pf.cn.forEach(q => {
        mk(q[0], '#ff5252');
        const p = po(q[0] + 45, -(rw / 2 + 18) / pm);
        x.lineWidth = 3;
        x.strokeStyle = '#000';
        x.strokeText('T' + q[1], p[0], p[1]);
        x.fillStyle = '#fff';
        x.fillText('T' + q[1], p[0], p[1]);
    });
    x.textAlign = 'start';
    if (wetIdx) {                                  // grey light of a rainy sky
        x.fillStyle = wetIdx == 1 ? 'rgba(20,30,50,.10)' : 'rgba(10,20,40,.22)';
        x.fillRect(0, 0, w, h);
    }
    // ---- flat 2D car sprite (top view) ----
    const car = (px, py, an, co, big) => {
        x.save();
        x.translate(px, py);
        x.rotate(an);
        const k = big ? 1.3 : 1;
        x.scale(k, k);
        x.fillStyle = '#111';
        [[-9, -6.3], [-9, 3.6], [4, -6.3], [4, 3.6]].forEach(q => x.fillRect(q[0], q[1], 5.5, 2.7));
        x.fillStyle = co;
        x.fillRect(-13, -5.5, 3, 11);
        x.fillRect(10.5, -5.5, 3, 11);
        x.beginPath();
        x.moveTo(-11, -2.8);
        x.lineTo(3, -3.4);
        x.lineTo(11, -1);
        x.lineTo(11, 1);
        x.lineTo(3, 3.4);
        x.lineTo(-11, 2.8);
        x.closePath();
        x.fill();
        x.strokeStyle = '#000';
        x.lineWidth = .8;
        x.stroke();
        x.fillStyle = '#fff';
        x.beginPath();
        x.arc(-1, 0, 1.9, 0, 6.283);
        x.fill();
        x.restore();
    };
    // lateral offset of a car: racing line, grid slot, overtake manoeuvre, pit lane
    const latOf = c => {
        const k = indexAtDistance(pf, c.s);
        let m = pf.off[k] * 6 * c.lw + c.lo;
        if (c.s < 150)
            m += (c.c.grid % 2 ? 1 : -1) * 6 * clamp(1 - c.s / 150, 0, 1);
        if (c.pit) {
            const b = sm(clamp((c.s - c.ei) / 60, 0, 1) * clamp((c.ex - c.s) / 60, 0, 1));
            m = m * (1 - b) + 22 * b;
        }
        return m;
    };
    for (const c of z.cs.slice().sort((a, b) => (a.c === sel) - (b.c === sel))) {
        const a = po(c.s, latOf(c));
        const isS = c.c === sel;
        if (isS) {
            x.strokeStyle = fg;
            x.lineWidth = 2;
            x.beginPath();
            x.arc(a[0], a[1], 21, 0, 6.283);
            x.stroke();
        }
        x.globalAlpha = c.out ? .45 : 1;
        car(a[0], a[1], a[2], teamColor(c.c), isS);
        x.font = 'bold 11px system-ui';
        const t2 = (c.out ? '✖' : ord.indexOf(c) + 1) + ' ' + carShort(c.c);
        x.lineWidth = 3;
        x.strokeStyle = '#000';
        x.strokeText(t2, a[0], a[1] - 17);
        x.fillStyle = '#fff';
        x.fillText(t2, a[0], a[1] - 17);
        x.globalAlpha = 1;
    }
    x.textAlign = 'start';
    if (wetIdx) {                                  // rain streaks
        x.strokeStyle = 'rgba(205,225,255,.4)';
        x.lineWidth = 1;
        x.beginPath();
        for (let q = wetIdx == 1 ? 40 : 160; q > 0; q--) {
            const rx = Math.random() * w, ry = Math.random() * h;
            x.moveTo(rx, ry);
            x.lineTo(rx - 4, ry + 12);
        }
        x.stroke();
    }
    // ---- mini-map ----
    if (state.cam) {
        const mw = 112;
        const mh = 92;
        const m0 = w - mw - 8;
        const mm = Math.min((mw - 12) / (ex - bx), (mh - 12) / (ey - by));
        const q = p => [m0 + 6 + (p[0] - bx) * mm, 14 + (p[1] - by) * mm];
        x.fillStyle = 'rgba(0,0,0,.6)';
        x.fillRect(m0, 8, mw, mh);
        x.strokeStyle = '#ddd';
        x.lineWidth = 2;
        ln(P.map(q));
        x.closePath();
        x.stroke();
        z.cs.forEach(c => {
            const a = q(at(c.s));
            x.fillStyle = teamColor(c.c);
            x.beginPath();
            x.arc(a[0], a[1], c.c === sel ? 4.5 : 3, 0, 6.283);
            x.fill();
        });
    }
    // ---- standings, overtake log and telemetry panel ----
    $('lv').innerHTML = ord.map((c, r) => `<tr${c.c === sel ? ' style="font-weight:700"' : ''}><td>${r + 1}</td><td><span style="color:${teamColor(c.c)}">●</span> ${carLabel(c.c)}${c.pit ? ' 🅿' : ''}${c.fin ? ' 🏁' : ''}${c.out ? ' ✖ DNF' : ''}${c.dr ? ' <b style="color:#2e9e4f">DRS</b>' : ''}</td><td>${r && !c.out ? gapText(c, ord[0], L) : '—'}</td><td>${r && !c.out ? gapText(c, ord[r - 1], L) : '—'}</td><td>${Math.round(c.v)}</td><td><b style="color:${TYRES[c.comp].c};text-shadow:0 0 1px #000">${c.comp}</b> ${c.wr}%</td><td>${Math.max(0, c.lp)}</td></tr>`).join('');
    $('lg').innerHTML = z.log.map(s => '🔁 ' + s).join('<br>');
    updateBroadcast(ord, L);
    const c = z.cs.find(q => q.c === sel);
    if (!c)
        return;
    const r = ord.indexOf(c);
    $('tgp').innerHTML = r ? `<b>P${r + 1}</b> · отставание от ${carLabel(ord[r - 1].c)}: <b>${gapText(c, ord[r - 1], L)} с</b>` : `<b>P1 · лидер</b>${ord[1] ? ` · интервал до ${carLabel(ord[1].c)}: <b>${gapText(ord[1], c, L)} с</b>` : ''}`;
    const pt2 = z.t - c.pin;
    $('tpt').innerHTML = c.pit === 1 ? `🅿 Питлейн (лимит 80 км/ч): <b>${pt2.toFixed(2)} с</b>` : c.pit === 2 ? `🛠 Стоянка в боксах: <b>${c.stC.toFixed(2)} с</b> · питлейн ${pt2.toFixed(2)} с` : c.pit === 3 ? `Выезд из боксов · питлейн <b>${pt2.toFixed(2)} с</b>` : `Последний пит-стоп: питлейн <b>${c.pl ? c.pl.toFixed(2) : '—'} с</b> · стоянка <b>${c.stT ? c.stT.toFixed(2) : '—'} с</b>${c.req ? ' · заявка на заезд ✔' : ''}`;
    $('pitb').className = c.req ? 'on' : '';
    drawHud(c, z, L);
    if (state.run && !z.done) updateEngineSound(c);
    else engineOff();
    const c3 = [0, 1, 2].map(j => j < c.sec ? c.sc[j] : j == c.sec ? z.t - c.st : 0);
    $('tsc').innerHTML = `Круг ${Math.max(0, c.lp)}: <b>${c.lp > 0 ? formatTime(z.t - c.ts) : '—'}</b><br>Сейчас: С1 ${formatSector(c3[0])} · С2 ${formatSector(c3[1])} · С3 ${formatSector(c3[2])}<br>Прошлый: С1 ${formatSector(c.ls[0])} · С2 ${formatSector(c.ls[1])} · С3 ${formatSector(c.ls[2])} · круг ${c.last ? formatTime(c.last) : '—'}<br>Лучший круг: ${c.best ? formatTime(c.best) : '—'}`;
    // ---- speed trace chart ----
    const sp = $('sp');
    const sw = sp.width = sp.clientWidth;
    const sh = sp.height = 100;
    const y = sp.getContext('2d');
    const vm = pf.vt * 1.05;
    y.strokeStyle = fg;
    y.lineWidth = 2;
    y.beginPath();
    for (let k = 0; k < pf.n; k += 2) {
        const X = pf.D[k] / L * sw;
        const Y = sh - 4 - pf.u[k] * 3.6 * c.m / vm * (sh - 8);
        k ? y.lineTo(X, Y) : y.moveTo(X, Y);
    }
    y.stroke();
    y.strokeStyle = '#ffd600';
    y.beginPath();
    y.moveTo(sw / 3, 0);
    y.lineTo(sw / 3, sh);
    y.moveTo(2 * sw / 3, 0);
    y.lineTo(2 * sw / 3, sh);
    y.stroke();
    const cp = ((c.s % L + L) % L) / L * sw;
    y.strokeStyle = '#e10600';
    y.beginPath();
    y.moveTo(cp, 0);
    y.lineTo(cp, sh);
    y.stroke();
    y.fillStyle = '#e10600';
    y.beginPath();
    y.arc(cp, sh - 4 - c.v / vm * (sh - 8), 4, 0, 6.283);
    y.fill();
    // retired car: show the reason instead of the pit information
    const retired = z.cs.find(q => q.c === sel);
    if (retired && retired.out) $('tpt').textContent = '✖ ' + retired.why;
}
