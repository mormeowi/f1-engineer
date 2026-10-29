/**
 * UI helpers and tab switching.
 */

const trackInfoText = i => {
    const track = TRACKS[i];
    return `${track[TRACK.LENGTH_KM]} км · ${track[TRACK.CORNERS]} поворотов · DRS: ${track[TRACK.DRS_ZONES]} · полный газ ${track[TRACK.FULL_THROTTLE]}% · прижим ${track[TRACK.DOWNFORCE]}/5 · износ шин ${track[TRACK.TYRE_WEAR]} (${track[TRACK.TYRE_WEAR] < .85 ? 'низкий' : track[TRACK.TYRE_WEAR] < 1.15 ? 'средний' : 'высокий'}) · шины C${TYRE_ALLOCATION[i][0]}/C${TYRE_ALLOCATION[i][1]}/C${TYRE_ALLOCATION[i][2]} · обгоны ${track[TRACK.OVERTAKING]}/5`;
};

const renderNoCar = () => $('m').innerHTML = '<div class="card">Добавьте болид во вкладке «Болид».</div>';

const sliderHtml = (l, k, v, a, b, s, fn, dis) => `<label class="sl"><span>${l}</span><b>${v}</b><input type="range" data-k="${k}" min="${a}" max="${b}" step="${s}" value="${v}"${dis ? ' disabled' : ''} oninput="${fn}(this)"></label>`;

const optionsHtml = (a, sel) => a.map((x, i) => `<option value="${i}"${i == sel ? ' selected' : ''}>${x}</option>`).join('');

// ---------- Общее ----------
const TAB_RENDERERS = [renderCarTab, renderStrategyTab, renderTestTab];

function render() {
    applyTyreAllocation();
    document.body.classList.toggle('wide', state.tab === 2);   // race tab uses the full width
    $('ti').textContent = TRACKS[state.tr][TRACK.NAME] + ': ' + trackInfoText(state.tr);
    $('eqb').textContent = 'Мощность болидов: ' + (state.eq ? 'равная' : 'реальная');
    $('eqb').className = state.eq ? 'on' : '';
    $('chips').innerHTML = state.cars.map((c, i) => `<button class="chip${i == state.a ? ' on' : ''}" onclick="state.a=${i};render()"><i style="background:${teamColor(c)}"></i>${carLabel(c)}</button>`).join('');
    TAB_RENDERERS[state.tab]();
}

function switchTab(n) {
    state.run = false;
    engineOff();
    state.tab = n;
    document.querySelectorAll('nav button').forEach((b, i) => b.className = i == n ? 'on' : '');
    render();
}
