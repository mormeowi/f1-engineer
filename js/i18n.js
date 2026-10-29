/**
 * Russian -> English translation. The UI is written in Russian; in English mode every text node is translated
 * through EN_DICTIONARY (longest phrase first). Add new UI texts to js/data/dictionary.js.
 */

// Longest phrases first so that long sentences win over the words inside them.
const EN_DICTIONARY = DICTIONARY_PAIRS.slice().sort((a, b) => b[0].length - a[0].length);

// Cache of already translated strings.
const translationCache = new Map();

function translate(d) {
    let r = translationCache.get(d);
    if (r != null)
        return r;
    r = d;
    for (const [a, b] of EN_DICTIONARY)
        if (r.includes(a))
            r = r.split(a).join(b);
    r = r.replace(/(\d+)\s*кр\.:/g, 'Lap $1:').replace(/(\d)\s*кр\./g, '$1 laps').replace(/(\d|\)|—)\s*с(?![А-Яа-яЁё])/g, '$1 s').replace(/(\d)\s*кг/g, '$1 kg');
    if (translationCache.size > 3000)
        translationCache.clear();
    translationCache.set(d, r);
    return r;
}

function translateTextNode(n) {
    if (state.lang !== 'en')
        return;
    const d = n.data;
    if (!/[А-Яа-яЁё]/.test(d))
        return;
    if (n.__ru == null)
        n.__ru = d;
    const e = translate(n.__ru === d ? d : d);
    if (e !== d)
        n.data = e;
}

function translateTree(r) {
    if (state.lang !== 'en')
        return;
    if (r.nodeType === 3)
        return translateTextNode(r);
    const w = document.createTreeWalker(r, 4);
    let n;
    while (n = w.nextNode())
        translateTextNode(n);
}

new MutationObserver(m => {
    if (state.lang !== 'en')
        return;
    for (const x of m) {
        if (x.type === 'characterData')
            translateTextNode(x.target);
        else
            x.addedNodes.forEach(translateTree);
    }
}).observe(document.body, { childList: true, subtree: true, characterData: true });

function setLang(l) {
    state.lang = l;
    document.documentElement.lang = l;
    $('sl').value = l;
    $('slng').value = l;
    if (l == 'en') {
        translateTree(document.body);
        document.title = 'F1 2020 — Race Engineer';
    }
    else {
        const w = document.createTreeWalker(document.body, 4);
        let n;
        while (n = w.nextNode())
            if (n.__ru != null)
                n.data = n.__ru;
        document.title = 'F1 2020 — Инженер-стратег';
    }
    saveSettings();
    if (state.cars.length)
        render();
}
