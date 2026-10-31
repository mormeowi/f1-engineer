/**
 * Race results window with per-car analysis.
 */

// Classification: finishers by laps and finishing time plus steward penalties, then retired cars by distance covered.
function classified(z) {
    const finished = [...z.res].sort((a, b) => (b.lp - a.lp) || ((a.fin + a.pen) - (b.fin + b.pen)));
    return [...finished, ...[...z.dnf].sort((a, b) => b.s - a.s)];
}

function showResults() {
    const z = state.sim;
    let d = $('rs');
    if (!d) {
        d = document.createElement('div');
        d.id = 'rs';
        d.style.cssText = 'position:fixed;inset:0;z-index:30;background:var(--bg);color:var(--fg);overflow:auto;padding:calc(env(safe-area-inset-top,0px) + 12px) 12px 80px';
        document.body.appendChild(d);
    }
    const rs = classified(z);
    const w = rs[0];
    d.innerHTML = `<div style="max-width:860px;margin:0 auto"><div class="row" style="align-items:center"><h2 style="margin:0;flex:4;font-size:18px">🏁 Итоги · ${TRACKS[state.tr][TRACK.NAME]} · ${raceLaps()} кр.</h2><button onclick="$('rs').remove()">✕ Закрыть</button></div>
<div class="card"><table><tr><th>#</th><th>Болид</th><th>Время / отрыв</th><th>Лучший</th><th>Пит</th><th>Обг.</th></tr>${rs.map((c, i) => `<tr><td>${i + 1}</td><td><span style="color:${teamColor(c.c)}">●</span> ${carLabel(c.c)}</td><td>${c.out ? 'DNF · ' + c.why : (i ? (c.lp < w.lp ? '+' + (w.lp - c.lp) + ' кр.' : '+' + ((c.fin + c.pen) - (w.fin + w.pen)).toFixed(3)) : formatTime(w.fin + w.pen)) + (c.pen ? ' (⚖️ +' + c.pen + ' с)' : '')}</td><td>${c.best ? formatTime(c.best) : '—'}</td><td>${c.ps.length}</td><td>${c.ot}/${c.lost}</td></tr>`).join('')}</table><div class="mu">Обг.: совершено / потеряно позиций</div></div>
<div class="card"><h3>Анализ болида</h3><select id="ra" style="width:100%" onchange="showCarAnalysis(+this.value)">${optionsHtml(rs.map(c => carLabel(c.c)), 0)}</select><div id="rb2"></div></div></div>`;
    showCarAnalysis(0);
}

