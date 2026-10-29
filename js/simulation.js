/**
 * Race simulation used by the "Test" tab.
 * 
 * Every car follows the track speed profile scaled by its own pace; it follows the car ahead,
 * attacks at braking points, uses DRS/ERS, pits according to its strategy and records sector/lap times.
 * 
 * Fields of a simulated car (state.sim.cs[i])
 *   c    the garage car              s    distance along the race in metres (negative = on the grid)
 *   v    speed km/h                  m    pace multiplier of the speed profile
 *   lt0  lap time at the start       lp   current lap (1 after crossing the line)
 *   sec  current sector (-1..2)      sc / ls  sector times of this / previous lap
 *   last / best  last and best lap   hl / hp / hc  per-lap time, position, tyre
 *   th / br  throttle / brake %      gr   gear
 *   er   ERS charge %                dp   deploying now        md  ERS mode label
 *   dr   DRS open                    att  running overtake manoeuvre   lo  lateral offset (m)
 *   comp tyre compound               age  tyre age (laps)      wr  tyre wear %      wf  setup wear factor
 *   sp   planned pit laps            si   current stint index
 *   pit  0 none, 1 entering the pit lane, 2 stationary, 3 leaving
 *   req  pit requested               pin / pl / stS / stC / stT  pit timing values
 *   ot / lost  overtakes made / positions lost
 *   fin  finish time (0 = still racing)
 */

const testLapTime = c => baseLapTime(c, state.tr) + modePaceDelta(c, TRACKS[state.tr]) + tyreTimeLoss(1, c.str.c[0], TRACKS[state.tr], tyreWearFactor(c)) + startFuel(c, raceLaps()) * .03;

const carsByPace = () => state.cars.map(c => ({ c, t: testLapTime(c) })).sort((a, b) => a.t - b.t);

// ---- Realistic driving ("human mode") ----
// Every driver gets random traits from the same distribution, so nobody is better or worse by design:
//   pen   steward penalty, s (added to the finishing time)    cons  consistency (higher = smaller pace scatter and fewer mistakes)    ag    aggression (attacks, risk)
//   tmg   tyre management (wear multiplier)    hold   launch reaction time, s    sd    lap pace scatter, s
// Timing loops: the lap is split into LOOPS points; every car records when it passed each point.
// Gaps are read from these times (like real timing), not estimated from distance.
const LOOPS = 60;

const NEUTRAL_TRAITS = { pen: 0, exp: .7, rac: .7, awa: .7, pz: 0, dg: 0, pnc: false, unpl: false, out: false, outT: 0, why: '', cons: 1, ag: 1, tmg: 1, hold: 0, sd: 0, nz: 0, wt: 0, wob: 0, err: null, errN: 0, errT: 0, slow: false };

// p = pilot ratings {exp, rac, awa, pac}, 1-99 (70 = baseline, see model/pilot.js):
//   EXP  experience: stays calm under pressure, gentle on the tyres, good starts
//   RAC  racecraft: attacks succeed more often, defending is harder to beat, good starts
//   AWA  awareness: steady laps, fewer mistakes, contacts and steward penalties
//   PAC  pace: raw speed per lap (about 0.2 s faster at 99, 0.55 s slower at 1)
function driverTraits(p) {
    const u = (a, b) => a + (b - a) * Math.random();
    const e = p.exp / 99, r = p.rac / 99, a = p.awa / 99;
    const cons = (.6 + .45 * a + .25 * e) * u(.95, 1.05);
    return {
        ...NEUTRAL_TRAITS, exp: e, rac: r, awa: a, cons,
        ag: u(.8, 1.2),
        tmg: (1.07 - .13 * e) * u(.98, 1.02),
        hold: Math.max(.12, .48 - .26 * (.5 * e + .5 * r) + u(-.06, .06)),
        sd: Math.max(.06, .12 + (1.3 - cons) * .56),
        pz: (70 - p.pac) * .008 * TRACKS[state.tr][TRACK.LAP_TIME] / 90,
    };
}

