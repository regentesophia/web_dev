const BASE = "https://raw.githubusercontent.com/Mar-7th/StarRailRes/master/";
const LANG = "en";
const DATA_URL = BASE + "index_min/" + LANG + "/characters.json";

const colors = {
  Fire: '#f4634e', Ice: '#6fc6f2', Wind: '#5fd6a4', Lightning: '#c58bf7',
  Physical: '#d0d0d0', Quantum: '#8a8cf0', Imaginary: '#f2d65e',
};

function elementName(e) { return e === 'Thunder' ? 'Lightning' : e; }

const PATH_NAMES = {
  Elation: 'Elation', Rogue: 'The Hunt', Memory: 'Remembrance', Mage: 'Erudition',
  Knight: 'Preservation', Priest: 'Abundance', Warlock: 'Nihility',
  Warrior: 'Destruction', Shaman: 'Harmony',
};
function pathName(p) { return PATH_NAMES[p] || p; }

function colorOf(c) { return colors[elementName(c.element)] || '#d0d0d0'; }

async function loadCharacters(fresh) {
  const response = await fetch(DATA_URL, fresh ? {cache: 'no-cache'} : undefined);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const data = await response.json();
  return Object.values(data)
    .filter(c => c.icon)
    .map(c => ({...c, name: c.name.replace('{NICKNAME}', 'Trailblazer')}))
    .sort((a, b) => a.id - b.id);
}

async function loadPromotions() {
  const response = await fetch(BASE + "index_min/" + LANG + "/character_promotions.json");
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function loadSkills() {
  const response = await fetch(BASE + "index_min/" + LANG + "/character_skills.json");
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

// Descriptions hold placeholders like #1[i]% or #2[f1] that point into the skill's per-level numbers.
//   i = whole number, f1 / f2 = 1 / 2 decimals, a trailing % means the value is x100
function fillSkillText(sk, level) {
  const row = sk.params?.[Math.min(level, sk.params.length) - 1];
  if (!row) return sk.desc;
  const text = sk.desc.replace(/#(\d+)\[(i|f\d)\](%?)/g, (m, n, fmt, pct) => {
    let v = row[n - 1];
    if (v == null) return m;
    if (pct) v *= 100;
    return (fmt === 'i' ? Math.round(v) : v.toFixed(Number(fmt[1]))) + pct;
  });
  if (!/#\d+\[/.test(text)) return text;
  return (sk.simple_desc || text).replace(/#\d+\[(i|f\d)\]%?/g, '?');
}

function skillsHTML(c, skills, level) {
  const list = (c.skills || []).map(id => skills?.[id]).filter(Boolean);
  if (!list.length) return '<div>Skill data isn\'t available right now.</div>';
  const options = Array.from({length: 15}, (_, i) => i + 1)
    .map(n => `<option value="${n}" ${n === level ? 'selected' : ''}>Lv. ${n}</option>`).join('');
  return `
    <div class="d-flex justify-content-between align-items-center">
      <div class="h4 mb-0">Skills</div>
      <select class="form-select form-select-sm lvl-select" data-bs-theme="dark" aria-label="Skill level" onchange="setSkillLevel(this.value)">${options}</select>
    </div>
    <div>${list.map(sk => {
      const lv = sk.params?.length > 1 ? Math.min(level, sk.params.length) : null;
      return `
      <div class="skill" style="--c: ${colorOf(c)}">
        <div class="sk-tile"><img loading="lazy" alt="" src="${BASE + sk.icon}"></div>
        <div>
          <div class="sk-name"><span class="sk-type">${sk.type_text || 'Skill'}</span> ${sk.name}${lv ? ` <span class="sk-lv">Lv. ${lv}</span>` : ''}</div>
          <div class="sk-desc">${fillSkillText(sk, level)}</div>
        </div>
      </div>`;
    }).join('')}
    </div>`;
}

function statsInnerHTML(promo, c, asc) {
  const ph = promo?.values?.[asc];
  const lvl = 20 + 10 * asc;
  const rows = [];
  if (ph) {
    const at = s => ph[s].base + ph[s].step * (lvl - 1);
    const whole = s => Math.floor(at(s));
    const pct = s => (Math.round(at(s) * 1000) / 10) + '%';
    rows.push(['HP', whole('hp')], ['ATK', whole('atk')], ['DEF', whole('def')], ['SPD', whole('spd')],
              ['CRIT Rate', pct('crit_rate')], ['CRIT DMG', pct('crit_dmg')], ['Taunt', whole('taunt')]);
  }
  if (c.max_sp != null) rows.push(['Energy cost', c.max_sp]);
  if (!rows.length) return '';
  const buttons = !ph ? '' : `<div class="asc" role="group" aria-label="Ascension">${
    promo.values.map((_, i) => `<button class="${i === asc ? 'on' : ''}" aria-pressed="${i === asc}" onclick="setAscension(${i})">A${i}</button>`).join('')}</div>`;
  return `
    <div class="small mt-4">Base stats · Ascension ${asc} · Lv. ${lvl}</div>
    ${buttons}
    <div class="stats">${rows.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('')}</div>
    <div class="small mt-2" style="opacity:.7">No light cone or relics</div>`;
}

function statsHTML(promo, c, asc) {
  return `<div id="statsBox">${statsInnerHTML(promo, c, asc)}</div>`;
}

function detailHTML(c, promo, splash, asc = 6) {
  const art = splash && c.portrait
    ? `<img src="${BASE + c.portrait}" alt="${c.name} splash art" decoding="async" onerror="this.onerror=null;this.src='${BASE + c.icon}'">`
    : `<img src="${BASE + c.icon}" alt="${c.name}">`;
  return `
    <div class="detail">
    <div class="big-tile ${splash ? 'splash' : ''}" style="--c: ${colorOf(c)}">
      ${art}
    </div>
    <div class="h3 mt-4 display-6">${c.name}</div>
    <div class="stars mb-2" aria-label="${c.rarity} stars">${'★'.repeat(c.rarity)}</div>
    <div class="chips" style="--c: ${colorOf(c)}">
      <span class="chip id">#${c.id}</span>
      <span class="chip">${elementName(c.element)}</span>
      <span class="chip path">${pathName(c.path)}</span>
    </div>
    ${statsHTML(promo, c, asc)}
    </div>`;
}

function titlebarHTML(closeHref) {
  return `
    <div class="titlebar">
      <img class="ico" src="${BASE}icon/sign/AvatarIcon.png" alt="">
      <div><small>Honkai: Star Rail</small><b>Trailblaze Log</b></div>
      <a class="x" href="${closeHref || 'index.html'}" aria-label="Close">
        <svg width="26" height="26" viewBox="0 0 26 26" stroke="currentColor" stroke-width="2" fill="none"><path d="M3 3l20 20M23 3L3 23"/></svg>
      </a>
    </div>
    <span class="px" style="top:90px;left:-6px;width:36px"></span>
    <span class="px" style="top:300px;right:-6px;width:44px"></span>`;
}

function startClock() {
  const el = document.getElementById("clock");
  const tick = () => { el.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', hour12: false}); };
  tick();
  setInterval(tick, 30000);
}

const FOOTER = `<div class="foot">Data and images: <a href="https://github.com/Mar-7th/StarRailRes" target="_blank" rel="noopener noreferrer">StarRailRes</a> · Game assets belong to HoYoverse.</div>`;
