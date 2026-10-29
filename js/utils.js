/**
 * Small helpers shared by every module.
 */

const $ = id => document.getElementById(id);

const hashString = s => {
    let h = 2166136261;
    for (const c of s) {
        h ^= c.charCodeAt(0);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967296;
};

const formatTime = t => {
    const h = Math.floor(t / 3600);
    const m = Math.floor(t % 3600 / 60);
    const s = t % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + s.toFixed(3).padStart(6, '0');
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const formatSector = t => t ? t.toFixed(3) : '—';

// Roughly normal random number (mean 0, standard deviation 1).
const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 1.73;

// Gap text like on a timing screen: 0.842 / 12.4 / 1:04.2
const formatGapTime = d => d < 10 ? d.toFixed(3) : d < 60 ? d.toFixed(1) : Math.floor(d / 60) + ':' + (d % 60).toFixed(1).padStart(4, '0');
