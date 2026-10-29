/**
 * Weather card of the strategy tab (the race tab has a button that cycles the weather).
 */
function weatherCardHtml() {
    const buttons = Object.entries(WEATHER_MODES).map(([k, m]) => `<button${state.weather == k ? ' class="on"' : ''} onclick="setWeather('${k}')">${m.icon} ${m.name}</button>`).join('');
    return `<div class="card"><h3>Погода</h3><div class="seg">${buttons}</div><div class="mu" style="margin-top:6px">${weatherNote(state.tr)}</div></div>`;
}
