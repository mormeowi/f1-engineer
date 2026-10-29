/**
 * Surroundings of every track (index = track number).
 *   ground   colour of the ground
 *   around   what surrounds the track: 'forest' | 'park' (a few trees) | 'city' (buildings) | 'sand' (desert scrub)
 *   pal      'glass' = dark glass towers instead of ordinary buildings
 *   edge     run-off colour: 'sand', or 'ricard' (the blue and red stripes of Paul Ricard)
 *   sea      {dir, gap} sea beyond the track's bounding box: dir N/E/S/W, gap in metres from the outermost track point
 *   lake     [x, y, rx, ry] lake as fractions of the track's bounding box (centre and radii)
 *   stands   [lap position 0-1, side (1 right / -1 left / 0 both), length in m] grandstands
 *   extras   ['wheel' | 'tower' | 'stadium' | 'hotel', x, y] landmarks as fractions of the bounding box (moved clear of the track if needed)
 */
const ENVIRONMENT = [
    { ground: '#4f8f52', around: 'park', lake: [.5, .5, .28, .3], stands: [[0, 0, 300], [.2, -1, 120], [.62, 1, 120]] }, // Австралия
    { ground: '#d6bf86', around: 'sand', edge: 'sand', stands: [[0, 0, 420], [.05, -1, 180], [.3, 1, 160], [.72, 1, 160]] }, // Бахрейн
    { ground: '#7a8b7c', around: 'city', stands: [[0, 0, 300], [.45, 1, 150]], extras: [['stadium', .15, .35]] }, // Вьетнам
    { ground: '#5f9b57', around: 'park', stands: [[0, 0, 520], [.12, 1, 200], [.55, -1, 160], [.8, 1, 160]] }, // Китай
    { ground: '#e3d3a0', around: 'sand', edge: 'sand', sea: { dir: 'W', gap: 700 }, stands: [[0, 0, 320], [.2, 1, 140], [.48, -1, 160], [.7, 1, 140], [.9, -1, 140]] }, // Нидерланды
    { ground: '#8da562', around: 'park', stands: [[0, 0, 520], [.06, -1, 260], [.35, 1, 180], [.62, -1, 180], [.9, 1, 160]] }, // Испания
    { ground: '#9a9ea6', around: 'city', sea: { dir: 'S', gap: 60 }, stands: [[0, 1, 160], [.55, -1, 120], [.85, 1, 100]] }, // Монако
    { ground: '#b9ae95', around: 'city', sea: { dir: 'S', gap: 80 }, stands: [[0, 0, 300], [.4, -1, 120]] }, // Азербайджан
    { ground: '#4d8a4b', around: 'forest', sea: { dir: 'E', gap: 140 }, stands: [[0, 0, 260], [.18, 1, 140], [.9, -1, 160]] }, // Канада
    { ground: '#b7a77c', around: 'sand', edge: 'ricard', stands: [[0, 0, 360], [.45, 1, 160], [.7, -1, 140]] }, // Франция
    { ground: '#4b8f45', around: 'forest', stands: [[0, 0, 320], [.3, 1, 200], [.62, -1, 180]] }, // Австрия
    { ground: '#5d9a4a', around: 'park', stands: [[0, 0, 520], [.12, -1, 260], [.28, 1, 200], [.55, 1, 180], [.82, -1, 200]] }, // Великобритания
    { ground: '#a2a869', around: 'park', stands: [[0, 0, 320], [.15, -1, 160], [.5, 1, 160]] }, // Венгрия
    { ground: '#3f7a41', around: 'forest', stands: [[0, 0, 320], [.08, -1, 160], [.2, 1, 220], [.35, -1, 140]] }, // Бельгия
    { ground: '#4b8a45', around: 'forest', stands: [[0, 0, 600], [.08, 1, 300], [.9, -1, 360], [.55, 1, 200]] }, // Италия
    { ground: '#505560', around: 'city', pal: 'glass', lake: [.6, .45, .18, .2], stands: [[0, 0, 360], [.3, 1, 200], [.55, -1, 200], [.8, 1, 200]], extras: [['wheel', .7, .15]] }, // Сингапур
    { ground: '#7f9a6a', around: 'city', stands: [[0, 0, 360], [.3, 1, 160]], extras: [['stadium', .35, .4]] }, // Россия
    { ground: '#3f7f45', around: 'forest', stands: [[0, 0, 380], [.35, 1, 160], [.55, -1, 160], [.88, 1, 200]], extras: [['wheel', .62, .45]] }, // Япония
    { ground: '#9aa860', around: 'park', stands: [[0, 0, 380], [.04, 1, 260], [.7, -1, 200], [.85, 1, 200]], extras: [['tower', .5, .5]] }, // США
    { ground: '#5b8f55', around: 'city', lake: [.45, .7, .14, .12], stands: [[0, 0, 340], [.25, 1, 160]], extras: [['stadium', .78, .45]] }, // Мексика
    { ground: '#4d8c4a', around: 'park', stands: [[0, 0, 380], [.2, 1, 200], [.45, -1, 200], [.7, 1, 160]] }, // Бразилия
    { ground: '#d8c796', around: 'sand', edge: 'sand', sea: { dir: 'S', gap: 150 }, stands: [[0, 0, 420], [.35, -1, 200], [.62, 1, 200], [.8, -1, 160]], extras: [['hotel', .5, .2]] }, // Абу-Даби
];