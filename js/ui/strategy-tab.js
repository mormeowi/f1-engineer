/**
 * "Strategy" tab: stints, pit laps, fuel mix, ERS mode, fuel load and the predicted race time.
 */

// ---------- Стратегия ----------
function renderStrategyTab() {
    const c = currentCar();
    if (!c)
        return renderNoCar();
    const N = raceLaps();
    const st = c.str;
    const p = pitLaps(c, N);
    const n = st.f.length;
    let h = weatherCardHtml() + `<div class="card"><h3>Дистанция гонки</h3><div class="seg">${[25, 35, 50, 100].map(x => `<button${state.pct == x ? ' class="on"' : ''} onclick="state.pct=${x};renderStrategyTab()">${x}% · ${Math.max(3, Math.round(TRACKS[state.tr][TRACK.LAPS] * x / 100))} кр.</button>`).join('')}</div></div>
<div class="card"><h3>Пит-стопы: ${carLabel(c)}</h3><div class="seg">${[0, 1, 2, 3].map(x => `<button${n == x ? ' class="on"' : ''} onclick="setStopCount(${x})">${x}</button>`).join('')}</div>`;
    for (let j = 0; j <= n; j++) {
        h += `<div class="g">Стинт ${j + 1}</div><div class="seg">${'SMHIW'.split('').map(m => `<button${st.c[j] == m ? ' class="on"' : ''} onclick="setStintCompound(${j},'${m}')">${TYRES[m].n}</button>`).join('')}</div>`;
        if (j < n)
            h += sliderHtml('Заезд на пит-стоп, круг', 'pit' + j, p[j], 3, N - 3, 1, 'onPitLapInput').replace('data-k="pit' + j + '"', 'data-k="' + j + '"');
    }
    h += `<button class="pr" style="width:100%;margin-top:12px" onclick="autoStrategy()">⚡ Найти оптимальную стратегию</button></div>${raceStrategyHtml(c, N)}<div id="out"></div>`;
    $('m').innerHTML = h;
    renderStrategyResult();
}

function raceStrategyHtml(c, N) {
    const Q = SERIES[c.s];
    const fn = startFuel(c, N);
    const need = N * fuelBurnPerLap(c);
    return `<div class="card"><h3>Стратегия гонки (как в игре)</h3><div class="g">Топливная смесь</div><div class="seg">${[['L', 'Бедная'], ['S', 'Стандарт'], ['R', 'Богатая'], ['X', 'Максимум']].map(a => `<button${fuelMix(c) == a[0] ? ' class="on"' : ''} onclick="setFuelMix('${a[0]}')">${a[1]}</button>`).join('')}</div>${c.s == 'f1' ? `<div class="g">Режим ERS</div><div class="seg">${[['N', 'Нет'], ['M', 'Средний'], ['O', 'Обгон'], ['H', 'Хотлэп']].map(a => `<button${ersMode(c) == a[0] ? ' class="on"' : ''} onclick="setErsMode('${a[0]}')">${a[1]}</button>`).join('')}</div>` : ''}${sliderHtml('Топливо на старте, кг', 'fl', Math.round(fn * 10) / 10, 5, Q.x, .5, 'onFuelInput')}<div class="mu">Нужно на гонку ≈ ${need.toFixed(1)} кг · ${fn >= need ? 'запас' : 'не хватит'} ${Math.abs(fn - need).toFixed(1)} кг</div><button style="margin-top:6px" onclick="currentCar().str.fl=null;renderStrategyTab()">Авто-топливо</button></div>`;
}

function setFuelMix(v) {
    currentCar().str.fm = v;
    renderStrategyTab();
}

function setErsMode(v) {
    currentCar().str.er = v;
    renderStrategyTab();
}

function onFuelInput(e) {
    currentCar().str.fl = +e.value;
    e.previousElementSibling.textContent = e.value;
    renderStrategyResult();
}

function setStopCount(n) {
    const st = currentCar().str;
    while (st.c.length < n + 1)
        st.c.push('H');
    st.c.length = n + 1;
    st.f = [...Array(n)].map((_, j) => (j + 1) / (n + 1));
    renderStrategyTab();
}

function setStintCompound(j, m) {
    currentCar().str.c[j] = m;
    renderStrategyTab();
}

