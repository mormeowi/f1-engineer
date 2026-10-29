/**
 * Weather scenarios.
 *
 * WEATHER_MODES: the three conditions of the race screen.
 *   risk  how much more often drivers make mistakes and touch each other      grip  tyre grip on the surface (corner speed)
 *   wing  extra wing the car needs
 * WEATHER_TRACK[i] (same order as TRACKS): [pace loss on a damp track %, pace loss in rain %, track risk factor, what makes the track special when wet].
 */
const WEATHER_MODES = {
    dry: { icon: '☀️', name: 'Сухо', short: 'СУХО', risk: 1, grip: 1, wing: 0 },
    damp: { icon: '🌦', name: 'Сыро', short: 'СЫРО', risk: 1.5, grip: .8, wing: 1 },
    rain: { icon: '🌧', name: 'Дождь', short: 'ДОЖДЬ', risk: 2.2, grip: .6, wing: 2 },
};

const WEATHER_TRACK = [
    [6, 13, 1.0, 'гладкий городской асфальт, мало сцепления на мокром'], // Австралия
    [6, 12, 1.0, 'песок на трассе, дождь редкость — асфальт скользкий'], // Бахрейн
    [6.5, 14, 1.2, 'городская трасса с неровностями, много луж'], // Вьетнам
    [5.5, 12, 1.0, 'длинные повороты копят воду, аквапланирование на прямых'], // Китай
    [5, 11, 1.0, 'виражи с наклоном держат воду, обгонять трудно'], // Нидерланды
    [5, 11, 0.9, 'открытая трасса, порывистый ветер'], // Испания
    [7, 16, 1.4, 'узкие улицы, разметка и люки скользкие, стены рядом'], // Монако
    [6.5, 15, 1.3, 'узкие участки у стен, аквапланирование на длинной прямой'], // Азербайджан
    [6, 13, 1.3, 'стены у шикан, быстро подсыхает'], // Канада
    [5, 11, 0.9, 'гладкий абразивный асфальт, большие зоны схода'], // Франция
    [5, 11, 0.9, 'быстро просыхает, перепады высот'], // Австрия
    [5.5, 12, 1.1, 'быстрые повороты, ветер и аквапланирование'], // Великобритания
    [5.5, 12, 1.0, 'трудно обгонять, сухая линия узкая'], // Венгрия
    [6, 14, 1.2, 'дождь бывает только на части круга, Эйр-Руж опасен'], // Бельгия
    [5.5, 12, 1.1, 'низкий прижим, скользко на торможениях и в шиканах'], // Италия
    [6, 14, 1.3, 'тропические ливни, высокая влажность'], // Сингапур
    [6, 13, 1.1, 'скользкое покрытие, длинные повороты'], // Россия
    [5.5, 13, 1.2, 'быстрые повороты, 130R и Дегнер особенно опасны'], // Япония
    [5.5, 12, 1.0, 'перепады высот и ухабы, линия быстро подсыхает'], // США
    [5.5, 12, 1.0, 'разреженный воздух, мало сцепления и прижима'], // Мексика
    [5.5, 12, 1.1, 'ручей пересекает трассу, погода меняется'], // Бразилия
    [5, 11, 0.9, 'дождь редкость, песок на гладком покрытии'], // Абу-Даби
];

// Seconds per 90 s lap lost by a tyre that does not fit the weather (the fitting tyre loses nothing).
const COMPOUND_WEATHER_OFFSET = {
    dry: { S: 0, M: 0, H: 0, I: 10, W: 22 },
    damp: { I: 0, W: 2.5, S: 5.5, M: 6.5, H: 7.5 },
    rain: { W: 0, I: 4.5, S: 16, M: 17, H: 18 },
};

// Wear multiplier of a compound in the weather: wet tyres overheat on a dry track, slicks hardly wear in the wet.
const COMPOUND_WEATHER_WEAR = {
    dry: { I: 3, W: 4 },
    damp: { W: 2.5, S: .6, M: .5, H: .5 },
    rain: { I: 1.4, S: .5, M: .4, H: .4 },
};

// Compounds the strategy search tries in each weather.
const COMPOUND_SETS = { dry: 'SMH', damp: 'ISM', rain: 'WI' };
