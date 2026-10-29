/**
 * Start-up code: theme, start screen and initial state. Loaded last.
 */

applyTyreAllocation();

$('trk').innerHTML = optionsHtml(TRACKS.map(track => track[TRACK.NAME]), 0);

function setTheme(v) {
    const r = document.documentElement;
    if (v == 'sys')
        r.removeAttribute('data-theme');
    else
        r.setAttribute('data-theme', v == 'white' ? 'light' : 'dark');
    state.theme = v;
    $('sth').value = v;
    $('sthm').value = v;
    saveSettings();
    if (state.sim && state.tab == 2)
        drawRace();
}

function startApp() {
    document.body.classList.remove('st');
    $('st').style.display = 'none';
    render();
}

state.lang = 'ru';

// Restore the saved settings; without them the browser language decides.
const saved = loadSettings();
setVolume(saved.volume != null ? saved.volume : state.volume);
setTheme(saved.theme || 'sys');
const startLang = saved.lang || ((navigator.language || 'ru').toLowerCase().startsWith('ru') ? 'ru' : 'en');
if (startLang == 'en') setLang('en');

// Browsers allow sound only after a click or tap.
document.addEventListener('pointerdown', initAudio, { passive: true });

state.cars.push(makeCar('f1', 0), makeCar('f1', 9));

state.cars.forEach((c, i) => c.grid = i);

switchTab(0);