// Rolled once per braking zone. Mistakes are more likely with a car close ahead (pressure) and on worn tyres.
function driverMistakeCheck(c, ah, w, z) {
    const near = ah && ah.s - c.s < 40;
    const p = .0025 * w * (1 + (near ? 1.2 * (1.6 - 1.2 * c.exp) : 0) + (c.wr > 85 ? 1 : 0)) * c.ag / c.cons * weatherRisk(state.tr);
    if (Math.random() >= p) return;
    const r = Math.random();
    const wx = state.weather == 'dry' ? 1 : state.weather == 'damp' ? 1.5 : 2;   // wet weather: more big mistakes
    const big = r < .04 * wx, wide = !big && r < .22 + .08 * (wx - 1);      // 4% off the track, 18% runs wide, the rest is a small lock-up
    c.err = big ? { t0: z.t, dur: 2.8, k: .5, lat: 8 } : wide ? { t0: z.t, dur: 1.8, k: .8, lat: 5 } : { t0: z.t, dur: 1, k: .93, lat: 0 };
    if (Math.random() < .5) c.err.lat = -c.err.lat;
    c.errN++;
    c.errT += c.err.dur * (1 - c.err.k);
    if (state.dnf && Math.random() < (big ? .3 : wide ? .04 : 0)) {   // a big mistake can end in the barrier
        retireCar(c, z, 'авария, сход с гонки', '💥');
        return;
    }
    if (big && state.dnf && Math.random() < .3 * (1.5 - c.awa)) penalize(c, z, 5, 'выезд за пределы трассы');
    if (big) z.log.unshift(`${Math.max(1, c.lp)} кр.: ⚠️ ${carLabel(c.c)} выехал за пределы трассы`);
    else if (wide) z.log.unshift(`${Math.max(1, c.lp)} кр.: ⚠️ ${carLabel(c.c)} — ошибка на торможении`);
}

// ---- Crashes, damage and technical failures (switch "Crashes and DNF", state.dnf) ----
const FAIL_PARTS = ['двигатель', 'коробка передач', 'гидравлика', 'перегрев тормозов'];

// Retired cars are sorted last; running cars by distance.
const raceOrder = cs => [...cs].sort((a, b) => (a.out - b.out) || (b.s - a.s));

// Technical failure rate per second, from the reliability value of the car (roughly 1-5% per race).
const mechanicalRate = c => (100 - effectiveStats(c.c)[3]) / 100 * .0033 / c.lt0;

function mechanicalReason(c) {
    const part = c.c.s == 'f1' && Math.random() < .2 ? 'система ERS' : FAIL_PARTS[Math.floor(Math.random() * FAIL_PARTS.length)];
    return `технический отказ (${part}), сход`;
}

function retireCar(c, z, why, icon) {
    c.out = true;
    c.outT = z.t;
    c.why = why;
    c.att = null;
    c.req = false;
    c.err = null;
    c.side = Math.random() < .5 ? 1 : -1;               // side of the track the car rolls to
    z.dnf.push(c);
    playEvent(icon === '💥' ? 'crash' : 'fail', c.c);
    z.log.unshift(`${Math.max(1, c.lp)} кр.: ${icon} ${carLabel(c.c)} — ${why}`);
}

// Steward time penalty: added to the finishing time in the classification.
function penalize(c, z, seconds, why) {
    c.pen += seconds;
    z.log.unshift(`${Math.max(1, c.lp)} кр.: ⚖️ ${carLabel(c.c)} — штраф +${seconds} с (${why})`);
}

// Damage costs seconds per lap until the car pits (repairs add time to the stop).
function damageCar(c, z, seconds, text) {
    c.dg = Math.max(c.dg, seconds);
    c.req = true;
    c.unpl = true;                                       // unplanned stop: the strategy stays as it was
    z.log.unshift(`${Math.max(1, c.lp)} кр.: ⚠️ ${carLabel(c.c)} — ${text}`);
}

