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

// Reworked characters list their skills twice. The second set has the same ids with a leading "1"
// (e.g. 100401 -> 1100401) and the same name and type, so those are treated as the v2 version.
function splitSkillVersions(c, skills) {
  const ids = c.skills || [];
  const v1 = [], v2 = [];
  ids.forEach(id => {
    const sk = skills?.[id];
    if (!sk) return;
    const base = skills?.[id.slice(1)];
    const isV2 = id[0] === '1' && ids.includes(id.slice(1)) && base
      && base.name === sk.name && base.type_text === sk.type_text;
    (isV2 ? v2 : v1).push(sk);
  });
  return {v1, v2};
}

function skillsHTML(c, skills, level, version = 1) {
  const {v1, v2} = splitSkillVersions(c, skills);
  const hasV2 = v2.length > 0;
  const list = hasV2 && version === 2 ? v2 : v1;
  if (!list.length) return '<div>Skill data isn\'t available right now.</div>';
  const options = Array.from({length: 15}, (_, i) => i + 1)
    .map(n => `<option value="${n}" ${n === level ? 'selected' : ''}>Lv. ${n}</option>`).join('');
  const versionButtons = !hasV2 ? '' : `<div class="asc m-0" role="group" aria-label="Skill version">${
    [1, 2].map(v => `<button class="${v === version ? 'on' : ''}" aria-pressed="${v === version}" onclick="setSkillVersion(${v})">v${v}</button>`).join('')}</div>`;
  return `
    <div class="d-flex justify-content-between align-items-center">
      <div class="h4 mb-0">Skills</div>
      <div class="d-flex align-items-center gap-2">
        ${versionButtons}
        <select class="form-select form-select-sm lvl-select" data-bs-theme="dark" aria-label="Skill level" onchange="setSkillLevel(this.value)">${options}</select>
      </div>
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

function titlebarHTML(closeHref, active = 'characters') {
  const tab = (key, href, label) => `<a href="${href}" class="${active === key ? 'on' : ''}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `
    <div class="titlebar">
      <img class="ico" src="${BASE}icon/sign/AvatarIcon.png" alt="">
      <div><small>Honkai: Star Rail</small><b>Trailblaze Log</b></div>
      <nav class="tabs" aria-label="Sections">${tab('characters', 'index.html', 'Characters')}${tab('lightcones', 'lightcones.html', 'Light Cones')}</nav>
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

// ---------- Light cones ----------
const LC_COLORS = {5: '#f2c46d', 4: '#b48cf5', 3: '#6fa8ff'};
function lcColor(l) { return LC_COLORS[l.rarity] || '#d0d0d0'; }

async function loadLightCones(fresh) {
  const response = await fetch(BASE + "index_min/" + LANG + "/light_cones.json", fresh ? {cache: 'no-cache'} : undefined);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const data = await response.json();
  return Object.values(data).sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name));
}

