/**
 * Pilot ratings, 1-99, like the stats on a driver card:
 *   EXP  experience     RAC  racecraft     AWA  awareness     PAC  pace
 *   RTG  overall rating, calculated from the four (pace counts the most; rookies with low EXP lose a little).
 * The ratings change the driving only while "realistic driving" is on - see driverTraits() in simulation.js.
 */
const PILOT_STATS = [
    // [key, short code, name]
    ['exp', 'EXP', 'Опыт (Experience)'],
    ['rac', 'RAC', 'Гоночное мастерство (Racecraft)'],
    ['awa', 'AWA', 'Осознанность (Awareness)'],
    ['pac', 'PAC', 'Скорость (Pace)'],
];

// 70 everywhere: all pilots are about equal until you change the ratings.
const PILOT_DEFAULT = { exp: 70, rac: 70, awa: 70, pac: 70 };

const pilotRating = p => Math.round(.4 * p.pac + .25 * p.rac + .2 * p.awa + .15 * p.exp);