// Rolled when car a starts an attack on car d.
function contactCheck(a, d, z) {
    const p = (state.human ? .004 * a.ag * (1.85 - 1.2 * a.awa) : .001) * (a.lp <= 1 ? 2 : 1) * weatherRisk(state.tr);
    if (Math.random() >= p) return;
    z.log.unshift(`${Math.max(1, a.lp)} кр.: ⚠️ контакт: ${carLabel(a.c)} × ${carLabel(d.c)}`);
    const r = Math.random();
    if (r < .5) damageCar(a, z, .5 + Math.random() * .7, 'повреждение переднего крыла');
    else if (r < .7) damageCar(d, z, .5 + Math.random() * .7, 'повреждение переднего крыла');
    else if (r < .85) {
        damageCar(a, z, 6, 'прокол');
        a.pnc = true;
    }
    else {
        retireCar(a, z, 'контакт, сход с гонки', '💥');
        if (Math.random() < .4) retireCar(d, z, 'контакт, сход с гонки', '💥');
    }
    if (state.human && Math.random() < clamp(.85 - .6 * a.awa, .15, .8)) penalize(a, z, 5, 'контакт');   // the attacker is usually blamed
}

function initSimulation() {
    const pf = trackProfile(state.tr);
    state.sim = {
        t: 0, log: [], res: [], cs: carsByPace().map(q => ({
            c: q.c, lt: q.t, lt0: q.t, m: pf.T0 / q.t, s: -(q.c.grid * 30 + 10), v: 0, pv: 0, k: 0, lp: 0, ts: 0, sec: -1, st: 0, sc: [0, 0, 0], ls: [0, 0, 0], last: 0, best: 0, er: 70, th: 0, br: 0, gr: 1, dr: 0, dp: 0, comp: q.c.str.c[0], wf: tyreWearFactor(q.c), sp: pitLaps(q.c, raceLaps()), si: 0, lo: 0, ot: 0, lost: 0, tt: 0, tf: 0, tb: 0, td: 0, eu: 0, eh: 0, vx: 0, hl: [], hp: [], hc: [], ps: [], fin: 0, wi: 0, att: null, rk: '', md: '', age: 1, wr: 0, s0: 0, pit: 0, req: false, pin: 0, pl: 0, stT: 0, stS: 0, stC: 0, bs: 0, ei: 0, ex: 0, lw: .4 + hashString('w' + q.c.id) * .3
        }))
    };
    state.kx = state.ky = state.ks = null;   // the camera jumps to the new race
    // driver traits (neutral values while the realistic mode is off)
    state.sim.dnf = [];
    state.sim.cs.forEach(c => {
        Object.assign(c, state.human ? driverTraits(c.c.pil) : NEUTRAL_TRAITS);
        c.wf *= c.tmg;
        c.tl = new Float32Array((raceLaps() + 3) * LOOPS);   // time of passing each timing loop
        c.pi = -1;                                           // index of the last loop passed
    });
}

// How much later car c passed the timing loop that `other` (ahead) passed first; null if there is no data yet.
function gapSeconds(c, other) {
    const p = Math.min(c.pi, other.pi);
    if (p < 0 || p >= c.tl.length) return null;
    return Math.max(0, c.tl[p] - other.tl[p]);
}

// Record the time at which the car passes each timing loop (called right after the car has moved).
function recordLoops(c, z, L) {
    const Lk = L / LOOPS, pi = Math.floor(c.s / Lk);
    while (c.pi < pi) {
        c.pi++;
        if (c.pi >= 0 && c.pi < c.tl.length) c.tl[c.pi] = z.t - Math.max(0, c.s - c.pi * Lk) / Math.max(c.v / 3.6, 1);
    }
}