async function loadLightConePromotions() {
  const response = await fetch(BASE + "index_min/" + LANG + "/light_cone_promotions.json");
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

async function loadLightConeRanks() {
  const response = await fetch(BASE + "index_min/" + LANG + "/light_cone_ranks.json");
  if (!response.ok) throw new Error('HTTP ' + response.status);
  return response.json();
}

const LC_PROPS = {
  AttackAddedRatio: ['ATK', true], HPAddedRatio: ['HP', true], DefenceAddedRatio: ['DEF', true],
  CriticalChanceBase: ['CRIT Rate', true], CriticalDamageBase: ['CRIT DMG', true],
  BreakDamageAddedRatioBase: ['Break Effect', true], StatusProbabilityBase: ['Effect Hit Rate', true],
  StatusResistanceBase: ['Effect RES', true], SpeedAddedRatio: ['SPD', true], BaseSpeed: ['SPD', false],
  SPRatioBase: ['Energy Regen Rate', true], AllDamageTypeAddedRatio: ['All-Type DMG', true],
  HealRatioBase: ['Outgoing Healing', true], HealTakenRatio: ['Incoming Healing', true],
  ElationDamageAddedRatioBase: ['Elation DMG', true],
};
function propText(p) {
  const [label, pct] = LC_PROPS[p.type] || [p.type, false];
  return `${label} +${pct ? (Math.round(p.value * 1000) / 10) + '%' : Math.round(p.value * 10) / 10}`;
}

// Light cone passives change with superimposition (S1-S5), using the same #1[i]% placeholders as skills.
function lcPassiveHTML(l, rank, sup) {
  if (!rank) return '<div>Passive data isn\'t available right now.</div>';
  const text = fillSkillText({desc: rank.desc.replace('{NICKNAME}', 'Trailblazer'), params: rank.params}, sup);
  const props = (rank.properties?.[sup - 1] || []).map(p => `<span class="chip">${propText(p)}</span>`).join('');
  const buttons = `<div class="asc m-0" role="group" aria-label="Superimposition">${
    rank.params.map((_, i) => `<button class="${i + 1 === sup ? 'on' : ''}" aria-pressed="${i + 1 === sup}" onclick="setSuperimposition(${i + 1})">S${i + 1}</button>`).join('')}</div>`;
  return `
    <div class="d-flex justify-content-between align-items-center">
      <div class="h4 mb-0">Light Cone Passive</div>
      ${buttons}
    </div>
    <div class="skill" style="--c: ${lcColor(l)}">
      <div>
        <div class="sk-name">${rank.skill} <span class="sk-lv">Superimposition ${sup}</span></div>
        <div class="sk-desc">${text}</div>
        ${props ? `<div class="chips mt-2" style="--c: ${lcColor(l)};justify-content:flex-start">${props}</div>` : ''}
      </div>
    </div>`;
}

function lcStatsInnerHTML(promo, asc) {
  const ph = promo?.values?.[asc];
  if (!ph) return '';
  const lvl = 20 + 10 * asc;
  const at = s => Math.floor(ph[s].base + ph[s].step * (lvl - 1));
  const rows = [['HP', at('hp')], ['ATK', at('atk')], ['DEF', at('def')]];
  const buttons = `<div class="asc" role="group" aria-label="Ascension">${
    promo.values.map((_, i) => `<button class="${i === asc ? 'on' : ''}" aria-pressed="${i === asc}" onclick="setAscension(${i})">A${i}</button>`).join('')}</div>`;
  return `
    <div class="small mt-1">Ascension ${asc} · Lv. ${lvl}</div>
    ${buttons}
    <div class="stats">${rows.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('')}</div>`;
}

function lcDetailHTML(l, promo, asc = 6) {
  const name = l.name.replace('{NICKNAME}', 'Trailblazer');
  return `
    <div class="detail">
      <div class="tilt-zone lc-hero" data-tilt="9">
        <div class="lc-hero-card tilt-inner" style="--c: ${lcColor(l)}">
          <img src="${BASE + l.portrait}" alt="${name} art" decoding="async" onerror="this.onerror=null;this.src='${BASE + l.preview}'">
          <span class="glare"></span>
        </div>
      </div>
      <div class="h3 mt-4 display-6">${name}</div>
      <div class="stars mb-2" aria-label="${l.rarity} stars">${'★'.repeat(l.rarity)}</div>
      <div class="chips" style="--c: ${lcColor(l)}">
        <span class="chip id">#${l.id}</span>
        <span class="chip path">${pathName(l.path)}</span>
      </div>
      <div class="mt-4">${lcStatsSectionHTML(promo, asc)}</div>
    </div>`;
}

function lcStatsSectionHTML(promo, asc = 6) {
  return `
    <div class="h4 mb-0">Base Stats</div>
    <div id="statsBox">${lcStatsInnerHTML(promo, asc)}</div>`;
}

function lcDescHTML(l) {
  const desc = (l.desc || '').replace('{NICKNAME}', 'Trailblazer');
  return desc ? `<div class="h4 mb-2">Description</div><div class="lc-flavor">${desc}</div>` : '';
}

const FOOTER = `<div class="foot">Data and images: <a href="https://github.com/Mar-7th/StarRailRes" target="_blank" rel="noopener noreferrer">StarRailRes</a> · Game assets belong to HoYoverse.</div>`;
