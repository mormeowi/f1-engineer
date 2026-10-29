/**
 * Car series and teams.
 *   F1 team row: [name, power unit, aero, chassis, reliability, colour]   (values 0-100)
 *   F2 team row: [name, car level, colour]   (all F2 cars share engine and chassis; level feeds aero, chassis, reliability)
 * d sets how much the teams differ in pace: the F1 field is spread wider than the (spec) F2 field.
 * Add a team by adding a row; add a series by adding a key (and an option in teamStats()).
 */
const SERIES = {
    f1: {
        n: 'F1 2020', // name
        s: 'F1 20', // short label
        k: 1, // pace factor relative to F1
        d: .0011, // lap time lost per point of performance below 100 (fraction of the lap time)
        x: 110, // maximum fuel load, kg
        t: [
        ['Mercedes', 98, 100, 96, 92, '#00d2be'],
        ['Red Bull', 88, 92, 92, 84, '#1e41ff'],
        ['McLaren', 82, 82, 84, 82, '#ff8700'],
        ['Racing Point', 94, 85, 84, 80, '#f596c8'],
        ['Renault', 78, 80, 80, 76, '#fff500'],
        ['Ferrari', 76, 84, 82, 70, '#dc0000'],
        ['AlphaTauri', 82, 76, 76, 76, '#4e7c9b'],
        ['Alfa Romeo', 74, 72, 74, 72, '#9b0000'],
        ['Haas', 74, 70, 72, 70, '#9ea3a8'],
        ['Williams', 90, 58, 62, 74, '#00a0de'],
        ],
    },
    f2: {
        n: 'F2 2020', // name
        s: 'F2 20', // short label
        k: 1.115, // pace factor relative to F1
        d: .0006, // lap time lost per point of performance below 100 (fraction of the lap time)
        x: 80, // maximum fuel load, kg
        t: [
        ['Prema', 90, '#d4141c'],
        ['UNI-Virtuosi', 88, '#1f3f8f'],
        ['Carlin', 86, '#00a859'],
        ['Hitech', 84, '#e7c500'],
        ['ART', 82, '#b0b4ba'],
        ['Campos', 80, '#f26522'],
        ['MP Motorsport', 80, '#ff3d9a'],
        ['DAMS', 78, '#0097d6'],
        ['Charouz', 76, '#8bc34a'],
        ['Trident', 74, '#7b1fa2'],
        ],
    },
    f19: {
        n: 'F2 2019', // name
        s: 'F2 19', // short label
        k: 1.12, // pace factor relative to F1
        d: .0006, // lap time lost per point of performance below 100 (fraction of the lap time)
        x: 80, // maximum fuel load, kg
        t: [
        ['Prema', 90, '#d4141c'],
        ['Carlin', 88, '#00a859'],
        ['UNI-Virtuosi', 86, '#1f3f8f'],
        ['ART', 84, '#b0b4ba'],
        ['DAMS', 82, '#0097d6'],
        ['MP Motorsport', 80, '#ff3d9a'],
        ['Campos', 78, '#f26522'],
        ['Trident', 76, '#7b1fa2'],
        ['Charouz', 74, '#8bc34a'],
        ['HWA', 70, '#555b63'],
        ],
    },
};
