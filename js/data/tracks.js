/**
 * The 22 circuits of F1 2020. TRACKS[i][TRACK.xxx] is used all over the code; index i is the track number
 * (the same index is used by TRACK_GEOMETRY and TYRE_ALLOCATION).
 *
 * To tune a track edit its row:
 *   LAP_TIME       reference race-pace lap time in seconds (a clean lap of a mid-grid F1 car)
 *   PIT_LOSS       time lost for a pit-lane drive-through without stopping, seconds
 *   TYRE_WEAR      tyre wear factor (1 = average, higher = tyres die sooner)
 *   FULL_THROTTLE  share of the lap at full throttle, % (decides how important engine power is)
 *   DOWNFORCE      required downforce level 1-5 (decides the ideal wing settings)
 *   OVERTAKING     1 = very hard to overtake ... 5 = easy
 */
const TRACK = {
    NAME: 0,
    LENGTH_KM: 1,
    LAPS: 2,
    LAP_TIME: 3,
    PIT_LOSS: 4,
    TYRE_WEAR: 5,
    FULL_THROTTLE: 6,
    DOWNFORCE: 7,
    CORNERS: 8,
    DRS_ZONES: 9,
    OVERTAKING: 10,
};

//                 name, km, laps, lap time, pit loss, tyre wear, full throttle %, downforce, corners, DRS, overtaking
const TRACKS = [
    ['Австралия', 5.303, 58, 80, 21, 0.8, 66, 3, 14, 2, 3],
    ['Бахрейн', 5.412, 57, 93, 23, 1.3, 70, 3, 15, 3, 4],
    ['Вьетнам', 5.607, 55, 91.5, 22, 0.9, 72, 2, 23, 3, 4],
    ['Китай', 5.451, 56, 96, 22, 1.15, 63, 3, 16, 2, 4],
    ['Нидерланды', 4.259, 72, 71.5, 18, 1.25, 62, 4, 14, 2, 2],
    ['Испания', 4.655, 66, 79, 22, 1.4, 63, 4, 16, 2, 2],
    ['Монако', 3.337, 78, 72, 19, 0.55, 40, 5, 19, 1, 1],
    ['Азербайджан', 6.003, 51, 102, 20, 0.8, 75, 1, 20, 2, 4],
    ['Канада', 4.361, 70, 73, 18, 0.85, 70, 2, 14, 2, 4],
    ['Франция', 5.842, 53, 91.5, 22, 0.95, 66, 3, 15, 2, 3],
    ['Австрия', 4.318, 71, 65.5, 20, 1, 70, 2, 10, 2, 4],
    ['Великобритания', 5.891, 52, 87, 21, 1.45, 68, 3, 18, 2, 4],
    ['Венгрия', 4.381, 70, 77.5, 20, 0.95, 55, 5, 14, 1, 1],
    ['Бельгия', 7.004, 44, 103, 19, 1.2, 75, 2, 19, 2, 4],
    ['Италия', 5.793, 53, 81.5, 24, 0.85, 80, 1, 11, 2, 4],
    ['Сингапур', 5.063, 61, 99, 26, 0.95, 50, 5, 23, 3, 2],
    ['Россия', 5.848, 53, 93, 21, 0.7, 68, 2, 18, 2, 3],
    ['Япония', 5.807, 53, 91.5, 21, 1.4, 66, 4, 18, 1, 2],
    ['США', 5.513, 56, 96, 20, 1.25, 62, 3, 20, 2, 4],
    ['Мексика', 4.304, 71, 78.5, 21, 0.8, 60, 4, 17, 3, 3],
    ['Бразилия', 4.309, 71, 71, 21, 1.05, 66, 3, 15, 2, 4],
    ['Абу-Даби', 5.554, 55, 99, 22, 0.9, 62, 3, 16, 2, 4],
];

/**
 * Pirelli compounds nominated for the race: [hard, medium, soft] as C-numbers (C1 = hardest ... C5 = softest).
 * Confirmed by Pirelli for Australia, Bahrain, Vietnam, China, Monaco and Canada; the other tracks use the
 * usual nomination and are approximate.
 */
const TYRE_ALLOCATION = [
    [2, 3, 4], // Австралия
    [2, 3, 4], // Бахрейн
    [2, 3, 4], // Вьетнам
    [2, 3, 4], // Китай
    [2, 3, 4], // Нидерланды
    [1, 2, 3], // Испания
    [3, 4, 5], // Монако
    [2, 3, 4], // Азербайджан
    [3, 4, 5], // Канада
    [2, 3, 4], // Франция
    [2, 3, 4], // Австрия
    [1, 2, 3], // Великобритания
    [2, 3, 4], // Венгрия
    [2, 3, 4], // Бельгия
    [2, 3, 4], // Италия
    [3, 4, 5], // Сингапур
    [2, 3, 4], // Россия
    [1, 2, 3], // Япония
    [2, 3, 4], // США
    [2, 3, 4], // Мексика
    [2, 3, 4], // Бразилия
    [2, 3, 4], // Абу-Даби
];
