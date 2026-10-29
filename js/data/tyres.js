/**
 * Tyre compounds. S/M/H are the soft/medium/hard tyres of the *current* track:
 * applyTyreAllocation() (model/lap-model.js) fills in pace offset (o), wear (d), life (l) and name (n)
 * from TYRE_ALLOCATION and the tables below.
 */
const TYRES = {
    S: { c: '#e53935', n: 'Софт' },
    M: { c: '#fdd835', n: 'Медиум' },
    H: { c: '#cfd3d8', n: 'Хард' },
    // wet-weather tyres: fixed values, their pace depends on the weather (see data/weather.js)
    I: { c: '#43a047', n: 'Интер', o: 0, d: .03, l: 38 },
    W: { c: '#1e88e5', n: 'Дождевые', o: 0, d: .025, l: 45 },
};

// Per C-number (C1..C5): seconds lost per lap and per lap of age, and life in laps at wear factor 1.
const TYRE_DEGRADATION = [0.016, 0.022, 0.034, 0.055, 0.09];
const TYRE_LIFE = [62, 48, 34, 22, 15];
