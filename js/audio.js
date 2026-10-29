/**
 * Sound, synthesised with the Web Audio API (no sound files).
 *   - the engine note of the selected car while the race runs (pitch from speed and gear, loudness from the throttle)
 *   - short cues for overtakes, pit stops, crashes, failures and the finish
 * state.volume (0-100, settings menu) is the master volume. Browsers start audio only after a click or tap,
 * so initAudio() is called from the first pointer event (see main.js).
 */
const sound = { ctx: null, master: null, filter: null, engine: null, osc: [] };

// Speed ranges of the gears in km/h; the engine revs up inside a gear and drops at the shift.
const GEAR_LIMITS = {
    f1: [0, 70, 105, 145, 185, 225, 265, 300, 345],
    f2: [0, 60, 100, 150, 200, 250, 310],
};

const volumeGain = () => Math.pow(state.volume / 100, 2) * .9;

function applyVolume() {
    if (sound.master) sound.master.gain.setTargetAtTime(volumeGain(), sound.ctx.currentTime, .03);
}

function initAudio() {
    if (sound.ctx) {
        if (sound.ctx.state === 'suspended') sound.ctx.resume();
        return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = sound.ctx = new AC();
    sound.master = ctx.createGain();
    sound.master.connect(ctx.destination);
    sound.filter = ctx.createBiquadFilter();
    sound.filter.type = 'lowpass';
    sound.engine = ctx.createGain();
    sound.engine.gain.value = 0;
    sound.filter.connect(sound.engine);
    sound.engine.connect(sound.master);
    // two slightly detuned saw waves and a square wave an octave up: a rough turbo V6 buzz
    sound.osc = [['sawtooth', 1, .5], ['sawtooth', 1.006, .4], ['square', 2, .12]].map(([type, ratio, level]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type;
        o.frequency.value = 200;
        g.gain.value = level;
        o.connect(g);
        g.connect(sound.filter);
        o.start();
        return { o, ratio };
    });
    applyVolume();
}

// c = simulated car (state.sim.cs[i]) that the player follows
function updateEngineSound(c) {
    if (!sound.ctx) return;
    if (c.out || state.volume == 0) return engineOff();
    const lim = GEAR_LIMITS[c.c.s == 'f1' ? 'f1' : 'f2'];
    const g = clamp(c.gr, 1, lim.length - 1);
    const ratio = clamp((c.v - lim[g - 1]) / (lim[g] - lim[g - 1]), 0, 1);
    const idle = c.v < 5;
    const rpm = idle ? 3800 : c.c.s == 'f1' ? 6500 + ratio * 6500 : 5500 + ratio * 4000;
    const f = rpm / 60 * 3 * .6;                 // a V6 fires three times per revolution; scaled down to a pleasant pitch
    const t = sound.ctx.currentTime;
    sound.osc.forEach(({ o, ratio }) => o.frequency.setTargetAtTime(f * ratio, t, .05));
    sound.filter.frequency.setTargetAtTime(500 + c.th * 22 + ratio * 300, t, .08);
    sound.engine.gain.setTargetAtTime(idle ? .05 : .08 + .18 * c.th / 100, t, .08);
}

function engineOff() {
    if (sound.engine) sound.engine.gain.setTargetAtTime(0, sound.ctx.currentTime, .1);
}

function tone(freq, dur, type = 'sine', level = .3, delay = 0) {
    const ctx = sound.ctx, t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + .01);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g);
    g.connect(sound.master);
    o.start(t);
    o.stop(t + dur + .02);
}

function noise(dur, level) {
    const ctx = sound.ctx, n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass';
    f.frequency.value = 1200;
    g.gain.value = level;
    src.buffer = buf;
    src.connect(f);
    f.connect(g);
    g.connect(sound.master);
    src.start();
}

// Race event cues. car = garage car the event is about; most cues play only for the selected car.
function playEvent(kind, car) {
    if (!sound.ctx || state.volume == 0) return;
    const own = !car || car === currentCar();
    if (kind === 'overtake' && own) {
        tone(660, .12, 'triangle');
        tone(880, .2, 'triangle', .3, .1);
    }
    else if (kind === 'lost' && own) {
        tone(330, .15, 'sawtooth', .18);
        tone(247, .22, 'sawtooth', .18, .12);
    }
    else if (kind === 'pit' && own) {
        tone(520, .08, 'square', .12);
        tone(520, .08, 'square', .12, .14);
    }
    else if (kind === 'crash') noise(.7, own ? .6 : .25);
    else if (kind === 'fail' && own) tone(220, .6, 'sawtooth', .25);
    else if (kind === 'finish' && own) [523, 659, 784, 1047].forEach((f, i) => tone(f, .5, 'triangle', .25, i * .12));
    else if (kind === 'preview') tone(440, .1, 'triangle', .3);
}
