/**
 * Cars in the garage.
 * 
 * A car object (makeCar):
 *   id     unique id            s     series key: 'f1' | 'f2' | 'f19'
 *   name   optional name given by the user (shown in tables, chips and the timing tower)
 *   pil    pilot ratings {exp, rac, awa, pac} 1-99 (see model/pilot.js); only used while realistic driving is on
 *   t      team index in SERIES[s].t
 *   st     [power unit, aero, chassis, reliability] 0-100
 *   su     setup values, keyed by SETUP_PARAMS[i][0]
 *   grid   starting position, 0 = pole
 *   str    race strategy: c = compounds per stint ('S'|'M'|'H'), f = pit laps as fractions of the race,
 *          fm = fuel mix (L|S|R|X), er = ERS mode (N|M|O|H), fl = start fuel in kg (null = automatic)
 */

const teamStats = (s, i) => {
    const t = SERIES[s].t[i];
    return s == 'f1' ? t.slice(1, 5) : [80, t[1], t[1], t[1]];
};

const teamColor = c => {
    const t = SERIES[c.s].t[c.t];
    return t[t.length - 1];
};

// Label used in chips and tables: the given name plus the team, or series + team when there is no name.
const carLabel = c => c.name ? `${c.name} (${SERIES[c.s].t[c.t][0]})` : SERIES[c.s].s + ' ' + SERIES[c.s].t[c.t][0];

// Three-letter code for the map and the timing tower.
const carShort = c => (c.name || SERIES[c.s].t[c.t][0]).replace(/\s+/g, '').slice(0, 3).toUpperCase();

// Names are inserted into HTML, so strip the characters that could break it.
const cleanName = v => v.replace(/[<>&"']/g, '').trim().slice(0, 14);

const makeCar = (s, i, name = '', pil = null) => ({
    id: ++nextCarId, name, pil: { ...PILOT_DEFAULT, ...pil }, s, t: i, st: teamStats(s, i), su: Object.fromEntries(SETUP_PARAMS.map(d => [d[0], d[5]])), str: {
        c: ['M', 'H'], f: [.45 + (Math.random() - .5) * .12],   // default one-stop plan; the pit lap differs a little from car to car
         fm: 'S', er: 'M', fl: null
    }
});

const currentCar = () => state.cars[state.a];

const horsepower = c => c.s == 'f1' ? Math.round(760 + 2.5 * effectiveStats(c)[0]) : 620;

const effectiveStats = c => state.eq ? [80, 80, 80, 80] : c.st;

const normalizeGrid = () => [...state.cars].sort((a, b) => a.grid - b.grid).forEach((c, i) => c.grid = i);