// Advance the simulation by dt seconds (called many times per animation frame).
function stepSimulation(dt) {
    const z = state.sim;
    const pf = trackProfile(state.tr);
    const L = pf.Lm;
    const tr = TRACKS[state.tr];
    const e = tr[TRACK.OVERTAKING];
    const EI = L - 350;
    const ord = raceOrder(z.cs);
    z.t += dt;
    if (!z.fin && ord[0].lp > raceLaps()) {
        z.fin = true;
        z.log.unshift('🏁 Финиш: победитель ' + carLabel(ord[0].c));
    }
    if (!z.done && z.cs.every(c => c.fin || c.out))
        z.done = true;
    // ---- per-car update ----
    ord.forEach((c, r) => {
        if (c.out) {                                      // retired: roll to a stop beside the track
            c.v = Math.max(0, c.v - 70 * dt);
            c.s += c.v / 3.6 * dt;
            recordLoops(c, z, L);
            c.lo += Math.max(-4 * dt, Math.min(4 * dt, c.side * 9 - c.lo));
            c.th = 0;
            c.br = c.v > 0 ? 60 : 0;
            c.dr = 0;
            c.dp = 0;
            return;
        }
        if (state.dnf && c.s > 0 && Math.random() < mechanicalRate(c) * dt) {
            retireCar(c, z, mechanicalReason(c), '🔧');
            return;
        }
        let ah = null;
        if (!c.pit)
            for (let j = r - 1; j >= 0; j--)
                if (!ord[j].pit) {
                    ah = ord[j];
                    break;
                }
        // tyres: age, wear and the resulting pace multiplier
        const k = indexAtDistance(pf, c.s);
        const f1 = c.c.s == 'f1';
        const ph = (c.s % L + L) % L;
        const lap = Math.floor(c.s / L);
        const life = TYRES[c.comp].l / (tr[TRACK.TYRE_WEAR] * c.wf * weatherTyreWear(c.comp));
        c.age = 1 + Math.max(0, (c.s - c.s0) / L);
        c.wr = Math.min(100, Math.round(c.age / life * 100));
        c.m = pf.T0 / (c.lt0 + tyreTimeLoss(c.age, c.comp, tr, c.wf) - tyreTimeLoss(1, c.c.str.c[0], tr, c.wf) - Math.max(0, c.s) / L * fuelBurnPerLap(c.c) * .03 + c.nz + c.pz + c.dg);
        if (!c.pit && !c.req && c.s > 0 && c.lp > 0 && ((c.sp.length > c.si && c.lp >= c.sp[c.si]) || c.wr >= 100))
            c.req = true;
        // pit entry (strategy lap reached, pit-entry line passed)
        if (c.req && !c.pit && c.s > 0 && ph >= EI && ph < L - 40) {
            c.pit = 1;
            c.wi = c.wr;
            c.pin = z.t;
            c.ei = lap * L + EI;
            c.bs = (lap + 1) * L + 30 + (c.c.t % 10) * 20 + (c.c.id % 2) * 8;
            c.ex = (lap + 1) * L + 430;
            c.stS = f1 ? 2 + Math.random() * 1.2 : 5.5 + Math.random() * 2;
            if (c.dg) c.stS += 2 + Math.random() * 1.5;   // repairs
            c.slow = false;
            if (state.human) {
                c.stS *= 1 + gauss() * .08;                   // crew and driver variation
                if (Math.random() < .05) {                    // rare problem: stuck wheel nut, late release ...
                    c.stS += 1.5 + Math.random() * 2.5;
                    c.slow = true;
                }
            }
        }
        // target speed (km/h) from the track profile, then pit-lane state machine
        let tv = pf.u[c.s < 0 ? 0 : k] * 3.6 * c.m;
        c.dr = 0;
        if (c.pit === 1) {
            const rem = c.bs - c.s;
            tv = Math.min(80, 3.6 * Math.sqrt(14 * Math.max(0, rem)));
            if (rem < .5) {
                c.pit = 2;
                playEvent('pit', c.c);
                c.stC = 0;
            }
        }
        else if (c.pit === 2) {
            tv = 0;
            c.stC += dt;
            if (c.stC >= c.stS) {
                c.stT = c.stS;
                if (c.slow) z.log.unshift(`🛠 ${carLabel(c.c)}: медленный пит-стоп (${c.stS.toFixed(1)} с)`);
                if (!c.unpl) {                            // planned stop: next stint of the strategy
                    c.si++;
                    c.comp = c.c.str.c[Math.min(c.si, c.c.str.c.length - 1)];
                }
                c.dg = 0;                                 // repaired, fresh tyres
                c.pnc = false;
                c.unpl = false;
                c.s0 = c.s;
                c.pit = 3;
            }
        }
        else if (c.pit === 3) {
            tv = 80;
            if (c.s >= c.ex) {
                c.pit = 0;
                c.req = false;
                c.pl = z.t - c.pin;
                c.ps.push({
                    lap: c.lp, pl: c.pl, st: c.stT, comp: c.comp, w: c.wi
                });
            }
        }
        // a mistake slows the car for a moment; at the start a human needs time to react
        if (c.err) {
            if (z.t - c.err.t0 > c.err.dur) c.err = null;
            else tv *= c.err.k;
        }
        if (state.human && z.t < c.hold) tv = 0;
        // following the car ahead, DRS and slipstream
        if (ah) {
            const g = ah.s - c.s;
            const gt = g / Math.max(c.v / 3.6, 20);                 // time gap to the car ahead, s
            const fast = pf.u[k] > .8 * pf.vt / 3.6;                // on a straight / in a fast section
            const spray = state.weather == 'dry' ? 1 : state.weather == 'damp' ? 1.3 : 1.8;   // water spray makes following harder
            if (!fast && gt < 1.2 * spray) tv *= 1 - .012 * spray * (1 - gt / (1.2 * spray));   // dirty air: less downforce in corners when close behind
            if (pf.dr[k] && c.s > L && state.weather !== 'rain' && g / Math.max(c.v / 3.6, 20) < 1) {   // DRS is not allowed in the rain
                c.dr = 1;
                tv *= 1.025;
            }
            if (g < 25 && fast)
                tv *= 1.006;                                        // slipstream
            if (g < 16 && !(c.att && c.att.t === ah))
                tv = Math.min(tv, ah.v + 2);
        }
        if (c.dp)
            tv *= 1.012;
        // overtake: decide at the next braking point, then run a visible side-by-side manoeuvre
        const prevK = c.k;
        c.k = k;
        // a car can skip profile points between two steps, so check every point it has just passed
        if (state.human && k !== prevK && c.s > 0 && !c.pit) {
            for (let i = (prevK + 1) % pf.n, guard = 0; guard < 8; i = (i + 1) % pf.n, guard++) {
                if (pf.bp[i]) driverMistakeCheck(c, ah, pf.bp[i], z);
                if (i === k) break;
            }
        }
        if (ah && !c.att && c.s > 0 && !c.pit) {
            const g = ah.s - c.s;
            if (g < 45 && c.v > ah.v - 6) {
                let d = 0;
                let bb = -1;
                for (let i = 0; i < 40 && d < 170; i++) {
                    const jj = (k + i) % pf.n;
                    if (pf.bp[jj]) {
                        bb = jj;
                        break;
                    }
                    d += pf.ds[jj];
                }
                if (bb >= 0 && c.rk !== bb + '|' + Math.floor(c.s / L)) {
                    c.rk = bb + '|' + Math.floor(c.s / L);
                    const pa = c.m / ah.m - 1;
                    const p = Math.max(0, Math.min(.9, e * e / 25 * pf.bp[bb] * (.05 + pa * 25 + (c.dr ? .3 : 0) + (f1 && c.er > 25 ? .1 : 0))));
                    if (Math.random() < (state.human ? p * (.8 + .4 * c.ag / 1.2) * (.7 + .6 * c.rac) * (1.2 - .4 * ah.rac) : p)) {
                        c.att = { t: ah, sg: pf.off[(bb + 30) % pf.n] >= 0 ? 1 : -1, t0: z.t };
                        z.log.unshift(`${Math.max(1, c.lp)} кр.: ${carLabel(c.c)} атакует ${carLabel(ah.c)}`);
                        if (state.dnf) contactCheck(c, ah, z);
                    }
                }
            }
        }
        let tl = 0;
        if (c.att) {
            const a2 = c.att.t;
            if (c.s > a2.s + 7) {
                z.log.unshift(`${Math.max(1, c.lp)} кр.: ✅ ${carLabel(c.c)} обошёл ${carLabel(a2.c)}`);
                c.ot++;
                a2.lost++;
                playEvent('overtake', c.c);
                playEvent('lost', a2.c);
                c.att = null;
            }
            else if (c.pit || a2.pit || z.t - c.att.t0 > 14 || a2.s - c.s > 80 || a2.out)   // gave up: too long or the gap grew
                c.att = null;
            else {
                tl = c.att.sg * 5.5;
                tv = Math.min(Math.max(tv * 1.03, a2.v + 12), tv * 1.1);   // never faster than the car can physically go here
            }
        }
        z.log.length = Math.min(z.log.length, 6);
        if (state.human) {
            if (z.t > c.wt) {                     // small wander around the racing line, a new value every ~second
                c.wt = z.t + .6 + Math.random() * .8;
                c.wob = (Math.random() - .5) * 1.4 / c.cons;
            }
            tl += c.wob + (c.err ? c.err.lat : 0);
        }
        c.lo += Math.max(-5 * dt, Math.min(5 * dt, tl - c.lo));
        // speed integration with acceleration / braking limits
        c.pv = c.v;
        c.v = tv > c.v ? Math.min(tv, c.v + 29 * dt) : Math.max(tv, c.v - 160 * dt);
        if (c.pit === 2)
            c.v = 0;
        c.s += c.v / 3.6 * dt;
        recordLoops(c, z, L);
        // telemetry: throttle, brake, gear
        const a = (c.v - c.pv) / dt;
        const br = a < -6 ? Math.min(100, -a / 1.6) : 0;
        let th;
        if (br)
            th = 0;
        else if (c.pit)
            th = c.pit === 2 ? 0 : 55;
        else if (tv > c.v + 1)
            th = 100;
        else
            th = c.v >= pf.vt * .96 ? 100 : 35 + c.v / pf.vt * 45;
        c.br = c.br * .6 + br * .4;
        c.th = c.th * .6 + th * .4;
        c.tt += dt;
        if (c.th > 90)
            c.tf += dt;
        if (c.br > 10)
            c.tb += dt;
        if (c.dr)
            c.td += dt;
        if (c.v > c.vx)
            c.vx = c.v;
        c.gr = (f1 ? [0, 70, 105, 145, 185, 225, 265, 300] : [0, 60, 100, 150, 200, 250]).filter(x => c.v >= x).length || 1;
        // ERS: deploy on planned straights or when attacking, harvest under braking
        if (f1) {
            const atk = ah && (ah.s - c.s) / Math.max(c.v / 3.6, 20) < 1.3 && c.er > 15;
            const want = c.th > 90 && c.v > 110 && !c.pit && c.c.str.er !== 'N' && (c.c.str.er === 'H' || pf.ep[k] || atk || c.er > 85 || (c.c.str.er === 'O' && c.er > 55));
            c.md = want ? (atk ? 'атака' : 'по плану') : (br > 10 ? 'рекуперация' : 'заряд');
            c.dp = want && c.er > 0 ? 1 : 0;
            if (c.dp) {
                c.er = Math.max(0, c.er - dt * 100 / 22);
                c.eu += dt * 100 / 22;
            }
            if (br > 10) {
                c.er = Math.min(100, c.er + dt * 100 / 26);
                c.eh += dt * 100 / 26;
            }
            else if (c.th < 60 && !c.dp)
                c.er = Math.min(100, c.er + dt * 100 / 160);
        }
        // sector and lap timing
        const sn = c.s < 0 ? -1 : Math.floor((c.s % L) / (L / 3));
        if (sn !== c.sec) {
            if (state.human && sn >= 0) c.nz = .55 * c.nz + gauss() * c.sd * .8;   // pace varies from sector to sector
            if (c.sec >= 0)
                c.sc[c.sec] = z.t - c.st;
            if (c.sec === 2 && sn === 0) {
                c.last = z.t - c.ts;
                c.ts = z.t;
                c.ls = [...c.sc];
                if (!c.best || c.last < c.best)
                    c.best = c.last;
                c.lp++;
                c.hl.push(c.last);
                c.hp.push(ord.indexOf(c) + 1);
                c.hc.push(c.comp);
                if ((c.lp > raceLaps() || z.fin) && !c.fin) {
                    c.fin = z.t;
                    z.res.push(c);
                playEvent('finish', c.c);
                }
            }
            if (c.sec === -1) {
                c.ts = z.t;
                c.lp = 1;
            }
            c.st = z.t;
            c.sec = sn;
        }
    });
}
