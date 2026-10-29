/**
 * Weather model. state.weather is 'dry', 'damp' or 'rain' (data in data/weather.js).
 * It changes the lap time, tyre choice and wear, grip (corner speeds), risk of mistakes and contacts,
 * DRS (off in rain) and the spray that makes following harder.
 */
const weatherMode = () => WEATHER_MODES[state.weather];
const weatherLoss = i => state.weather == 'dry' ? 0 : WEATHER_TRACK[i][state.weather == 'damp' ? 0 : 1] / 100;
const weatherRisk = i => state.weather == 'dry' ? 1 : weatherMode().risk * WEATHER_TRACK[i][2];
const weatherGrip = () => weatherMode().grip;
const weatherTyreOffset = m => COMPOUND_WEATHER_OFFSET[state.weather][m];
const weatherTyreWear = m => COMPOUND_WEATHER_WEAR[state.weather][m] || 1;

function weatherNote(i) {
    if (state.weather == 'dry') return 'Сухая трасса: полный темп, шины Софт/Медиум/Хард.';
    const t = WEATHER_TRACK[i], loss = t[state.weather == 'damp' ? 0 : 1], risk = weatherRisk(i).toFixed(1);
    return state.weather == 'damp'
        ? `Сыро: темп −${loss}%, риск ошибок ×${risk}, лучше Интер; ${t[3]}.`
        : `Дождь: темп −${loss}%, риск ошибок ×${risk}, DRS выключен, нужны дождевые шины; ${t[3]}.`;
}

// Put a car's strategy on tyres that fit the weather (teams would do the same when the weather changes).
function adaptStrategy(c) {
    const w = state.weather;
    c.str.c = c.str.c.map(m => w == 'dry' ? (m == 'I' || m == 'W' ? 'M' : m) : w == 'damp' ? 'I' : 'W');
    if (w == 'dry' && new Set(c.str.c).size < 2) c.str.c[c.str.c.length - 1] = 'H';
}

function setWeather(w) {
    state.weather = w;
    state.cars.forEach(adaptStrategy);
    render();
}

function cycleWeather() {
    setWeather({ dry: 'damp', damp: 'rain', rain: 'dry' }[state.weather]);
}
