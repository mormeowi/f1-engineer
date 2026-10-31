/**
 * Trait effects (see data/traits.js for the texts).
 *
 * effectivePilot(car)   ratings after the traits (the rookie trait pins EXP to 1 and lifts the other three)
 * applyTraits(c, weak)  sets the multipliers of a simulated car c; weak = its car is among the slowest of the field
 *
 * Multipliers used by the simulation (all 1 = no effect):
 *   bigMul      share of big mistakes among the mistakes
 *   mistakeMul  chance of a mistake     crashMul  chance that a big mistake ends in a retirement
 *   contactMul  chance of a contact     wetRisk   extra factor for mistakes and contacts in damp/rain
 *   atkMul      success of own attacks  defMul    success of rivals attacking this car
 *   nearMul     pressure term of the mistake chance (a rival close behind)
 * The pace effects are added to c.pz (seconds per lap, negative = faster) and c.sd (pace scatter).
 */
const hasTrait = (car, id) => (car.traits || []).includes(id);

function effectivePilot(car) {
    const p = { ...car.pil };
    if (hasTrait(car, 'rookie')) {
        p.exp = 1;
        p.rac = Math.min(99, p.rac + 8);
        p.awa = Math.min(99, p.awa + 8);
        p.pac = Math.min(99, p.pac + 8);
    }
    return p;
}

function applyTraits(c, weak) {
    const car = c.c, k = TRACKS[state.tr][TRACK.LAP_TIME] / 90;        // seconds scale with the lap time
    const wetLoss = weatherLoss(state.tr) * TRACKS[state.tr][TRACK.LAP_TIME];   // seconds per lap lost to the weather
    const wet = state.weather == 'rain' ? 1 : state.weather == 'damp' ? .5 : 0;
    if (hasTrait(car, 'adaptive')) {
        c.pz -= wetLoss * .03;
        c.wetRisk *= .8;
        c.sd *= .85;
        if (!wet) c.pz += .05 * k;
    }
    if (hasTrait(car, 'rainMaster')) {
        c.pz -= (wetLoss * .04 + .1 * k) * wet;
        c.wetRisk *= 1 - .3 * wet;
        if (!wet) {
            c.pz += .12 * k;
            c.sd *= 1.05;
        }
    }
    if (hasTrait(car, 'rookie')) {
        c.mistakeMul *= 1.5;
        c.crashMul *= 1.5;
        c.bigMul *= 3;
        c.contactMul *= 1.35;
        c.pz -= .06 * k;
    }
    if (hasTrait(car, 'underdog')) {
        if (weak) {
            c.pz -= .7 * k;
            c.mistakeMul *= .75;
            c.atkMul *= 1.2;
        } else c.pz += .05 * k;
    }
    if (hasTrait(car, 'clumsyPass')) {
        c.atkMul *= .65;
        c.defMul *= .6;
        c.nearMul *= .75;
        c.contactMul *= 1.2;
    }
}
