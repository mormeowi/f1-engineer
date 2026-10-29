/**
 * Settings menu: theme, language and volume. The values are kept in localStorage, so they survive a reload.
 * (Theme: setTheme() in main.js, language: setLang() in i18n.js, sound: audio.js.)
 */
const SETTINGS_KEY = 'f1-engineer-settings';

function loadSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function saveSettings() {
    try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme: state.theme, lang: state.lang, volume: state.volume }));
    } catch (e) { /* storage blocked: settings last until the page is closed */ }
}

function openSettings() {
    $('set').classList.add('open');
}

function closeSettings() {
    $('set').classList.remove('open');
}

function setVolume(v) {
    state.volume = v;
    $('svol').value = v;
    $('svv').textContent = v;
    applyVolume();
    saveSettings();
}

// Slider moved by the user: also wakes up the audio engine (browsers need a user gesture for that).
function onVolumeInput(v) {
    setVolume(v);
    initAudio();
}
