/**
 * Draws the surroundings of the track on the race map: sea and lakes, trees and buildings, landmarks and grandstands.
 * Trees and buildings are placed once per track (seeded random, so a track always looks the same) and only drawn
 * when they are on screen.
 */
const envCache = {};

function seeded(seed) {
    let a = (seed + 1) * 2654435761 >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

const ENV_LOOK = {   // spacing, min and max distance from the track (m)
    forest: [18, 45, 450], park: [55, 50, 420], city: [58, 42, 480], sand: [75, 40, 420],
};
const ENV_EXTRA_SIZE = { wheel: 50, tower: 20, stadium: 90, hotel: 55 };   // clearance radius in m

// bb = track bounding box [minX, minY, maxX, maxY] in map units, ppm = map units per metre
function buildEnvironment(i, P, bb, ppm) {
    const env = ENVIRONMENT[i], rnd = seeded(i), [bx, by, ex, ey] = bb;
    const out = { items: [], extras: [], sea: null, lake: null };
    const edge = { S: ey, N: by, E: ex, W: bx };
    const wave = (v, amp) => amp * ppm * Math.sin(v / (180 * ppm));
    if (env.sea) {
        const d = env.sea.dir, g = env.sea.gap * ppm, far = 6000 * ppm, pad = 800 * ppm, step = 60 * ppm;
        const sgn = (d == 'S' || d == 'E') ? 1 : -1, base = edge[d] + sgn * g, pts = [];
        const [a0, a1] = (d == 'S' || d == 'N') ? [bx - pad, ex + pad] : [by - pad, ey + pad];
        for (let v = a0; v <= a1; v += step) pts.push([v, base + wave(v, 30)]);
        pts.push([a1, base + sgn * far], [a0, base + sgn * far]);
        out.sea = (d == 'S' || d == 'N') ? pts : pts.map(p => [p[1], p[0]]);
    }
    if (env.lake) {
        const [fx, fy, frx, fry] = env.lake, cx = bx + fx * (ex - bx), cy = by + fy * (ey - by), rx = frx * (ex - bx), ry = fry * (ey - by);
        out.lake = Array.from({ length: 48 }, (_, k) => [cx + rx * Math.cos(k / 48 * 6.283) * (1 + .06 * Math.sin(k * 3)), cy + ry * Math.sin(k / 48 * 6.283) * (1 + .06 * Math.sin(k * 3))]);
        out.lakeEllipse = [cx, cy, rx, ry];
    }
    const inWater = (x, y) => {
        if (env.sea) {
            const d = env.sea.dir, g = env.sea.gap * ppm;
            if ((d == 'S' && y > ey + g) || (d == 'N' && y < by - g) || (d == 'E' && x > ex + g) || (d == 'W' && x < bx - g)) return true;
        }
        if (out.lakeEllipse) {
            const [cx, cy, rx, ry] = out.lakeEllipse;
            if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1.2) return true;
        }
        return false;
    };
    const S = P.filter((_, k) => k % 6 == 0);
    const minD2 = (x, y) => {
        let m = Infinity;
        for (const p of S) {
            const d = (p[0] - x) ** 2 + (p[1] - y) ** 2;
            if (d < m) m = d;
        }
        return m;
    };
    const [sp0, dmin, dmax] = ENV_LOOK[env.around];
    const margin = dmax * ppm;
    const area = (ex - bx + 2 * margin) * (ey - by + 2 * margin) / (ppm * ppm);
    const sp = Math.max(sp0, Math.sqrt(area / 5500)), stepU = sp * ppm;
    const palette = env.around == 'city' ? (env.pal == 'glass' ? ['#3f4757', '#505a6e', '#2f3647', '#5b6881'] : ['#b9b3a7', '#a6a095', '#cdc4b0', '#9a9ea8'])
        : env.around == 'forest' ? ['#1f5a2e', '#2a6b36', '#245f31'] : env.around == 'park' ? ['#3b7f40', '#47904a', '#2f7035'] : ['#a8955c', '#b7a36a'];
    for (let x = bx - margin; x < ex + margin; x += stepU)
        for (let y = by - margin; y < ey + margin; y += stepU) {
            const jx = x + (rnd() - .5) * stepU * .8, jy = y + (rnd() - .5) * stepU * .8, c = palette[Math.floor(rnd() * palette.length)], q = rnd();
            if (inWater(jx, jy)) continue;
            const d2 = minD2(jx, jy);
            if (d2 < (dmin * ppm) ** 2 || d2 > (dmax * ppm) ** 2) continue;
            if (env.around == 'city') {
                if (q < .22) continue;
                out.items.push({ x: jx, y: jy, k: 'b', w: sp * (.4 + q * .4) * ppm, h: sp * (.4 + rnd() * .4) * ppm, c, tall: env.pal == 'glass' || q > .85 });
            } else {
                out.items.push({ x: jx, y: jy, k: 't', r: (env.around == 'sand' ? 2.5 + q * 1.5 : 4.5 + q * 4.5) * ppm, c });
            }
        }
    (env.extras || []).forEach(([kind, fx, fy]) => {
        const rm = ENV_EXTRA_SIZE[kind], bxp = bx + fx * (ex - bx), byp = by + fy * (ey - by);
        for (let k = 0; k < 30; k++) {            // search outwards for a free spot
            const ang = k * 2.4, dist = k ? (rm + 80) * ppm * (1 + Math.floor(k / 8)) : 0;
            const x = bxp + Math.cos(ang) * dist, y = byp + Math.sin(ang) * dist;
            if (!inWater(x, y) && minD2(x, y) > ((rm + 50) * ppm) ** 2) {
                out.extras.push({ kind, x, y, rm });
                break;
            }
        }
    });
    return out;
}

