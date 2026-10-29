/**
 * Lap time, tyre wear and fuel model.
 * 
 * Lap time = track reference time * series factor * (1 + performance deficit)
 *            + setup penalty + tyre loss + fuel effect + fuel-mix / ERS-mode delta.
 * simulateRace() sums that over the whole race for a given strategy and is what the strategy tab uses.
 */

const powerWeight = i => Math.min(.46, Math.max(.2, .2 + (TRACKS[i][TRACK.FULL_THROTTLE] - 40) * .0065));

function applyTyreAllocation() {
    const a = TYRE_ALLOCATION[state.tr];
    ['H', 'M', 'S'].forEach((k, j) => {
        const n = a[j];
        TYRES[k].d = TYRE_DEGRADATION[n - 1];
        TYRES[k].l = TYRE_LIFE[n - 1];
        TYRES[k].o = (a[2] - n) * .55;
        TYRES[k].n = ({ S: 'Софт', M: 'Медиум', H: 'Хард' })[k] + ' (C' + n + ')';
    });
}

const raceLaps = () => Math.max(3, Math.round(TRACKS[state.tr][TRACK.LAPS] * state.pct / 100));

// Setup values that trade lap time against tyre wear (camber, toe, tyre pressure).
const TYRE_SETUP_KEYS = ['fc', 'rc', 'ft', 'rt', 'pfl', 'pfr', 'prl', 'prr'];

const setupAggression = c => {
    const n = k => {
        const d = SETUP_PARAMS.find(x => x[0] == k);
        return (c.su[k] - d[2]) / (d[3] - d[2]);
    };
    return ((1 - n('fc')) + (1 - n('rc')) + n('ft') + n('rt') + (1 - n('pfl')) + (1 - n('pfr')) + (1 - n('prl')) + (1 - n('prr'))) / 8;
};

const tyreWearFactor = c => .85 + .35 * setupAggression(c);

const idealSetupValue = (d, i) => {
    const k = d[0];
    if (k == 'fw')
        return clamp(Math.round(TRACKS[i][TRACK.DOWNFORCE] * 2 - 1) + weatherMode().wing, 0, 11);
    if (k == 'rw')
        return clamp(Math.round(TRACKS[i][TRACK.DOWNFORCE] * 2.4 - .5) + weatherMode().wing, 0, 11);
    if (TYRE_SETUP_KEYS.includes(k)) {
        const a = clamp(.7 - (TRACKS[i][TRACK.TYRE_WEAR] - 1) * .8, .15, .9);
        const m = (k == 'ft' || k == 'rt') ? a : 1 - a;
        return d[2] + (d[3] - d[2]) * m;
    }
    return clamp(d[5] + (hashString(TRACKS[i][TRACK.NAME] + k) - .5) * .3 * (d[3] - d[2]), d[2], d[3]);
};

// Lap time lost to a poor setup (0 = ideal for this track).
function setupPenalty(c, i) {
    let s = 0;
    for (const d of SETUP_PARAMS)
        if (!TYRE_SETUP_KEYS.includes(d[0]))
            s += Math.abs(c.su[d[0]] - idealSetupValue(d, i)) / (d[3] - d[2]);
    return (s * .7 + (1 - setupAggression(c)) * .7) * TRACKS[i][TRACK.LAP_TIME] / 90;
}

function baseLapTime(c, i) {
    const w = powerWeight(i);
    const e = effectiveStats(c);
    const sc = e[0] * w + e[1] * (.8 - w) + e[2] * .2;
    return TRACKS[i][TRACK.LAP_TIME] * SERIES[c.s].k * (1 + (100 - sc) * SERIES[c.s].d) * (1 + weatherLoss(i)) + setupPenalty(c, i);
}

const tyreTimeLoss = (k, m, tr, w = 1) => {
    const p = TYRES[m];
    const tw = tr[TRACK.TYRE_WEAR] * w * weatherTyreWear(m);
    const L = p.l / tw;
    return (p.o + weatherTyreOffset(m) + p.d * tw * k + (k > L ? (k - L) * .12 : 0)) * tr[TRACK.LAP_TIME] / 90;
};

// Fuel mix and ERS mode as in the game: pace delta (s per 90 s lap) and fuel burn.
const FUEL_MIX_BURN = {
    L: .93, S: 1, R: 1.06, X: 1.14
};
const FUEL_MIX_PACE = {
    L: .3, S: 0, R: -.18, X: -.3
};
const ERS_MODE_PACE = {
    N: .8, M: 0, O: -.2, H: -.35
};

const fuelMix = c => c.str.fm || 'S';
const ersMode = c => c.s == 'f1' ? (c.str.er || 'M') : 'M';
const fuelBurnPerLap = c => TRACKS[state.tr][TRACK.LENGTH_KM] * (c.s == 'f1' ? .34 : .27) * FUEL_MIX_BURN[fuelMix(c)];
const startFuel = (c, N) => c.str.fl != null ? c.str.fl : Math.min(SERIES[c.s].x, N * fuelBurnPerLap(c) + 1.5);
const modePaceDelta = (c, tr) => (FUEL_MIX_PACE[fuelMix(c)] + (c.s == 'f1' ? ERS_MODE_PACE[ersMode(c)] : 0)) * tr[TRACK.LAP_TIME] / 90;

function simulateRace(b, tr, N, cs, p, c) {
    const F = startFuel(c, N);
    const br = fuelBurnPerLap(c);
    const w = tyreWearFactor(c);
    const d = modePaceDelta(c, tr);
    let t = 0;
    let si = 0;
    let k = 0;
    const l = [];
    for (let i = 0; i < N; i++) {
        let x = b + d + tyreTimeLoss(k++, cs[si], tr, w) + Math.max(0, F - br * i) * .03 + (i ? 0 : 3 + c.grid * .15 * (6 - tr[TRACK.OVERTAKING]) / 3);
        if (si < p.length && i + 1 == p[si]) {
            x += tr[TRACK.PIT_LOSS];
            si++;
            k = 0;
        }
        l.push(x);
        t += x;
    }
    return { l, t, fr: F - br * N };
}

const pitLaps = (c, N) => c.str.f.map(f => clamp(Math.round(f * N), 3, N - 3));