function onPitLapInput(e) {
    const c = currentCar();
    const N = raceLaps();
    const p = pitLaps(c, N);
    const j = +e.dataset.k;
    const v = clamp(+e.value, (j ? p[j - 1] : 0) + 3, (j < p.length - 1 ? p[j + 1] : N) - 3);
    e.value = v;
    e.previousElementSibling.textContent = v;
    c.str.f[j] = v / N;
    renderStrategyResult();
}

function autoStrategy() {
    const c = currentCar();
    const tr = TRACKS[state.tr];
    const N = raceLaps();
    const b = baseLapTime(c, state.tr);
    let best = null;
    for (let n = 1; n <= 3; n++) {
        const stp = n == 3 ? Math.max(2, Math.round(N / 18)) : n == 2 ? 2 : 1;
        const cs = [];
        const ps = [];
        (function g(a) {
            if (a.length == n + 1)
                return cs.push(a);
            for (const m of COMPOUND_SETS[state.weather])
                g([...a, m]);
        })([]);
        (function g(a, s) {
            if (a.length == n)
                return ps.push(a);
            for (let p = s; p <= N - 3; p += stp)
                g([...a, p], p + 4);
        })([], 4);
        for (const a of cs) {
            if (state.weather == 'dry' && new Set(a).size < 2)
                continue;
            for (const p of ps) {
                const t = simulateRace(b, tr, N, a, p, c).t;
                if (!best || t < best.t)
                    best = { t, a, p };
            }
        }
    }
    if (best) {
        c.str = { ...c.str, c: best.a, f: best.p.map(p => p / N) };
        renderStrategyTab();
    }
}

function renderStrategyResult() {
    const c = currentCar();
    const tr = TRACKS[state.tr];
    const N = raceLaps();
    const p = pitLaps(c, N);
    const r = simulateRace(baseLapTime(c, state.tr), tr, N, c.str.c, p, c);
    const e = effectiveStats(c);
    const ok = state.weather != 'dry' || new Set(c.str.c).size > 1;   // the two-compound rule applies to dry races only
    const rows = state.cars.map(x => {
        const q = pitLaps(x, N);
        return { x, t: simulateRace(baseLapTime(x, state.tr), tr, N, x.str.c, q, x).t };
    }).sort((a, b) => a.t - b.t);
    $('out').innerHTML = `<div class="card"><div class="mu">Время гонки · ${tr[TRACK.NAME]} · ${N} кр.</div><div class="big">${formatTime(r.t)}</div>
<div class="mu">Средний круг ${formatTime(r.t / N)} · пит-стопы ${p.length}×${tr[TRACK.PIT_LOSS]} с · риск отказа ≈ ${((100 - e[3]) * .15 * N / 60).toFixed(1)}%</div>
<div class="mu">Топливо на финише: ${r.fr.toFixed(1)} кг</div>${r.fr < 0 ? '<div class="bad">Топлива не хватит до финиша</div>' : ''}${ok ? '' : '<div class="bad">В сухой гонке нужно минимум два разных состава шин</div>'}<canvas id="cv"></canvas>
<div class="mu">Время круга по ходу гонки (пики пит-стопов обрезаны), фон — состав шин</div></div>
<div class="card"><h3>Сравнение болидов в гараже</h3><table>${rows.map((q, i) => `<tr><td>${i + 1}</td><td><span style="color:${teamColor(q.x)}">●</span> ${carLabel(q.x)}</td><td>${formatTime(q.t)}</td><td>${i ? '+' + (q.t - rows[0].t).toFixed(1) + ' с' : ''}</td></tr>`).join('')}</table></div>`;
    const cv = $('cv');
    const w = cv.width = cv.clientWidth;
    const h = cv.height = 150;
    const x = cv.getContext('2d');
    const mn = Math.min(...r.l);
    const mx = mn + 6;
    const ed = [0, ...p, N];
    for (let j = 0; j < ed.length - 1; j++) {
        x.globalAlpha = .3;
        x.fillStyle = TYRES[c.str.c[j]].c;
        x.fillRect(ed[j] / N * w, 0, (ed[j + 1] - ed[j]) / N * w, h);
    }
    x.globalAlpha = 1;
    x.strokeStyle = getComputedStyle(document.body).color;
    x.lineWidth = 2;
    x.beginPath();
    r.l.forEach((v, i) => {
        const X = (i + .5) / N * w;
        const Y = h - 8 - (Math.min(v, mx) - mn) / (mx - mn) * (h - 16);
        i ? x.lineTo(X, Y) : x.moveTo(X, Y);
    });
    x.stroke();
}
