/**
 * Compact pilot card: overall rating (RTG) on the left, four editable ratings on the right.
 * Only used in the Pilots tab (scope 'draft'): the sliders edit the pilot that is being created.
 */
const PILOT_NOTE = 'EXP — опыт · RAC — гоночное мастерство · AWA — осознанность · PAC — скорость · RTG — общий рейтинг (считается сам). Значения 1–99, действуют при включённой реалистичной езде.';

function pilotCardHtml(p, scope) {
    const rows = PILOT_STATS.map(([key, code, name]) => `<label title="${name}"><span>${code}</span><input type="range" min="1" max="99" step="1" value="${p[key]}" data-k="${key}" oninput="onPilotInput(this)"><b>${p[key]}</b></label>`).join('');
    return `<div class="pilot" data-scope="${scope}"><div class="rtg"><b>${pilotRating(p)}</b><small>RTG</small></div><div class="pst">${rows}</div></div>`;
}

const readPilotCard = card => Object.fromEntries([...card.querySelectorAll('input[data-k]')].map(i => [i.dataset.k, +i.value]));

function onPilotInput(e) {
    const card = e.closest('.pilot');
    e.nextElementSibling.textContent = e.value;
    const p = readPilotCard(card);
    card.querySelector('.rtg b').textContent = pilotRating(p);
    if (card.dataset.scope === 'draft') {
        draft().pil = p;
        updateDraftPreview();
    }
}
