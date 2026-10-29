/**
 * Track geometry and speed profile.
 * 
 * trackPath(i)     smooth closed outline of track i (from TRACK_GEOMETRY)
 * trackProfile(i)  per-point corner speed limit, acceleration/braking pass, DRS zones, braking points,
 *                  ERS deployment zones and the optimal racing-line offset
 */

const pathCache = {};

function trackPath(i) {
    if (pathCache[i])
        return pathCache[i];
    const [lat, pts] = TRACK_GEOMETRY[i].split('|');
    const k = Math.cos(+lat * Math.PI / 180);
    const P = pts.split(' ').map(s => {
        const [x, y] = s.split(',').map(Number);
        return [x * k, -y];
    });
    const n = P.length;
    const o = [];
    for (let k = 0; k < n; k++) {
        const a = P[(k + n - 1) % n];
        const b = P[k];
        const c = P[(k + 1) % n];
        const d = P[(k + 2) % n];
        for (let t = 0; t < 20; t++) {
            const u = t / 20;
            const u2 = u * u;
            const u3 = u2 * u;
            o.push([0, 1].map(z => .5 * (2 * b[z] + (-a[z] + c[z]) * u + (2 * a[z] - 5 * b[z] + 4 * c[z] - d[z]) * u2 + (-a[z] + 3 * b[z] - 3 * c[z] + d[z]) * u3)));
        }
    }
    return pathCache[i] = o;
}

// профиль скорости: кривизна -> предел скорости, разгон/торможение, зоны DRS и точки торможения
const profileCache = {};

// Speed limits from curvature, forward/backward passes, DRS zones, braking points, ERS zones, racing line.
function trackProfile(i) {
    const key = i + state.weather;                 // the profile depends on the grip of the weather
    if (profileCache[key])
        return profileCache[key];
    const grip = weatherGrip();
    const P = trackPath(i);
    const n = P.length;
    const tr = TRACKS[i];
    const Lm = tr[TRACK.LENGTH_KM] * 1000;
    const sg = [];
    let tot = 0;
    for (let k = 0; k < n; k++) {
        const a = P[k];
        const b = P[(k + 1) % n];
        const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
        sg.push(d);
        tot += d;
    }
    const ds = sg.map(d => d / tot * Lm);
    const D = [0];
    ds.forEach((d, k) => D.push(D[k] + d));
    // top speed from the full-throttle share
    const vt = 240 + (tr[TRACK.FULL_THROTTLE] - 40) * 2.25;
    const u = [];
    for (let k = 0; k < n; k++) {
        const a = P[(k + n - 1) % n];
        const b = P[k];
        const c = P[(k + 1) % n];
        const g = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
        const an = Math.abs(Math.atan2(Math.sin(g), Math.cos(g)));
        const cu = an / ((ds[(k + n - 1) % n] + ds[k]) / 2);
        u.push(Math.max(17, Math.min(vt / 3.6, Math.sqrt(30 * grip / Math.max(cu, 1e-5)))));
    }
    for (let r = 0; r < 3; r++) {
        for (let k = 0; k < n; k++) {
            const j = (k + 1) % n;
            u[j] = Math.min(u[j], Math.sqrt(u[k] * u[k] + 16 * grip * ds[k]));
        }
        for (let k = n - 1; k >= 0; k--) {
            const j = (k + 1) % n;
            u[k] = Math.min(u[k], Math.sqrt(u[j] * u[j] + 90 * grip * ds[k]));
        }
    }
    let T0 = 0;
    const cm = [0];
    for (let k = 0; k < n; k++) {
        T0 += ds[k] / u[k];
        cm.push(T0);
    }
    const dr = Array(n).fill(0);
    const bp = Array(n).fill(0);
    const runs = [];
    let s0 = -1;
    for (let k = 0; k <= n; k++) {
        const hi = k < n && u[k] > .93 * vt / 3.6;
        if (hi && s0 < 0)
            s0 = k;
        if (!hi && s0 >= 0) {
            runs.push([s0, k, D[k] - D[s0]]);
            s0 = -1;
        }
    }
    runs.sort((a, b) => b[2] - a[2]).slice(0, tr[TRACK.DRS_ZONES]).forEach(r => {
        for (let k = r[0]; k < r[1]; k++)
            dr[k] = 1;
    });
    for (let k = 0; k < n; k++) {
        const p = (k + n - 1) % n;
        const j = (k + 1) % n;
        if (u[j] < u[k] - .05 && u[p] <= u[k] + .05) {
            let m = j;
            let c = 0;
            while (u[(m + 1) % n] < u[m] - .02 && c++ < n)
                m = (m + 1) % n;
            const d = (u[k] - u[m]) * 3.6;
            if (d > 30)
                bp[k] = Math.min(1.3, d / 110);
        }
    }
    // ERS deployment zones: longest straights up to ~11 s of deployment per lap
    const ep = Array(n).fill(0);
    const rn = [];
    let q0 = -1;
    for (let k = 0; k <= n; k++) {
        const hi = k < n && u[k] > .82 * vt / 3.6;
        if (hi && q0 < 0)
            q0 = k;
        if (!hi && q0 >= 0) {
            let t = 0;
            for (let j = q0; j < k; j++)
                t += ds[j] / u[j];
            rn.push([q0, k, t]);
            q0 = -1;
        }
    }
    rn.sort((a, b) => b[2] - a[2]);
    let bud = 11;
    for (const r of rn) {
        if (bud <= 0)
            break;
        for (let k = r[0]; k < r[1]; k++)
            ep[k] = 1;
        bud -= r[2];
    }
    // optimal racing line: offset towards the inside of corners
    const og = [];
    for (let k = 0; k < n; k++) {
        const a = P[(k + n - 1) % n];
        const b = P[k];
        const c = P[(k + 1) % n];
        const g = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
        og.push(Math.atan2(Math.sin(g), Math.cos(g)));
    }
    let off = og.map(g => Math.max(-1, Math.min(1, g * 14)));
    for (let r = 0; r < 3; r++)
        off = off.map((_, k) => {
            let t = 0;
            for (let j = -12; j <= 12; j++)
                t += off[(k + j + n) % n];
            return t / 25;
        });
    const mo = Math.max(...off.map(Math.abs)) || 1;
    off = off.map(v => v / mo);
    let turnR = 0, turnL = 0;
    og.forEach(g => g > 0 ? turnR += g : turnL -= g);
    const pf = {
        n, Lm, D, ds, u, cm, T0, dr, bp, vt, off, ep
    };
    pf.rs = turnR / ((turnR + turnL) || 1);   // share of right-hand turning: left tyres are loaded more in right-hand corners
    const tA = x => {
        const k = indexAtDistance(pf, x);
        return cm[k] + (x - D[k]) / ds[k] * (cm[k + 1] - cm[k]);
    };
    const s1 = tA(Lm / 3);
    const s2 = tA(2 * Lm / 3) - s1;
    pf.sh = [s1 / T0, s2 / T0, (T0 - s1 - s2) / T0];
    return profileCache[key] = pf;
}

const indexAtDistance = (p, x) => {
    x = (x % p.Lm + p.Lm) % p.Lm;
    let a = 0;
    let b = p.n - 1;
    while (a < b) {
        const m = (a + b + 1) >> 1;
        if (p.D[m] <= x)
            a = m;
        else
            b = m - 1;
    }
    return a;
};