// E = { i, P, bb, ppm, sc, cx, cy, w, h, pm }: track index, outline, bounding box, units per metre, camera scale/centre, canvas size, px per metre
function drawEnvironment(x, E) {
    const env = envCache[E.i] || (envCache[E.i] = buildEnvironment(E.i, E.P, E.bb, E.ppm));
    const W = E.w, H = E.h, S = E.sc;
    const sx = u => W / 2 + (u - E.cx) * S, sy = v => H / 2 + (v - E.cy) * S;
    const poly = (pts, fill) => {
        x.beginPath();
        pts.forEach((p, k) => k ? x.lineTo(sx(p[0]), sy(p[1])) : x.moveTo(sx(p[0]), sy(p[1])));
        x.closePath();
        x.fillStyle = fill;
        x.fill();
        x.strokeStyle = 'rgba(255,255,255,.45)';
        x.lineWidth = 2;
        x.stroke();
    };
    if (env.sea) poly(env.sea, '#2f78b5');
    if (env.lake) poly(env.lake, '#3a86c4');
    for (const it of env.items) {
        const px = sx(it.x), py = sy(it.y);
        if (px < -60 || py < -60 || px > W + 60 || py > H + 60) continue;
        if (it.k == 't') {
            const r = Math.max(1.2, it.r * S);
            x.fillStyle = 'rgba(0,0,0,.22)';
            x.beginPath();
            x.arc(px + r * .25, py + r * .25, r, 0, 6.283);
            x.fill();
            x.fillStyle = it.c;
            x.beginPath();
            x.arc(px, py, r, 0, 6.283);
            x.fill();
        } else {
            const bw = Math.max(2, it.w * S), bh = Math.max(2, it.h * S);
            if (it.tall) {                       // shadow of a tall building
                x.fillStyle = 'rgba(0,0,0,.25)';
                x.fillRect(px - bw / 2 + bw * .18, py - bh / 2 + bh * .18, bw, bh);
            }
            x.fillStyle = it.c;
            x.fillRect(px - bw / 2, py - bh / 2, bw, bh);
            if (bw > 8) {
                x.strokeStyle = 'rgba(0,0,0,.3)';
                x.lineWidth = 1;
                x.strokeRect(px - bw / 2, py - bh / 2, bw, bh);
            }
        }
    }
    for (const e of env.extras) {
        const px = sx(e.x), py = sy(e.y), r = e.rm * E.pm;
        if (px < -r * 2 || py < -r * 2 || px > W + r * 2 || py > H + r * 2) continue;
        if (e.kind == 'wheel') {                  // ferris wheel
            x.strokeStyle = '#d8dce2';
            x.lineWidth = Math.max(1, r * .08);
            x.beginPath();
            x.arc(px, py, r, 0, 6.283);
            x.stroke();
            for (let k = 0; k < 12; k++) {
                x.beginPath();
                x.moveTo(px, py);
                x.lineTo(px + r * Math.cos(k * .5236), py + r * Math.sin(k * .5236));
                x.stroke();
            }
        } else if (e.kind == 'tower') {           // observation tower
            x.fillStyle = 'rgba(0,0,0,.25)';
            x.beginPath();
            x.arc(px + r * .5, py + r * .5, r, 0, 6.283);
            x.fill();
            x.fillStyle = '#c9ced6';
            x.beginPath();
            x.arc(px, py, r, 0, 6.283);
            x.fill();
            x.fillStyle = '#6b7380';
            x.beginPath();
            x.arc(px, py, r * .45, 0, 6.283);
            x.fill();
        } else if (e.kind == 'stadium') {         // stadium: stands around a pitch
            x.fillStyle = '#6a6f78';
            x.beginPath();
            x.ellipse(px, py, r, r * .7, 0, 0, 6.283);
            x.fill();
            x.fillStyle = '#4f8f52';
            x.beginPath();
            x.ellipse(px, py, r * .68, r * .42, 0, 0, 6.283);
            x.fill();
            x.strokeStyle = 'rgba(255,255,255,.7)';
            x.lineWidth = 1;
            x.strokeRect(px - r * .5, py - r * .28, r, r * .56);
        } else {                                  // hotel
            x.fillStyle = '#cfd5dc';
            x.fillRect(px - r, py - r * .45, r * 2, r * .9);
            x.fillStyle = '#5b7a99';
            x.fillRect(px - r * .9, py - r * .2, r * 1.8, r * .4);
        }
    }
}