function showCarAnalysis(i) {
    const z = state.sim;
    const c = classified(z)[i];
    const w = z.res[0] || c;
    const tr = TRACKS[state.tr];
    const hl = c.hl;
    const fg = getComputedStyle(document.body).color;
    const srt = [...hl].sort((a, b) => a - b);
    const med = srt[srt.length >> 1] || 1;
    const mean = a => a.length ? a.reduce((p, q) => p + q, 0) / a.length : 0;
    const cln = a => {
        const m = [...a].sort((x, y) => x - y)[a.length >> 1] || 1;
        return a.filter((t, j) => j > 0 && t < m * 1.03);
    };
    const cc = cln(hl);
    const k3 = Math.max(1, Math.floor(cc.length / 3));
    const dg = mean(cc.slice(-k3)) - mean(cc.slice(0, k3));
    const g = c.c.grid + 1;
    const pos = i + 1;
    const bi = hl.indexOf(Math.min(...hl)) + 1;
    const av = (c.fin ? (c.lp - 1) * tr[TRACK.LENGTH_KM] : c.s / 1000) / (c.fin || c.outT) * 3600;
    const ins = [`Старт P${g} → финиш P${pos}: ${pos < g ? '+' + (g - pos) + ' мест' : pos > g ? '−' + (pos - g) + ' мест' : 'без изменений'}; обгонов совершено ${c.ot}, позиций потеряно ${c.lost}.`,
        `Темп: лучший круг ${formatTime(c.best)} (круг ${bi}); ${i ? 'в среднем ' + (mean(cc) - mean(cln(w.hl))).toFixed(2) + ' с/кр. к лидеру.' : 'лучший средний темп среди финишировавших.'}`,
        `Шины: к концу стинтов темп меняется на ${dg > 0 ? '+' : ''}${dg.toFixed(2)} с/кр.; ${c.ps.length ? c.ps.map((p, j) => `стоп ${j + 1} на круге ${p.lap - 1} (износ ${p.w}%, далее ${TYRES[p.comp].n})`).join('; ') : 'пит-стопов не было'}.`,
        `Режим: полный газ ${(c.tf / c.tt * 100).toFixed(0)}% времени, торможение ${(c.tb / c.tt * 100).toFixed(0)}%, DRS ${c.td.toFixed(0)} с, макс. скорость ${Math.round(c.vx)} км/ч, средняя ${av.toFixed(0)} км/ч.`,
        c.c.s == 'f1' ? `ERS: потрачено ${c.eu.toFixed(0)}% заряда, рекуперировано ${c.eh.toFixed(0)}%, в конце ${Math.round(c.er)}%.` : 'У F2 нет ERS.'];
    if (state.human) {
        const eff = effectivePilot(c.c);
        ins.push(`Реалистичная езда: ошибок ${c.errN}, потери ≈ ${c.errT.toFixed(1)} с; разброс темпа ±${c.sd.toFixed(2)} с.`);
        if (c.c.traits.length) ins.push('Черты: ' + c.c.traits.map(id => TRAITS[id].name).join(', ') + '.');
        ins.push(`Пилот: RTG ${pilotRating(effectivePilot(c.c))} (EXP ${eff.exp} · RAC ${eff.rac} · AWA ${eff.awa} · PAC ${eff.pac})${c.pen ? '; штрафы стюардов +' + c.pen + ' с' : ''}.`);
    }
    if (c.out) ins.unshift(`✖ Сход на круге ${Math.max(1, c.lp)}: ${c.why}.`);
    $('rb2').innerHTML = `<ul style="padding-left:18px;margin:8px 0">${ins.map(t => '<li>' + t + '</li>').join('')}</ul><div class="mu">Время круга (пики пит-стопов обрезаны), фон — шины</div><canvas id="rc1" style="height:150px"></canvas><div class="mu">Позиция по кругам</div><canvas id="rc2" style="height:120px"></canvas>${c.ps.length ? `<table><tr><th>Стоп</th><th>Круг</th><th>Питлейн</th><th>Стоянка</th><th>Шины</th></tr>${c.ps.map((p, j) => `<tr><td>${j + 1}</td><td>${p.lap - 1}</td><td>${p.pl.toFixed(2)} с</td><td>${p.st.toFixed(2)} с</td><td>${TYRES[p.comp].n}</td></tr>`).join('')}</table>` : ''}`;
    const n = Math.max(1, hl.length);
    const a = $('rc1');
    const W = a.width = a.clientWidth;
    const H = a.height = 150;
    const x = a.getContext('2d');
    const mn = Math.min(...hl);
    const mx = Math.max(mn + 1, med * 1.03);
    hl.forEach((t, j) => {
        x.globalAlpha = .3;
        x.fillStyle = TYRES[c.hc[j] || 'M'].c;
        x.fillRect(j / n * W, 0, W / n, H);
    });
    x.globalAlpha = 1;
    x.strokeStyle = fg;
    x.lineWidth = 2;
    x.beginPath();
    hl.forEach((t, j) => {
        const X = (j + .5) / n * W;
        const Y = H - 8 - (Math.min(t, mx) - mn) / (mx - mn) * (H - 16);
        j ? x.lineTo(X, Y) : x.moveTo(X, Y);
    });
    x.stroke();
    const b = $('rc2');
    const y = b.getContext('2d');
    const W2 = b.width = b.clientWidth;
    const H2 = b.height = 120;
    const nc = Math.max(2, z.cs.length);
    y.strokeStyle = '#e10600';
    y.lineWidth = 2;
    y.beginPath();
    c.hp.forEach((p, j) => {
        const X = (j + .5) / n * W2;
        const Y = 8 + (p - 1) / (nc - 1) * (H2 - 16);
        j ? y.lineTo(X, Y) : y.moveTo(X, Y);
    });
    y.stroke();
    y.fillStyle = fg;
    y.font = '10px system-ui';
    y.fillText('P1', 2, 10);
    y.fillText('P' + nc, 2, H2 - 2);
}
