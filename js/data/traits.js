/**
 * Pilot traits. A pilot can carry up to MAX_TRAITS of them; they work while "realistic driving" is on.
 * The numbers in the texts are the ones used in model/traits.js and simulation.js - change them together.
 *   name / desc / effects   texts of the Russian interface
 *   en                      the English twin of the same texts (added to the translation dictionary below)
 */
const MAX_TRAITS = 3;

const TRAITS = {
    adaptive: {
        name: 'Адаптивность',
        desc: 'Выступает стабильно при любых погодных условиях: в дождь и на сырой трассе штрафы к пилотированию меньше.',
        effects: [
            'Сыро и дождь: возвращает 3% потери темпа из-за погоды (около 0,15–0,4 с/круг)',
            'Сыро и дождь: ошибок и контактов на 20% меньше',
            'Разброс темпа на 15% меньше в любую погоду',
            'Минус: в сухую на 0,05 с/круг медленнее',
        ],
        en: {
            name: 'Adaptability',
            desc: 'Performs steadily in any weather: in rain and on a damp track the driving penalties are smaller.',
            effects: [
                'Damp and rain: wins back 3% of the pace lost to the weather (about 0.15-0.4 s/lap)',
                'Damp and rain: 20% fewer mistakes and contacts',
                'Pace scatter is 15% smaller in any weather',
                'Downside: 0.05 s/lap slower in the dry',
            ],
        },
    },
    rainMaster: {
        name: 'Мастер дождя',
        desc: 'Пилотирует лучше в дождь, чем в сухую погоду.',
        effects: [
            'Дождь: возвращает 4% потери темпа из-за погоды и ещё 0,1 с/круг (на сырой трассе вдвое меньше)',
            'Дождь: ошибок и контактов на 30% меньше (на сырой трассе на 15%)',
            'Минус: в сухую на 0,12 с/круг медленнее, разброс темпа на 5% больше',
        ],
        en: {
            name: 'Rain master',
            desc: 'Drives better in the rain than in the dry.',
            effects: [
                'Rain: wins back 4% of the pace lost to the weather plus another 0.1 s/lap (half of that on a damp track)',
                'Rain: 30% fewer mistakes and contacts (15% on a damp track)',
                'Downside: 0.12 s/lap slower in the dry, pace scatter 5% larger',
            ],
        },
    },
    rookie: {
        name: 'Перспективный новичок',
        desc: 'Опытность опускается до минимума, ошибок и сходов больше. Остальные показатели выше, а шансы выиграть гонку или финишировать в топ-3…5 выше, если пилот не сходит.',
        effects: [
            'EXP всегда 1',
            'RAC, AWA и PAC на 8 выше',
            'Быстрее на 0,06 с/круг: шанс на победу или топ-3…5, пока пилот на трассе',
            'Минус: ошибок на 50% больше, тяжёлых ошибок втрое больше, сходов после них на 50% больше, контактов на 35% больше',
        ],
        en: {
            name: 'Promising rookie',
            desc: 'Experience drops to the minimum and mistakes and retirements are more frequent. The other ratings are higher, and the chances to win or to finish in the top 3-5 are better as long as the pilot does not retire.',
            effects: [
                'EXP is always 1',
                'RAC, AWA and PAC are 8 higher',
                '0.06 s/lap faster: a chance to win or finish in the top 3-5 while the pilot stays on track',
                'Downside: 50% more mistakes, three times as many big mistakes, 50% more retirements after them, 35% more contacts',
            ],
        },
    },
    underdog: {
        name: 'Андердог',
        desc: 'На самом слабом болиде пелотона пилотирует лучше.',
        effects: [
            'Слабейшие болиды пелотона (нижние 20%, минимум один): быстрее на 0,7 с/круг, ошибок на 25% меньше, атаки на 20% успешнее',
            'Минус: на остальных болидах на 0,05 с/круг медленнее',
        ],
        en: {
            name: 'Underdog',
            desc: 'Drives better in the weakest car of the field.',
            effects: [
                'Weakest cars of the field (bottom 20%, at least one): 0.7 s/lap faster, 25% fewer mistakes, attacks 20% more successful',
                'Downside: 0.05 s/lap slower in any other car',
            ],
        },
    },
    clumsyPass: {
        name: 'Неумелые обгоны',
        desc: 'Пилоту сложнее обгонять, зато легче удерживать и защищать позицию.',
        effects: [
            'Свои атаки успешны на 35% реже, при атаке контакт на 20% вероятнее',
            'Защита: соперники обгоняют его на 40% реже',
            'Под давлением (соперник близко сзади) ошибок на 25% меньше',
        ],
        en: {
            name: 'Clumsy overtakes',
            desc: 'Finds it harder to overtake, but it is easier to hold and defend a position.',
            effects: [
                'Own attacks succeed 35% less often, a contact is 20% more likely when attacking',
                'Defence: rivals pass him 40% less often',
                'Under pressure (a rival close behind) 25% fewer mistakes',
            ],
        },
    },
};

// English twins go into the translation dictionary (see i18n.js).
Object.values(TRAITS).forEach(t => {
    DICTIONARY_PAIRS.push([t.name, t.en.name], [t.desc, t.en.desc]);
    t.effects.forEach((text, k) => DICTIONARY_PAIRS.push([text, t.en.effects[k]]));
});