// Grandstands next to the track. rw = drawn width of the road in px, at/po = position helpers of drawRace.
function drawStands(x, E, rw, at, po, L) {
    const env = ENVIRONMENT[E.i], pm = E.pm, inner = rw / 2 + 24;     // px from the centre line
    const crowd = ['#d33a3a', '#3a63d3', '#f0c030', '#e8e8e8'];
    (env.stands || []).forEach(([frac, side, len], n) => {
        (side ? [side] : [1, -1]).forEach(sg => {
            const s0 = frac * L, steps = Math.max(2, Math.round(len / 12));
            const line = lat => {
                x.beginPath();
                for (let k = 0; k <= steps; k++) {
                    const s = s0 + len * k / steps;
                    // grandstands next to the pit lane are moved back behind the pit buildings
                    const pit = sg > 0 && ((s % L + L) % L > L - 350 || (s % L) < 430);
                    const p = po(s, sg * (inner + lat + (pit ? 40 : 0)) / pm);
                    k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]);
                }
                x.stroke();
            };
            x.lineCap = 'butt';
            x.strokeStyle = '#3a3f48';
            x.lineWidth = Math.max(4, 24 * pm);
            line(Math.max(4, 24 * pm) / 2);
            x.strokeStyle = crowd[(E.i + n) % crowd.length];
            x.lineWidth = Math.max(3, 13 * pm);
            x.setLineDash([Math.max(2, 3 * pm), Math.max(1, 1.5 * pm)]);
            line(Math.max(4, 24 * pm) / 2);
            x.setLineDash([]);
        });
    });
}
