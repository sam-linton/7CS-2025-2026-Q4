// ===== FIGHT NIGHT =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;
const GROUND_Y = H - 80;
const GRAVITY = 0.9;

// ===== Deterministic RNG (used in place of Math.random) =====
// Offline mode: rand() simply delegates to Math.random so behavior is unchanged.
// Online mode (lockstep): both peers seed with the same value, advancing
// rngState in lockstep so visual + gameplay randomness stays in sync.
let rngState = 0;        // 0 = disabled, fall through to Math.random
function setRngSeed(seed) {
  rngState = (seed >>> 0) || 1;   // non-zero enables deterministic mode
}
function disableRng() { rngState = 0; }
// Sim-frame counter used wherever timing must stay in lockstep between peers.
// Offline: equals frameCount (every rAF is a sim tick). Online: equals
// net.netFrame (incremented only when both peers' inputs are available).
// Wall-clock frameCount can drift between peers under stalls; this helper
// keeps gameplay timers consistent across the network.
function currentSimFrame() {
  return net && net.isOnline ? net.netFrame : frameCount;
}
function rand() {
  // NOTE: Math.random (not rand) — calling rand() here would recurse forever.
  // The Phase-2 bulk sed accidentally rewrote this line; this is the fix.
  if (rngState === 0) return Math.random();
  // mulberry32 — small, fast, well-distributed for our needs
  let t = (rngState = (rngState + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// HUD refs
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlaySub = document.getElementById('overlay-sub');
const playerHealthEl = document.getElementById('player-health');
const lebronHealthEl = document.getElementById('lebron-health');
const playerSpecialEl = document.getElementById('player-special');
const opponentSpecialEl = document.getElementById('opponent-special');
const playerUltEl = document.getElementById('player-ult');
const opponentUltEl = document.getElementById('opponent-ult');
const playerNameEl = document.getElementById('player-name');
const opponentNameEl = document.getElementById('opponent-name');
const timerEl = document.getElementById('timer');
const roundTextEl = document.getElementById('round-text');
const difficultyLabelEl = document.getElementById('difficulty-label');
const tourneyLabelEl = document.getElementById('tourney-label');
const menuEl = document.getElementById('menu');
const playerRosterEl = document.getElementById('player-roster');
const opponentRosterEl = document.getElementById('opponent-roster');
const opponentSectionEl = document.getElementById('opponent-section');
const difficultyRowEl = document.getElementById('difficulty-row');
const modeRowEl = document.getElementById('mode-row');
const startBtn = document.getElementById('start-btn');
const selectedSummaryEl = document.getElementById('selected-summary');
const fightViewEl = document.getElementById('fight-view');

// Settings UI refs
const settingsToggleBtn   = document.getElementById('settings-toggle');
const settingsPanelEl     = document.getElementById('settings-panel');
const settingShakeEl      = document.getElementById('setting-shake');
const settingShakeValEl   = document.getElementById('setting-shake-val');
const settingParticlesEl  = document.getElementById('setting-particles');
const settingHintEl       = document.getElementById('setting-hint');
const settingFastEl       = document.getElementById('setting-fast');
const settingKeybindsEl   = document.getElementById('setting-keybinds');
const settingKeysResetBtn = document.getElementById('setting-keys-reset');
const settingResetGojoBtn = document.getElementById('setting-reset-gojo');
const controlsEl          = document.getElementById('controls');

// Online-mode UI refs
const onlineSectionEl    = document.getElementById('online-section');
const netPickRoleEl      = document.getElementById('net-pick-role');
const netHostBtn         = document.getElementById('net-host-btn');
const netJoinBtn         = document.getElementById('net-join-btn');
const netHostFlowEl      = document.getElementById('net-host-flow');
const netJoinFlowEl      = document.getElementById('net-join-flow');
const netHostOfferTA     = document.getElementById('net-host-offer');
const netHostAnswerTA    = document.getElementById('net-host-answer');
const netHostConnectBtn  = document.getElementById('net-host-connect');
const netCopyOfferBtn    = document.getElementById('net-copy-offer');
const netJoinOfferTA     = document.getElementById('net-join-offer');
const netJoinAnswerTA    = document.getElementById('net-join-answer');
const netJoinGenerateBtn = document.getElementById('net-join-generate');
const netCopyAnswerBtn   = document.getElementById('net-copy-answer');
const netStatusEl        = document.getElementById('net-status');

// ===== Characters =====
const CHARACTERS = {
  lebron: {
    id: 'lebron',
    name: 'KING',
    skin: '#8b5a3c',
    outfit: '#4a1a72',       // royal purple — shifted off Lakers tone
    accent: '#c0c8d8',       // silver instead of Lakers gold
    hair: '#1a1208',
    number: '1',
    hp: 130,
    speed: 3.6,
    specialId: 'dunk',
    ultimateId: 'kingsCrown',
    allOutId: 'crownSun',
    specialCDMax: 360,
    tauntText: 'BOW DOWN',
    desc: 'Crowned the day he picked up a ball. Plays like every game decides the throne. Refuses to lose on his own court.',
    specialName: 'SLAM',
    ultName: 'CORONATION',
    allOutName: 'GOLDEN HOUR',
    archetype: 'BALANCED',
    idle: 'dribble',
  },
  bezos: {
    id: 'bezos',
    name: 'TYCOON',
    skin: '#e8c4a0',
    outfit: '#1a1a1a',
    accent: '#0c8a5e',
    hair: '#e8c4a0',
    number: '$',
    hp: 110,
    speed: 3.4,
    bald: true,
    specialId: 'cashrain',
    ultimateId: 'trillionRain',
    allOutId: 'billionaireBarrage',
    specialCDMax: 300,
    tauntText: 'CHA-CHING',
    desc: 'Net worth: too many zeros. Solves every problem with capital. Treats every fight like a hostile takeover.',
    specialName: 'CASH RAIN',
    ultName: 'MARKET STORM',
    allOutName: 'HOSTILE TAKEOVER',
    archetype: 'MAGE',
    idle: 'count',
  },
  shadow: {
    id: 'shadow',
    name: 'SHADOW',
    skin: '#d4b896',
    outfit: '#0a0a0a',
    accent: '#cc2222',
    hair: '#000000',
    number: 'X',
    hp: 90,
    speed: 4.6,
    mask: true,
    specialId: 'shuriken',
    ultimateId: 'kageBunshin',
    allOutId: 'shadowStorm',
    specialCDMax: 180,
    tauntText: 'TOO SLOW',
    desc: 'Faceless. Frameless. Always behind you. Fastest hands in the roster, but you only ever see them in flashes.',
    specialName: 'SHURIKEN',
    ultName: 'KAGE BUNSHIN',
    allOutName: 'SHADOW STORM',
    archetype: 'ASSASSIN',
    idle: 'blink',
  },
  mike: {
    id: 'mike',
    name: 'BIG MIKE',
    skin: '#f0c090',
    outfit: '#2e7d32',
    accent: '#ffeb3b',
    hair: '#5a3010',
    number: '99',
    hp: 150,
    speed: 3.0,
    bulky: true,
    specialId: 'shockwave',
    ultimateId: 'earthquake',
    allOutId: 'cataclysm',
    specialCDMax: 330,
    tauntText: 'COME HERE',
    desc: 'Ex-bouncer, ex-football lineman, currently 280 pounds of bad day. Quotes Sun Tzu badly. Loves leg day.',
    specialName: 'SHOCKWAVE',
    ultName: 'EARTHQUAKE',
    allOutName: 'CATACLYSM',
    archetype: 'TANK',
    idle: 'flex',
  },
  volt: {
    id: 'volt',
    name: 'VOLT',
    skin: '#f3d6a8',
    outfit: '#2a2078',
    accent: '#ffe600',
    hair: '#ffe600',
    number: 'V',
    hp: 95,
    speed: 4.8,
    specialId: 'bolt',
    ultimateId: 'thunderstorm',
    allOutId: 'stormCaller',
    specialCDMax: 200,
    tauntText: 'ZAPPED',
    desc: 'Walking power surge. Got struck by lightning twice and stopped flinching. The static cling alone is a crime.',
    specialName: 'BOLT',
    ultName: 'THUNDERSTORM',
    allOutName: 'STORM CALLER',
    archetype: 'MAGE',
    idle: 'sparks',
  },
  chef: {
    id: 'chef',
    name: 'CHEF',
    skin: '#f0c090',
    outfit: '#ffffff',
    accent: '#cc2222',
    hair: '#1a1208',
    number: 'C',
    hp: 145,
    speed: 3.1,
    bulky: true,
    hat: 'chef',
    specialId: 'rollingpin',
    ultimateId: 'kitchenNightmare',
    allOutId: 'flambeFrenzy',
    specialCDMax: 260,
    tauntText: 'TASTY',
    desc: 'Three Michelin stars and zero patience. Fights using whatever heavy kitchenware is nearby. Tenderizes opponents like a cut of brisket.',
    specialName: 'ROLLING PIN',
    ultName: 'KITCHEN NIGHTMARE',
    allOutName: 'FLAMBÉ FRENZY',
    archetype: 'TANK',
    idle: 'toss',
  },
  trump: {
    id: 'trump',
    name: 'PREZ',
    skin: '#f3c08a',
    outfit: '#1e2a52',
    accent: '#c81e2a',
    hair: '#8a7050',         // neutral brown — away from the orange-swept caricature
    number: '1',
    hp: 115,
    speed: 3.2,
    specialId: 'maga',
    ultimateId: 'buildTheWall',
    allOutId: 'secretService',
    specialCDMax: 280,
    tauntText: 'ORDER',
    desc: 'Self-anointed strongest fighter in any room. Negotiates with fists. Brings his own podium to every match.',
    specialName: 'PODIUM SLAM',
    ultName: 'EXECUTIVE ORDER',
    allOutName: 'STATE OF EMERGENCY',
    archetype: 'BALANCED',
    idle: 'thumbs',
  },
  bob: {
    id: 'bob',
    name: 'BOB',
    skin: '#d9a070',
    outfit: '#d97a1a',
    accent: '#ffd34d',
    hair: '#3a1f0a',
    number: 'B',
    hp: 165,
    speed: 2.8,
    bulky: true,
    hat: 'hardhat',
    specialId: 'wrench',
    ultimateId: 'wreckingBall',
    allOutId: 'demolitionDay',
    specialCDMax: 300,
    tauntText: 'CAN WE FIX IT',
    desc: 'Union card, hard hat, zero nonsense. Spends his weekends rebuilding what other fighters smashed. Carries 40lbs of tools at all times.',
    specialName: 'WRENCH',
    ultName: 'WRECKING BALL',
    allOutName: 'DEMOLITION DAY',
    archetype: 'TANK',
    idle: 'tap',
  },
  gojo: {
    id: 'gojo',
    name: 'VOID',
    skin: '#f5e8d4',
    outfit: '#0a0a14',
    accent: '#7df9ff',
    hair: '#ffffff',
    number: '∞',
    hp: 110,
    speed: 4.4,
    mask: true,
    maskColor: '#ffffff',
    specialId: 'gojoCycle',
    ultimateId: 'hollowPurple',
    allOutId: 'hollowNuke',
    specialCDMax: 600,
    tauntText: 'NOT EVEN CLOSE',
    desc: 'A walking event horizon. Pulls everything in, lets nothing out. Wears the mask because mortals can\'t hold his gaze.',
    specialName: 'AZURE/CRIMSON',
    ultName: 'VOID PURGE',
    allOutName: 'INFINITE COLLAPSE',
    archetype: 'ASSASSIN',
    idle: 'sixeyes',
    secret: true,
  },

  baldman: {
    id: 'baldman',
    name: 'BALD MAN',
    skin: '#f0c890',
    outfit: '#3a3a3a',
    accent: '#ffd34d',
    hair: '#1a1208',
    number: 'O',
    hp: 100,
    speed: 3.4,
    bald: true,
    dmgResist: 0.9,             // takes 10% of normal damage
    specialId: 'headSmash',     // one-shots every enemy on screen
    ultimateId: 'earthquake',   // reuses Big Mike's ground-slam ult
    allOutId: 'cataclysm',      // reuses Big Mike's crash-from-sky
    specialCDMax: 1200,         // 20s — head smash is once-per-fight
    tauntText: 'BALD',
    desc: 'Forgot to wear a helmet. Doesn\'t need one. His skull bends physics. One headbutt and the room goes quiet.',
    specialName: 'HEAD SMASH',
    ultName: 'GROUND POUND',
    allOutName: 'CRANIUM CRASH',
    archetype: 'TANK',
    secret: true,
  },

  hacker: {
    id: 'hacker',
    name: 'HACKER',
    skin: '#cdbfae',
    outfit: '#0a1410',
    accent: '#39ff14',         // neon terminal green
    hair: '#0a0a0a',
    number: '#',
    hp: 105,
    speed: 4.2,
    mask: true,
    maskColor: '#0a1410',
    teleport: true,            // blinks instead of dash-punching
    specialId: 'glitch',       // homing data-spike burst
    ultimateId: 'timeHack',    // SYSTEM HALT — 5s time-stop, damage banks
    allOutId: 'kernelPanic',   // unique datamosh-then-BSOD finisher
    specialCDMax: 240,
    tauntText: 'GET PWNED',
    desc: 'Lives in the terminal, fights in the real world. Rewrites the rules mid-match. By the time you see him move he has already won.',
    specialName: 'GLITCH',
    ultName: 'SYSTEM HALT',
    allOutName: 'KERNEL PANIC',
    archetype: 'ASSASSIN',
    secret: true,
  },

  // ====== Tower monsters ======
  // Not in the playable roster; only spawned by tower mode as opponents.
  grunt: {
    id: 'grunt', monster: true,
    name: 'GRUNT',
    skin: '#9a8870', outfit: '#3a3a3a', accent: '#6a6a6a', hair: '#1a1a1a',
    number: 'G', hp: 60, speed: 3.0,
    specialId: null,
    specialCDMax: 999,
    tauntText: 'UGH',
    specialName: '—', ultName: '—', allOutName: '—',
    archetype: 'BALANCED',
  },
  blitz: {
    id: 'blitz', monster: true,
    name: 'BLITZ',
    skin: '#e8c0d0', outfit: '#cc1a4a', accent: '#ffe600', hair: '#ffe600',
    number: 'B', hp: 50, speed: 5.5,
    specialId: null,
    specialCDMax: 999,
    tauntText: 'TOO SLOW',
    specialName: '—', ultName: '—', allOutName: '—',
    archetype: 'ASSASSIN',
  },
  tank: {
    id: 'tank', monster: true,
    name: 'TANK',
    skin: '#d0b890', outfit: '#4a3210', accent: '#7a5a20', hair: '#1a0f0a',
    number: 'T', hp: 140, speed: 2.4,
    bulky: true,
    specialId: null,
    specialCDMax: 999,
    tauntText: 'COME ON',
    specialName: '—', ultName: '—', allOutName: '—',
    archetype: 'TANK',
  },
  mage: {
    id: 'mage', monster: true,
    name: 'MAGE',
    skin: '#e0d0ff', outfit: '#3a1e6a', accent: '#a070ff', hair: '#cdb6ff',
    number: 'M', hp: 70, speed: 3.0,
    specialId: 'shuriken',  // reuses Shadow's projectile mechanic
    specialCDMax: 220,
    tauntText: 'BEHOLD',
    specialName: 'BOLT', ultName: '—', allOutName: '—',
    archetype: 'MAGE',
  },
  jumper: {
    id: 'jumper', monster: true,
    name: 'JUMPER',
    skin: '#f0d8b8', outfit: '#1e7050', accent: '#aaffaa', hair: '#5a3010',
    number: 'J', hp: 80, speed: 3.6,
    specialId: null,
    specialCDMax: 999,
    tauntText: 'CATCH ME',
    specialName: '—', ultName: '—', allOutName: '—',
    archetype: 'ASSASSIN',
  },
};

// Damage rating per playable character — surfaced as a bar on the menu card.
// Hand-tuned 0..100 against a character's realistic kit damage (basic + special +
// ultimate + all-out + range/AoE). Bald Man tops out because Head Smash one-shots.
const DMG_RATING = {
  lebron:  60,    // dunk 28..36 + Coronation 3×32
  bezos:   55,    // cashrain spam, trillionRain projectiles
  shadow:  55,    // shuriken 18 + clone strike 28, fast pressure
  mike:    75,    // shockwave AoE 22 + wall slam 55
  volt:    50,    // small bolts 14 + thunderstorm rain
  chef:    70,    // pin throw + Kitchen Nightmare 42 AoE
  trump:   75,    // Build the Wall 55
  bob:     80,    // wrecking ball 40 wide + finisher
  gojo:    90,    // Hollow Purple, massive AoE
  baldman: 100,   // Head Smash one-shots everyone on screen
  hacker:  85,    // SYSTEM HALT banks a full combo, detonates at once
};

// Base roster (secret characters only appear once unlocked)
const BASE_ROSTER = ['lebron', 'bezos', 'shadow', 'mike', 'volt', 'chef', 'trump', 'bob'];
let ROSTER_ORDER = BASE_ROSTER.slice();
const GOJO_LS_KEY = 'fightnight_gojo_unlocked';
const BALD_LS_KEY = 'fightnight_bald_unlocked';
const HACK_LS_KEY = 'fightnight_hacker_unlocked';

// Persistent unlock checks
function isGojoUnlocked() {
  try { return localStorage.getItem(GOJO_LS_KEY) === '1'; } catch { return false; }
}
function isBaldUnlocked() {
  try { return localStorage.getItem(BALD_LS_KEY) === '1'; } catch { return false; }
}
function isHackerUnlocked() {
  try { return localStorage.getItem(HACK_LS_KEY) === '1'; } catch { return false; }
}

// Rebuild ROSTER_ORDER from BASE + any unlocked secrets. Called whenever the
// unlock state changes so the menu picks up new characters immediately.
function rebuildRoster() {
  ROSTER_ORDER = BASE_ROSTER.slice();
  if (isGojoUnlocked()) ROSTER_ORDER.push('gojo');
  if (isBaldUnlocked()) ROSTER_ORDER.push('baldman');
  if (isHackerUnlocked()) ROSTER_ORDER.push('hacker');
}
function applyGojoUnlock() { rebuildRoster(); }
function applyBaldUnlock() { rebuildRoster(); }
function applyHackerUnlock() { rebuildRoster(); }
rebuildRoster();

// ===== Difficulty =====
// hpMode: 'mult' uses opp's base * hpMult; 'playerMult' uses player.maxHp * playerHpMult
// qteKeys / qteFrames: how many keys the QTE asks for and how many frames per key
// aiParryChance: roll for considering a parry this frame.
// aiParryDelay:  [min,max] frame delay before tryParry() actually fires once decided.
//                Lower delay (impossible) = faster reaction; higher delay (easy) = often misses.
const DIFFICULTY = {
  easy:       { aiMin: 35, aiMax: 60, attackBias: 0.35, blockChance: 0.05, specialChance: 0.0, ultChance: 0.4, dmgMult: 0.7, hpMode: 'mult',       hpMult: 0.8, qteKeys: 4, qteFrames: 60, aiParryChance: 0.02, aiParryDelay: [12, 20] },
  normal:     { aiMin: 18, aiMax: 42, attackBias: 0.55, blockChance: 0.18, specialChance: 0.5, ultChance: 0.8, dmgMult: 1.0, hpMode: 'mult',       hpMult: 1.0, qteKeys: 5, qteFrames: 50, aiParryChance: 0.05, aiParryDelay: [8, 14] },
  hard:       { aiMin: 8,  aiMax: 22, attackBias: 0.75, blockChance: 0.32, specialChance: 0.9, ultChance: 1.2, dmgMult: 1.3, hpMode: 'playerMult', playerHpMult: 2, qteKeys: 6, qteFrames: 40, aiParryChance: 0.10, aiParryDelay: [4, 9] },
  impossible: { aiMin: 4,  aiMax: 12, attackBias: 0.9,  blockChance: 0.45, specialChance: 1.0, ultChance: 1.8, dmgMult: 1.5, hpMode: 'playerMult', playerHpMult: 3, qteKeys: 8, qteFrames: 28, aiParryChance: 0.18, aiParryDelay: [1, 4] },
};

let chosenPlayerId = 'shadow';
let chosenOpponentId = 'lebron';
let chosenDifficulty = 'normal';
let chosenMode = 'versus';

// Tournament state
let tournamentBracket = [];
let tournamentIdx = 0;

// ===== Tower mode state =====
const TOWER_LS_KEY = 'fightnight_tower_high';
const TOWER_TOTAL_FLOORS = 50;
const TOWER_BOSS_EVERY = 10;
function loadTowerHigh() {
  try { return parseInt(localStorage.getItem(TOWER_LS_KEY), 10) || 0; }
  catch { return 0; }
}
function saveTowerHigh(n) {
  try { localStorage.setItem(TOWER_LS_KEY, String(n)); } catch {}
}
let towerState = null;   // { floor, bossOrder: [5 char ids], highBefore: number }

// ===== User settings (persisted to localStorage) =====
const SETTINGS_LS_KEY = 'fightnight_settings';
const DEFAULT_KEYMAP = {
  punch:   'j',
  parry:   'k',
  special: 'i',
  ult:     'u',
  dash:    'q',
  taunt:   ' ',
};
const SETTINGS = {
  shake: 1.0,          // 0..1 multiplier on screen shake amplitude
  particles: 'full',   // 'off' | 'low' | 'full'
  hintBar: true,       // show the A/D/W/J/... reminder under the canvas
  fastMode: false,     // performance mode: skip expensive draws + halve particles
  keymap: { ...DEFAULT_KEYMAP },
};
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.shake === 'number')   SETTINGS.shake = Math.max(0, Math.min(1, parsed.shake));
    if (parsed.particles === 'off' || parsed.particles === 'low' || parsed.particles === 'full') {
      SETTINGS.particles = parsed.particles;
    }
    if (typeof parsed.hintBar === 'boolean') SETTINGS.hintBar = parsed.hintBar;
    if (typeof parsed.fastMode === 'boolean') SETTINGS.fastMode = parsed.fastMode;
    if (parsed.keymap && typeof parsed.keymap === 'object') {
      for (const k of Object.keys(DEFAULT_KEYMAP)) {
        if (typeof parsed.keymap[k] === 'string') SETTINGS.keymap[k] = parsed.keymap[k];
      }
    }
  } catch {}
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(SETTINGS)); } catch {}
}
loadSettings();

// ===== Input + buffer =====
const keys = {};
const COMBO_WINDOW = 60;            // frames a key stays in combo buffer
const DIR_WINDOW = 30;              // frames for forward-forward / back-back inputs
const inputBuffer = [];             // [{key, frame}]
let frameCount = 0;

function bufferPush(key) {
  inputBuffer.push({ key, frame: frameCount });
  while (inputBuffer.length > 16) inputBuffer.shift();
}

function bufferRecent(maxAge) {
  return inputBuffer.filter(e => frameCount - e.frame <= maxAge).map(e => e.key);
}

// Check whether the last N entries in the buffer (within maxAge) match seq exactly
function bufferEndsWith(seq, maxAge) {
  const r = bufferRecent(maxAge);
  if (r.length < seq.length) return false;
  for (let i = 0; i < seq.length; i++) {
    if (r[r.length - seq.length + i] !== seq[i]) return false;
  }
  return true;
}

// Secret cheat-code buffer (menu only). Multiple triggers tracked off a single
// rolling buffer sized to the longest code.
let secretBuffer = '';
const SECRET_VOIDCODE = 'voidpls';
const SECRET_HAIRCODE = 'hair';
const SECRET_BUF_LEN = Math.max(SECRET_VOIDCODE.length, SECRET_HAIRCODE.length);

function trySecretUnlock(k) {
  if (state.phase !== 'menu') return;
  if (k.length !== 1 || !/[a-z]/.test(k)) return;
  secretBuffer = (secretBuffer + k).slice(-SECRET_BUF_LEN);

  if (secretBuffer.endsWith(SECRET_VOIDCODE) && !ROSTER_ORDER.includes('gojo')) {
    try { localStorage.setItem(GOJO_LS_KEY, '1'); } catch {}
    applyGojoUnlock();
    showUnlockReveal('VOID', '∞ THE INFINITE ∞');
    buildRoster();
  }
  if (secretBuffer.endsWith(SECRET_HAIRCODE) && !ROSTER_ORDER.includes('baldman')) {
    spawnHairClicker();
  }
}

// ===== HACKER unlock challenge =====
// Type "glitch" DURING a match to arm the challenge. From that moment you must
// defeat the opponent without taking ANY damage. Succeed → HACKER unlocks.
let hackerChallenge = null;   // { armed, clean, prevHp } while a match is live
let hackerCodeBuf = '';
const HACK_CHALLENGE_CODE = 'glitch';

function tryHackerChallengeCode(k) {
  if (state.phase !== 'fighting') return;
  if (net.isOnline) return;                 // single-player only
  if (ROSTER_ORDER.includes('hacker')) return;
  if (k.length !== 1 || !/[a-z]/.test(k)) return;
  hackerCodeBuf = (hackerCodeBuf + k).slice(-HACK_CHALLENGE_CODE.length);
  if (hackerCodeBuf === HACK_CHALLENGE_CODE && (!hackerChallenge || !hackerChallenge.armed)) {
    hackerChallenge = { armed: true, clean: true, prevHp: player ? player.hp : 0 };
    showUnlockReveal('CHALLENGE ARMED', 'FLAWLESS WIN → HACKER');
  }
}

// Called every fighting frame: a single hp-drop check means we don't have to
// touch every scattered damage site.
function tickHackerChallenge() {
  if (!hackerChallenge || !hackerChallenge.armed || !player) return;
  if (player.hp < hackerChallenge.prevHp - 0.001) hackerChallenge.clean = false;
  hackerChallenge.prevHp = player.hp;
}

// Called when the player decisively wins (opponent defeated). Unlocks HACKER
// if the challenge was armed and no damage was taken since arming.
function checkHackerChallengeWin() {
  if (!hackerChallenge || !hackerChallenge.armed || !hackerChallenge.clean) return;
  if (ROSTER_ORDER.includes('hacker')) return;
  try { localStorage.setItem(HACK_LS_KEY, '1'); } catch {}
  applyHackerUnlock();
  showUnlockReveal('HACKER', '# ROOT ACCESS #');
  buildRoster();
  hackerChallenge = null;
}

// ===== Admin / debug panel =====
// Type "adminpanel" anywhere (any phase) to toggle a cheat panel.
const admin = { infHealth: false, infUlt: false, infSpecial: false, open: false };
let adminBuffer = '';
const ADMIN_CODE = 'adminpanel';

function tryAdminCode(k) {
  if (k.length !== 1 || !/[a-z]/.test(k)) return;
  adminBuffer = (adminBuffer + k).slice(-ADMIN_CODE.length);
  if (adminBuffer === ADMIN_CODE) {
    adminBuffer = '';
    toggleAdminPanel();
  }
}

function toggleAdminPanel() {
  let el = document.getElementById('admin-panel');
  if (el) { el.remove(); admin.open = false; return; }
  admin.open = true;
  el = document.createElement('div');
  el.id = 'admin-panel';
  el.innerHTML =
    `<div class="ap-title">⚙ ADMIN PANEL</div>` +
    `<label class="ap-row"><input type="checkbox" id="ap-hp"> Infinite Health</label>` +
    `<label class="ap-row"><input type="checkbox" id="ap-ult"> Infinite Ultimate</label>` +
    `<label class="ap-row"><input type="checkbox" id="ap-sp"> Infinite Special</label>` +
    `<button class="ap-btn" id="ap-freeze">Freeze Time: OFF</button>` +
    `<button class="ap-btn ap-close" id="ap-close">Close</button>` +
    `<div class="ap-hint">Freeze stops everyone but you. Online mode disables freeze.</div>`;
  document.body.appendChild(el);
  el.querySelector('#ap-hp').checked  = admin.infHealth;
  el.querySelector('#ap-ult').checked = admin.infUlt;
  el.querySelector('#ap-sp').checked  = admin.infSpecial;
  el.querySelector('#ap-hp').addEventListener('change', e => { admin.infHealth = e.target.checked; });
  el.querySelector('#ap-ult').addEventListener('change', e => { admin.infUlt = e.target.checked; });
  el.querySelector('#ap-sp').addEventListener('change', e => { admin.infSpecial = e.target.checked; });
  const fBtn = el.querySelector('#ap-freeze');
  const syncFreezeLabel = () => {
    const on = !!(state.timeStop && !state.timeStop.accum);
    fBtn.textContent = 'Freeze Time: ' + (on ? 'ON' : 'OFF');
    fBtn.classList.toggle('on', on);
  };
  fBtn.addEventListener('click', () => {
    if (state.timeStop && !state.timeStop.accum) {
      endTimeStop();
    } else if (player && state.phase === 'fighting') {
      // Indefinite freeze; player is the actor, no damage banking.
      beginTimeStop(player, opponent || null, -1, false);
    }
    syncFreezeLabel();
  });
  syncFreezeLabel();
  el.querySelector('#ap-close').addEventListener('click', toggleAdminPanel);
}

// Generic unlock banner — reused by both secret characters.
function showUnlockReveal(name, tag) {
  const existing = document.getElementById('gojo-reveal');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'gojo-reveal';   // reuse existing CSS animation
  el.innerHTML = `<div class="gr-flash"></div><div class="gr-text"><div class="gr-sub">UNLOCKED</div><div class="gr-name">${name}</div><div class="gr-tag">${tag}</div></div>`;
  document.body.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.classList.add('fade'); }, 2400);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3400);
}

// Hair-clicker: appears top-right of the menu when 'hair' is typed.
// Click the small dude 3 times → his hair flies off → BALD MAN unlocks.
function spawnHairClicker() {
  // Already showing? bring it back to 0 clicks instead of double-adding.
  const existing = document.getElementById('hair-clicker');
  if (existing) existing.remove();
  if (ROSTER_ORDER.includes('baldman')) return;

  const el = document.createElement('div');
  el.id = 'hair-clicker';
  el.innerHTML =
    '<div class="hc-head">' +
      '<div class="hc-hair"></div>' +
      '<div class="hc-eye hc-eye-left"></div>' +
      '<div class="hc-eye hc-eye-right"></div>' +
      '<div class="hc-mouth"></div>' +
    '</div>' +
    '<div class="hc-count">0/3</div>';

  let clicks = 0;
  const countEl = el.querySelector('.hc-count');
  el.addEventListener('click', () => {
    if (el.classList.contains('bald')) return;   // already done
    clicks++;
    countEl.textContent = clicks + '/3';
    // Retrigger wobble animation
    el.classList.remove('wobble');
    void el.offsetWidth;
    el.classList.add('wobble');

    if (clicks >= 3) {
      el.classList.add('bald');                  // hair fly-off animation
      countEl.textContent = 'BALD!';
      setTimeout(() => {
        try { localStorage.setItem(BALD_LS_KEY, '1'); } catch {}
        applyBaldUnlock();
        showUnlockReveal('BALD MAN', '★ INDESTRUCTIBLE ★');
        buildRoster();
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 700);
    }
  });

  // Attach inside menuEl so it auto-hides when leaving the menu phase.
  menuEl.appendChild(el);
}

window.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();

  // Settings: capturing a new key binding takes precedence over everything else.
  if (typeof listeningForKeybind === 'string' && listeningForKeybind) {
    e.preventDefault();
    // Cancel on Escape — keep existing binding
    if (k === 'escape') {
      listeningForKeybind = null;
      for (const b of settingKeybindsEl.children) b.classList.remove('listening');
      applySettings();
      return;
    }
    if (RESERVED_KEYS.has(k)) {
      // Briefly flash an error — keep the listening UI up
      applySettings();   // restores label
      return;
    }
    // Conflict check — unbind any other action currently using this key
    for (const action of Object.keys(SETTINGS.keymap)) {
      if (action !== listeningForKeybind && SETTINGS.keymap[action] === k) {
        SETTINGS.keymap[action] = '';   // cleared — user must rebind it
      }
    }
    SETTINGS.keymap[listeningForKeybind] = k;
    listeningForKeybind = null;
    for (const b of settingKeybindsEl.children) b.classList.remove('listening');
    applySettings();
    saveSettings();
    return;
  }

  if (!keys[k]) {
    // Rising edge — buffer attack/dir keys (no kick anymore)
    if ('juiadw'.includes(k)) bufferPush(k);
    // QTE consumes rising-edge presses
    if (state.phase === 'qte' && 'jadwi'.includes(k)) qteHandleKey(k);
    // Secret menu code
    trySecretUnlock(k);
    // Admin panel code — works in any phase
    tryAdminCode(k);
    // HACKER challenge arming code — only mid-match
    tryHackerChallengeCode(k);
  }
  keys[k] = true;

  if (e.key === ' ') e.preventDefault();
  if (state.phase === 'ready' && e.key === ' ') startFight();
  if (state.phase === 'over' && e.key === ' ') {
    if (net.isOnline) { net.send({ t: 'menu' }); net.isOnline = false; disableRng(); }
    showMenu();
  }
  if (e.key === 'Escape' && (state.phase === 'fighting' || state.phase === 'ready' || state.phase === 'over' || state.phase === 'lastStandReady')) {
    if (net.isOnline) { net.send({ t: 'menu' }); net.isOnline = false; disableRng(); }
    showMenu();
  }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// ===== Projectiles =====
const projectiles = [];

class Projectile {
  constructor(opts) {
    Object.assign(this, opts);
    this.life = this.life ?? 240;
    this.owner = opts.owner;
    this.dmg = opts.dmg ?? 8;
    this.kb = opts.kb ?? 5;
    this.blockMult = opts.blockMult ?? 0.15;
    this.r = opts.r ?? 10;
    this.hasGravity = opts.hasGravity ?? false;
    this.color = opts.color ?? '#fff';
    this.type = opts.type ?? 'ball';
    this.spin = 0;
    this.vy = opts.vy ?? 0;
    this.vx = opts.vx ?? 0;
    this.gravityMult = opts.gravityMult ?? 0.6;
    this.bouncesLeft = opts.bouncesLeft ?? 0;
    this.harmless = opts.harmless ?? false;
    this.homing = opts.homing ?? 0;      // per-frame steer accel toward target (0 = none)
    this.trail = [];                     // last few positions for motion ghosting
    this.trailMax = opts.trailMax ?? 5;
    this._hit = false;
  }
  update() {
    // record trail BEFORE we move
    this.trail.unshift({ x: this.x, y: this.y, spin: this.spin });
    if (this.trail.length > this.trailMax) this.trail.pop();

    // Homing steer (HACKER data-spikes): nudge velocity toward the target,
    // then renormalize so speed stays constant — gives a smooth tracking curve.
    if (this.homing > 0 && !this._hit) {
      const tgt = this.owner === player ? opponent : player;
      if (tgt && tgt.hp > 0) {
        const dx = tgt.x - this.x;
        const dy = (tgt.y - 50) - this.y;
        const d = Math.hypot(dx, dy) || 1;
        const sp = Math.hypot(this.vx, this.vy) || 8;
        this.vx += (dx / d) * this.homing;
        this.vy += (dy / d) * this.homing;
        const ns = Math.hypot(this.vx, this.vy) || 1;
        this.vx = this.vx / ns * sp;
        this.vy = this.vy / ns * sp;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    if (this.hasGravity) this.vy += GRAVITY * this.gravityMult;
    this.spin += 0.3;
    this.life--;

    // Bounce on ground (for boulders/wrenches)
    if (this.bouncesLeft > 0 && this.y >= GROUND_Y - this.r * 0.4) {
      this.y = GROUND_Y - this.r * 0.4;
      this.vy = -Math.abs(this.vy) * 0.55;
      this.vx *= 0.9;
      this.bouncesLeft--;
      spawnSparks(this.x, GROUND_Y, this.color, 8);
    }

    if (this.x < -60 || this.x > W + 60 || this.y > GROUND_Y + 40) this.life = 0;

    if (this.harmless) return;

    // Hit detection vs the opposing fighter
    if (!this._hit) {
      const target = this.owner === player ? opponent : player;
      if (target) {
        const tb = target.hitbox;
        // Glitch spikes are fast + homing; pad the test by the projectile
        // radius so a graze still connects instead of tunnelling past.
        const pad = this.type === 'glitch' ? this.r : 0;
        if (this.x > tb.x - pad && this.x < tb.x + tb.w + pad &&
            this.y > tb.y - pad && this.y < tb.y + tb.h + pad) {
          // Parry vs incoming projectile
          if (target.parryStance > 0) {
            target.parryStance = 0;
            target.parriesLeft = Math.min(3, target.parriesLeft + 1);
            target.parryFlash = 20;
            target.parryLockout = 0;
            // reflect projectile back
            this.vx = -this.vx;
            this.owner = target;
            this._hit = false;
            spawnHitBurst(this.x, this.y, '#7df9ff', 1.6);
            spawnCastRing(this.x, this.y, '#7df9ff', 100, 18, 6);
            return;
          }
          if (target.invuln <= 0 &&
              bankTimeStopDamage(target, this.dmg * difficultyDmgMult(this.owner))) {
            // Banked into the Hacker's time-stop — projectile fizzles, no hit.
            this.owner.gainUlt(2);
            this._hit = true;
            this.life = 0;
          } else if (target.invuln <= 0) {
            const resist = target.dmgResist || 0;   // BALD MAN: takes 10%
            target.hp -= this.dmg * difficultyDmgMult(this.owner) * (1 - resist);
            target.hitstun = 14;
            target.knockback = (this.vx > 0 ? 1 : -1) * this.kb;
            target.vy = -5;
            target.onGround = false;
            target.hitFlash = 10;
            target.shake = 10;
            target.gainUlt(4);
            this.owner.gainUlt(8);
            this.owner.registerHitLanded();
            spawnHitBurst(this.x, this.y, this.color, 1.2);
          }
          this._hit = true;
          this.life = 0;
        }
      }
    }
  }
  drawBody(ctx) {
    if (this.type !== 'wall') ctx.rotate(this.spin);
    if (this.type === 'basketball') {
      ctx.fillStyle = '#d9742a';
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1a0a02'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-this.r, 0); ctx.lineTo(this.r, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -this.r); ctx.lineTo(0, this.r); ctx.stroke();
    } else if (this.type === 'cash') {
      ctx.fillStyle = '#0c8a5e';
      ctx.fillRect(-this.r, -this.r * 0.5, this.r * 2, this.r);
      ctx.fillStyle = '#e8e0a0';
      ctx.fillRect(-this.r + 2, -this.r * 0.5 + 2, this.r * 2 - 4, this.r - 4);
      ctx.fillStyle = '#0c8a5e';
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 3);
    } else if (this.type === 'shuriken') {
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * this.r, Math.sin(a) * this.r);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * this.r * 0.35, Math.sin(a + Math.PI / 4) * this.r * 0.35);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#cc2222';
      ctx.beginPath(); ctx.arc(0, 0, this.r * 0.25, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'shockwave') {
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, this.r, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
      ctx.fillRect(-this.r, -this.r * 0.4, this.r * 2, this.r * 0.4);
    } else if (this.type === 'bolt') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(-this.r * 0.6, -this.r);
      ctx.lineTo(this.r * 0.2, -this.r * 0.2);
      ctx.lineTo(-this.r * 0.2, -this.r * 0.2);
      ctx.lineTo(this.r * 0.6, this.r);
      ctx.lineTo(-this.r * 0.2, this.r * 0.2);
      ctx.lineTo(this.r * 0.2, this.r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (this.type === 'pin') {
      ctx.fillStyle = '#e6c089';
      ctx.fillRect(-this.r * 1.4, -this.r * 0.35, this.r * 2.8, this.r * 0.7);
      ctx.fillStyle = '#a67039';
      ctx.fillRect(-this.r * 1.7, -this.r * 0.2, this.r * 0.4, this.r * 0.4);
      ctx.fillRect(this.r * 1.3, -this.r * 0.2, this.r * 0.4, this.r * 0.4);
    } else if (this.type === 'magahat') {
      // red baseball cap
      ctx.fillStyle = '#c81e2a';
      ctx.beginPath();
      ctx.arc(0, 0, this.r, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-this.r, -2, this.r * 2.3, 4);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 7px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MAGA', 0, -3);
    } else if (this.type === 'wrench') {
      ctx.fillStyle = '#9aa4ad';
      ctx.fillRect(-this.r * 0.25, -this.r, this.r * 0.5, this.r * 1.8);
      ctx.fillStyle = '#bcc4cc';
      ctx.beginPath();
      ctx.arc(0, -this.r, this.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0a0a';
      ctx.beginPath();
      ctx.arc(0, -this.r, this.r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'boulder') {
      ctx.fillStyle = '#7a6a5a';
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a4a3a';
      ctx.beginPath(); ctx.arc(-this.r * 0.3, -this.r * 0.2, this.r * 0.25, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.r * 0.2, this.r * 0.3, this.r * 0.18, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'wall') {
      // The Wall — big brick block
      const w = this.r * 2, h = this.r * 4;
      ctx.fillStyle = '#a05030';
      ctx.fillRect(-w / 2, -h, w, h);
      ctx.strokeStyle = '#4a2010';
      ctx.lineWidth = 2;
      for (let row = 0; row < 5; row++) {
        const yy = -h + row * (h / 5);
        ctx.beginPath(); ctx.moveTo(-w / 2, yy); ctx.lineTo(w / 2, yy); ctx.stroke();
        const off = row % 2 === 0 ? 0 : w / 4;
        for (let cx = -w / 2 + off; cx < w / 2; cx += w / 2) {
          ctx.beginPath(); ctx.moveTo(cx, yy); ctx.lineTo(cx, yy + h / 5); ctx.stroke();
        }
      }
    } else if (this.type === 'wreckingball') {
      // Big metal ball with chain
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -200);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.fillStyle = '#3a3a40';
      ctx.beginPath(); ctx.arc(0, 0, this.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a20';
      ctx.beginPath(); ctx.arc(this.r * 0.3, -this.r * 0.3, this.r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a5a60';
      ctx.beginPath(); ctx.arc(-this.r * 0.25, -this.r * 0.25, this.r * 0.2, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'clone') {
      // shadow ghost flash
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#220022';
      ctx.fillRect(-12, -50, 24, 50);
      ctx.fillStyle = '#cc2222';
      ctx.fillRect(-4, -40, 8, 6);
      ctx.globalAlpha = 1;
    } else if (this.type === 'redball') {
      // Half-fighter sized glowing red orb
      const r = this.r;
      ctx.fillStyle = 'rgba(255, 60, 60, 0.35)';
      ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2020';
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffaaaa';
      ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.4, r * 0.15, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'purpleBeam') {
      const len = this.beamLen || W;
      const h = this.beamH || 120;
      const dir = this.beamDir || 1;
      // outer glow
      ctx.fillStyle = 'rgba(120, 30, 200, 0.35)';
      ctx.fillRect(0, -h, dir * len, h * 2);
      // mid
      ctx.fillStyle = 'rgba(180, 80, 255, 0.7)';
      ctx.fillRect(0, -h * 0.6, dir * len, h * 1.2);
      // core
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, -h * 0.18, dir * len, h * 0.36);
      // sparks along axis — Math.random not rand(): purely visual, runs per
      // render rather than per sim, so leave the seeded RNG alone.
      for (let i = 0; i < 12; i++) {
        const xx = dir * (i + 1) * (len / 13);
        const yy = (Math.random() - 0.5) * h * 1.6;
        ctx.fillStyle = i % 2 === 0 ? '#fff' : '#d04dff';
        ctx.fillRect(xx, yy, 4, 4);
      }
    } else if (this.type === 'glitch') {
      // HACKER data-spike — a jagged neon-green shard with a bright core and
      // RGB-split chromatic offset for a "corrupted" look.
      const r = this.r;
      ctx.fillStyle = 'rgba(255, 0, 80, 0.6)';
      ctx.fillRect(-r - 2, -r * 0.4, r * 2, r * 0.8);          // red ghost
      ctx.fillStyle = 'rgba(0, 180, 255, 0.6)';
      ctx.fillRect(-r + 2, -r * 0.4, r * 2, r * 0.8);          // cyan ghost
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.moveTo(-r, 0); ctx.lineTo(0, -r * 0.8);
      ctx.lineTo(r, 0);  ctx.lineTo(0, r * 0.8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eaffea';
      ctx.fillRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7);    // hot core
    }
  }

  draw(ctx) {
    // Render ghost trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      const alpha = (1 - i / this.trail.length) * 0.45;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      const savedSpin = this.spin;
      this.spin = p.spin;
      this.drawBody(ctx);
      this.spin = savedSpin;
      ctx.restore();
    }
    // Active sprite
    ctx.save();
    ctx.translate(this.x, this.y);
    this.drawBody(ctx);
    ctx.restore();
  }
}

function difficultyDmgMult(owner) {
  if (owner === opponent) return DIFFICULTY[chosenDifficulty].dmgMult;
  return 1.0;
}

// ===== Fighter =====
class Fighter {
  constructor(opts) {
    Object.assign(this, opts);
    this.vx = 0;
    this.vy = 0;
    this.maxHp = this.hp;
    // Speed-driven scaling: faster characters get shorter cooldowns and longer dashes.
    // BASE_SPEED is King's 3.6. Range across cast is roughly 2.8..4.8.
    const BASE_SPEED = 3.6;
    const sdelta = (this.speed || BASE_SPEED) - BASE_SPEED;
    this.speedFactor = Math.max(0.75, Math.min(1.25, 1 - sdelta * 0.10));
    this.dashFactor  = Math.max(0.80, Math.min(1.30, 1 + sdelta * 0.12));
    this.attackCD = 0;
    this.attackTimer = 0;
    this.attackKind = null;
    this.attackBonus = null;     // {dmgMult, kbMult, launcher}
    this.hitstun = 0;
    this.taunting = 0;
    this.facing = opts.facing || 1;
    this.onGround = true;
    this.hitFlash = 0;
    this.knockback = 0;
    this.shake = 0;
    this.particles = [];
    this.specialCD = 0;
    this.specialState = null;
    this.ultimateState = null;
    this.invuln = 0;
    this.ult = 0;                // 0..100
    this.ultMax = 100;
    this.isPlayer = false;
    this.regenLockout = 0;       // frames after taking dmg where regen pauses
    this.allOutState = null;     // active cinematic
    this.proneTimer = 0;         // frames face-down (locked from acting)
    this.walkPhase = 0;          // for walk-bob sin wave
    this.moveLean = 0;           // smoothed lean angle while moving
    this.breathPhase = 0;        // idle breath sin
    this.landSquash = 0;         // frames of squash on landing
    this.wasOnGround = true;     // for land detection
    this.idlePhase = 0;
    this.counterParried = 0;     // frames remaining of PARRY! flash
    this.castPose = null;        // 'charge' | 'cast' | null
    this.jumpsLeft = 2;          // double-jump: ground jump + one mid-air jump
    this.qDashLatch = false;     // edge-tracking for Q dash
    this.dashTimer = 0;          // frames of sustained dash velocity
    this.dashDir = 0;            // -1 / 0 / +1
    this.dashCD = 0;             // recovery cooldown before another dash
    // Parry mechanic
    this.parryStance = 0;        // frames where a hit would be parried
    this.parryLockout = 0;       // end-lag from a missed parry
    this.parriesLeft = 3;
    this.parryRegen = 0;         // frames left until a charge auto-refills (only ticks when parriesLeft===0)
    this.parryFlash = 0;         // VFX on successful parry
    this.parryLatch = false;
    // Edge-tracking latches for input-snapshot system. Per-fighter so the same
    // pipeline can drive local-player, AI, or remote-network inputs.
    this.specialLatch = false;
    this.ultLatch = false;
    this.wLatch = false;
    this.punchLatch = false;
    this.jHoldStart = 0;
    // Gojo state
    this.gojoMode = 'blue';      // 'blue' | 'red' — toggles on each I press
    this.gojoBlueTimer = 0;      // frames remaining of Blue aura/invuln
  }

  get hitbox() {
    return { x: this.x - 28, y: this.y - 90, w: 56, h: 90 };
  }

  gainUlt(amount) {
    this.ult = Math.min(this.ultMax, this.ult + amount);
  }

  // No-op stub — combo counter is gone, but lots of call sites still call this.
  registerHitLanded() {}

  attackHitbox() {
    if (this.attackTimer <= 0 || this.attackTimer > 12) return null;
    const isDash = this.attackKind === 'dashpunch';
    const isHeavy = this.attackKind === 'heavypunch';
    const range = isDash ? 70 : (isHeavy ? 64 : 58);
    // x is the LEFT edge of the rect. When facing right the hitbox extends to
    // the right (x+18 .. x+18+range). When facing left it must extend to the
    // left (x-18-range .. x-18). The old `this.x + this.facing * 18` ignored
    // the width sign and put the rect to the right of the fighter both ways,
    // so AI punches with facing=-1 always whiffed.
    const base = {
      x: this.facing > 0 ? this.x + 18 : this.x - 18 - range,
      y: this.y - 62,
      w: range,
      h: 28,
      dmg: 8,
      kb: 6,
      launcher: false,
    };
    if (this.attackBonus) {
      base.dmg *= this.attackBonus.dmgMult || 1;
      base.kb *= this.attackBonus.kbMult || 1;
      base.launcher = !!this.attackBonus.launcher;
    }
    return base;
  }

  takeHit(hb, attacker) {
    // Parry: if in stance, cancel the hit, stagger attacker, refund the parry.
    if (this.parryStance > 0) {
      this.parryStance = 0;
      this.parriesLeft = Math.min(3, this.parriesLeft + 1);
      this.parryFlash = 20;
      this.parryLockout = 0;
      // A successful parry breaks the defender out of any stun/knockback so
      // parrying mid-combo actually rescues you (matches "parry any time").
      this.hitstun = 0;
      this.knockback = 0;
      attacker.attackTimer = 0;
      attacker.attackKind = null;
      attacker.hitstun = 22;
      attacker.knockback = -Math.sign(this.x - attacker.x || 1) * 8;
      attacker.vy = -4;
      attacker.onGround = false;
      attacker.shake = 14;
      spawnHitBurst(this.x, this.y - 50, '#7df9ff', 2.2);
      spawnCastRing(this.x, this.y - 50, '#7df9ff', 140, 22, 8);
      spawnCastRing(this.x, this.y - 50, '#ffffff', 90, 18, 4);
      screenFlash = Math.max(screenFlash, 18);
      screenFlashColor = '#7df9ff';
      state.hitstop = Math.max(state.hitstop, 6);
      ultBanner = { name: 'PARRY!', t: 50, color: '#7df9ff', side: this === player ? 'left' : 'right' };
      return true;
    }
    // Only ult-invuln blocks damage now. Letting hits land during hitstun means
    // combos actually connect — the previous behavior silently rejected the 2nd
    // hit of any combo, which read as "fist doesn't deal damage".
    if (this.invuln > 0) return false;
    const dmgMult = attacker === opponent ? DIFFICULTY[chosenDifficulty].dmgMult : 1.0;
    const resist = this.dmgResist || 0;        // BALD MAN: takes 10% damage
    // SYSTEM HALT: hits on the frozen target during the Hacker's time-stop are
    // banked and detonated all at once when time resumes (see endTimeStop).
    if (bankTimeStopDamage(this, hb.dmg * dmgMult)) {
      attacker.gainUlt(2);
      return true;
    }
    this.hp -= hb.dmg * dmgMult * (1 - resist);
    this.hitstun = hb.launcher ? 28 : 18;
    this.knockback = -this.facing * hb.kb;
    this.vy = hb.launcher ? -12 : -6;
    this.onGround = false;
    this.hitFlash = 10;
    this.shake = hb.launcher ? 16 : 12;
    this.gainUlt(4);
    this.regenLockout = 90;
    attacker.gainUlt(8);
    attacker.registerHitLanded();
    spawnHitBurst(this.x, this.y - 50, hb.launcher ? '#ffd34d' : '#ff3a3a', hb.launcher ? 1.6 : 1);
    return true;
  }

  update(other) {
    if (this.attackCD > 0) this.attackCD--;
    if (this.attackTimer > 0) this.attackTimer--;
    else { this.attackKind = null; this.attackBonus = null; }
    if (this.hitstun > 0) this.hitstun--;
    if (this.taunting > 0) this.taunting--;
    if (this.hitFlash > 0) this.hitFlash--;
    if (this.shake > 0) this.shake--;
    if (this.specialCD > 0) this.specialCD--;
    if (this.invuln > 0) this.invuln--;
    if (this.regenLockout > 0) this.regenLockout--;

    // Slow HP regen — 1 HP per ~4s, paused after taking damage / mid-hitstun
    if (this.regenLockout <= 0 && this.hitstun <= 0 && this.hp > 0 && this.hp < this.maxHp && currentSimFrame() % 240 === 0) {
      this.hp = Math.min(this.maxHp, this.hp + 1);
    }

    if (this.proneTimer > 0) this.proneTimer--;
    if (this.counterParried > 0) this.counterParried--;
    if (this.parryStance > 0) {
      this.parryStance--;
      if (this.parryStance === 0) {
        // Stance expired without consuming a hit → end-lag
        this.parryLockout = 30;
      }
    }
    if (this.parryLockout > 0) this.parryLockout--;
    if (this.parryFlash > 0) this.parryFlash--;
    // Parry regen: only runs while completely empty.
    if (this.parriesLeft <= 0) {
      if (this.parryRegen <= 0) this.parryRegen = 360;   // 6s
      this.parryRegen--;
      if (this.parryRegen <= 0) {
        this.parriesLeft = 1;
        this.parryRegen = 0;
      }
    } else {
      // Cancel pending regen if we picked up a charge another way (e.g. successful parry refund).
      this.parryRegen = 0;
    }
    // Sustain dash velocity for its duration
    if (this.dashTimer > 0) {
      this.dashTimer--;
      this.vx = this.dashDir * 20;
      this.invuln = Math.max(this.invuln, 2);
    }
    if (this.dashCD > 0) this.dashCD--;
    if (this.gojoBlueTimer > 0) {
      this.gojoBlueTimer--;
      this.invuln = Math.max(this.invuln, 2);   // keep invuln topped up while Blue lingers
      // Trail of cyan particles around the fighter
      if (currentSimFrame() % 3 === 0) {
        const a = rand() * Math.PI * 2;
        globalParticles.push(new Particle(
          this.x + Math.cos(a) * 36, this.y - 50 + Math.sin(a) * 36,
          Math.cos(a) * -1, Math.sin(a) * -1 - 0.3,
          rand() < 0.5 ? '#7df9ff' : '#ffffff',
          20 + rand() * 12
        ));
      }
    }
    this.updateSpecial(other);
    this.updateUltimate(other);
    const prevAllOut = this.allOutState;
    this.updateAllOut(other);
    // If a Last-Stand all-out just finished, flip into Sudden Death
    if (prevAllOut && !this.allOutState && prevAllOut.fromLastStand && !state.suddenDeath) {
      enterSuddenDeath();
    }

    this.vx += this.knockback;
    this.knockback *= 0.5;
    if (Math.abs(this.knockback) < 0.1) this.knockback = 0;

    this.x += this.vx;
    this.y += this.vy;
    this.vy += GRAVITY;
    this.vx *= 0.8;

    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }

    if (this.x < 40) this.x = 40;
    if (this.x > W - 40) this.x = W - 40;

    // ===== Movement polish =====
    // Land squash when transitioning airborne → grounded
    if (this.onGround && !this.wasOnGround) {
      this.landSquash = 8;
      this.jumpsLeft = 2;                 // refresh double-jump budget on landing
    }
    this.wasOnGround = this.onGround;
    if (this.landSquash > 0) this.landSquash--;

    // Walk/air-stride bob: keep the cycle moving in the air too so the legs
    // continue to swing through the jump arc — feels much livelier than a
    // frozen pose mid-jump.
    if (Math.abs(this.vx) > 0.5) this.walkPhase += Math.abs(this.vx) * 0.08;
    // Lean toward direction of motion. Ground gets a stronger lean than before
    // (0.08 → 0.14) for visible run animation; airborne adds a softer tilt so
    // the body angles through the arc.
    let targetLean = 0;
    if (this.onGround && Math.abs(this.vx) > 0.5) {
      targetLean = Math.sign(this.vx) * 0.14;
    } else if (!this.onGround && Math.abs(this.vx) > 0.5) {
      targetLean = Math.sign(this.vx) * 0.10;
    }
    this.moveLean += (targetLean - this.moveLean) * 0.2;
    // Idle breathing
    if (this.onGround && Math.abs(this.vx) < 0.4 && !this.attackKind && !this.specialState && !this.ultimateState && !this.allOutState) {
      this.breathPhase += 0.04;
    }
    this.idlePhase++;

    if (this.hitstun <= 0 && this.attackTimer <= 0 && !this.specialState && !this.ultimateState) {
      this.facing = other.x > this.x ? 1 : -1;
    }

    // Attack hitbox check — moved out of update(). The main loop calls
    // tickAttackHits() with the full list of valid targets so one swing can
    // damage multiple enemies (multi-enemy tower floors).

    for (const p of this.particles) p.update();
    this.particles = this.particles.filter(p => p.life > 0);

    this.hp = Math.max(0, this.hp);
  }

  // Per-frame attack-vs-target check. Called from the main loop with the list
  // of valid victims (player has many enemies, each enemy has just the player).
  // A Set of already-hit fighters prevents a single swing from double-tapping
  // the same target while still letting it damage multiple distinct ones.
  tickAttackHits(targets) {
    const hb = this.attackHitbox();
    if (this.attackTimer <= 0) { this._hitSet = null; return; }
    if (!hb) return;
    if (!this._hitSet) this._hitSet = new Set();
    for (const t of targets) {
      if (!t || t.hp <= 0 || t.proneTimer > 0) continue;
      if (this._hitSet.has(t)) continue;
      if (rectsOverlap(hb, t.hitbox)) {
        if (t.takeHit(hb, this)) this._hitSet.add(t);
      }
    }
  }

  // Plain punch — no chains, no finisher combo.
  punch() {
    if (this.attackCD > 0 || this.hitstun > 0 || !this.onGround || this.specialState || this.ultimateState || this.allOutState) return;
    this.attackKind = 'punch';
    this.attackTimer = 16;
    this.attackCD = Math.round(22 * this.speedFactor);
    this.attackBonus = { dmgMult: 1, kbMult: 1, launcher: false };
  }

  // Heavy punch — fires on J release after a hold ≥ HEAVY_HOLD_FRAMES.
  heavyPunch() {
    if (this.attackCD > 0 || this.hitstun > 0 || !this.onGround || this.specialState || this.ultimateState || this.allOutState) return;
    this.attackKind = 'heavypunch';
    this.attackTimer = 22;
    this.attackCD = Math.round(30 * this.speedFactor);
    this.attackBonus = { dmgMult: 1.8, kbMult: 1.5, launcher: true };
    spawnCastRing(this.x, this.y - 50, '#ffd34d', 90, 20, 6);
    spawnHitBurst(this.x, this.y - 50, '#ffd34d', 1.4);
  }

  jump() {
    if (this.hitstun > 0 || this.specialState || this.ultimateState || this.allOutState) return;
    if (this.onGround) {
      this.vy = -16;
      this.onGround = false;
      this.jumpsLeft = 1;        // ground jump consumed; 1 air-jump remaining
    } else if (this.jumpsLeft > 0) {
      // Double jump
      this.vy = -14;
      this.jumpsLeft--;
      // Visual puff under feet
      spawnCastRing(this.x, this.y - 4, '#ffffff', 50, 14, 4);
      for (let i = 0; i < 10; i++) {
        const a = rand() * Math.PI - Math.PI;   // upper-hemisphere swirl
        const sp = 2 + rand() * 3;
        globalParticles.push(new Particle(
          this.x + (rand() - 0.5) * 14, this.y - 2,
          Math.cos(a) * sp, Math.sin(a) * sp,
          '#ffffff', 18
        ));
      }
    }
  }

  // Called when a special/ultimate/all-out hit is absorbed by an active parry.
  // Refunds the charge, clears lockout, plays cyan feedback FX, and pins the
  // attacker for ~0.1s so a successful parry always reads visually + denies an
  // instant follow-up jab. Returns true so callers short-circuit damage.
  absorbParry(attacker) {
    if (this.parryStance <= 0) return false;
    this.parryStance = 0;
    this.parriesLeft = Math.min(3, this.parriesLeft + 1);
    this.parryFlash = 20;
    this.parryLockout = 0;
    this.counterParried = 22;
    spawnCastRing(this.x, this.y - 50, '#7df9ff', 110, 18, 6);
    spawnHitBurst(this.x, this.y - 50, '#7df9ff', 1.4);
    if (screenFlash < 10) { screenFlash = 10; screenFlashColor = '#7df9ff'; }
    // 0.1s stun on the attacker. Min() guard so we never *reduce* an existing
    // longer stun (e.g. from a chained parry). Special/ult/allOut state machines
    // ignore hitstun by design, so this won't cancel a cinematic mid-frame —
    // but it does cancel a basic melee swing and gates the next punch.
    if (attacker) {
      attacker.hitstun = Math.max(attacker.hitstun || 0, 6);
      attacker.attackTimer = 0;
      attacker.attackKind = null;
      attacker.shake = Math.max(attacker.shake || 0, 6);
    }
    return true;
  }

  // PARRY — 15-frame stance. If hit during stance, parry succeeds and refunds itself.
  // Otherwise expire into a 30-frame lockout.
  tryParry() {
    if (this.parryStance > 0) return;     // already in a parry window
    if (this.parriesLeft <= 0) return;    // out of charges (still regenerates)
    if (this.isPlayer) {
      // The player may parry at ANY time — even while stunned, in lockout, or
      // mid-special/ult/all-out — so there's always a defensive option and no
      // combo is truly inescapable. (AI keeps the stricter gating below.)
    } else {
      if (this.parryLockout > 0) return;
      if (this.hitstun > 0 || this.specialState || this.ultimateState || this.allOutState) return;
    }
    this.parryStance = 15;            // 0.25 s window
    this.parriesLeft--;
    this._parryArmedAt = frameCount;
    spawnCastRing(this.x, this.y - 50, '#7df9ff', 70, 14, 4);
  }

  // Sustained dash. `inputDir` (-1 / 0 / +1) comes from the player's currently-held
  // A/D key — NOT from facing — so you can dash AWAY from the opponent.
  qDash(inputDir) {
    if (this.hitstun > 0 || this.specialState || this.ultimateState || this.allOutState) return;
    if (this.attackCD > 0) return;
    if (this.dashTimer > 0) return;
    if (this.dashCD > 0) return;
    const dir = inputDir || this.facing;

    // HACKER: blink-teleport instead of a dash-punch. Instant reposition with
    // brief i-frames and a glitch trail — no sustained velocity, no hitbox.
    if (this.teleport) {
      const blink = 380;                       // long-range blink
      const fromX = this.x;
      this.x = Math.max(60, Math.min(W - 60, this.x + dir * blink));
      this.vx = 0;
      this.invuln = 16;
      this.dashCD = 0;                          // no cooldown — spam-blink at will
      // De-rez at the origin, re-rez at the destination
      for (let i = 0; i < 14; i++) {
        globalParticles.push(new Particle(
          fromX + (rand() - 0.5) * 24, this.y - 30 - rand() * 50,
          (rand() - 0.5) * 2, -rand() * 2, '#39ff14', 16 + rand() * 8));
        globalParticles.push(new Particle(
          this.x + (rand() - 0.5) * 24, this.y - 30 - rand() * 50,
          (rand() - 0.5) * 2, -rand() * 2, '#39ff14', 16 + rand() * 8));
      }
      spawnCastRing(fromX, this.y - 46, '#39ff14', 70, 14, 5);
      spawnCastRing(this.x, this.y - 46, '#39ff14', 90, 16, 6);
      return;
    }

    this.attackKind = 'dashpunch';
    this.attackTimer = 24; this.attackCD = Math.round(32 * this.speedFactor);
    this.invuln = 22;
    this.dashTimer = Math.round(20 * this.dashFactor);   // longer dash for fast chars
    this.dashDir = dir;
    this.dashCD = Math.round(50 * this.speedFactor);     // faster recovery for fast chars
    this.vx = dir * 20;
    if (!this.onGround) this.vy = Math.min(this.vy, -2);
    this.attackBonus = { dmgMult: 1.35, kbMult: 1.2, launcher: false };
    spawnCastRing(this.x, this.y - 40, '#ffd34d', 120, 24, 8);
    spawnHitBurst(this.x, this.y - 40, '#ffd34d', 1.4);
    for (let i = 0; i < 10; i++) {
      globalParticles.push(new Particle(
        this.x - dir * i * 7, this.y - 40 - i,
        -dir * 2, -0.5, '#ffd34d', 22 - i
      ));
    }
  }

  // ===== Special (with directional variants) =====
  // variant: 'normal' | 'forward' | 'back' | 'air'
  special(variant) {
    if (this.specialCD > 0 || this.hitstun > 0 || this.specialState || this.ultimateState) return;
    if (!this.specialId) return;   // monsters with no special skip the visual flourish too
    if (variant === 'air' && this.onGround) variant = 'normal';
    if (variant !== 'air' && !this.onGround) return;
    const id = this.specialId;
    if (id === 'dunk') this.startDunk(variant);
    else if (id === 'cashrain') this.startCashRain(variant);
    else if (id === 'shuriken') this.startShuriken(variant);
    else if (id === 'shockwave') this.startShockwave(variant);
    else if (id === 'bolt') this.startBolt(variant);
    else if (id === 'rollingpin') this.startRollingPin(variant);
    else if (id === 'maga') this.startMaga(variant);
    else if (id === 'wrench') this.startWrench(variant);
    else if (id === 'gojoCycle') this.startGojoCycle(variant);
    else if (id === 'headSmash') this.startHeadSmash(variant);
    else if (id === 'glitch') this.startGlitch(variant);
    this.specialCD = Math.round(this.specialCDMax * this.speedFactor);
    // Universal cast-ring FX
    spawnCastRing(this.x, this.y - 60, this.accent || '#ffd34d', 90, 22, 6);
    spawnCastRing(this.x, this.y - 60, '#ffffff', 50, 16, 3);
    spawnHitBurst(this.x, this.y - 60, this.accent || '#ffd34d', 0.8);
    if (screenFlash < 12) {
      screenFlash = 12;
      screenFlashColor = this.accent || '#ffd34d';
    }
  }

  ultimate() {
    if (this.ult < this.ultMax || this.hitstun > 0 || this.specialState || this.ultimateState) return;
    this.ult = 0;
    this.invuln = 30;
    const id = this.ultimateId;
    if (id === 'kingsCrown') this.startKingsCrown();
    else if (id === 'trillionRain') this.startTrillionRain();
    else if (id === 'kageBunshin') this.startKageBunshin();
    else if (id === 'earthquake') this.startEarthquake();
    else if (id === 'thunderstorm') this.startThunderstorm();
    else if (id === 'kitchenNightmare') this.startKitchenNightmare();
    else if (id === 'buildTheWall') this.startBuildTheWall();
    else if (id === 'wreckingBall') this.startWreckingBall();
    else if (id === 'hollowPurple') this.startHollowPurple();
    else if (id === 'timeHack') this.startTimeHack();
    triggerUltFanfare(this);
  }

  // ===== Specials =====
  startDunk(variant) {
    this.specialState = { kind: 'dunk', phase: 'toss', t: 0, variant };
    projectiles.push(new Projectile({
      x: this.x, y: this.y - 90,
      vx: 0, vy: -12,
      type: 'basketball', color: '#d9742a',
      owner: this, dmg: 0, kb: 0, r: 12,
      life: 60, hasGravity: true, harmless: true,
    }));
  }

  startCashRain(variant) {
    this.specialState = { kind: 'cashrain', phase: 'throw', t: 0, variant };
  }

  startShuriken(variant) {
    this.specialState = { kind: 'shuriken', phase: 'throw', t: 0, variant };
  }

  // HACKER special — a burst of homing "data-spikes" that curve onto the
  // opponent. `air` variant fans them slightly wider.
  startGlitch(variant) {
    this.specialState = { kind: 'glitch', phase: 'cast', t: 0, variant };
  }

  // HACKER ultimate — SYSTEM HALT. Stops time for 5s (300f). During the freeze
  // only the Hacker acts; every hit on the opponent is banked and detonates
  // all at once when time resumes (see beginTimeStop/endTimeStop).
  startTimeHack() {
    const tgt = this === player ? opponent : player;
    this._ultBurst && this._ultBurst('#39ff14', 60);
    // No lingering ultimateState — it would lock the Hacker out of attacking.
    // The 5s freeze is driven entirely by state.timeStop instead. Clear the
    // ultimate()-granted invuln so the Hacker is in a clean, normal state for
    // the freeze (the frozen victim can't act anyway).
    this.ultimateState = null;
    this.invuln = 0;
    beginTimeStop(this, tgt, 300, true);
    hackerClock = 30;            // ticking green clock on screen for ~0.5s
    ultBanner = { name: 'SYSTEM HALT', t: 120, color: '#39ff14',
                  side: this === player ? 'left' : 'right' };
  }

  startShockwave(variant) {
    this.specialState = { kind: 'shockwave', phase: 'leap', t: 0, variant };
    this.vy = variant === 'forward' ? -20 : -18;
    if (variant === 'forward') {
      const other = this === player ? opponent : player;
      this.vx = Math.sign(other.x - this.x) * 7;
    }
    this.onGround = false;
  }

  startBolt(variant) {
    this.specialState = { kind: 'bolt', phase: 'throw', t: 0, variant };
  }

  startRollingPin(variant) {
    this.specialState = { kind: 'rollingpin', phase: 'throw', t: 0, variant };
  }

  startMaga(variant) {
    this.specialState = { kind: 'maga', phase: 'throw', t: 0, variant };
  }

  startWrench(variant) {
    this.specialState = { kind: 'wrench', phase: 'throw', t: 0, variant };
  }

  // BALD MAN's HEAD SMASH — instant, no cinematic state. One-shots every
  // enemy currently on the screen with a single dramatic flash. The
  // specialCD is long (set in CHARACTERS to 1200 = 20s) so this is
  // typically a once-per-fight nuke.
  startHeadSmash(variant) {
    // Decide targets: whoever isn't us. In offline 1v1 / tower that's the
    // enemy team; in online lockstep it's just the other fighter.
    let targets;
    if (this === player) {
      targets = allEnemies();
    } else {
      targets = [player];
    }
    for (const t of targets) {
      if (!t || t.hp <= 0) continue;
      // Skip ult-invuln (still respects defensive invuln, fair gating)
      if (t.invuln > 0) continue;
      if (t.absorbParry && t.absorbParry(this)) continue;   // parry no-sells the nuke
      const resist = t.dmgResist || 0;
      // Deliberately massive damage: 9999 * (1 - resist) so even another
      // BALD MAN goes down (1000 -> takes 100 dmg, well above 100 HP).
      t.hp -= 9999 * (1 - resist);
      t.hitstun = 30;
      t.knockback = -this.facing * 14;
      t.vy = -8;
      t.onGround = false;
      t.hitFlash = 10;
      t.shake = 24;
      spawnHitBurst(t.x, t.y - 50, '#ffd34d', 3.0);
      spawnCastRing(t.x, t.y - 50, '#ffffff', 240, 28, 12);
    }
    // Big screen-wide flash + banner
    screenFlash = 50;
    screenFlashColor = '#ffffff';
    state.hitstop = 18;
    ultBanner = {
      name: 'HEAD SMASH',
      t: 80,
      color: '#ffd34d',
      side: this === player ? 'left' : 'right',
    };
    spawnCastRing(this.x, this.y - 50, '#ffd34d', 360, 34, 14);
    this.gainUlt(20);
  }

  startGojoCycle(variant) {
    if (this.gojoMode === 'blue') {
      // BLUE: 10s of invuln, no specialState lock (he can still attack)
      this.gojoBlueTimer = 600;
      this.invuln = Math.max(this.invuln, 600);
      // Visual: huge cyan ring + spiral particles
      spawnCastRing(this.x, this.y - 50, '#7df9ff', 180, 36, 10);
      spawnCastRing(this.x, this.y - 50, '#ffffff', 110, 28, 6);
      spawnHitBurst(this.x, this.y - 50, '#7df9ff', 2.2);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        globalParticles.push(new Particle(
          this.x + Math.cos(a) * 12, this.y - 50 + Math.sin(a) * 12,
          Math.cos(a) * 5, Math.sin(a) * 5,
          '#7df9ff', 50
        ));
      }
      screenFlash = 30; screenFlashColor = '#7df9ff';
      this.gojoMode = 'red';
    } else {
      // RED: huge fast red orb
      const dir = this.facing;
      projectiles.push(new Projectile({
        x: this.x + dir * 36, y: this.y - 60,
        vx: dir * 22, vy: 0,
        type: 'redball', color: '#ff2020',
        owner: this, dmg: 35, kb: 40, r: 28,
        life: 110, hasGravity: false, blockMult: 0.3,
        trailMax: 9,
      }));
      spawnCastRing(this.x + dir * 30, this.y - 60, '#ff2020', 140, 28, 9);
      spawnCastRing(this.x + dir * 30, this.y - 60, '#ffaaaa', 90, 22, 5);
      spawnHitBurst(this.x + dir * 30, this.y - 60, '#ff2020', 1.6);
      screenFlash = 28; screenFlashColor = '#ff5050';
      this.gojoMode = 'blue';
    }
  }

  updateSpecial(other) {
    const s = this.specialState;
    if (!s) return;
    s.t++;

    if (s.kind === 'dunk') {
      const recoverFrame = s.variant === 'forward' ? 18 : 24;
      if (s.phase === 'toss' && s.t >= recoverFrame) {
        s.phase = 'teleport';
        s.t = 0;
        this.x = other.x;
        this.y = GROUND_Y - 220;
        this.vx = 0;
        this.vy = 0;
        this.invuln = 30;
        this.onGround = false;
        spawnSparks(this.x, this.y, '#fdb927', 24);
        for (const pr of projectiles) if (pr.owner === this && pr.type === 'basketball') pr.life = 0;
      } else if (s.phase === 'teleport') {
        if (this.onGround) {
          s.phase = 'land';
          s.t = 0;
          const dmg = (s.variant === 'forward' ? 36 : 28);
          const radius = (s.variant === 'forward' ? 130 : 110);
          if (Math.abs(other.x - this.x) < radius && other.hitstun <= 0 && other.invuln <= 0 && !other.absorbParry(this)) {
            other.hp -= dmg * difficultyDmgMult(this);
            other.hitstun = 26;
            other.knockback = -Math.sign(this.x - other.x || 1) * 14;
            other.vy = -10;
            other.onGround = false;
            other.hitFlash = 12;
            other.shake = 18;
            other.gainUlt(6);
            this.gainUlt(12);
            this.registerHitLanded();
          }
          spawnSparks(this.x, GROUND_Y, '#fdb927', 40);
          this.shake = 14;
        } else {
          this.vy = 18;
        }
      } else if (s.phase === 'land' && s.t >= 14) {
        this.specialState = null;
      }
    } else if (s.kind === 'cashrain') {
      if (s.phase === 'throw' && s.t === 12) {
        const cx = other.x;
        const count = s.variant === 'forward' ? 11 : 7;
        for (let i = 0; i < count; i++) {
          const offX = (i - (count - 1) / 2) * 28 + (rand() - 0.5) * 20;
          projectiles.push(new Projectile({
            x: cx + offX, y: -20,
            vx: (rand() - 0.5) * 1.5,
            vy: 4 + rand() * 2,
            type: 'cash', color: '#0c8a5e',
            owner: this, dmg: 7, kb: 4, r: 9,
            life: 220, hasGravity: false,
            blockMult: 0.1,
          }));
        }
      }
      if (s.t >= 24) this.specialState = null;
    } else if (s.kind === 'shuriken') {
      if (s.phase === 'throw' && s.t === 10) {
        if (s.variant === 'forward') {
          for (let i = -1; i <= 1; i++) {
            projectiles.push(new Projectile({
              x: this.x + this.facing * 30, y: this.y - 60 + i * 22,
              vx: this.facing * 15, vy: i * 0.8,
              type: 'shuriken', color: '#cccccc',
              owner: this, dmg: 9, kb: 6, r: 11,
              life: 90, hasGravity: false,
            }));
          }
        } else if (s.variant === 'back') {
          // defensive backstep + retreat shuriken
          this.vx = -this.facing * 10;
          this.invuln = 18;
          projectiles.push(new Projectile({
            x: this.x + this.facing * 30, y: this.y - 60,
            vx: this.facing * 14, vy: 0,
            type: 'shuriken', color: '#cccccc',
            owner: this, dmg: 11, kb: 8, r: 12,
            life: 90, hasGravity: false,
          }));
        } else if (s.variant === 'air') {
          projectiles.push(new Projectile({
            x: this.x + this.facing * 30, y: this.y - 30,
            vx: this.facing * 13, vy: 3,
            type: 'shuriken', color: '#cccccc',
            owner: this, dmg: 11, kb: 8, r: 12,
            life: 90, hasGravity: false,
          }));
        } else {
          projectiles.push(new Projectile({
            x: this.x + this.facing * 30, y: this.y - 60,
            vx: this.facing * 14, vy: 0,
            type: 'shuriken', color: '#cccccc',
            owner: this, dmg: 11, kb: 8, r: 12,
            life: 90, hasGravity: false,
          }));
        }
      }
      if (s.t >= 20) this.specialState = null;
    } else if (s.kind === 'shockwave') {
      if (s.phase === 'leap' && this.onGround && s.t > 6) {
        const dir = Math.sign(other.x - this.x) || 1;
        const dmg = s.variant === 'forward' ? 18 : 14;
        const speed = s.variant === 'forward' ? 11 : 9;
        projectiles.push(new Projectile({
          x: this.x + dir * 30, y: GROUND_Y - 8,
          vx: dir * speed, vy: 0,
          type: 'shockwave', color: '#ffeb3b',
          owner: this, dmg, kb: 10, r: 26,
          life: 80, hasGravity: false,
        }));
        spawnSparks(this.x, GROUND_Y, '#ffeb3b', 24);
        this.shake = 14;
        s.phase = 'recover';
        s.t = 0;
      } else if (s.phase === 'recover' && s.t >= 16) {
        this.specialState = null;
      }
    } else if (s.kind === 'bolt') {
      if (s.phase === 'throw' && s.t === 8) {
        const speed = s.variant === 'forward' ? 16 : 13;
        projectiles.push(new Projectile({
          x: this.x + this.facing * 30, y: this.y - 60,
          vx: this.facing * speed, vy: 0,
          type: 'bolt', color: '#ffe600',
          owner: this, dmg: 10, kb: 7, r: 14,
          life: 70, hasGravity: false,
        }));
        spawnSparks(this.x + this.facing * 30, this.y - 60, '#ffffff', 16);
      }
      if (s.variant === 'back' && s.t === 4) {
        this.vx = -this.facing * 9;
        this.invuln = 16;
      }
      if (s.t >= 18) this.specialState = null;
    } else if (s.kind === 'glitch') {
      // Fire 3 homing data-spikes on a short stagger so they corkscrew in.
      if (s.phase === 'cast' && (s.t === 6 || s.t === 12 || s.t === 18)) {
        const idx = (s.t - 6) / 6;            // 0,1,2
        const spread = s.variant === 'air' ? 0.5 : 0.28;
        projectiles.push(new Projectile({
          x: this.x + this.facing * 26, y: this.y - 62,
          vx: this.facing * 8,                 // slower so the homing converges
          vy: (idx - 1) * spread * 10,
          type: 'glitch', color: '#39ff14',
          owner: this, dmg: 26, kb: 9, r: 12,  // hits hard now
          life: 130, hasGravity: false, homing: 1.9,   // strong tracking
        }));
        spawnSparks(this.x + this.facing * 26, this.y - 62, '#39ff14', 10);
      }
      if (s.t >= 26) this.specialState = null;
    } else if (s.kind === 'rollingpin') {
      if (s.phase === 'throw' && s.t === 14) {
        const speed = s.variant === 'forward' ? 13 : 10;
        projectiles.push(new Projectile({
          x: this.x + this.facing * 30, y: this.y - 60,
          vx: this.facing * speed, vy: -2,
          type: 'pin', color: '#e6c089',
          owner: this, dmg: 13, kb: 9, r: 14,
          life: 80, hasGravity: true, gravityMult: 0.25,
        }));
      }
      if (s.t >= 26) this.specialState = null;
    } else if (s.kind === 'maga') {
      if (s.phase === 'throw' && s.t === 12) {
        const speed = s.variant === 'forward' ? 14 : 11;
        projectiles.push(new Projectile({
          x: this.x + this.facing * 30, y: this.y - 80,
          vx: this.facing * speed, vy: -3,
          type: 'magahat', color: '#c81e2a',
          owner: this, dmg: 11, kb: 7, r: 16,
          life: 100, hasGravity: true, gravityMult: 0.35,
        }));
      }
      if (s.t >= 24) this.specialState = null;
    } else if (s.kind === 'wrench') {
      if (s.phase === 'throw' && s.t === 14) {
        const speed = s.variant === 'forward' ? 12 : 9;
        projectiles.push(new Projectile({
          x: this.x + this.facing * 30, y: this.y - 70,
          vx: this.facing * speed, vy: -6,
          type: 'wrench', color: '#bcc4cc',
          owner: this, dmg: 14, kb: 10, r: 12,
          life: 110, hasGravity: true, gravityMult: 0.7,
          bouncesLeft: 1,
        }));
      }
      if (s.t >= 26) this.specialState = null;
    }
  }

  // ===== Ultimates =====
  // Each one auras a themed color burst on cast.
  _ultBurst(color, count) {
    for (let i = 0; i < count; i++) {
      const ang = rand() * Math.PI * 2;
      const sp = 3 + rand() * 6;
      globalParticles.push(new Particle(
        this.x, this.y - 60,
        Math.cos(ang) * sp, Math.sin(ang) * sp - 2,
        i % 3 === 0 ? '#ffffff' : color,
        24 + rand() * 20
      ));
    }
  }

  startKingsCrown() {
    this.ultimateState = { kind: 'kingsCrown', phase: 'toss', t: 0, slamsLeft: 3 };
    this._ultBurst('#fdb927', 40);
  }

  startTrillionRain() {
    this.ultimateState = { kind: 'trillionRain', phase: 'throw', t: 0 };
    this._ultBurst('#0c8a5e', 40);
  }

  startKageBunshin() {
    this.ultimateState = { kind: 'kageBunshin', phase: 'startup', t: 0 };
    this._ultBurst('#cc2222', 40);
  }

  startEarthquake() {
    this.ultimateState = { kind: 'earthquake', phase: 'leap', t: 0, wavesLeft: 3 };
    this.vy = -22;
    this.onGround = false;
    this._ultBurst('#ffeb3b', 40);
  }

  startThunderstorm() {
    this.ultimateState = { kind: 'thunderstorm', phase: 'startup', t: 0, strikesLeft: 7 };
    this._ultBurst('#ffe600', 50);
  }

  startKitchenNightmare() {
    this.ultimateState = { kind: 'kitchenNightmare', phase: 'leap', t: 0 };
    this.vy = -18;
    this.onGround = false;
    this._ultBurst('#cc2222', 40);
  }

  startBuildTheWall() {
    this.ultimateState = { kind: 'buildTheWall', phase: 'startup', t: 0 };
    this._ultBurst('#c81e2a', 40);
  }

  startWreckingBall() {
    this.ultimateState = { kind: 'wreckingBall', phase: 'startup', t: 0 };
    this._ultBurst('#3a3a40', 40);
  }

  startHollowPurple() {
    this.ultimateState = { kind: 'hollowPurple', phase: 'charge', t: 0 };
    this._ultBurst('#d04dff', 80);
    spawnCastRing(this.x, this.y - 60, '#7df9ff', 140, 30, 8);
    spawnCastRing(this.x, this.y - 60, '#ff2020', 110, 26, 7);
    spawnCastRing(this.x, this.y - 60, '#d04dff', 170, 36, 10);
  }

  updateUltimate(other) {
    const s = this.ultimateState;
    if (!s) return;
    s.t++;

    if (s.kind === 'kingsCrown') {
      // 3 successive teleport dunks
      if (s.phase === 'toss' && s.t === 18) {
        s.phase = 'teleport'; s.t = 0;
        this.x = other.x; this.y = GROUND_Y - 240;
        this.vx = 0; this.vy = 0; this.onGround = false;
        this.invuln = 60;
        spawnSparks(this.x, this.y, '#fdb927', 36);
      } else if (s.phase === 'teleport') {
        if (this.onGround) {
          this.shake = 18;
          spawnSparks(this.x, GROUND_Y, '#fdb927', 40);
          if (Math.abs(other.x - this.x) < 140 && other.hitstun <= 0 && !other.absorbParry(this)) {
            other.hp -= 32 * difficultyDmgMult(this);
            other.hitstun = 20;
            other.knockback = -Math.sign(this.x - other.x || 1) * 8;
            other.vy = -8;
            other.onGround = false;
            other.hitFlash = 10;
            other.shake = 14;
            this.registerHitLanded();
          }
          s.slamsLeft--;
          if (s.slamsLeft > 0) {
            s.phase = 'recoup'; s.t = 0;
          } else {
            this.ultimateState = null;
          }
        } else {
          this.vy = 20;
        }
      } else if (s.phase === 'recoup' && s.t >= 16) {
        s.phase = 'teleport'; s.t = 0;
        this.x = other.x; this.y = GROUND_Y - 240;
        this.vx = 0; this.vy = 0; this.onGround = false;
        this.invuln = 40;
        spawnSparks(this.x, this.y, '#fdb927', 28);
      }
    } else if (s.kind === 'trillionRain') {
      if (s.phase === 'throw' && s.t >= 6 && s.t <= 80 && s.t % 6 === 0) {
        for (let i = 0; i < 4; i++) {
          const xx = 80 + rand() * (W - 160);
          projectiles.push(new Projectile({
            x: xx, y: -20,
            vx: (rand() - 0.5) * 2,
            vy: 4 + rand() * 3,
            type: 'cash', color: '#0c8a5e',
            owner: this, dmg: 9, kb: 4, r: 9,
            life: 260, hasGravity: false, blockMult: 0.1,
          }));
        }
      }
      if (s.t >= 110) this.ultimateState = null;
    } else if (s.kind === 'kageBunshin') {
      // 5-shuriken star spread + 2 clone dashes
      if (s.phase === 'startup' && s.t === 10) {
        for (let i = 0; i < 5; i++) {
          const ang = (-Math.PI / 4) + (i / 4) * (Math.PI / 2); // spread vertically forward
          projectiles.push(new Projectile({
            x: this.x + this.facing * 30, y: this.y - 60,
            vx: this.facing * Math.cos(ang) * 16, vy: Math.sin(ang) * 6,
            type: 'shuriken', color: '#cccccc',
            owner: this, dmg: 18, kb: 7, r: 12,
            life: 100, hasGravity: false,
          }));
        }
        spawnSparks(this.x, this.y - 60, '#cc2222', 28);
      }
      if (s.phase === 'startup' && s.t === 24) {
        // clone strike: damaging i-frame dash through opponent
        const dir = Math.sign(other.x - this.x) || this.facing;
        this.x = other.x - dir * 80;
        this.vx = dir * 16;
        this.invuln = 24;
        if (other.hitstun <= 0 && other.invuln <= 0 && !other.absorbParry(this)) {
          other.hp -= 28 * difficultyDmgMult(this);
          other.hitstun = 22;
          other.knockback = dir * 10;
          other.vy = -8;
          other.onGround = false;
          other.hitFlash = 10;
          other.shake = 14;
          this.registerHitLanded();
        }
        projectiles.push(new Projectile({
          x: other.x, y: other.y - 40, vx: 0, vy: 0,
          type: 'clone', owner: this, dmg: 0, kb: 0, r: 12,
          life: 16, harmless: true,
        }));
      }
      if (s.t >= 50) this.ultimateState = null;
    } else if (s.kind === 'earthquake') {
      // big leap, then 3 alternating shockwaves
      if (s.phase === 'leap' && this.onGround && s.t > 8) {
        s.phase = 'spawn'; s.t = 0;
        this.shake = 22;
        spawnSparks(this.x, GROUND_Y, '#ffeb3b', 50);
      }
      if (s.phase === 'spawn' && s.t % 14 === 0 && s.wavesLeft > 0) {
        const dir = s.wavesLeft % 2 === 0 ? 1 : -1;
        const aim = (s.wavesLeft === 3) ? Math.sign(other.x - this.x) || 1 : dir;
        projectiles.push(new Projectile({
          x: this.x + aim * 30, y: GROUND_Y - 8,
          vx: aim * 10, vy: 0,
          type: 'shockwave', color: '#ffeb3b',
          owner: this, dmg: 22, kb: 10, r: 30,
          life: 110, hasGravity: false,
        }));
        s.wavesLeft--;
        if (s.wavesLeft <= 0) s.phase = 'recover';
      }
      if (s.phase === 'recover' && s.t >= 30) this.ultimateState = null;
    } else if (s.kind === 'thunderstorm') {
      // 7 lightning strikes from sky, tracking opponent
      if (s.phase === 'startup' && s.t >= 6 && s.t % 8 === 0 && s.strikesLeft > 0) {
        const tx = other.x + (rand() - 0.5) * 80;
        projectiles.push(new Projectile({
          x: tx, y: -20,
          vx: 0, vy: 24,
          type: 'bolt', color: '#ffe600',
          owner: this, dmg: 14, kb: 6, r: 16,
          life: 40, hasGravity: false,
        }));
        spawnSparks(tx, 0, '#ffffff', 16);
        spawnSparks(tx, GROUND_Y, '#ffe600', 12);
        // jagged trail
        for (let i = 0; i < 8; i++) {
          globalParticles.push(new Particle(
            tx + (rand() - 0.5) * 14, i * (GROUND_Y / 8),
            (rand() - 0.5) * 1.5, 0,
            '#ffffff', 14
          ));
        }
        s.strikesLeft--;
      }
      if (s.t >= 80) this.ultimateState = null;
    } else if (s.kind === 'kitchenNightmare') {
      // pan slam at landing + 4 spinning pins outward
      if (s.phase === 'leap' && this.onGround && s.t > 6) {
        s.phase = 'recover'; s.t = 0;
        this.shake = 20;
        spawnSparks(this.x, GROUND_Y, '#cc2222', 40);
        // pan slam AOE
        if (Math.abs(other.x - this.x) < 160 && other.hitstun <= 0 && !other.absorbParry(this)) {
          other.hp -= 42 * difficultyDmgMult(this);
          other.hitstun = 24;
          other.knockback = -Math.sign(this.x - other.x || 1) * 14;
          other.vy = -12;
          other.onGround = false;
          other.hitFlash = 12;
          other.shake = 18;
          this.registerHitLanded();
        }
        // launch 4 pins outward
        for (let i = 0; i < 4; i++) {
          const dir = i < 2 ? -1 : 1;
          const lane = i % 2 === 0 ? -30 : -60;
          projectiles.push(new Projectile({
            x: this.x, y: this.y + lane,
            vx: dir * (9 + rand() * 3), vy: -4 - rand() * 2,
            type: 'pin', color: '#e6c089',
            owner: this, dmg: 15, kb: 7, r: 12,
            life: 110, hasGravity: true, gravityMult: 0.3,
          }));
        }
      }
      if (s.phase === 'recover' && s.t >= 26) this.ultimateState = null;
    } else if (s.kind === 'buildTheWall') {
      // Wall slams down on opponent's locked-in position
      if (s.phase === 'startup' && s.t === 18) {
        s.wallX = other.x;
        projectiles.push(new Projectile({
          x: s.wallX, y: GROUND_Y - 1, vx: 0, vy: 0,
          type: 'wall', color: '#a05030',
          owner: this, dmg: 0, kb: 0, r: 30,
          life: 30, harmless: true,
        }));
        s.phase = 'slam'; s.t = 0;
      }
      if (s.phase === 'slam' && s.t === 4) {
        if (Math.abs(other.x - s.wallX) < 80 && other.hitstun <= 0 && other.invuln <= 0 && !other.absorbParry(this)) {
          other.hp -= 55 * difficultyDmgMult(this);
          other.hitstun = 32;
          other.knockback = -Math.sign(this.x - other.x || 1) * 10;
          other.vy = -10;
          other.onGround = false;
          other.hitFlash = 14;
          other.shake = 24;
          this.registerHitLanded();
        }
        spawnSparks(s.wallX, GROUND_Y, '#a05030', 50);
      }
      if (s.t >= 36) this.ultimateState = null;
    } else if (s.kind === 'wreckingBall') {
      // big swinging ball sweeps from off-screen
      if (s.phase === 'startup' && s.t === 10) {
        const dir = Math.sign(other.x - this.x) || 1;
        projectiles.push(new Projectile({
          x: dir > 0 ? -40 : W + 40, y: GROUND_Y - 90,
          vx: dir * 9, vy: 0,
          type: 'wreckingball', color: '#3a3a40',
          owner: this, dmg: 40, kb: 16, r: 32,
          life: 200, hasGravity: false, blockMult: 0.25,
        }));
      }
      if (s.t >= 30) this.ultimateState = null;
    } else if (s.kind === 'hollowPurple') {
      // Phase 1 (0..30): two orbs form on either side of Gojo and converge
      // Phase 2 (30..50): collision flash
      // Phase 3 (50..110): massive purple beam fires forward; one-shot on contact
      if (s.phase === 'charge') {
        const ratio = s.t / 30;
        const dir = this.facing;
        // Blue orb on his left hand
        const bx = this.x - dir * (50 - ratio * 50);
        const rx = this.x + dir * (50 - ratio * 50);
        const by = this.y - 60;
        // Render via globalParticles trail
        if (currentSimFrame() % 2 === 0) {
          globalParticles.push(new Particle(bx, by + (rand() - 0.5) * 10, 0, 0, '#7df9ff', 12));
          globalParticles.push(new Particle(rx, by + (rand() - 0.5) * 10, 0, 0, '#ff2020', 12));
        }
        // Store positions so drawAllOutProps can render them
        s.blueX = bx; s.blueY = by; s.redX = rx; s.redY = by; s.size = 8 + ratio * 14;
        if (s.t >= 30) {
          s.phase = 'collide'; s.t = 0;
          spawnHitBurst(this.x, this.y - 60, '#d04dff', 3.0);
          spawnCastRing(this.x, this.y - 60, '#ffffff', 220, 30, 12);
          spawnCastRing(this.x, this.y - 60, '#d04dff', 280, 36, 12);
          screenFlash = 38; screenFlashColor = '#ffffff';
          state.hitstop = 10;
        }
      } else if (s.phase === 'collide') {
        if (s.t === 1) {
          // spawn the beam projectile (long-lived, dmg=0 — we apply kill manually on hit)
          const dir = this.facing;
          s.beamFiredAt = frameCount;
          s.killed = false;
          projectiles.push(new Projectile({
            x: this.x + dir * 30, y: this.y - 60,
            vx: 0, vy: 0,
            type: 'purpleBeam', color: '#d04dff',
            owner: this, dmg: 0, kb: 0, r: 40,
            life: 50, hasGravity: false, blockMult: 1.0, harmless: true,
            beamLen: W, beamH: 110, beamDir: dir,
          }));
        }
        // On any frame where opponent is within the beam horizontal lane → kill
        if (!s.killed) {
          const dir = this.facing;
          const inFront = (other.x - this.x) * dir > 0;
          const inLane = Math.abs(other.y - 50 - (this.y - 60)) < 110;
          if (inFront && inLane && other.proneTimer <= 0) {
            applyProne(other, 180, 0, true);
            spawnHitBurst(other.x, other.y - 50, '#d04dff', 3.5);
            spawnCastRing(other.x, other.y - 50, '#d04dff', 260, 36, 14);
            spawnCastRing(other.x, other.y - 50, '#ffffff', 200, 32, 10);
            screenFlash = 40; screenFlashColor = '#d04dff';
            s.killed = true;
          }
        }
        if (s.t >= 50) this.ultimateState = null;
      }
    }
  }

  // ===== All-out attack cinematics =====
  // Each handles its own timing inside this.allOutState.t
  updateAllOut(other) {
    const s = this.allOutState;
    if (!s) return;
    s.t++;
    this.invuln = 8;            // caster invuln throughout
    // Pin caster movement so they don't drift mid-cinematic.
    if (s.kind !== 'cataclysm' && s.kind !== 'shadowStorm' && s.kind !== 'crownSun' && s.kind !== 'kitchenNightmare' && s.kind !== 'earthquake' && s.kind !== 'kingsCrown') {
      this.vx = 0;
      this.knockback = 0;
    }
    // Caster pose flag (read by drawFighterSprite)
    // 'charge' = arms raised channelling, 'cast' = arms extended forward firing
    this.castPose = null;
    if (s.kind === 'hollowNuke') {
      if (s.t < 100) this.castPose = 'charge';
      else if (s.t < 200) this.castPose = 'cast';
    } else if (s.kind === 'crownSun' && s.t < 30) {
      this.castPose = 'charge';
    } else if (s.kind === 'cataclysm' && s.t < 30) {
      this.castPose = 'charge';
    } else if (s.kind === 'stormCaller') {
      this.castPose = 'charge';
    } else if (s.kind === 'flambeFrenzy' && s.t < 6) {
      this.castPose = 'charge';
    } else if (s.kind === 'kernelPanic') {
      this.castPose = s.t < 40 ? 'charge' : 'cast';
    } else if (s.kind === 'shadowStorm' && s.t < 8) {
      this.castPose = 'charge';
    }

    if (s.kind === 'crownSun') {
      // 0..30: massive screen-wide flash (handled by external screenFlash)
      // 30..50: flying backboard descends; Lebron teleports above
      // 50..90: Lebron dives onto opponent; gold radial; opponent slammed prone
      // 90..200: opponent prone, taunt
      if (s.t === 30) {
        screenFlash = 30; screenFlashColor = '#fff8c0';
        spawnSparks(W / 2, H / 2, '#fdb927', 80);
      }
      if (s.t === 50) {
        s.boardX = other.x;
        // teleport above
        this.x = other.x;
        this.y = GROUND_Y - 260;
        this.vx = 0; this.vy = 0;
        // dramatic radial
        ultRadial = { x: this.x, y: this.y + 60, t: 30, color: '#fdb927' };
      }
      if (s.t > 50 && s.t < 90) {
        this.vy = 16;
        if (this.onGround) {
          // SLAM — one-shot
          applyProne(other, 180, 80, true);
          this.shake = 30;
          screenFlash = 24; screenFlashColor = '#fdb927';
          spawnSparks(other.x, GROUND_Y, '#fdb927', 80);
          for (let i = 0; i < 30; i++) {
            const ang = rand() * Math.PI * 2;
            globalParticles.push(new Particle(
              other.x, GROUND_Y,
              Math.cos(ang) * (3 + rand() * 5),
              Math.sin(ang) * (3 + rand() * 5) - 4,
              '#fdb927', 50
            ));
          }
          s.t = 90;
        }
      }
      if (s.t >= 200) this.allOutState = null;
    } else if (s.kind === 'billionaireBarrage') {
      // 0..30: rocket rises behind Bezos; 30..160: cash, gold bars, boxes rain
      // 160..200: final radial
      if (s.t >= 30 && s.t <= 160 && s.t % 4 === 0) {
        // mixed projectile rain across the screen
        const t = rand();
        const xx = 60 + rand() * (W - 120);
        let type = 'cash', color = '#0c8a5e', r = 9, dmg = 6;
        if (t < 0.18) { type = 'boulder'; color = '#c9a040'; r = 11; dmg = 12; } // gold bar = boulder skin
        else if (t < 0.32) { type = 'wrench'; color = '#bcc4cc'; r = 10; dmg = 9; } // package
        projectiles.push(new Projectile({
          x: xx, y: -20,
          vx: (rand() - 0.5) * 2,
          vy: 5 + rand() * 3,
          type, color,
          owner: this, dmg, kb: 5, r,
          life: 240, hasGravity: false, blockMult: 0.15,
        }));
      }
      if (s.t === 170) {
        // Closing one-shot — guaranteed K.O.
        applyProne(other, 90, 0, true);
      }
      if (s.t >= 200) this.allOutState = null;
    } else if (s.kind === 'shadowStorm') {
      // Reworked: clearer choreography in 4 phases.
      //   0-24   : Shadow vanishes off-screen; focus rings tighten on victim
      //   25-100 : 6 discrete strike passes from alternating sides (12 frames
      //            apart), each leaves a slash mark + brief pause-frame
      //   100-130: final wind-up — Shadow appears mid-air behind victim,
      //            a giant white slash mark draws across them
      //   130-180: victim crumples prone, screen flashes red→white
      if (s.t === 1) {
        s.slashes = [];                  // { x,y,angle,life,maxLife } per stroke
        // Shadow vanishes — park off-screen until reappearance
        this.x = -200;
        this.y = GROUND_Y - 30;
        this.vx = 0; this.vy = 0;
        state.hitstop = 8;
      }
      // ---- Phase 1: vanish + focus rings ----
      if (s.t >= 1 && s.t < 25) {
        if (s.t % 6 === 0) {
          const radius = 200 - (s.t * 6);   // tighten
          spawnCastRing(other.x, other.y - 50, '#ff3a3a', radius, 16, 4);
        }
      }
      // ---- Phase 2: strike passes ----
      if (s.t >= 25 && s.t < 100 && (s.t - 25) % 12 === 0) {
        const passIndex = ((s.t - 25) / 12) | 0;   // 0..5
        const dir = (passIndex % 2 === 0) ? 1 : -1;
        // Position Shadow briefly visible for the strike frame
        this.x = other.x - dir * 80;
        this.y = GROUND_Y - 40 - (passIndex * 5);
        this.facing = dir;
        // Slash mark on the victim — random short angle, lasts ~40 frames
        s.slashes.push({
          x: other.x + (rand() - 0.5) * 30,
          y: other.y - 30 - rand() * 50,
          angle: (rand() - 0.5) * 1.4,
          life: 0,
          maxLife: 40,
        });
        spawnHitBurst(other.x + (rand() - 0.5) * 20, other.y - 50, '#ff3a3a', 0.8);
        state.hitstop = 3;                // micro pause per cut
      }
      // ---- Phase 3: final big slash ----
      if (s.t === 100) {
        // Shadow reappears mid-air, posed behind victim
        this.x = other.x - this.facing * 90;
        this.y = GROUND_Y - 90;
        this.vx = 0; this.vy = 0;
      }
      if (s.t === 115) {
        s.slashes.push({
          x: other.x,
          y: other.y - 50,
          angle: -0.5,
          life: 0,
          maxLife: 70,
          big: true,
        });
        spawnHitBurst(other.x, other.y - 50, '#ffffff', 3.0);
        spawnCastRing(other.x, other.y - 50, '#ffffff', 320, 36, 16);
        state.hitstop = 14;
      }
      // ---- Phase 4: knockdown + flash ----
      if (s.t === 130) {
        applyProne(other, 180, 80, true);
        screenFlash = 50; screenFlashColor = '#ff3a3a';
      }
      if (s.t === 145) {
        screenFlash = 30; screenFlashColor = '#ffffff';
      }
      // Tick slash lifetimes
      if (s.slashes) for (const sl of s.slashes) sl.life++;
      if (s.t >= 180) this.allOutState = null;
    } else if (s.kind === 'cataclysm') {
      // Mike vanishes off-screen, then crashes back as meteor
      if (s.t === 1) {
        this.y = -200;
        this.x = other.x;
        this.vx = 0;
        this.vy = 0;
      }
      if (s.t > 30 && s.t < 80) {
        this.vy = 24;
        if (this.onGround) {
          applyProne(other, 180, 80, true);
          this.shake = 40;
          screenFlash = 30; screenFlashColor = '#ff5a2e';
          // 6 shockwaves outward
          for (let i = 0; i < 6; i++) {
            const dir = i < 3 ? -1 : 1;
            projectiles.push(new Projectile({
              x: this.x + dir * 30, y: GROUND_Y - 8,
              vx: dir * (8 + i * 1.5), vy: 0,
              type: 'shockwave', color: '#ff5a2e',
              owner: this, dmg: 0, kb: 6, r: 22 + i * 4,
              life: 60, hasGravity: false, harmless: true,
            }));
          }
          // lava sparks
          for (let i = 0; i < 60; i++) {
            const ang = -rand() * Math.PI;
            globalParticles.push(new Particle(
              other.x + (rand() - 0.5) * 80, GROUND_Y,
              Math.cos(ang) * (3 + rand() * 5),
              Math.sin(ang) * (3 + rand() * 6),
              i % 2 === 0 ? '#ff5a2e' : '#ffd34d', 60
            ));
          }
          s.t = 80;
        }
      }
      if (s.t >= 200) this.allOutState = null;
    } else if (s.kind === 'stormCaller') {
      // sky-darkening flag (used by drawAllOutOverlay); 20 rapid bolts
      s.sky = Math.min(1, s.t / 20);
      if (s.t === 1) s.bolts = 20;
      if (s.t > 20 && s.t < 160 && s.t % 6 === 0 && s.bolts > 0) {
        const tx = other.x + (rand() - 0.5) * 60;
        projectiles.push(new Projectile({
          x: tx, y: -20, vx: 0, vy: 32,
          type: 'bolt', color: '#ffe600',
          owner: this, dmg: 6, kb: 2, r: 18,
          life: 30, hasGravity: false,
        }));
        // trail
        for (let i = 0; i < 6; i++) {
          globalParticles.push(new Particle(
            tx + (rand() - 0.5) * 16, i * (GROUND_Y / 6),
            (rand() - 0.5) * 2, 0, '#ffffff', 14
          ));
        }
        spawnSparks(tx, 0, '#ffffff', 8);
        spawnSparks(tx, GROUND_Y, '#ffe600', 12);
        s.bolts--;
      }
      if (s.t === 170) {
        applyProne(other, 180, 40, true);
      }
      if (s.t >= 200) this.allOutState = null;
    } else if (s.kind === 'flambeFrenzy') {
      // 12 flaming dishes (pin type, orange), then big pan slam
      if (s.t === 1) s.dishes = 12;
      if (s.t > 6 && s.t < 100 && s.t % 7 === 0 && s.dishes > 0) {
        const dir = Math.sign(other.x - this.x) || 1;
        projectiles.push(new Projectile({
          x: this.x + dir * 30, y: this.y - 60 - rand() * 30,
          vx: dir * (9 + rand() * 4),
          vy: -5 - rand() * 4,
          type: 'pin', color: '#ff5a2e',
          owner: this, dmg: 7, kb: 5, r: 11,
          life: 110, hasGravity: true, gravityMult: 0.3,
        }));
        // fire trail
        for (let i = 0; i < 4; i++) {
          globalParticles.push(new Particle(
            this.x + dir * 30, this.y - 60,
            dir * rand() * 4, -rand() * 3,
            i % 2 === 0 ? '#ff5a2e' : '#ffd34d', 20
          ));
        }
        s.dishes--;
      }
      // GIANT PAN
      if (s.t === 130) {
        s.panX = other.x;
        spawnSparks(other.x, GROUND_Y, '#000', 20);
      }
      if (s.t === 145) {
        applyProne(other, 180, 55, true);
        screenFlash = 22; screenFlashColor = '#ff5a2e';
        this.shake = 24;
        spawnSparks(other.x, GROUND_Y, '#ff5a2e', 60);
      }
      if (s.t >= 200) this.allOutState = null;
    } else if (s.kind === 'secretService') {
      // 0..40: spotlight, 40..120: SUV slams across, 120..200: agents jump out
      if (s.t === 1) {
        s.dir = Math.sign(other.x - this.x) || 1;
        s.vanX = s.dir > 0 ? -160 : W + 160;
      }
      if (s.t >= 40) {
        s.vanX += s.dir * 14;
        // van hits opponent
        if (other.proneTimer <= 0 && Math.abs(s.vanX - other.x) < 80) {
          applyProne(other, 180, 80, true);
          this.shake = 24;
          screenFlash = 30; screenFlashColor = '#1e2a52';
          spawnSparks(other.x, GROUND_Y - 30, '#c81e2a', 60);
        }
        // smoke from van
        if (s.t % 3 === 0) {
          globalParticles.push(new Particle(
            s.vanX - s.dir * 40, GROUND_Y - 30,
            -s.dir * 1, -1 - rand() * 2,
            '#888', 40
          ));
        }
      }
      // Agents jump out at end
      if (s.t === 140) {
        s.agentsT = 0;
        s.agents = [];
        for (let i = 0; i < 6; i++) {
          s.agents.push({
            x: s.vanX, y: GROUND_Y,
            vx: (rand() - 0.5) * 6,
            vy: -8 - rand() * 4,
          });
        }
      }
      if (s.t > 140 && s.agents) {
        for (const a of s.agents) {
          a.x += a.vx;
          a.y += a.vy;
          a.vy += 0.6;
          if (a.y > GROUND_Y) a.y = GROUND_Y;
        }
      }
      if (s.t >= 230) this.allOutState = null;
    } else if (s.kind === 'demolitionDay') {
      // bulldozer scrapes in, then wrecking ball swings
      if (s.t === 1) {
        s.dir = Math.sign(other.x - this.x) || 1;
        s.dozerX = s.dir > 0 ? -200 : W + 200;
      }
      if (s.t >= 20 && s.t < 120) {
        s.dozerX += s.dir * 10;
        if (s.dozerX !== undefined && other.proneTimer <= 0 && Math.abs(s.dozerX - other.x) < 70) {
          applyProne(other, 60, 35);
          this.shake = 20;
          spawnSparks(other.x, GROUND_Y, '#d97a1a', 30);
        }
        if (s.t % 6 === 0) {
          spawnSparks(s.dozerX - s.dir * 40, GROUND_Y - 20, '#ffd34d', 6);
        }
      }
      // Wrecking ball arrives
      if (s.t === 130) {
        projectiles.push(new Projectile({
          x: s.dir > 0 ? -40 : W + 40, y: GROUND_Y - 90,
          vx: s.dir * 14, vy: 0,
          type: 'wreckingball', color: '#3a3a40',
          owner: this, dmg: 50, kb: 18, r: 36,
          life: 200, hasGravity: false, blockMult: 0.25,
        }));
      }
      if (s.t === 160) {
        applyProne(other, 180, 30, true);
        screenFlash = 30; screenFlashColor = '#3a3a40';
      }
      if (s.t >= 220) this.allOutState = null;
    } else if (s.kind === 'hollowNuke') {
      // ===== HOLLOW NUKE — 5-phase cinematic =====
      if (s.t === 1) {
        s.dir = this.facing;
        s.killed = false;
        // Gojo holds his charge pose throughout
        s.castStartFrame = frameCount;
      }
      // Phase 1 — inward spiral (denser + slower convergence so it READS)
      if (s.t < 50) {
        const STREAMS = 6;
        for (let i = 0; i < STREAMS; i++) {
          const a = i * (Math.PI * 2 / STREAMS) + s.t * 0.12;
          const dist = Math.max(20, 260 - s.t * 5);
          const sx = this.x + Math.cos(a) * dist;
          const sy = this.y - 60 + Math.sin(a) * dist;
          globalParticles.push(new Particle(
            sx, sy,
            (this.x - sx) * 0.06, (this.y - 60 - sy) * 0.06,
            i % 3 === 0 ? '#ffffff' : (i % 2 === 0 ? '#d04dff' : '#7df9ff'),
            32
          ));
        }
        // Slow build-up glow ring at Gojo
        if (s.t % 4 === 0) {
          spawnCastRing(this.x, this.y - 60, '#d04dff', 80, 22, 5);
        }
      }
      if (s.t === 50) {
        spawnCastRing(this.x, this.y - 60, '#d04dff', 260, 36, 14);
        spawnCastRing(this.x, this.y - 60, '#7df9ff', 200, 30, 10);
        spawnCastRing(this.x, this.y - 60, '#ffffff', 140, 24, 6);
        spawnHitBurst(this.x, this.y - 60, '#d04dff', 3.5);
        screenFlash = 30; screenFlashColor = '#d04dff';
        state.hitstop = 6;
      }
      // Phase 2 — three orbiting orbs (slower, BIGGER, more dramatic)
      if (s.t >= 50 && s.t < 100) {
        const k = (s.t - 50) / 50;
        s.orbR = 22 + k * 30;                                    // was 14..36, now 22..52
        const a0 = s.t * 0.18;
        s.orbs = [];
        for (let i = 0; i < 3; i++) {
          const a = a0 + i * (Math.PI * 2 / 3);
          s.orbs.push({
            x: this.x + Math.cos(a) * (60 + k * 40),
            y: this.y - 60 + Math.sin(a) * (36 + k * 14),
            color: i === 0 ? '#7df9ff' : (i === 1 ? '#ff2020' : '#d04dff'),
          });
        }
        // Trail orbs leave behind themselves
        if (s.t % 2 === 0) {
          for (const o of s.orbs) {
            globalParticles.push(new Particle(o.x, o.y, 0, 0, o.color, 18));
          }
        }
      }
      // Phase 3 — fire the giga-beam (delayed slightly to let orbs read)
      if (s.t === 100) {
        spawnHitBurst(this.x, this.y - 60, '#ffffff', 5.0);
        spawnCastRing(this.x, this.y - 60, '#ffffff', 420, 42, 22);
        spawnCastRing(this.x, this.y - 60, '#d04dff', 520, 48, 16);
        spawnCastRing(this.x, this.y - 60, '#7df9ff', 360, 40, 14);
        screenFlash = 70; screenFlashColor = '#ffffff';
        state.hitstop = 20;
        projectiles.push(new Projectile({
          x: this.x + s.dir * 30, y: this.y - 60,
          vx: 0, vy: 0,
          type: 'purpleBeam', color: '#d04dff',
          owner: this, dmg: 0, kb: 0, r: 80,
          life: 90, hasGravity: false, harmless: true,
          beamLen: W, beamH: 360, beamDir: s.dir,
        }));
      }
      // Phase 3+4 — frequent shockwave rings outward
      if (s.t >= 100 && s.t < 200 && s.t % 12 === 0) {
        spawnCastRing(this.x, this.y - 60, '#d04dff', 700, 60, 12);
        spawnCastRing(this.x, this.y - 60, '#7df9ff', 540, 50, 8);
      }
      if (s.t >= 100 && s.t < 220 && !s.killed) {
        if (other.proneTimer <= 0) {
          applyProne(other, 240, 0, true);
          spawnHitBurst(other.x, other.y - 50, '#d04dff', 6.0);
          spawnCastRing(other.x, other.y - 50, '#d04dff', 360, 44, 20);
          spawnCastRing(other.x, other.y - 50, '#ffffff', 280, 38, 14);
          s.killed = true;
          state.hitstop = 16;
        }
      }
      // Phase 4 — denser nuke spray + mushroom silhouette
      if (s.t >= 140 && s.t < 210 && s.t % 2 === 0) {
        for (let i = 0; i < 8; i++) {
          const a = rand() * Math.PI * 2;
          const sp = 6 + rand() * 10;
          globalParticles.push(new Particle(
            this.x + s.dir * 120 + (rand() - 0.5) * 260,
            this.y - 60 + (rand() - 0.5) * 240,
            Math.cos(a) * sp, Math.sin(a) * sp - 2,
            rand() < 0.5 ? '#d04dff' : '#ffffff',
            55 + rand() * 30
          ));
        }
      }
      // Phase 5 — final white-out flash + banner
      if (s.t === 200) {
        screenFlash = 90; screenFlashColor = '#ffffff';
        ultBanner = { name: 'INFINITE COLLAPSE', t: 100, color: '#d04dff', side: 'left' };
      }
      if (s.t >= 260) this.allOutState = null;
    } else if (s.kind === 'kernelPanic') {
      // ===== KERNEL PANIC — datamosh barrage → BSOD slam =====
      //   1      : screen corrupts, Hacker parks beside the victim
      //   1..45  : "compiling" — green glitch bands + tightening rings
      //   45..150: data-spike barrage homing onto the victim
      //   150    : BSOD — full-screen crash flash + guaranteed K.O. slam
      //   150..200: victim prone, end
      if (s.t === 1) {
        s.dir = Math.sign(other.x - this.x) || this.facing;
        this.x = other.x - s.dir * 90;
        this.y = GROUND_Y;
        this.vx = 0; this.vy = 0;
        screenFlash = 36; screenFlashColor = '#39ff14';
        state.hitstop = 10;
      }
      // Phase 1 — corruption build-up
      if (s.t < 45) {
        if (s.t % 5 === 0) {
          spawnCastRing(other.x, other.y - 50, '#39ff14',
                        Math.max(40, 220 - s.t * 4), 16, 5);
        }
        // glitch confetti around the victim
        for (let i = 0; i < 3; i++) {
          globalParticles.push(new Particle(
            other.x + (rand() - 0.5) * 120, other.y - 30 - rand() * 80,
            (rand() - 0.5) * 4, (rand() - 0.5) * 4,
            rand() < 0.5 ? '#39ff14' : '#aaffaa', 16 + rand() * 10));
        }
        if (s.t % 9 === 0) { screenFlash = Math.max(screenFlash, 10); screenFlashColor = '#39ff14'; }
      }
      // Phase 2 — homing data-spike barrage from screen edges
      if (s.t >= 45 && s.t < 150 && s.t % 6 === 0) {
        const edge = rand() < 0.5 ? -40 : W + 40;
        projectiles.push(new Projectile({
          x: edge, y: 40 + rand() * (GROUND_Y - 120),
          vx: (edge < 0 ? 1 : -1) * 7, vy: (rand() - 0.5) * 4,
          type: 'glitch', color: '#39ff14',
          owner: this, dmg: 14, kb: 6, r: 12,
          life: 150, hasGravity: false, homing: 2.0,
        }));
        if (s.t % 18 === 0) spawnSparks(other.x, other.y - 50, '#39ff14', 12);
      }
      // Phase 3 — BLUE/GREEN SCREEN OF DEATH crash + one-shot slam
      if (s.t === 150) {
        screenFlash = 70; screenFlashColor = '#1060ff';
        state.hitstop = 16;
        applyProne(other, 180, 80, true);
        spawnHitBurst(other.x, other.y - 50, '#39ff14', 3.4);
        spawnCastRing(other.x, other.y - 50, '#1060ff', 300, 30, 14);
        spawnCastRing(other.x, other.y - 50, '#ffffff', 200, 24, 8);
        for (let i = 0; i < 40; i++) {
          const ang = rand() * Math.PI * 2;
          globalParticles.push(new Particle(
            other.x, other.y - 40,
            Math.cos(ang) * (3 + rand() * 6), Math.sin(ang) * (3 + rand() * 6) - 3,
            rand() < 0.5 ? '#39ff14' : '#1060ff', 50));
        }
        ultBanner = { name: 'KERNEL PANIC', t: 100, color: '#39ff14',
                      side: this === player ? 'left' : 'right' };
      }
      if (s.t >= 200) this.allOutState = null;
    }
  }

  draw(ctx) {
    // Math.random (NOT rand) — this runs every rAF, not every sim frame.
    // Using the seeded rand() here would advance rngState at the render rate
    // and de-sync between peers whose rAF rates drift even slightly.
    // SETTINGS.shake scales the amplitude (0=off, 1=full).
    const shakeAmp = this.shake * SETTINGS.shake;
    const sx = (Math.random() - 0.5) * shakeAmp;
    const sy = (Math.random() - 0.5) * shakeAmp;
    // Walk bob
    const walkBob = this.onGround && Math.abs(this.vx) > 0.5 ? Math.sin(this.walkPhase) * 2.2 : 0;
    // Idle breathing
    const breath = this.onGround && Math.abs(this.vx) < 0.4 ? Math.sin(this.breathPhase) * 0.8 : 0;
    // Land squash
    const squashY = this.landSquash > 0 ? 1 - (this.landSquash / 8) * 0.18 : 1;
    const squashX = this.landSquash > 0 ? 1 + (this.landSquash / 8) * 0.12 : 1;

    ctx.save();
    ctx.translate(this.x + sx, this.y + sy);
    ctx.rotate(this.moveLean);                 // lean in world-space (not affected by facing)
    ctx.scale(this.facing * squashX, squashY);
    ctx.translate(0, walkBob + breath);

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 2 - walkBob - breath, 28, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const flash = this.hitFlash > 0 || this.invuln > 0;
    drawFighterSprite(ctx, this, flash);

    ctx.restore();

    // Counter parry: cyan ring + floating "PARRY!" text
    if (this.counterParried > 0) {
      const k = this.counterParried / 12;
      ctx.save();
      ctx.strokeStyle = '#7df9ff';
      ctx.globalAlpha = k;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y - 50, 36 + (1 - k) * 18, 56 + (1 - k) * 18, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.font = 'bold 26px Impact';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7df9ff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 5;
      const ty = this.y - 130 - (1 - k) * 20;
      ctx.strokeText('PARRY!', this.x, ty);
      ctx.fillText('PARRY!', this.x, ty);
      ctx.restore();
    }

    // Gojo Blue-aura ring + mode badge (drawn in canvas coords, no scale)
    if (this.id === 'gojo') {
      // Blue aura
      if (this.gojoBlueTimer > 0) {
        ctx.save();
        const pulse = (Math.sin(frameCount * 0.18) + 1) * 0.5;
        ctx.strokeStyle = '#7df9ff';
        ctx.lineWidth = 2 + pulse * 2;
        ctx.globalAlpha = 0.55 + pulse * 0.3;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 46, 38, 60, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y - 46, 50 + pulse * 6, 76 + pulse * 6, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      // Mode badge above head
      ctx.save();
      const label = this.gojoMode === 'blue' ? 'AZURE' : 'CRIMSON';
      const color = this.gojoMode === 'blue' ? '#7df9ff' : '#ff5050';
      ctx.font = 'bold 14px Impact';
      ctx.textAlign = 'center';
      ctx.fillStyle = color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(label, this.x, this.y - 120);
      ctx.fillText(label, this.x, this.y - 120);
      ctx.restore();
    }
  }
}

// ===== Sprite drawing =====
function drawFighterSprite(ctx, f, flash) {
  const skin = flash ? '#ffffff' : f.skin;
  const outfit = flash ? '#ffffff' : f.outfit;
  const accent = flash ? '#ffffff' : f.accent;
  const hair = flash ? '#ffffff' : f.hair;

  const bodyWidth = f.bulky ? 50 : 44;
  const halfBody = bodyWidth / 2;

  const isDashPunch = f.attackKind === 'dashpunch' && f.attackTimer > 0;
  const lean = isDashPunch ? -5 : 0;
  const plantBend = 0;

  // ===== Leg animation =====
  // Three modes:
  //   walking  — grounded + moving + free → step cycle with horizontal sway + lift
  //   airborne — !grounded + free       → rising tucks knees up, falling extends legs
  //   idle     — everything else        → plain standing legs
  // We keep each leg geometrically "complete" by computing the shaft length so
  // the foot top always sits at shaftBottom and the foot extends 2px below.
  const grounded = f.onGround;
  const busy = !!f.attackKind || !!f.specialState || !!f.ultimateState || !!f.allOutState || f.taunting > 0;
  const walking = grounded && !busy && Math.abs(f.vx || 0) > 0.5;
  const airborne = !grounded && !busy;
  const wp = f.walkPhase || 0;

  let backSwingX = 0, backLift = 0, frontSwingX = 0, frontLift = 0;
  let backShortenTop = 0, frontShortenTop = 0;   // raises the TOP of the shaft when knees tuck

  if (walking) {
    // Slightly wider stride (5 → 6) for more readable running.
    backSwingX  = Math.cos(wp) * 6;
    backLift    = Math.max(0, Math.sin(wp)) * 7;
    frontSwingX = Math.cos(wp + Math.PI) * 6;
    frontLift   = Math.max(0, Math.sin(wp + Math.PI)) * 7;
  } else if (airborne) {
    // Rising: knees pulled toward chest (legs short, lifted). Falling: legs
    // extended downward (also lifted off the ground line so they don't sit
    // through the floor while mid-air). Add small vx-driven horizontal trail.
    const rising = (f.vy || 0) < 0;
    const speedScale = Math.max(0, Math.min(1, Math.abs(f.vy || 0) / 14));
    if (rising) {
      // Knee tuck — raise the top of the leg shaft so the leg looks bent
      backShortenTop  = 10 + speedScale * 8;
      frontShortenTop = 12 + speedScale * 10;
      backLift  = 18 + speedScale * 8;
      frontLift = 22 + speedScale * 10;
    } else {
      // Trailing legs as the fighter falls — legs extend, slight back-trail
      backLift  = 4 + speedScale * 4;
      frontLift = 2 + speedScale * 2;
    }
    // Wind drag: lean legs back opposite to vx (vx > 0 → feet trail to the left).
    const trail = -Math.sign(f.vx || 0) * Math.min(6, Math.abs(f.vx || 0));
    backSwingX  = trail;
    frontSwingX = trail * 0.6;
  }

  // Back leg shaft + attached foot. Shaft top = -40 + shortenTop, bottom = -lift,
  // so the shaft height = (40 - shortenTop) - lift.
  const backTop    = -40 + plantBend + backShortenTop;
  const backHeight = Math.max(2, 40 - plantBend - backShortenTop - backLift);
  ctx.fillStyle = outfit;
  ctx.fillRect(-18 + backSwingX, backTop, 14, backHeight);
  ctx.fillStyle = accent;
  ctx.fillRect(-20 + backSwingX, -backLift - 6, 18, 8);

  // Front leg shaft + attached foot.
  const frontTop    = -40 + frontShortenTop;
  const frontHeight = Math.max(2, 40 - frontShortenTop - frontLift);
  ctx.fillStyle = outfit;
  ctx.fillRect(4 + frontSwingX, frontTop, 14, frontHeight);
  ctx.fillStyle = accent;
  ctx.fillRect(2 + frontSwingX, -frontLift - 6, 18, 8);

  ctx.save();
  ctx.translate(lean, 0);

  // Body
  ctx.fillStyle = outfit;
  ctx.fillRect(-halfBody, -78 + plantBend, bodyWidth, 42);

  if (f.id === 'bezos') {
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -78 + plantBend, 8, 30);
    ctx.fillStyle = accent;
    ctx.fillRect(-3, -70 + plantBend, 6, 14);
  } else if (f.id === 'chef') {
    // double-breasted chef coat
    ctx.fillStyle = '#000';
    ctx.fillRect(-2, -78 + plantBend, 4, 30);
    ctx.fillStyle = '#999';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-8, -72 + plantBend + i * 7, 3, 3);
      ctx.fillRect(5, -72 + plantBend + i * 7, 3, 3);
    }
  } else if (f.id === 'trump') {
    // suit with red tie
    ctx.fillStyle = '#fff';
    ctx.fillRect(-4, -78 + plantBend, 8, 14);
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-4, -64 + plantBend);
    ctx.lineTo(4, -64 + plantBend);
    ctx.lineTo(2, -38 + plantBend);
    ctx.lineTo(-2, -38 + plantBend);
    ctx.closePath();
    ctx.fill();
  } else if (f.id === 'bob') {
    // overalls straps
    ctx.fillStyle = accent;
    ctx.fillRect(-12, -78 + plantBend, 6, 24);
    ctx.fillRect(6, -78 + plantBend, 6, 24);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-2, -58 + plantBend, 4, 4);
  } else {
    ctx.fillStyle = accent;
    ctx.fillRect(-halfBody, -78 + plantBend, bodyWidth, 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(f.number || '?', 0, -52 + plantBend);
  }

  // Arms
  const armSwing = (f.attackKind === 'punch' || f.attackKind === 'dashpunch') && f.attackTimer > 0 ? 1 : 0;
  const heavySwing = f.attackKind === 'heavypunch' && f.attackTimer > 0;
  ctx.fillStyle = skin;
  if (f.noArms) {
    // Idle-prop draws its own arms (e.g. overhead press) — skip defaults so we don't double up.
  } else if (f.castPose === 'charge') {
    ctx.fillRect(-halfBody - 4, -114, 8, 36);
    ctx.fillRect(-halfBody - 10, -120, 14, 12);
    ctx.fillRect(halfBody - 4, -114, 8, 36);
    ctx.fillRect(halfBody - 4, -120, 14, 12);
  } else if (f.castPose === 'cast') {
    ctx.fillRect(-halfBody - 4, -76 + plantBend, 8, 30);
    ctx.fillRect(halfBody - 4, -70, 46, 10);
    ctx.fillRect(halfBody + 36, -76, 16, 22);
  } else if (heavySwing) {
    // Heavy punch: thicker forward arm, oversized fist, yellow energy glow.
    // Back arm tucked low behind the body for that wind-up follow-through.
    ctx.fillRect(-halfBody, -68 + plantBend, 8, 22);            // back arm pulled in
    const reach = 54;
    ctx.fillRect(halfBody - 4, -72, reach, 14);                 // thick forward arm
    ctx.fillRect(halfBody + reach - 8, -80, 22, 22);            // huge fist
    // Yellow energy aura around the fist
    ctx.fillStyle = 'rgba(255, 211, 77, 0.65)';
    ctx.fillRect(halfBody + reach - 12, -86, 30, 32);
    ctx.fillStyle = '#fff';
    ctx.fillRect(halfBody + reach - 6, -76, 14, 8);              // bright impact band
  } else {
    // Default arm pose with three live variations:
    //   - punching   → forward arm extends with fist
    //   - walking    → arms counter-swing with the leg cycle
    //   - airborne   → arms raise/spread based on vertical velocity
    if (armSwing) {
      // Back arm pulled in, front arm thrust forward — same as before
      ctx.fillRect(-halfBody - 4, -76 + plantBend, 8, 30);
      const reach = f.attackKind === 'dashpunch' ? 50 : 38;
      ctx.fillRect(halfBody - 4, -70, reach, 8);
      ctx.fillRect(halfBody + reach - 10, -74, 14, 14);
    } else if (walking) {
      // Counter-swing: when the front leg is forward, the back arm is forward.
      // Driven by the same walkPhase as the legs so it stays in sync.
      const armPhase = Math.cos(wp) * 6;   // -6..+6 px horizontal swing
      const armLift  = Math.max(0, Math.sin(wp)) * 4;
      // Back arm (anti-phase with the back leg)
      ctx.fillRect(-halfBody - 4 - armPhase, -76 + plantBend - armLift, 8, 30);
      // Front arm
      ctx.fillRect(halfBody - 4 + armPhase, -76 + plantBend + armLift, 8, 30);
    } else if (airborne) {
      // Vy-driven arm pose: rising = arms raise overhead-ish; falling = arms
      // splay out for balance. Magnitudes scaled by vertical speed.
      const vy = f.vy || 0;
      const rising = vy < 0;
      const mag = Math.max(0, Math.min(1, Math.abs(vy) / 14));
      if (rising) {
        // Both arms swept up: shafts shifted up + outward
        const shaftTop = -86 - mag * 10;
        ctx.fillRect(-halfBody - 6, shaftTop, 8, 26 + mag * 8);
        ctx.fillRect(halfBody - 2, shaftTop, 8, 26 + mag * 8);
      } else {
        // Falling: arms angled outward for balance — wider stance + slight droop
        const spread = 4 + mag * 6;
        ctx.fillRect(-halfBody - 4 - spread, -72 + plantBend, 8, 28);
        ctx.fillRect(halfBody - 4 + spread, -72 + plantBend, 8, 28);
      }
    } else if (state.phase === 'fighting' && f.hitstun <= 0 &&
               f.parryStance <= 0 && f.taunting <= 0) {
      // Combat stance — a proper boxing guard: both arms make an L (upper arm
      // down from the shoulder, forearm back up to a fist held by the face).
      // Fists stay near the head — not jutting forward — so it reads as a
      // ready guard, with a tiny breathing bob for life.
      const bob = Math.sin((f.breathPhase || 0) + (f === player ? 0 : 1.5)) * 1.2;
      const y = plantBend + bob;

      // Rear arm (further from the opponent): tucked tight to the torso.
      ctx.fillRect(-halfBody - 2, -74 + y, 8, 18);   // upper arm, shoulder→elbow
      ctx.fillRect(-halfBody + 1, -92 + y, 8, 20);   // forearm, elbow→up
      ctx.fillRect(-halfBody + 0, -97 + y, 11, 11);  // rear fist by the cheek

      // Lead arm (toward the opponent): slightly more forward, fist at chin.
      ctx.fillRect(halfBody - 6, -74 + y, 8, 18);    // upper arm
      ctx.fillRect(halfBody - 3, -92 + y, 9, 20);    // forearm up
      ctx.fillRect(halfBody + 2, -98 + y, 12, 12);   // lead fist at chin height
    } else {
      // Idle stance — original arms
      ctx.fillRect(-halfBody - 4, -76 + plantBend, 8, 30);
      ctx.fillRect(halfBody - 4, -76, 8, 30);
    }
  }

  // Head
  ctx.fillStyle = skin;
  ctx.fillRect(-16, -100 + plantBend, 32, 26);

  // Hair / headwear
  if (f.hat === 'chef') {
    // big white chef toque
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-16, -110 + plantBend, 32, 12);
    ctx.beginPath();
    ctx.arc(-12, -116 + plantBend, 8, 0, Math.PI * 2);
    ctx.arc(0, -118 + plantBend, 10, 0, Math.PI * 2);
    ctx.arc(12, -116 + plantBend, 8, 0, Math.PI * 2);
    ctx.fill();
  } else if (f.hat === 'hardhat') {
    // yellow construction hat
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(0, -100 + plantBend, 18, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-20, -102 + plantBend, 40, 4);
    ctx.fillStyle = '#1a0a02';
    ctx.fillRect(-10, -110 + plantBend, 20, 4);
  } else if (!f.bald) {
    ctx.fillStyle = hair;
    if (f.id === 'trump') {
      // iconic swept hair
      ctx.fillRect(-18, -106 + plantBend, 36, 10);
      ctx.beginPath();
      ctx.moveTo(-18, -100 + plantBend);
      ctx.lineTo(-22, -94 + plantBend);
      ctx.lineTo(-18, -92 + plantBend);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(-16, -102 + plantBend, 32, 8);
    }
  }

  // Mask (ninja or blindfold)
  if (f.mask) {
    ctx.fillStyle = f.maskColor || '#000';
    ctx.fillRect(-16, -94 + plantBend, 32, 8);
    // Eye slits / glow
    if (f.id === 'gojo') {
      // faint cyan glow through the blindfold
      ctx.fillStyle = 'rgba(125, 249, 255, 0.55)';
      ctx.fillRect(-12, -91 + plantBend, 4, 2);
      ctx.fillRect(8, -91 + plantBend, 4, 2);
    } else {
      ctx.fillStyle = accent;
      ctx.fillRect(-12, -90 + plantBend, 4, 3);
      ctx.fillRect(8, -90 + plantBend, 4, 3);
    }
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(-8, -90 + plantBend, 4, 4);
    ctx.fillRect(4, -90 + plantBend, 4, 4);
  }

  if (f.id === 'bezos') {
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.strokeRect(-12, -92 + plantBend, 8, 6);
    ctx.strokeRect(4, -92 + plantBend, 8, 6);
    ctx.beginPath();
    ctx.moveTo(-4, -89 + plantBend); ctx.lineTo(4, -89 + plantBend);
    ctx.stroke();
  }

  // Mouth
  if (!f.mask) {
    ctx.fillStyle = '#000';
    if (f.taunting > 0) {
      ctx.fillRect(-6, -80 + plantBend, 12, 2);
    } else if (f.attackTimer > 0) {
      ctx.fillRect(-7, -80 + plantBend, 14, 4);
    } else {
      ctx.fillRect(-5, -80 + plantBend, 10, 2);
    }
  }

  // Parry stance flash (cyan glow around fighter)
  if (f.parryStance > 0 || f.parryFlash > 0) {
    const k = Math.max(f.parryStance / 15, f.parryFlash / 20);
    ctx.save();
    ctx.strokeStyle = '#7df9ff';
    ctx.globalAlpha = 0.45 + 0.45 * k;
    ctx.lineWidth = 3 + 3 * k;
    ctx.beginPath();
    ctx.ellipse(0, -50, 40, 60, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // Parry lockout (red staggered tint)
  if (f.parryLockout > 0) {
    ctx.fillStyle = `rgba(255, 60, 60, ${0.4 * f.parryLockout / 30})`;
    ctx.fillRect(-halfBody - 4, -104 + plantBend, bodyWidth + 8, 110);
  }

  // Ultimate-active aura
  if (f.ultimateState || f.invuln > 20) {
    ctx.strokeStyle = '#ffd34d';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;
    ctx.strokeRect(-halfBody - 4, -104 + plantBend, bodyWidth + 8, 110);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// Roster portrait
// Tracked portrait canvases — re-rendered every frame while the menu is open.
const portraitRegistry = [];   // [{canvas, char}]

function drawPortrait(canvasEl, char, frame) {
  const pctx = canvasEl.getContext('2d');
  pctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  pctx.save();
  pctx.translate(canvasEl.width / 2, canvasEl.height - 4);
  pctx.scale(0.55, 0.55);
  const fakeF = {
    ...char,
    attackTimer: 0, taunting: 0, blocking: false, hitFlash: 0, facing: 1,
    invuln: 0, ultimateState: null, allOutState: null, proneTimer: 0, walkPhase: 0,
    moveLean: 0, breathPhase: frame * 0.04, idlePhase: frame || 0,
    noArms: char.idle === 'flex',
  };
  drawFighterSprite(pctx, fakeF, false);
  // Idle prop layered on top, sized to match the 0.55 scale
  drawIdleProp(pctx, char, frame || 0);
  pctx.restore();
}

function drawIdleProp(pctx, char, f) {
  const id = char.idle;
  if (!id) return;
  pctx.save();
  // We're already translated to fighter base & scaled — these props use local fighter coords.
  if (id === 'dribble') {
    // Bouncing basketball at the player's hand
    const t = f * 0.18;
    const bounce = Math.abs(Math.sin(t)) * 18;
    pctx.translate(36, -10 - bounce);
    pctx.fillStyle = '#d9742a';
    pctx.beginPath(); pctx.arc(0, 0, 8, 0, Math.PI * 2); pctx.fill();
    pctx.strokeStyle = '#1a0a02'; pctx.lineWidth = 1.5;
    pctx.beginPath(); pctx.moveTo(-8, 0); pctx.lineTo(8, 0); pctx.stroke();
    pctx.beginPath(); pctx.moveTo(0, -8); pctx.lineTo(0, 8); pctx.stroke();
  } else if (id === 'count') {
    // Fanned cash stack flicking
    const flick = Math.sin(f * 0.18);
    pctx.translate(34, -50);
    pctx.rotate(flick * 0.3);
    for (let i = 0; i < 5; i++) {
      pctx.fillStyle = '#0c8a5e';
      pctx.fillRect(-i, -10 + i * 2, 14, 10);
      pctx.fillStyle = '#e8e0a0';
      pctx.fillRect(-i + 2, -8 + i * 2, 10, 6);
    }
  } else if (id === 'blink') {
    // Red mask gleam, blinks
    const blink = ((f % 90) < 6) ? 0 : 1;
    pctx.fillStyle = `rgba(204, 34, 34, ${blink * 0.9})`;
    pctx.fillRect(-12, -90, 4, 3);
    pctx.fillRect(8, -90, 4, 3);
    // little smoke wisps
    for (let i = 0; i < 3; i++) {
      pctx.globalAlpha = 0.18;
      pctx.fillStyle = '#222';
      pctx.beginPath();
      pctx.arc(-30 + i * 30, -110 - (f + i * 13) % 30, 6, 0, Math.PI * 2);
      pctx.fill();
    }
    pctx.globalAlpha = 1;
  } else if (id === 'flex') {
    // Overhead barbell press. Bar bobs up/down with the press; both arms
    // are drawn extended straight up gripping the bar; plates on either end.
    const press = Math.sin(f * 0.08);                 // -1 (deep) .. 1 (locked out)
    const barY = -118 - press * 8;                   // higher when locked out
    const barX = 0;
    // === Arms: both straight up from shoulders to the bar ===
    pctx.fillStyle = char.skin;
    pctx.fillRect(-26, -78, 8, barY + 78 + 4);       // back arm
    pctx.fillRect( 18, -78, 8, barY + 78 + 4);       // front arm
    // Hand wraps gripping the bar
    pctx.fillStyle = '#1a1208';
    pctx.fillRect(-28, barY - 1, 12, 5);
    pctx.fillRect( 16, barY - 1, 12, 5);
    // === Bar ===
    pctx.fillStyle = '#9aa4ad';
    pctx.fillRect(barX - 42, barY, 84, 4);
    pctx.fillStyle = '#bcc4cc';
    pctx.fillRect(barX - 42, barY, 84, 1.4);          // highlight
    // === Plates on each end (two discs per side) ===
    for (let side = -1; side <= 1; side += 2) {
      const cx = barX + side * 44;
      // outer big plate
      pctx.fillStyle = '#0a0a0a';
      pctx.beginPath(); pctx.arc(cx, barY + 2, 9, 0, Math.PI * 2); pctx.fill();
      pctx.fillStyle = '#1a1a20';
      pctx.beginPath(); pctx.arc(cx, barY + 2, 7, 0, Math.PI * 2); pctx.fill();
      pctx.fillStyle = '#c81e2a';
      pctx.beginPath(); pctx.arc(cx, barY + 2, 2.5, 0, Math.PI * 2); pctx.fill();
      // smaller inner plate
      const ix = cx - side * 5;
      pctx.fillStyle = '#1a1a20';
      pctx.beginPath(); pctx.arc(ix, barY + 2, 5, 0, Math.PI * 2); pctx.fill();
    }
    // Strain shimmer above the bar at the top of the press
    if (press > 0.7) {
      pctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
      for (let i = 0; i < 4; i++) {
        const sx = barX - 30 + i * 18;
        pctx.fillRect(sx, barY - 6, 8, 2);
      }
    }
  } else if (id === 'sparks') {
    // 3 yellow sparks orbiting head
    for (let i = 0; i < 3; i++) {
      const a = f * 0.1 + i * (Math.PI * 2 / 3);
      const x = Math.cos(a) * 24;
      const y = -90 + Math.sin(a) * 14;
      pctx.fillStyle = '#ffe600';
      pctx.beginPath();
      pctx.moveTo(x, y - 5);
      pctx.lineTo(x + 3, y);
      pctx.lineTo(x, y + 5);
      pctx.lineTo(x - 3, y);
      pctx.closePath();
      pctx.fill();
    }
  } else if (id === 'toss') {
    // Tossed mini pin going up and down
    const phase = (f % 80) / 80;
    const yy = -60 - Math.sin(phase * Math.PI) * 50;
    pctx.translate(30, yy);
    pctx.rotate(phase * Math.PI * 2);
    pctx.fillStyle = '#e6c089';
    pctx.fillRect(-14, -4, 28, 8);
    pctx.fillStyle = '#a67039';
    pctx.fillRect(-17, -3, 4, 6);
    pctx.fillRect(13, -3, 4, 6);
  } else if (id === 'thumbs') {
    // Trump idle: holding a waving American flag in his right hand. (No thumbs-up.)
    const bob = Math.sin(f * 0.1) * 2;

    pctx.save();
    pctx.translate(34, -56 + bob);

    // Pole
    pctx.fillStyle = '#9aa4ad';
    pctx.fillRect(-1, -36, 2, 56);
    // Gold knob on top
    pctx.fillStyle = '#ffd34d';
    pctx.beginPath(); pctx.arc(0, -38, 2.4, 0, Math.PI * 2); pctx.fill();

    // Flag (a bit bigger now that it's the only prop)
    const flagW = 28, flagH = 18;
    const wave = (yy) => Math.sin(f * 0.18 + yy * 0.5) * 1.6;
    // 7 red/white stripes
    for (let i = 0; i < 7; i++) {
      const sy = -36 + i * (flagH / 7);
      pctx.fillStyle = (i % 2 === 0) ? '#c81e2a' : '#ffffff';
      pctx.fillRect(1 + wave(i), sy, flagW, flagH / 7 + 0.7);
    }
    // Blue canton
    pctx.fillStyle = '#1e2a52';
    pctx.fillRect(1 + wave(0), -36, flagW * 0.45, flagH * 0.5);
    // Tiny white stars
    pctx.fillStyle = '#ffffff';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        pctx.fillRect(2.5 + wave(r) + c * 2.6, -33 + r * 2.6, 0.9, 0.9);
      }
    }

    // Fist gripping the pole
    pctx.fillStyle = char.skin;
    pctx.beginPath(); pctx.ellipse(0, 20, 6, 5, 0, 0, Math.PI * 2); pctx.fill();
    // Suit cuff
    pctx.fillStyle = char.outfit;
    pctx.fillRect(-5, 20, 10, 6);
    pctx.fillStyle = '#fff';
    pctx.fillRect(-5, 25, 10, 1);
    pctx.restore();
  } else if (id === 'tap') {
    // Wrench tapping against palm
    const phase = Math.sin(f * 0.2);
    pctx.translate(34, -55 + phase * 4);
    pctx.fillStyle = '#9aa4ad';
    pctx.fillRect(-2, -2, 4, 22);
    pctx.fillStyle = '#bcc4cc';
    pctx.beginPath();
    pctx.arc(0, -8, 6, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillStyle = '#000';
    pctx.beginPath();
    pctx.arc(0, -8, 2.5, 0, Math.PI * 2);
    pctx.fill();
  } else if (id === 'sixeyes') {
    // 6 stars (alternating cyan/violet) orbit Gojo's head
    for (let i = 0; i < 6; i++) {
      const a = f * 0.06 + i * (Math.PI * 2 / 6);
      const x = Math.cos(a) * 30;
      const y = -90 + Math.sin(a) * 18;
      pctx.fillStyle = i % 2 === 0 ? '#7df9ff' : '#d04dff';
      pctx.beginPath();
      pctx.moveTo(x, y - 5);
      pctx.lineTo(x + 4, y);
      pctx.lineTo(x, y + 5);
      pctx.lineTo(x - 4, y);
      pctx.closePath();
      pctx.fill();
    }
    // Soft blindfold pulse glow
    const pulse = (Math.sin(f * 0.1) + 1) * 0.5;
    pctx.fillStyle = `rgba(125, 249, 255, ${0.18 + pulse * 0.18})`;
    pctx.fillRect(-18, -96, 36, 12);
  }
  pctx.restore();
}

function renderPortraits() {
  // Called every frame while the menu is visible
  for (const r of portraitRegistry) {
    drawPortrait(r.canvas, r.char, frameCount);
  }
}

// ===== Particles =====
class Particle {
  constructor(x, y, vx, vy, color, life) {
    this.x = x; this.y = y;
    this.vx = vx; this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.25;
    this.life--;
  }
  draw(ctx) {
    ctx.globalAlpha = this.life / this.maxLife;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
    ctx.globalAlpha = 1;
  }
}

const globalParticles = [];
// Particle gating helper. Always called per attempted spawn, in BOTH branches,
// so rand() is consumed deterministically across peers regardless of the
// local particle setting. Returns true if this particular particle should
// actually be pushed to the global list.
function shouldDrawParticle(i) {
  const mode = SETTINGS.particles;
  if (mode === 'off') return false;
  if (mode === 'low') return (i & 1) === 0;             // half the particles
  if (SETTINGS.fastMode) return (i & 1) === 0;          // fast mode → half too
  return true;
}

function spawnSparks(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const ang = rand() * Math.PI * 2;
    const sp = 2 + rand() * 4;
    const life = 20 + rand() * 10;
    if (!shouldDrawParticle(i)) continue;
    globalParticles.push(new Particle(
      x, y,
      Math.cos(ang) * sp, Math.sin(ang) * sp - 1,
      color, life
    ));
  }
}

// Bigger 3-tone burst: white core + colored ring + secondary streaks
function spawnHitBurst(x, y, color, intensity = 1) {
  const coreN = Math.round(8 * intensity);
  const ringN = Math.round(16 * intensity);
  const tailN = Math.round(6 * intensity);
  for (let i = 0; i < coreN; i++) {
    const ang = rand() * Math.PI * 2;
    const sp = 1 + rand() * 2;
    const life = 14 + rand() * 6;
    if (!shouldDrawParticle(i)) continue;
    globalParticles.push(new Particle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 0.5, '#ffffff', life));
  }
  for (let i = 0; i < ringN; i++) {
    const ang = (i / ringN) * Math.PI * 2 + rand() * 0.2;
    const sp = 3 + rand() * 4;
    const life = 22 + rand() * 10;
    if (!shouldDrawParticle(i)) continue;
    globalParticles.push(new Particle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 1, color, life));
  }
  for (let i = 0; i < tailN; i++) {
    const ang = rand() * Math.PI * 2;
    const sp = 5 + rand() * 3;
    const life = 34 + rand() * 14;
    if (!shouldDrawParticle(i)) continue;
    globalParticles.push(new Particle(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 2, color, life));
  }
}

// Expanding ring overlay — render-only effect
const castRings = [];   // {x, y, t, max, color, thick}
function spawnCastRing(x, y, color, maxR = 80, life = 22, thick = 6) {
  if (SETTINGS.particles === 'off') return;   // pure visual, no rand() to gate
  castRings.push({ x, y, t: 0, life, maxR, color, thick });
}

// Ultimate fanfare — screen flash + banner + hitstop + radial particles
let screenFlash = 0;
let screenFlashColor = '#ffd34d';
let ultBanner = null;          // { name, t, color, side }
let ultRadial = null;          // { x, y, t, color }
let hackerClock = 0;           // frames left to draw the SYSTEM HALT clock (~0.5s)
function triggerUltFanfare(who) {
  screenFlash = 36;
  screenFlashColor = who && who === player ? '#ffe89a' : '#d04dff';
  state.hitstop = 14;
  ultBanner = {
    name: who.ultName || 'ULTIMATE',
    t: 90,
    color: who === player ? '#ffd34d' : '#d04dff',
    side: who === player ? 'left' : 'right',
  };
  ultRadial = { x: who.x, y: who.y - 60, t: 30, color: screenFlashColor };
  // Burst of particles around the caster
  for (let i = 0; i < 50; i++) {
    const ang = (i / 50) * Math.PI * 2;
    const sp = 4 + rand() * 6;
    globalParticles.push(new Particle(
      who.x, who.y - 60,
      Math.cos(ang) * sp, Math.sin(ang) * sp - 2,
      i % 2 === 0 ? screenFlashColor : '#ffffff',
      30 + rand() * 20
    ));
  }
}

// ===== Triple-U intent + QTE mini-game =====
// U key fires the regular ultimate immediately (no triple-press / no UUU all-out).
// All-outs are now ONLY reachable via the Last Stand QTE on death.
function registerUltPress() {
  if (state.phase !== 'fighting') return;
  if (player.specialState || player.ultimateState) return;
  if (qte) return;
  player.ultimate();
}

// ===== QTE mini-game =====
const QTE_KEYS = ['j', 'a', 'd', 'w', 'i'];
let qte = null;                // { who, prompts, idx, timer, successes, fails, postT, result, perPrompt, lastStand }

// Last Stand — when player.hp would hit 0, fire a (slightly harder) QTE; if they
// nail every prompt, their all-out cinematic plays and Sudden Death begins.
// 3-second "GET READY" countdown — freezes the world before the QTE so the
// player isn't ambushed by prompts.
let lastStandCountdown = null;   // { t } where t counts down from 180

function startLastStandCountdown() {
  lastStandCountdown = { t: 180 };
  state.phase = 'lastStandReady';
  state.hitstop = 0;
  // Crimson burst + flash to telegraph the moment
  screenFlash = 40;
  screenFlashColor = '#ff3a3a';
  for (let i = 0; i < 60; i++) {
    const ang = rand() * Math.PI * 2;
    const sp = 3 + rand() * 6;
    globalParticles.push(new Particle(
      player.x, player.y - 60,
      Math.cos(ang) * sp, Math.sin(ang) * sp - 1,
      i % 2 === 0 ? '#ff3a3a' : '#ffffff',
      40 + rand() * 20
    ));
  }
  // Hold the player visually low but not 0 so checkRoundEnd doesn't trigger again
  player.hp = 0.1;
}

function tickLastStandCountdown() {
  if (!lastStandCountdown) return;
  lastStandCountdown.t--;
  if (lastStandCountdown.t <= 0) {
    lastStandCountdown = null;
    startLastStandQTE();
  }
}

function drawLastStandCountdown(ctx) {
  if (!lastStandCountdown) return;
  // Dim
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);
  // Spotlight player
  if (player) {
    ctx.save();
    const grad = ctx.createRadialGradient(player.x, player.y - 50, 30, player.x, player.y - 50, 220);
    grad.addColorStop(0, 'rgba(255, 60, 60, 0.35)');
    grad.addColorStop(1, 'rgba(255, 60, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    player.draw(ctx);
  }
  // Title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 44px Impact';
  ctx.fillStyle = '#ff3a3a';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.strokeText('LAST STAND', W / 2, 110);
  ctx.fillText('LAST STAND', W / 2, 110);
  ctx.font = 'bold 22px Impact';
  ctx.fillStyle = '#ffd34d';
  ctx.fillText('GET READY', W / 2, 148);
  // Big pulsing countdown digit (3 / 2 / 1)
  const secs = Math.ceil(lastStandCountdown.t / 60);
  const within = (lastStandCountdown.t % 60) / 60;          // 1 at start of each second, decays
  const scale = 1.4 + within * 0.8;
  ctx.font = 'bold ' + Math.round(150 * scale) + 'px Impact';
  ctx.globalAlpha = 0.4 + 0.6 * within;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 10;
  ctx.strokeText(String(secs), W / 2, H / 2 + 60);
  ctx.fillText(String(secs), W / 2, H / 2 + 60);
  ctx.restore();
}

function startLastStandQTE() {
  const diff = DIFFICULTY[chosenDifficulty];
  // Lifesteal QTE is one prompt harder than the normal ult-combo for the same difficulty
  const numPrompts = diff.qteKeys + 1;
  const perPrompt = Math.max(18, diff.qteFrames - 6);
  const prompts = [];
  let prev = null;
  for (let i = 0; i < numPrompts; i++) {
    let k = QTE_KEYS[(rand() * QTE_KEYS.length) | 0];
    while (k === prev) k = QTE_KEYS[(rand() * QTE_KEYS.length) | 0];
    prompts.push(k);
    prev = k;
  }
  qte = {
    who: player,
    prompts,
    idx: 0,
    timer: perPrompt,
    perPrompt,
    successes: 0,
    fails: 0,
    postT: 0,
    result: null,
    flashes: [],
    lastStand: true,
    title: 'LAST STAND',
    subtitle: 'NAIL ALL ' + numPrompts + ' PROMPTS — SUDDEN DEATH AWAITS',
  };
  state.phase = 'qte';
  state.hitstop = 0;
  // Keep player visually at low hp until cinematic resolution
  player.hp = 0.1;
  screenFlash = 50;
  screenFlashColor = '#ff3a3a';
  // crimson burst around player
  for (let i = 0; i < 80; i++) {
    const ang = rand() * Math.PI * 2;
    const sp = 4 + rand() * 7;
    globalParticles.push(new Particle(
      player.x, player.y - 60,
      Math.cos(ang) * sp, Math.sin(ang) * sp - 2,
      i % 2 === 0 ? '#ff3a3a' : '#ffffff',
      40 + rand() * 30
    ));
  }
}

function qteHandleKey(k) {
  if (!qte || qte.result) return;
  const expected = qte.prompts[qte.idx];
  if (k === expected) {
    qte.successes++;
    qte.flashes.push({ color: '#7df9ff', t: 14 });
  } else {
    qte.fails++;
    qte.flashes.push({ color: '#ff3a3a', t: 14 });
  }
  qte.idx++;
  qte.timer = qte.perPrompt;
  if (qte.idx >= qte.prompts.length) finishQTE();
}

function qteTick() {
  if (!qte) return;
  if (qte.result) {
    qte.postT++;
    if (qte.postT > 30) {
      const lastStand = qte.lastStand;
      const who = qte.who;
      if (qte.result === 'success') {
        qte = null;
        state.phase = 'fighting';
        if (lastStand) {
          // Restore the dying fighter to 1 HP so the all-out cinematic can play.
          who.hp = 1;
        }
        startAllOut(who);
      } else {
        qte = null;
        state.phase = 'fighting';
        if (lastStand) {
          // Failed last stand — they actually die now; let checkRoundEnd resolve normally.
          who.hp = 0;
        }
      }
    }
    return;
  }
  qte.timer--;
  for (const f of qte.flashes) f.t--;
  qte.flashes = qte.flashes.filter(f => f.t > 0);
  if (qte.timer <= 0) {
    qte.fails++;
    qte.flashes.push({ color: '#ff3a3a', t: 14 });
    qte.idx++;
    qte.timer = qte.perPrompt;
    if (qte.idx >= qte.prompts.length) finishQTE();
  }
}

function finishQTE() {
  qte.result = qte.successes >= qte.prompts.length ? 'success' : 'fail';
  qte.postT = 0;
  if (qte.result === 'success') {
    screenFlash = 60;
    screenFlashColor = '#ffffff';
  }
}

function drawQTE(ctx) {
  if (!qte) return;
  // Dark cinematic dim
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, W, H);

  // Aurora rays behind
  const t = frameCount * 0.03;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + t;
    ctx.strokeStyle = `rgba(255, 211, 77, ${0.07 + Math.sin(a) * 0.04})`;
    ctx.lineWidth = 40;
    ctx.beginPath();
    ctx.moveTo(W / 2, H / 2);
    ctx.lineTo(W / 2 + Math.cos(a) * 900, H / 2 + Math.sin(a) * 900);
    ctx.stroke();
  }

  // Caster silhouette in spotlight
  if (qte.who) {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 211, 77, 0.15)';
    ctx.beginPath();
    ctx.arc(qte.who.x, qte.who.y - 40, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    qte.who.draw(ctx);
  }

  // Title
  ctx.save();
  ctx.font = 'bold 32px Impact';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd34d';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  const title = qte.title || 'ULTIMATE COMBO';
  ctx.fillStyle = qte.lastStand ? '#ff3a3a' : '#ffd34d';
  ctx.strokeText(title, W / 2, 80);
  ctx.fillText(title, W / 2, 80);
  if (qte.subtitle) {
    ctx.font = 'bold 16px Impact';
    ctx.fillStyle = '#ffd34d';
    ctx.fillText(qte.subtitle, W / 2, 104);
  }

  // Success/fail counter
  ctx.font = 'bold 22px Impact';
  ctx.fillStyle = '#7df9ff';
  ctx.fillText(`✓ ${qte.successes}   ✗ ${qte.fails}   /  ${qte.prompts.length}`, W / 2, 116);
  ctx.restore();

  if (qte.result) {
    // result banner
    ctx.save();
    ctx.font = 'bold 96px Impact';
    ctx.textAlign = 'center';
    ctx.fillStyle = qte.result === 'success' ? '#ffd34d' : '#ff3a3a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 8;
    const txt = qte.result === 'success' ? 'PERFECT!' : 'MISSED!';
    ctx.strokeText(txt, W / 2, H / 2 + 30);
    ctx.fillText(txt, W / 2, H / 2 + 30);
    ctx.restore();
    return;
  }

  // Prompt: big letter center, shrinking timer ring
  const key = qte.prompts[qte.idx];
  const ratio = qte.timer / qte.perPrompt;
  const cx = W / 2;
  const cy = H / 2 + 20;
  ctx.save();
  // ring
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#3a2a6a';
  ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = ratio > 0.4 ? '#7df9ff' : '#ff3a3a';
  ctx.beginPath();
  ctx.arc(cx, cy, 80, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
  ctx.stroke();
  // letter
  ctx.font = 'bold 110px Impact';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.strokeText(key.toUpperCase(), cx, cy + 38);
  ctx.fillText(key.toUpperCase(), cx, cy + 38);
  ctx.restore();

  // Press flash feedback
  for (let i = 0; i < qte.flashes.length; i++) {
    const f = qte.flashes[i];
    ctx.save();
    ctx.globalAlpha = f.t / 14;
    ctx.strokeStyle = f.color;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 100 + (14 - f.t) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Prompt sequence dots at bottom
  ctx.save();
  for (let i = 0; i < qte.prompts.length; i++) {
    const dx = W / 2 - (qte.prompts.length - 1) * 18 + i * 36;
    const dy = H - 80;
    ctx.fillStyle = i < qte.idx ? '#7df9ff' : (i === qte.idx ? '#ffd34d' : '#444');
    ctx.beginPath(); ctx.arc(dx, dy, 8, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// ===== All-Out Attack launcher =====
function startAllOut(who) {
  // Mark this all-out as a "last stand" if the player triggered it from death.
  // After the cinematic resolves we'll flip into Sudden Death instead of normal K.O.
  const fromLastStand = (who === player && state.lastStandUsed && !state.suddenDeath);
  who.allOutState = { kind: who.allOutId, t: 0, fromLastStand };
  // Big cinematic kickoff
  screenFlash = 60;
  screenFlashColor = '#ffffff';
  state.hitstop = 20;
  triggerUltFanfare({ x: who.x, y: who.y, ultName: who.allOutName });
  ultBanner = {
    name: who.allOutName,
    t: 140,
    color: fromLastStand ? '#ff3a3a' : '#ffd34d',
    side: who === player ? 'left' : 'right',
  };
}

let suddenDeathCountdown = null;   // { t } 180-frame ramp before action resumes

function enterSuddenDeath() {
  state.suddenDeath = true;
  // Teleport to opposite sides + reset position/momentum/attack state.
  if (player) {
    player.x = 200; player.y = GROUND_Y; player.vx = 0; player.vy = 0;
    player.facing = 1;
    player.hp = 1;
    player.proneTimer = 0; player.hitstun = 0;
    player.attackTimer = 0; player.attackKind = null;
    player.knockback = 0;
  }
  if (opponent) {
    opponent.x = 760; opponent.y = GROUND_Y; opponent.vx = 0; opponent.vy = 0;
    opponent.facing = -1;
    opponent.hp = 1;
    opponent.proneTimer = 0; opponent.hitstun = 0;
    opponent.attackTimer = 0; opponent.attackKind = null;
    opponent.knockback = 0;
  }
  // Freeze action for 3 seconds while the countdown plays.
  suddenDeathCountdown = { t: 180 };
  state.phase = 'suddenDeathReady';
  screenFlash = 60;
  screenFlashColor = '#ff3a3a';
  ultBanner = { name: 'SUDDEN DEATH', t: 120, color: '#ff3a3a', side: 'left' };
  spawnCastRing(W / 2, H / 2, '#ff3a3a', 600, 50, 14);
}

function tickSuddenDeathCountdown() {
  if (!suddenDeathCountdown) return;
  suddenDeathCountdown.t--;
  if (suddenDeathCountdown.t <= 0) {
    suddenDeathCountdown = null;
    state.phase = 'fighting';
  }
}

function drawSuddenDeathCountdown(ctx) {
  if (!suddenDeathCountdown) return;
  const seconds = Math.ceil(suddenDeathCountdown.t / 60);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.font = 'bold 32px Impact';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  ctx.strokeText('SUDDEN DEATH IN', W / 2, H / 2 - 60);
  ctx.fillText('SUDDEN DEATH IN', W / 2, H / 2 - 60);
  ctx.font = 'bold 140px Impact';
  ctx.fillStyle = '#ff3a3a';
  ctx.lineWidth = 10;
  ctx.strokeText(String(seconds), W / 2, H / 2 + 60);
  ctx.fillText(String(seconds), W / 2, H / 2 + 60);
  ctx.restore();
}

// Apply a prone state: opponent face-down on floor, locked for `frames`, takes massive damage.
// If `kill` is true, set HP directly to 0 (one-shot).
// A target holding parry stance no-sells the hit: the cinematic animation keeps
// running on the attacker's side, but the target stays standing and refunds a
// parry charge. Returns true on hit, false on parry-absorb.
function applyProne(target, frames, totalDamage, kill) {
  if (target && target.absorbParry && target.absorbParry(null)) return false;
  target.hp = kill ? 0 : Math.max(1, target.hp - totalDamage);
  target.proneTimer = frames;
  target.hitstun = frames;
  target.vy = 0;
  target.vx = 0;
  target.onGround = true;
  target.y = GROUND_Y;
  target.shake = 30;
  target.hitFlash = 14;
  target.regenLockout = frames + 60;
  return true;
}

// ===== Helpers =====
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ===== Game state =====
const state = {
  phase: 'menu',
  round: 1,
  playerWins: 0,
  opponentWins: 0,
  timer: 99,
  timerTick: 0,
  hitstop: 0,
  suddenDeath: false,
  lastStandUsed: false,   // each match, player gets ONE last-stand attempt
  // Time-stop: while active, only `actor` simulates; everyone/everything else
  // (fighters, projectiles, round timer) is frozen. `frames < 0` = indefinite
  // (admin freeze). `accum` true = damage on `target` is banked into accumDmg
  // and detonated all at once in endTimeStop (Hacker's SYSTEM HALT ultimate).
  timeStop: null,         // { actor, target, frames, accum, accumDmg }
};

// Single-player only — running a selective freeze under lockstep would desync
// the two peers. Returns the actor that should keep moving, or null.
function timeStopActor() {
  if (!state.timeStop || net.isOnline) return null;
  return state.timeStop.actor || null;
}

function beginTimeStop(actor, target, frames, accum) {
  if (net.isOnline) return;             // never in online lockstep
  state.timeStop = { actor, target: target || null, frames, accum: !!accum, accumDmg: 0 };
  screenFlash = Math.max(screenFlash, 24);
  screenFlashColor = accum ? '#39ff14' : '#7df9ff';
  spawnCastRing(actor.x, actor.y - 50, accum ? '#39ff14' : '#7df9ff', 220, 30, 10);
}

// If a damaging hit lands on the frozen target during an accumulating
// time-stop, bank it instead of applying it. Returns true if it was banked
// (caller must then skip its own hp/hitstun/knockback). Spawns a rising tally.
function bankTimeStopDamage(target, dmg) {
  const ts = state.timeStop;
  if (!ts || !ts.accum || target !== ts.target || dmg <= 0) return false;
  ts.accumDmg += dmg;
  spawnHitBurst(target.x, target.y - 50, '#39ff14', 0.7);
  return true;
}

function endTimeStop() {
  const ts = state.timeStop;
  state.timeStop = null;
  if (!ts) return;
  // Detonate banked damage as one massive hit on the target.
  if (ts.accum && ts.target && ts.accumDmg > 0 && ts.target.hp > 0) {
    const t = ts.target;
    const resist = t.dmgResist || 0;
    t.hp -= ts.accumDmg * (1 - resist);
    t.hitstun = 36;
    t.knockback = -t.facing * 22;
    t.vy = -14;
    t.onGround = false;
    t.hitFlash = 14;
    t.shake = 30;
    t.regenLockout = 120;
    spawnHitBurst(t.x, t.y - 50, '#39ff14', 3.0);
    spawnCastRing(t.x, t.y - 50, '#39ff14', 280, 30, 14);
    spawnCastRing(t.x, t.y - 50, '#ffffff', 180, 24, 8);
    screenFlash = Math.max(screenFlash, 40);
    screenFlashColor = '#39ff14';
    state.hitstop = Math.max(state.hitstop, 12);
    ultBanner = { name: 'SYSTEM RESUME', t: 70, color: '#39ff14',
                  side: ts.actor === player ? 'left' : 'right' };
  }
}

let player, opponent;
// In online mode we keep canonical refs so both peers update fighters in the
// same order regardless of who is local: hostFighter always goes first.
let hostFighter = null, joinFighter = null;
// Tower mode multi-enemy: additional enemies beyond the primary `opponent`.
// Empty in 1v1 modes; populated on tower floors 21+.
let extraEnemies = [];
function allEnemies() {
  return opponent ? [opponent, ...extraEnemies] : extraEnemies.slice();
}
function aliveEnemies() {
  return allEnemies().filter(e => e.hp > 0 && e.proneTimer <= 0);
}

function makeFighters(opponentIdOverride) {
  const pc = CHARACTERS[chosenPlayerId];
  const oppId = opponentIdOverride || chosenOpponentId;
  const oc = CHARACTERS[oppId];
  const diff = DIFFICULTY[chosenDifficulty];

  extraEnemies = [];   // 1v1 modes — clear any tower leftovers

  player = new Fighter({
    ...pc,
    x: 240, y: GROUND_Y,
    hp: pc.hp,
    facing: 1,
  });
  player.isPlayer = true;

  let oppHp;
  if (diff.hpMode === 'playerMult') oppHp = Math.round(pc.hp * diff.playerHpMult);
  else oppHp = Math.round(oc.hp * diff.hpMult);

  opponent = new Fighter({
    ...oc,
    x: 720, y: GROUND_Y,
    hp: oppHp,
    facing: -1,
  });
  opponent.aiState = 'approach';
  opponent.aiTimer = 0;
}

// Online: build fighters with canonical orientation (host left, join right) on
// both peers. The LOCAL peer's fighter is bound to `player`, the REMOTE peer's
// to `opponent`. This means join sees themselves on the right side of the
// canvas — a trade-off for lockstep simulation parity.
function makeFightersOnline(hostChar, joinChar) {
  extraEnemies = [];
  const hc = CHARACTERS[hostChar];
  const jc = CHARACTERS[joinChar];
  hostFighter = new Fighter({ ...hc, x: 240, y: GROUND_Y, hp: hc.hp, facing: 1 });
  joinFighter = new Fighter({ ...jc, x: 720, y: GROUND_Y, hp: jc.hp, facing: -1 });
  hostFighter.aiState = 'approach'; hostFighter.aiTimer = 0;
  joinFighter.aiState = 'approach'; joinFighter.aiTimer = 0;

  if (net.role === 'host') {
    player = hostFighter; opponent = joinFighter;
  } else {
    player = joinFighter; opponent = hostFighter;
  }
  player.isPlayer = true;
}

// ===== Tower mode helpers =====
function monsterPool(floor) {
  if (floor <= 10)      return ['grunt', 'blitz'];
  if (floor <= 20)      return ['grunt', 'blitz', 'mage', 'jumper'];
  return ['grunt', 'blitz', 'mage', 'jumper', 'tank'];
}

// Pick `count` monster IDs for a floor. Tries to avoid consecutive duplicates
// in the line-up but allows repeats overall (e.g. "3 mages + 1 blitz").
function pickMonsterIds(floor, count) {
  const pool = monsterPool(floor);
  const out = [];
  for (let i = 0; i < count; i++) {
    let pick;
    let tries = 0;
    do {
      pick = pool[Math.floor(rand() * pool.length)];
      tries++;
    } while (out.length > 0 && pick === out[out.length - 1] && tries < 4);
    out.push(pick);
  }
  return out;
}

function towerEnemyCount(floor) {
  if ((floor % TOWER_BOSS_EVERY) === 0) return 1;   // bosses are solo
  if (floor <= 20) return 1;
  if (floor <= 30) return 2;
  if (floor <= 40) return rand() < 0.5 ? 2 : 3;     // 2-3
  return rand() < 0.5 ? 3 : 4;                       // 3-4
}

function towerHpScale(floor) {
  if (floor <= 10) return 1.0;
  if (floor <= 20) return 1.1;
  if (floor <= 30) return 1.2;
  if (floor <= 40) return 1.4;
  return 1.6;
}

function towerDifficulty(floor) {
  if (floor <= 10) return 'easy';
  if (floor <= 20) return 'normal';
  if (floor <= 30) return 'hard';
  if (floor <= 40) return 'hard';
  return 'impossible';
}

function buildBossOrder() {
  // 5 main-roster fighters excluding the player's pick — these become the
  // bosses at floors 10, 20, 30, 40, 50 in that order. Secret characters
  // (Void / Bald Man / Hacker) are intentionally never tower bosses.
  const eligible = BASE_ROSTER.filter(id =>
    id !== chosenPlayerId && !(CHARACTERS[id] && CHARACTERS[id].secret));
  return shuffle(eligible).slice(0, 5);
}

function makeTowerFighters(opponentId, extraIds = []) {
  const pc = CHARACTERS[chosenPlayerId];
  const oc = CHARACTERS[opponentId];

  // Player: fresh on floor 1, carry state on later floors.
  if (!player) {
    player = new Fighter({ ...pc, x: 240, y: GROUND_Y, hp: pc.hp, facing: 1 });
    player.isPlayer = true;
  } else {
    const savedHp = player.hp;
    const savedMaxHp = player.maxHp;
    const savedUlt = player.ult;
    const savedSpecialCD = player.specialCD;
    player = new Fighter({ ...pc, x: 240, y: GROUND_Y, hp: pc.hp, facing: 1 });
    player.isPlayer = true;
    player.hp = savedHp;
    player.maxHp = savedMaxHp;
    player.ult = savedUlt;
    player.specialCD = savedSpecialCD;
  }

  // Primary opponent HP — monsters scale flatly per floor tier; bosses use
  // the difficulty HP multipliers so they hit like the normal-mode versions.
  function rollHp(c) {
    if (c.monster) return Math.round(c.hp * towerHpScale(towerState.floor));
    const diff = DIFFICULTY[chosenDifficulty];
    if (diff.hpMode === 'playerMult') return Math.round(pc.hp * diff.playerHpMult);
    return Math.round(c.hp * diff.hpMult);
  }

  opponent = new Fighter({ ...oc, x: 720, y: GROUND_Y, hp: rollHp(oc), facing: -1 });
  opponent.aiState = 'approach';
  opponent.aiTimer = 0;

  // Spawn extras with staggered x-positions and AI timers so they don't all
  // do the same thing on the same frame.
  extraEnemies = [];
  const slots = [620, 800, 540, 880];
  for (let i = 0; i < extraIds.length; i++) {
    const ec = CHARACTERS[extraIds[i]];
    const ex = new Fighter({
      ...ec,
      x: slots[i % slots.length],
      y: GROUND_Y,
      hp: rollHp(ec),
      facing: -1,
    });
    ex.aiState = 'approach';
    ex.aiTimer = 10 + i * 7;
    extraEnemies.push(ex);
  }
}

function startTowerFromMenu() {
  hackerChallenge = null;
  hackerCodeBuf = '';
  state.timeStop = null;
  towerState = {
    floor: 0,
    bossOrder: buildBossOrder(),
    highBefore: loadTowerHigh(),
  };
  state.round = 1;
  state.playerWins = 0;
  state.opponentWins = 0;
  state.timer = 999;
  state.timerTick = 0;
  state.suddenDeath = false;
  state.lastStandUsed = false;
  state.hitstop = 0;
  lastStandCountdown = null;
  projectiles.length = 0;
  globalParticles.length = 0;
  castRings.length = 0;
  qte = null;
  ultBanner = null;
  ultRadial = null;
  hackerClock = 0;
  screenFlash = 0;
  player = null;           // force fresh build inside makeTowerFighters
  opponent = null;

  advanceTowerFloor();

  menuEl.classList.add('hidden');
  fightViewEl.classList.remove('hidden');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function advanceTowerFloor() {
  const ts = towerState;
  ts.floor++;

  if (ts.floor > TOWER_TOTAL_FLOORS) {
    state.phase = 'over';
    saveTowerHigh(TOWER_TOTAL_FLOORS);
    showOverlay('TOWER CLEARED!', 'You beat all ' + TOWER_TOTAL_FLOORS + ' floors — SPACE for menu');
    return;
  }

  if (ts.floor > ts.highBefore) saveTowerHigh(ts.floor);

  const isBoss = (ts.floor % TOWER_BOSS_EVERY) === 0;
  let oppId, extraIds = [];
  if (isBoss) {
    oppId = ts.bossOrder[(ts.floor / TOWER_BOSS_EVERY) - 1];
  } else {
    const count = towerEnemyCount(ts.floor);
    const ids = pickMonsterIds(ts.floor, count);
    oppId = ids[0];
    extraIds = ids.slice(1);
  }

  chosenDifficulty = towerDifficulty(ts.floor);
  makeTowerFighters(oppId, extraIds);

  // Heal between floors. None for floor 1, full after a boss kill, +30% otherwise.
  if (ts.floor > 1) {
    const prevWasBoss = ((ts.floor - 1) % TOWER_BOSS_EVERY) === 0;
    if (prevWasBoss) player.hp = player.maxHp;
    else             player.hp = Math.min(player.maxHp, player.hp + Math.round(player.maxHp * 0.3));
  }

  // Reset transient round state for the new floor.
  projectiles.length = 0;
  state.timer = 999;
  state.timerTick = 0;
  state.hitstop = 0;
  state.suddenDeath = false;
  state.lastStandUsed = false;
  qte = null;

  playerNameEl.textContent = player.name || 'YOU';
  opponentNameEl.textContent = opponent.name || 'OPP';
  difficultyLabelEl.textContent = 'TOWER';
  tourneyLabelEl.textContent = `FLOOR ${ts.floor}/${TOWER_TOTAL_FLOORS}`;
  roundTextEl.textContent = isBoss ? 'BOSS' : 'FLOOR ' + ts.floor;
  timerEl.textContent = '∞';
  updateHealthBars();
  updateSpecialBars();
  updateUltBars();

  // Brief intro overlay; auto-dismiss after 1.5s. Player can SPACE to skip.
  state.phase = 'ready';
  if (isBoss) showOverlay('BOSS', opponent.name);
  else        showOverlay('FLOOR ' + ts.floor, '');
  setTimeout(() => {
    if (state.phase === 'ready') {
      overlay.classList.add('hidden');
      state.phase = 'fighting';
    }
  }, 1500);
}

function showTowerDeath() {
  state.phase = 'over';
  const high = Math.max(loadTowerHigh(), towerState.floor);
  showOverlay('GAME OVER', `Reached floor ${towerState.floor}/${TOWER_TOTAL_FLOORS}. Best: ${high}. SPACE for menu`);
}

// Begin an online match — called on host immediately after sending 'start',
// and on join when 'start' arrives. Identical work either way: seed RNG,
// spawn canonical fighters, reset sim state.
function startOnlineMatch(seed, hostChar, joinChar) {
  net.isOnline = true;
  net.matchSeed = seed >>> 0;
  net.hostChar = hostChar;
  net.joinChar = joinChar;
  setRngSeed(net.matchSeed);
  net.netFrame = 0;
  net.localBuf = new Map();
  net.remoteBuf = new Map();
  net.stallFrames = 0;
  // Prime input buffer with empty inputs for the first DELAY frames so the
  // simulation can start before either side has had time to capture inputs.
  for (let i = 0; i < NET_INPUT_DELAY; i++) {
    net.localBuf.set(i, emptyInputs());
    net.remoteBuf.set(i, emptyInputs());
  }

  state.round = 1;
  state.playerWins = 0;
  state.opponentWins = 0;
  state.timer = 99;
  state.timerTick = 0;
  state.suddenDeath = false;
  state.lastStandUsed = false;
  state.hitstop = 0;
  // Skip the 'ready'/Press-SPACE step — both peers must transition together
  // and SPACE can't be sync'd. Go straight into the match.
  state.phase = 'fighting';
  lastStandCountdown = null;
  projectiles.length = 0;
  globalParticles.length = 0;
  castRings.length = 0;
  qte = null;
  ultBanner = null;
  ultRadial = null;
  hackerClock = 0;
  screenFlash = 0;

  makeFightersOnline(hostChar, joinChar);

  playerNameEl.textContent = player.name || 'YOU';
  opponentNameEl.textContent = opponent.name || 'OPP';
  difficultyLabelEl.textContent = net.role === 'host' ? 'ONLINE • HOST' : 'ONLINE • JOIN';
  tourneyLabelEl.textContent = '';
  roundTextEl.textContent = 'ROUND 1';
  updateHealthBars();
  updateSpecialBars();
  updateUltBars();
  overlay.classList.add('hidden');

  menuEl.classList.add('hidden');
  fightViewEl.classList.remove('hidden');
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
}

function handleRemoteDisconnect() {
  if (state.phase === 'fighting' || state.phase === 'ready' || state.phase === 'lastStandReady') {
    showOverlay('OPPONENT LEFT', 'Press ESC for menu');
    state.phase = 'over';
  }
  net.isOnline = false;
  disableRng();
}

function startFight() {
  overlay.classList.add('hidden');
  state.phase = 'fighting';
}

function resetMatch() {
  hackerChallenge = null;
  hackerCodeBuf = '';
  state.timeStop = null;
  state.round = 1;
  state.playerWins = 0;
  state.opponentWins = 0;
  state.timer = 99;
  state.timerTick = 0;
  state.suddenDeath = false;
  state.lastStandUsed = false;
  lastStandCountdown = null;
  projectiles.length = 0;
  globalParticles.length = 0;
  castRings.length = 0;
  inputBuffer.length = 0;
  // Per-fighter latches reset when makeFighters() rebuilds the fighters below.
  ultBanner = null;
  ultRadial = null;
  hackerClock = 0;
  screenFlash = 0;
  qte = null;
  // Drop the start button's focus so the next SPACE press goes to the game, not the button
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

  if (chosenMode === 'tournament') {
    // Build a bracket of 3 random opponents. Exclude the player and ALL secret
    // characters (Void, Bald Man, Hacker) — their kits trivialise a bracket.
    const pool = ROSTER_ORDER.filter(id =>
      id !== chosenPlayerId && !(CHARACTERS[id] && CHARACTERS[id].secret));
    tournamentBracket = shuffle(pool).slice(0, 3);
    tournamentIdx = 0;
    makeFighters(tournamentBracket[0]);
    tourneyLabelEl.textContent = `TOURNEY 1/${tournamentBracket.length}`;
  } else {
    tournamentBracket = [];
    tournamentIdx = 0;
    makeFighters();
    tourneyLabelEl.textContent = '';
  }

  playerNameEl.textContent = player.name || 'YOU';
  opponentNameEl.textContent = opponent.name || 'OPP';
  difficultyLabelEl.textContent = chosenDifficulty.toUpperCase();
  roundTextEl.textContent = 'ROUND 1';
  updateHealthBars();
  updateSpecialBars();
  updateUltBars();
  showOverlay('FIGHT!', 'Press SPACE to start');
  state.phase = 'ready';

  menuEl.classList.add('hidden');
  fightViewEl.classList.remove('hidden');
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rand() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showOverlay(title, sub) {
  overlayTitle.textContent = title;
  overlaySub.textContent = sub;
  overlay.classList.remove('hidden');
}

function updateHealthBars() {
  playerHealthEl.style.width = (player.hp / player.maxHp * 100) + '%';
  lebronHealthEl.style.width = (opponent.hp / opponent.maxHp * 100) + '%';
}

function updateSpecialBars() {
  const pPct = player.specialCD <= 0 ? 100 : Math.max(0, (1 - player.specialCD / player.specialCDMax) * 100);
  const oPct = opponent.specialCD <= 0 ? 100 : Math.max(0, (1 - opponent.specialCD / opponent.specialCDMax) * 100);
  playerSpecialEl.style.width = pPct + '%';
  opponentSpecialEl.style.width = oPct + '%';
  playerSpecialEl.classList.toggle('ready', pPct >= 100);
  opponentSpecialEl.classList.toggle('ready', oPct >= 100);
}

function updateUltBars() {
  const pPct = (player.ult / player.ultMax) * 100;
  const oPct = (opponent.ult / opponent.ultMax) * 100;
  playerUltEl.style.width = pPct + '%';
  opponentUltEl.style.width = oPct + '%';
  playerUltEl.classList.toggle('ready', pPct >= 100);
  opponentUltEl.classList.toggle('ready', oPct >= 100);
}

// ===== Player input =====
const HEAVY_HOLD_FRAMES = 18;   // ~0.3s

// ===== Per-frame input snapshot =====
// All booleans (current frame held state). Edge detection lives on each
// Fighter via per-fighter latches, so the same pipeline can drive local,
// AI, or remote-network inputs identically.
function emptyInputs() {
  return {
    left: false, right: false, jump: false, dash: false,
    punch: false, parry: false, special: false, ult: false, taunt: false,
  };
}

function readLocalInputs() {
  const km = SETTINGS.keymap;
  return {
    // Movement is fixed to WASD (intentionally not remappable — keeps things
    // simple and avoids conflicts with the menu/qte hardcoded keys).
    left:    !!keys['a'],
    right:   !!keys['d'],
    jump:    !!keys['w'],
    // Action keys are remappable via the settings menu
    dash:    !!keys[km.dash],
    punch:   !!keys[km.punch],
    parry:   !!keys[km.parry],
    special: !!keys[km.special],
    ult:     !!keys[km.ult],
    taunt:   !!keys[km.taunt],
  };
}

function applyInputs(f, inp) {
  if (state.phase !== 'fighting') return;

  // Parry is handled BEFORE the stun/lockout/state early-returns so the
  // player can always defend — even mid-hitstun or while a special is
  // locking everything else out. tryParry() itself enforces who may parry
  // when (player: anytime; AI: gated).
  if (inp.parry) {
    if (!f.parryLatch) { f.tryParry(); f.parryLatch = true; }
  } else {
    f.parryLatch = false;
  }

  if (f.hitstun > 0) return;
  if (f.specialState || f.ultimateState || f.allOutState) return;
  if (f.parryLockout > 0) return;

  const accel = 0.9;
  if (inp.left)  f.vx = Math.max(-f.speed, f.vx - accel);
  if (inp.right) f.vx = Math.min( f.speed, f.vx + accel);

  // Jump (rising edge)
  if (inp.jump) {
    if (!f.wLatch) { f.jump(); f.wLatch = true; }
  } else {
    f.wLatch = false;
  }

  // Dash (rising edge) — direction from held left/right, not facing
  if (inp.dash) {
    if (!f.qDashLatch) {
      let dir = 0;
      if (inp.left) dir = -1;
      else if (inp.right) dir = 1;
      else dir = f.facing;
      f.qDash(dir);
      f.qDashLatch = true;
    }
  } else {
    f.qDashLatch = false;
  }

  // (Parry handled above, before the stun/state gates.)

  // Punch — tap = normal, hold ≥ HEAVY_HOLD_FRAMES then release = HEAVY.
  // All timing in sim-frame units so both peers compute identical decisions.
  if (inp.punch) {
    if (!f.punchLatch) {
      f.jHoldStart = currentSimFrame();
      f.punchLatch = true;
    }
    // Visual charge sparks fire for whichever fighter is charging (both peers
    // see them — gating on f === player would drift the seeded RNG state).
    const sf = currentSimFrame();
    if (f.jHoldStart && sf - f.jHoldStart >= HEAVY_HOLD_FRAMES && sf % 4 === 0) {
      spawnSparks(f.x + f.facing * 26, f.y - 60, '#ffd34d', 4);
    }
  } else {
    if (f.punchLatch && f.jHoldStart) {
      const held = currentSimFrame() - f.jHoldStart;
      if (held >= HEAVY_HOLD_FRAMES) f.heavyPunch();
      else f.punch();
    }
    f.jHoldStart = 0;
    f.punchLatch = false;
  }

  // Special (rising edge)
  if (inp.special) {
    if (!f.specialLatch) { f.special('normal'); f.specialLatch = true; }
  } else {
    f.specialLatch = false;
  }

  // Ultimate (rising edge, when meter full)
  if (inp.ult) {
    if (!f.ultLatch && f.ult >= f.ultMax) {
      if (f === player) registerUltPress();
      else f.ultimate();
      f.ultLatch = true;
    }
  } else {
    f.ultLatch = false;
  }

  // Taunt (held — guarded by internal cooldowns)
  if (inp.taunt) {
    if (f.taunting <= 0 && f.attackCD <= 0) {
      f.taunting = 40;
      f.attackCD = 40;
    }
  }
}

function handleInput() {
  applyInputs(player, readLocalInputs());
}

// ===== Opponent AI =====
// updateEnemyAI drives one enemy. The wrapper updateOpponentAI iterates over
// all live enemies (opponent + extras for tower multi-enemy floors).
function updateOpponentAI() {
  if (state.phase !== 'fighting') return;
  updateEnemyAI(opponent);
  for (const e of extraEnemies) updateEnemyAI(e);
}

function updateEnemyAI(enemy) {
  if (!enemy) return;
  if (enemy.hitstun > 0 || enemy.proneTimer > 0) {
    enemy.aiTimer = 30 + rand() * 20;
    return;
  }
  if (enemy.specialState || enemy.ultimateState || enemy.allOutState) return;
  if (player.allOutState) return;
  if (enemy.parryLockout > 0) return;

  const diff = DIFFICULTY[chosenDifficulty];
  const dx = player.x - enemy.x;
  const dist = Math.abs(dx);
  enemy.aiTimer--;

  // Ultimate when ready
  if (enemy.ult >= enemy.ultMax && rand() < 0.02 * diff.ultChance) {
    enemy.ultimate();
    return;
  }

  // Special when off-cooldown
  if (enemy.specialCD <= 0 && diff.specialChance > 0 && enemy.onGround) {
    const specId = enemy.specialId;
    const wantClose = specId === 'dunk' || specId === 'shockwave';
    const goodRange = wantClose ? dist < 320 : dist > 60;
    if (goodRange && rand() < diff.specialChance * 0.06) {
      enemy.special('normal');
      return;
    }
  }

  // AI parry scheduling
  if (enemy._aiParryFireFrame && frameCount >= enemy._aiParryFireFrame) {
    enemy._aiParryFireFrame = 0;
    if (enemy.parryStance <= 0 && enemy.parryLockout <= 0 && enemy.parriesLeft > 0) {
      enemy.tryParry();
      enemy.vx = 0;
      return;
    }
  }
  const playerAttacking = (player.attackTimer > 0) ||
                         !!(player.specialState && (player.specialId === 'shuriken' || player.specialId === 'cashrain' || player.specialId === 'bolt'));
  if (dist < 160 && playerAttacking && !enemy._aiParryFireFrame &&
      enemy.parryStance <= 0 && enemy.parryLockout <= 0 &&
      enemy.parriesLeft > 0 && rand() < diff.aiParryChance) {
    const [dMin, dMax] = diff.aiParryDelay;
    const delay = dMin + Math.floor(rand() * (dMax - dMin + 1));
    enemy._aiParryFireFrame = frameCount + delay;
  }

  // Dodge incoming projectiles by jumping
  for (const pr of projectiles) {
    if (pr.owner === enemy || pr.harmless) continue;
    const headingTowardMe = Math.sign(pr.vx) === Math.sign(enemy.x - pr.x);
    if (headingTowardMe && Math.abs(pr.x - enemy.x) < 200 && Math.abs(pr.y - (enemy.y - 50)) < 60) {
      if (rand() < diff.blockChance + 0.2) { enemy.jump(); break; }
    }
  }

  if (enemy.aiTimer <= 0) {
    const r = rand();
    if (dist < 110) {
      enemy.aiState = r < 0.7 ? 'attack' : (r < 0.9 ? 'retreat' : 'jump');
    } else if (dist < 260) {
      enemy.aiState = r < (0.4 + diff.attackBias * 0.4) ? 'approach' : 'attack';
    } else {
      enemy.aiState = r < 0.85 ? 'approach' : 'jump';
    }
    enemy.aiTimer = diff.aiMin + rand() * (diff.aiMax - diff.aiMin);
  }

  switch (enemy.aiState) {
    case 'approach':
      enemy.vx = Math.sign(dx) * enemy.speed;
      break;
    case 'retreat':
      enemy.vx = -Math.sign(dx) * enemy.speed * 0.8;
      break;
    case 'jump':
      enemy.jump();
      enemy.vx = Math.sign(dx) * enemy.speed * 0.6;
      enemy.aiState = 'approach';
      break;
    case 'attack':
      if (dist < 60) {
        enemy.punch();
      } else if (dist < 110) {
        enemy.vx = Math.sign(dx) * enemy.speed;
        if (dist < 75) enemy.punch();
      } else {
        enemy.aiState = 'approach';
      }
      break;
  }
}

// ===== Background =====
// The background is static (gradient + ~14 buildings + ~196-window lattice +
// ground strokes). We used to repaint all of it every frame which dominates
// the per-frame cost. Now we paint it ONCE into an offscreen canvas and blit
// it each frame — drops drawBackground from ~210 ops to a single drawImage.
const bgCacheCanvas = document.createElement('canvas');
bgCacheCanvas.width = W;
bgCacheCanvas.height = H;
const bgCacheCtx = bgCacheCanvas.getContext('2d');
let bgCacheFastMode = null;     // tracks which mode the cache was painted for

function paintBackgroundTo(bctx) {
  const fast = SETTINGS.fastMode;
  if (fast) {
    bctx.fillStyle = '#3a1066';
    bctx.fillRect(0, 0, W, H);
  } else {
    const grad = bctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1b0a3a');
    grad.addColorStop(0.6, '#7a1a8a');
    grad.addColorStop(1, '#ff5a2e');
    bctx.fillStyle = grad;
    bctx.fillRect(0, 0, W, H);
  }

  bctx.fillStyle = '#16082a';
  for (let i = 0; i < 14; i++) {
    const bx = i * 75;
    const bh = 80 + (i * 37) % 110;
    bctx.fillRect(bx, H - 180 - bh, 60, bh + 100);
  }
  if (!fast) {
    bctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
    for (let i = 0; i < 14; i++) {
      const bx = i * 75;
      const bh = 80 + (i * 37) % 110;
      for (let yy = H - 170 - bh; yy < H - 90; yy += 14) {
        for (let xx = bx + 6; xx < bx + 56; xx += 10) {
          if (((xx + yy) * (i + 1)) % 7 < 3) bctx.fillRect(xx, yy, 4, 6);
        }
      }
    }
  }

  bctx.fillStyle = '#3a1f0a';
  bctx.fillRect(0, GROUND_Y + 2, W, H - GROUND_Y);
  if (!fast) {
    bctx.strokeStyle = '#1f0f04';
    bctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      bctx.beginPath();
      bctx.moveTo(i * 50, GROUND_Y + 2);
      bctx.lineTo(i * 50, H);
      bctx.stroke();
    }
  }
  bctx.fillStyle = 'rgba(255, 211, 77, 0.08)';
  bctx.fillRect(0, GROUND_Y + 2, W, 4);
}

function drawBackground() {
  // Repaint the cache if Fast Mode changed (or on first call).
  if (bgCacheFastMode !== SETTINGS.fastMode) {
    paintBackgroundTo(bgCacheCtx);
    bgCacheFastMode = SETTINGS.fastMode;
  }
  ctx.drawImage(bgCacheCanvas, 0, 0);
}

// ===== Round flow =====
function checkRoundEnd() {
  if (state.phase !== 'fighting') return;
  // Let all-out cinematics and prone state play through before declaring the round
  if (player.allOutState) return;
  if (player.proneTimer > 0) return;
  // Tower multi-enemy: any enemy still mid-cinematic / prone? Wait.
  for (const e of allEnemies()) {
    if (e.allOutState) return;
    if (e.proneTimer > 0) return;
  }

  // ===== Last Stand =====
  // If the player would die (and we're not already in sudden death), they get
  // ONE shot at a QTE. Online mode disables this since QTE input timing would
  // diverge between peers' wall-clocks and break lockstep determinism.
  if (!net.isOnline && !state.suddenDeath && !state.lastStandUsed && player.hp <= 0 && opponent.hp > 0) {
    state.lastStandUsed = true;
    startLastStandCountdown();
    return;
  }

  const allEnemiesDead = allEnemies().every(e => e.hp <= 0);
  if (player.hp <= 0 || allEnemiesDead || state.timer <= 0) {
    let winner;
    if (allEnemiesDead && player.hp > 0)        winner = 'player';
    else if (player.hp <= 0 && !allEnemiesDead) winner = 'opponent';
    else if (state.timer <= 0) {
      // Time-out: in 1v1 compare opponent.hp; in multi-enemy sum enemy HP.
      const totalEnemyHp = allEnemies().reduce((s, e) => s + Math.max(0, e.hp), 0);
      if (player.hp > totalEnemyHp)      winner = 'player';
      else if (totalEnemyHp > player.hp) winner = 'opponent';
      else                               winner = 'draw';
    } else {
      winner = 'draw';
    }

    if (winner === 'player') state.playerWins++;
    else if (winner === 'opponent') state.opponentWins++;

    // Tower mode: one round per floor. Win advances; lose ends the run.
    if (chosenMode === 'tower') {
      if (winner === 'player') { checkHackerChallengeWin(); advanceTowerFloor(); }
      else                     showTowerDeath();
      return;
    }

    if (state.playerWins >= 2) {
      // Decisive match win — resolve the HACKER flawless challenge if armed.
      checkHackerChallengeWin();
      // Player won this match
      if (chosenMode === 'tournament') {
        tournamentIdx++;
        if (tournamentIdx >= tournamentBracket.length) {
          state.phase = 'over';
          showOverlay('CHAMPION!', 'You won the tournament — SPACE for menu');
          return;
        }
        // Advance to next bracket fight; carry partial meters
        const savedUlt = Math.min(player.ult, 60);
        const savedSpecial = Math.min(player.specialCD, player.specialCDMax * 0.5);
        const nextOpp = tournamentBracket[tournamentIdx];
        state.round = 1;
        state.playerWins = 0;
        state.opponentWins = 0;
        state.timer = 99;
        state.timerTick = 0;
        projectiles.length = 0;
        makeFighters(nextOpp);
        player.hp = Math.min(player.maxHp, player.maxHp * 0.7); // heal between fights
        player.ult = savedUlt;
        player.specialCD = savedSpecial;
        playerNameEl.textContent = player.name;
        opponentNameEl.textContent = opponent.name;
        tourneyLabelEl.textContent = `TOURNEY ${tournamentIdx + 1}/${tournamentBracket.length}`;
        roundTextEl.textContent = 'ROUND 1';
        showOverlay('NEXT FIGHT', `vs ${opponent.name} — SPACE`);
        state.phase = 'ready';
        return;
      }
      state.phase = 'over';
      showOverlay('YOU WIN!', 'Press SPACE for menu');
      return;
    }
    if (state.opponentWins >= 2) {
      state.phase = 'over';
      showOverlay(opponent.name + ' WINS', 'Press SPACE for menu');
      return;
    }

    state.round++;
    state.timer = 99;
    state.timerTick = 0;
    state.suddenDeath = false;
    state.lastStandUsed = false;
    lastStandCountdown = null;
    roundTextEl.textContent = 'ROUND ' + state.round;
    const subMsg = winner === 'player' ? 'You won round ' + (state.round - 1) :
                   winner === 'opponent' ? opponent.name + ' won round ' + (state.round - 1) :
                   'Draw!';
    projectiles.length = 0;

    if (net.isOnline) {
      // Online round transition: carry HALF of BOTH fighters' ult meters into
      // the next round — saving only `player.ult` would diverge since `player`
      // points at different fighters on host vs join.
      const savedHostUlt = hostFighter ? hostFighter.ult * 0.5 : 0;
      const savedJoinUlt = joinFighter ? joinFighter.ult * 0.5 : 0;
      makeFightersOnline(net.hostChar, net.joinChar);
      hostFighter.ult = savedHostUlt;
      joinFighter.ult = savedJoinUlt;
      showOverlay('ROUND ' + state.round, subMsg);
      setTimeout(() => { if (state.phase === 'fighting') overlay.classList.add('hidden'); }, 1500);
    } else {
      const savedUlt = player.ult * 0.5;
      showOverlay('ROUND ' + state.round, subMsg + ' — Press SPACE');
      state.phase = 'ready';
      const oppIdForNext = chosenMode === 'tournament' ? tournamentBracket[tournamentIdx] : null;
      makeFighters(oppIdForNext);
      player.x = 240;
      opponent.x = 720;
      player.ult = savedUlt;
    }
    // Clear transient combat state between rounds (latches live on fighters,
    // which are rebuilt above).
    qte = null;
    inputBuffer.length = 0;
  }
}

// ===== Menu =====
function buildRoster() {
  portraitRegistry.length = 0;
  for (const side of ['player', 'opponent']) {
    const root = side === 'player' ? playerRosterEl : opponentRosterEl;
    root.innerHTML = '';
    for (const id of ROSTER_ORDER) {
      const c = CHARACTERS[id];
      const card = document.createElement('div');
      card.className = 'char-card';
      card.dataset.id = id;

      const port = document.createElement('canvas');
      port.width = 80; port.height = 84;
      port.className = 'char-portrait';
      card.appendChild(port);

      const name = document.createElement('div');
      name.className = 'char-name';
      name.textContent = c.name;
      card.appendChild(name);

      const spec = document.createElement('div');
      spec.className = 'char-special';
      spec.textContent = c.desc;
      card.appendChild(spec);

      const combo = document.createElement('div');
      combo.className = 'char-combo';
      combo.innerHTML = `I:${c.specialName} · U:${c.ultName}<br>ALL-OUT → <span style="color:#ffd34d">${c.allOutName}</span>`;
      card.appendChild(combo);

      // Hover-revealed stats panel: HP bar, speed bar, archetype tag, move names.
      // Bars normalize to the roster's stat range so visual comparison is fair.
      const HP_MIN = 90, HP_MAX = 170;
      const SP_MIN = 2.6, SP_MAX = 5.0;
      const DMG_MIN = 40, DMG_MAX = 100;
      const hpPct = Math.round(Math.max(0, Math.min(100, (c.hp - HP_MIN) / (HP_MAX - HP_MIN) * 100)));
      const spPct = Math.round(Math.max(0, Math.min(100, (c.speed - SP_MIN) / (SP_MAX - SP_MIN) * 100)));
      const dmgRaw = DMG_RATING[c.id] || 50;
      const dmgPct = Math.round(Math.max(0, Math.min(100, (dmgRaw - DMG_MIN) / (DMG_MAX - DMG_MIN) * 100)));
      const stats = document.createElement('div');
      stats.className = 'char-stats';
      stats.innerHTML =
        `<div class="cs-arch">${c.archetype || '—'}</div>` +
        `<div class="cs-row"><span class="cs-lbl">HP</span><div class="cs-bar"><div class="cs-fill cs-fill-hp" style="width:${hpPct}%"></div></div><span class="cs-val">${c.hp}</span></div>` +
        `<div class="cs-row"><span class="cs-lbl">SPD</span><div class="cs-bar"><div class="cs-fill cs-fill-sp" style="width:${spPct}%"></div></div><span class="cs-val">${c.speed.toFixed(1)}</span></div>` +
        `<div class="cs-row"><span class="cs-lbl">DMG</span><div class="cs-bar"><div class="cs-fill cs-fill-dmg" style="width:${dmgPct}%"></div></div><span class="cs-val">${dmgRaw}</span></div>` +
        `<div class="cs-moves">` +
          `<div><b>I</b> ${c.specialName}</div>` +
          `<div><b>U</b> ${c.ultName}</div>` +
          `<div><b>ALL-OUT</b> <span style="color:#ffd34d">${c.allOutName}</span></div>` +
        `</div>`;
      card.appendChild(stats);

      card.addEventListener('click', () => selectChar(side, id));
      root.appendChild(card);
      portraitRegistry.push({ canvas: port, char: c });
      drawPortrait(port, c, 0);
    }
  }
  refreshSelection();
}

function selectChar(side, id) {
  if (side === 'player') chosenPlayerId = id;
  else chosenOpponentId = id;
  refreshSelection();
  // Online: notify peer about a new pick
  if (side === 'player' && chosenMode === 'online' && net.connected) {
    net.send({ t: 'pick', char: chosenPlayerId });
  }
}

function refreshSelection() {
  for (const card of playerRosterEl.children) {
    card.classList.toggle('selected', card.dataset.id === chosenPlayerId);
  }
  for (const card of opponentRosterEl.children) {
    card.classList.toggle('selected', card.dataset.id === chosenOpponentId);
  }
  for (const btn of difficultyRowEl.children) {
    btn.classList.toggle('selected', btn.dataset.diff === chosenDifficulty);
  }
  for (const btn of modeRowEl.children) {
    btn.classList.toggle('selected', btn.dataset.mode === chosenMode);
  }
  // Opponent picker is hidden in tournament (random) and online (remote picks)
  opponentSectionEl.classList.toggle('hidden', chosenMode !== 'versus');
  onlineSectionEl.classList.toggle('hidden', chosenMode !== 'online');

  // Summary line
  const pc = CHARACTERS[chosenPlayerId];
  const oc = CHARACTERS[chosenOpponentId];
  let modeLabel;
  if (chosenMode === 'tournament')   modeLabel = 'TOURNAMENT (3 random fights)';
  else if (chosenMode === 'online')  modeLabel = `ONLINE <b>${net.connected ? '(CONNECTED)' : '(not connected)'}</b>`;
  else if (chosenMode === 'tower') {
    const best = loadTowerHigh();
    modeLabel = `TOWER <b>(${TOWER_TOTAL_FLOORS} floors)</b>${best > 0 ? ` · best: floor ${best}` : ''}`;
  }
  else                               modeLabel = `VS <b>${oc.name}</b>`;
  selectedSummaryEl.innerHTML =
    `<b>${pc.name}</b> · ${modeLabel} · <b>${chosenDifficulty.toUpperCase()}</b><br>` +
    `<code>U</code>=${pc.specialName} &nbsp; <code>I</code>=${pc.ultName}`;
}

difficultyRowEl.addEventListener('click', e => {
  const t = e.target.closest('.diff-btn');
  if (!t) return;
  chosenDifficulty = t.dataset.diff;
  refreshSelection();
});

modeRowEl.addEventListener('click', e => {
  const t = e.target.closest('.diff-btn');
  if (!t) return;
  chosenMode = t.dataset.mode;
  // Reset any in-flight network handshake when leaving online mode
  if (chosenMode !== 'online') net.teardown();
  refreshSelection();
});

// ===== WebRTC peer-to-peer connection layer =====
// Uses copy-paste signaling (no signaling server needed). Both peers exchange
// SDP blobs by hand — one click to copy, one paste each direction.
const NET_INPUT_DELAY = 4;     // ~66ms — buffer to absorb wire jitter
const NET_STALL_GIVEUP = 600;  // 10s of no remote input → declare disconnect
const net = {
  role: null,            // 'host' | 'join' | null
  pc: null,              // RTCPeerConnection
  channel: null,         // RTCDataChannel
  connected: false,
  remoteReady: false,    // true once the DataChannel is open both ways

  // Online-match state (only valid while isOnline is true)
  isOnline: false,
  netFrame: 0,
  localBuf: new Map(),   // sim frame → input snapshot we will apply
  remoteBuf: new Map(),  // sim frame → input snapshot from remote
  stallFrames: 0,
  remotePick: null,      // remote peer's chosen character id
  matchSeed: 0,          // shared rng seed
  hostChar: null,        // canonical host pick during a match
  joinChar: null,        // canonical join pick during a match

  setStatus(text, kind) {
    netStatusEl.textContent = text;
    netStatusEl.classList.remove('ok', 'bad', 'busy');
    if (kind) netStatusEl.classList.add(kind);
  },

  teardown() {
    try { if (this.channel) this.channel.close(); } catch {}
    try { if (this.pc) this.pc.close(); } catch {}
    this.pc = null;
    this.channel = null;
    this.connected = false;
    this.remoteReady = false;
    this.role = null;
    this.isOnline = false;
    this.remotePick = null;
    this.localBuf.clear();
    this.remoteBuf.clear();
    this.netFrame = 0;
    this.stallFrames = 0;
    disableRng();
    netHostFlowEl.classList.add('hidden');
    netJoinFlowEl.classList.add('hidden');
    netHostBtn.disabled = false;
    netJoinBtn.disabled = false;
    netHostConnectBtn.disabled = false;
    netJoinGenerateBtn.disabled = false;
    netHostOfferTA.value = '';
    netHostAnswerTA.value = '';
    netJoinOfferTA.value = '';
    netJoinAnswerTA.value = '';
    this.setStatus('Not connected.', null);
  },

  // Build an RTCPeerConnection with Google's free public STUN.
  _newPC() {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
    pc.onconnectionstatechange = () => {
      if (!this.pc) return;
      const s = pc.connectionState;
      if (s === 'connected')      this.setStatus('Peer connected. Waiting on data channel...', 'busy');
      else if (s === 'failed')    this.setStatus('Connection failed.', 'bad');
      else if (s === 'disconnected') this.setStatus('Disconnected.', 'bad');
      else if (s === 'closed')    this.setStatus('Connection closed.', 'bad');
    };
    return pc;
  },

  _wireChannel(ch) {
    this.channel = ch;
    ch.onopen = () => {
      this.connected = true;
      this.remoteReady = true;
      this.setStatus('Connected. Ready to fight!', 'ok');
      refreshSelection();
      // Send our character pick so the remote knows what to spawn
      this.send({ t: 'pick', char: chosenPlayerId });
    };
    ch.onclose = () => {
      this.connected = false;
      this.remoteReady = false;
      this.setStatus('Disconnected.', 'bad');
      refreshSelection();
      if (this.isOnline) handleRemoteDisconnect();
    };
    ch.onmessage = (ev) => this._handleMessage(ev.data);
  },

  _handleMessage(data) {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }
    switch (msg.t) {
      case 'pick':
        this.remotePick = msg.char;
        refreshSelection();
        break;
      case 'start':
        // Only join consumes start (host initiated it locally)
        if (this.role === 'join') {
          startOnlineMatch(msg.seed, msg.hostChar, msg.joinChar);
        }
        break;
      case 'i':
        // Discard inputs for frames already simulated (would be no-ops anyway)
        if (msg.f >= this.netFrame) this.remoteBuf.set(msg.f, msg.in);
        break;
      case 'menu':
        // Remote signaled match end / back-to-menu
        if (this.isOnline) showMenu();
        this.isOnline = false;
        break;
    }
  },

  // Wait for ICE gathering so we ship a single bundle SDP (no trickle ICE needed).
  _waitForIce(pc) {
    return new Promise(resolve => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', check);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', check);
      // Hard timeout — most networks finish in <2s
      setTimeout(resolve, 4000);
    });
  },

  encodeSdp(desc) {
    return btoa(JSON.stringify({ type: desc.type, sdp: desc.sdp }));
  },

  decodeSdp(text) {
    try { return JSON.parse(atob(text.trim())); }
    catch (e) { return null; }
  },

  async startHost() {
    this.role = 'host';
    netHostConnectBtn.disabled = false;   // fresh flow — allow applying an answer
    this.pc = this._newPC();
    // Host creates the data channel
    const ch = this.pc.createDataChannel('fight', { ordered: true });
    this._wireChannel(ch);

    this.setStatus('Generating code...', 'busy');
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this._waitForIce(this.pc);
    netHostOfferTA.value = this.encodeSdp(this.pc.localDescription);
    this.setStatus('Send the code above to your friend. Paste their reply below.', 'busy');
  },

  async hostApplyAnswer() {
    if (!this.pc) {
      this.setStatus('Click HOST GAME first.', 'bad');
      return;
    }
    // The answer can only be applied while we're waiting on it. If the
    // connection is already past that point, the answer was applied before
    // (e.g. the button got clicked twice) — treat it as success instead of
    // throwing "setRemoteDescription ... wrong state: stable".
    if (this.pc.signalingState !== 'have-local-offer') {
      netHostConnectBtn.disabled = true;
      this.setStatus(this.connected
        ? 'Connected. Host can press START FIGHT.'
        : 'Response already applied — connecting...', this.connected ? 'ok' : 'busy');
      return;
    }
    const decoded = this.decodeSdp(netHostAnswerTA.value);
    if (!decoded || decoded.type !== 'answer') {
      this.setStatus('Response code looks invalid.', 'bad');
      return;
    }
    try {
      await this.pc.setRemoteDescription(decoded);
      netHostConnectBtn.disabled = true;          // prevent a second apply
      this.setStatus('Connecting...', 'busy');
    } catch (e) {
      this.setStatus('Failed to apply response: ' + e.message, 'bad');
    }
  },

  async startJoin() {
    this.role = 'join';
    netJoinGenerateBtn.disabled = false;  // fresh flow — allow generating a response
    this.pc = this._newPC();
    this.pc.ondatachannel = (ev) => { this._wireChannel(ev.channel); };
    this.setStatus('Paste the host\'s code below.', 'busy');
  },

  async joinApplyOfferAndAnswer() {
    if (!this.pc) {
      this.setStatus('Click JOIN GAME first.', 'bad');
      return;
    }
    // Already produced an answer? Don't run the handshake again (a second
    // click would call setRemoteDescription in the wrong state).
    if (this.pc.currentLocalDescription &&
        this.pc.currentLocalDescription.type === 'answer') {
      this.setStatus('Response already generated — send it back to the host.', 'busy');
      return;
    }
    const decoded = this.decodeSdp(netJoinOfferTA.value);
    if (!decoded || decoded.type !== 'offer') {
      this.setStatus('Host code looks invalid.', 'bad');
      return;
    }
    try {
      await this.pc.setRemoteDescription(decoded);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      await this._waitForIce(this.pc);
      netJoinAnswerTA.value = this.encodeSdp(this.pc.localDescription);
      netJoinGenerateBtn.disabled = true;          // prevent a second handshake
      this.setStatus('Send the response code above back to the host.', 'busy');
    } catch (e) {
      this.setStatus('Failed: ' + e.message, 'bad');
    }
  },

  send(obj) {
    if (!this.connected || !this.channel) return;
    try { this.channel.send(JSON.stringify(obj)); } catch {}
  },
};

// ===== Online UI wiring =====
netHostBtn.addEventListener('click', () => {
  netHostBtn.disabled = true;
  netJoinBtn.disabled = true;
  netHostFlowEl.classList.remove('hidden');
  net.startHost();
});

netJoinBtn.addEventListener('click', () => {
  netHostBtn.disabled = true;
  netJoinBtn.disabled = true;
  netJoinFlowEl.classList.remove('hidden');
  net.startJoin();
});

netHostConnectBtn.addEventListener('click', () => { net.hostApplyAnswer(); });
netJoinGenerateBtn.addEventListener('click', () => { net.joinApplyOfferAndAnswer(); });

function copyTextareaToClipboard(ta) {
  ta.select();
  ta.setSelectionRange(0, 9999);
  try { document.execCommand('copy'); } catch {}
  if (navigator.clipboard && ta.value) navigator.clipboard.writeText(ta.value).catch(() => {});
}
netCopyOfferBtn.addEventListener('click', () => copyTextareaToClipboard(netHostOfferTA));
netCopyAnswerBtn.addEventListener('click', () => copyTextareaToClipboard(netJoinAnswerTA));

// ===== Settings UI wiring =====
// Pretty-print a key value for the keybind buttons. ' ' → 'SPACE' etc.
function keyDisplayName(k) {
  if (k === ' ') return 'SPACE';
  if (k.length === 1) return k.toUpperCase();
  return k.toUpperCase();
}

// Push the current SETTINGS into all the visible controls. Called at boot
// and whenever a setting changes so the UI stays in sync.
function applySettings() {
  // Shake slider
  settingShakeEl.value = String(Math.round(SETTINGS.shake * 100));
  settingShakeValEl.textContent = Math.round(SETTINGS.shake * 100) + '%';
  // Particles button group
  for (const btn of settingParticlesEl.children) {
    btn.classList.toggle('selected', btn.dataset.particles === SETTINGS.particles);
  }
  // Hint button group + actual hint bar visibility
  for (const btn of settingHintEl.children) {
    const want = SETTINGS.hintBar ? 'show' : 'hide';
    btn.classList.toggle('selected', btn.dataset.hint === want);
  }
  controlsEl.classList.toggle('hidden', !SETTINGS.hintBar);
  // Fast Mode button group
  if (settingFastEl) {
    const want = SETTINGS.fastMode ? 'on' : 'off';
    for (const btn of settingFastEl.children) {
      btn.classList.toggle('selected', btn.dataset.fast === want);
    }
  }
  // Key bindings — update each button's label
  for (const btn of settingKeybindsEl.children) {
    const action = btn.dataset.action;
    const span = btn.querySelector('span');
    if (span && SETTINGS.keymap[action]) span.textContent = keyDisplayName(SETTINGS.keymap[action]);
  }
}
applySettings();

// SETTINGS toggle button — show/hide the panel
settingsToggleBtn.addEventListener('click', () => {
  settingsPanelEl.classList.toggle('hidden');
});

// Shake slider
settingShakeEl.addEventListener('input', () => {
  SETTINGS.shake = Math.max(0, Math.min(1, parseInt(settingShakeEl.value, 10) / 100));
  settingShakeValEl.textContent = Math.round(SETTINGS.shake * 100) + '%';
  saveSettings();
});

// Particles button group
settingParticlesEl.addEventListener('click', e => {
  const btn = e.target.closest('.settings-btn');
  if (!btn) return;
  SETTINGS.particles = btn.dataset.particles;
  for (const b of settingParticlesEl.children) {
    b.classList.toggle('selected', b === btn);
  }
  saveSettings();
});

// Fast Mode toggle
if (settingFastEl) {
  settingFastEl.addEventListener('click', e => {
    const btn = e.target.closest('.settings-btn');
    if (!btn) return;
    SETTINGS.fastMode = btn.dataset.fast === 'on';
    for (const b of settingFastEl.children) {
      b.classList.toggle('selected', b === btn);
    }
    saveSettings();
  });
}

// Hint bar toggle
settingHintEl.addEventListener('click', e => {
  const btn = e.target.closest('.settings-btn');
  if (!btn) return;
  SETTINGS.hintBar = btn.dataset.hint === 'show';
  for (const b of settingHintEl.children) {
    b.classList.toggle('selected', b === btn);
  }
  controlsEl.classList.toggle('hidden', !SETTINGS.hintBar);
  saveSettings();
});

// Key remapping — click a binding button to enter "press a key" mode.
// Keys reserved for movement / menu navigation are rejected.
let listeningForKeybind = null;   // action name being rebound, or null
const RESERVED_KEYS = new Set(['a', 'd', 'w', 'escape', 'tab', 'enter', 'shift', 'control', 'alt', 'meta']);

settingKeybindsEl.addEventListener('click', e => {
  const btn = e.target.closest('.settings-keybind');
  if (!btn) return;
  // Cancel any prior listening state
  for (const b of settingKeybindsEl.children) b.classList.remove('listening');
  listeningForKeybind = btn.dataset.action;
  btn.classList.add('listening');
  const span = btn.querySelector('span');
  if (span) span.textContent = '...';
});

settingKeysResetBtn.addEventListener('click', () => {
  SETTINGS.keymap = { ...DEFAULT_KEYMAP };
  listeningForKeybind = null;
  for (const b of settingKeybindsEl.children) b.classList.remove('listening');
  applySettings();
  saveSettings();
});

// Reset secret-character unlock — wipes localStorage flag and removes from the roster.
settingResetGojoBtn.addEventListener('click', () => {
  if (!confirm('Reset VOID unlock? You\'ll have to enter the cheat code again.')) return;
  try { localStorage.removeItem(GOJO_LS_KEY); } catch {}
  ROSTER_ORDER = BASE_ROSTER.slice();
  if (chosenPlayerId === 'gojo') chosenPlayerId = 'shadow';
  if (chosenOpponentId === 'gojo') chosenOpponentId = 'lebron';
  buildRoster();
});

startBtn.addEventListener('click', () => {
  if (chosenMode === 'online') {
    if (!net.connected) {
      net.setStatus('Connect to a peer first!', 'bad');
      return;
    }
    if (net.role !== 'host') {
      net.setStatus('Only the host can start the fight.', 'busy');
      return;
    }
    if (!net.remotePick) {
      net.setStatus('Waiting on opponent\'s character pick...', 'busy');
      return;
    }
    // Host: pick a seed, broadcast start, then begin locally
    const seed = ((Math.random() * 0x7fffffff) | 0) || 1;
    const hostChar = chosenPlayerId;
    const joinChar = net.remotePick;
    net.send({ t: 'start', seed, hostChar, joinChar });
    startOnlineMatch(seed, hostChar, joinChar);
    return;
  }
  if (chosenMode === 'tower') {
    startTowerFromMenu();
    return;
  }
  resetMatch();
});

function showMenu() {
  state.phase = 'menu';
  overlay.classList.add('hidden');
  menuEl.classList.remove('hidden');
  fightViewEl.classList.add('hidden');
  // Clear any in-flight transitional state from a previous match
  state.suddenDeath = false;
  suddenDeathCountdown = null;
  hackerChallenge = null;
  hackerCodeBuf = '';
  state.timeStop = null;
  // Drop online-match state but keep the WebRTC channel alive for a rematch
  if (net.isOnline) { net.isOnline = false; disableRng(); }
  refreshSelection();
}

// ===== Main loop =====
let lastTime = 0;
function loop(t) {
  const dt = t - lastTime;
  lastTime = t;
  frameCount++;

  if (state.phase === 'menu') {
    renderPortraits();
    requestAnimationFrame(loop);
    return;
  }

  // Decide whether to advance the simulation this rAF tick. Offline always
  // does; online requires both peers' inputs for the current sim frame.
  let canSim = true;

  if (net.isOnline && state.phase === 'fighting') {
    // Capture local input and schedule it DELAY frames in the future so the
    // remote has time to receive it before that frame ticks. Send over the wire.
    const sendFrame = net.netFrame + NET_INPUT_DELAY;
    if (!net.localBuf.has(sendFrame)) {
      const inp = readLocalInputs();
      net.localBuf.set(sendFrame, inp);
      net.send({ t: 'i', f: sendFrame, in: inp });
    }
    // Advance only when BOTH sides' inputs are available for the current frame.
    if (net.localBuf.has(net.netFrame) && net.remoteBuf.has(net.netFrame)) {
      applyInputs(player, net.localBuf.get(net.netFrame));
      applyInputs(opponent, net.remoteBuf.get(net.netFrame));
      // GC stale buffer entries
      net.localBuf.delete(net.netFrame - 60);
      net.remoteBuf.delete(net.netFrame - 60);
      net.netFrame++;
      net.stallFrames = 0;
    } else {
      canSim = false;
      net.stallFrames++;
      if (net.stallFrames > NET_STALL_GIVEUP) handleRemoteDisconnect();
    }
  } else if (!net.isOnline) {
    handleInput();
    // While time is stopped only the actor (always the player in our cases)
    // gets to act — the frozen opponent's AI must not run.
    if (!timeStopActor()) updateOpponentAI();
  }

  qteTick();
  tickLastStandCountdown();
  tickSuddenDeathCountdown();

  // Admin cheats — applied every tick (even while frozen) so the values hold.
  if (admin.open && state.phase === 'fighting' && player) {
    if (admin.infHealth) { player.hp = player.maxHp; player.regenLockout = 0; }
    if (admin.infUlt)    { player.ult = player.ultMax; }
    if (admin.infSpecial){ player.specialCD = 0; }
  }

  const tsActor = timeStopActor();
  if (canSim && state.phase === 'fighting' && state.hitstop <= 0 && tsActor) {
    // ===== Frozen-world frame: only the actor + its projectiles advance =====
    // Re-resolve the target every frame: in tower multi-enemy the primary
    // `opponent` can be swapped/killed, leaving state.timeStop.target a stale
    // pointer to a corpse. Re-bind to a live foe (or end the freeze if none).
    let tsTarget = state.timeStop && state.timeStop.target;
    if (!tsTarget || tsTarget.hp <= 0) {
      if (tsActor === player) {
        const live = aliveEnemies();
        tsTarget = live.length
          ? live.reduce((a, b) => Math.abs(a.x - player.x) < Math.abs(b.x - player.x) ? a : b)
          : null;
      } else {
        tsTarget = (player && player.hp > 0) ? player : null;
      }
      if (state.timeStop) state.timeStop.target = tsTarget;
    }
    if (!tsTarget) {
      // No valid victim left — bank nothing, just end the freeze cleanly.
      endTimeStop();
    } else {
      tsActor.update(tsTarget);
      tsActor.tickAttackHits([tsTarget]);
    if (state.timeStop.accum) {
      // SYSTEM HALT: ALL projectiles (both sides) are frozen mid-air — none
      // update or expire. They resume exactly where they were when time
      // resumes. The Hacker's special also rapid-recharges: ready in ~1s
      // regardless of its normal cooldown. Normal CD resumes after the halt.
      tsActor.specialCD = Math.max(0, tsActor.specialCD - tsActor.specialCDMax / 60);
    } else {
      // Admin freeze: only the actor's own projectiles keep flying.
      for (const pr of projectiles) if (pr.owner === tsActor) pr.update();
      for (let i = projectiles.length - 1; i >= 0; i--) {
        if (projectiles[i].life <= 0) projectiles.splice(i, 1);
      }
    }
      if (state.timeStop.frames > 0) {
        state.timeStop.frames--;
        if (state.timeStop.frames <= 0) endTimeStop();
      }
    }
    updateHealthBars();
    updateSpecialBars();
    updateUltBars();
    tickHackerChallenge();
    checkRoundEnd();
  } else if (canSim && state.phase === 'fighting' && state.hitstop <= 0) {
    if (net.isOnline) {
      // Canonical update order on both peers for lockstep determinism
      hostFighter.update(joinFighter);
      joinFighter.update(hostFighter);
      hostFighter.tickAttackHits([joinFighter]);
      joinFighter.tickAttackHits([hostFighter]);
    } else {
      const enemies = allEnemies();
      // Pick primary target for the player's facing/AI focus: closest alive enemy
      let primary = opponent;
      if (extraEnemies.length > 0) {
        const alive = aliveEnemies();
        if (alive.length > 0) {
          primary = alive.reduce((a, b) =>
            Math.abs(a.x - player.x) < Math.abs(b.x - player.x) ? a : b);
        }
      }
      player.update(primary);
      for (const e of enemies) e.update(player);

      // Hit checks: player can hit ALL enemies in one swing; each enemy only
      // checks against the player.
      player.tickAttackHits(enemies);
      for (const e of enemies) e.tickAttackHits([player]);

      // Soft separation so enemies don't stack into a single sprite column
      if (extraEnemies.length > 0) {
        for (let i = 0; i < enemies.length; i++) {
          for (let j = i + 1; j < enemies.length; j++) {
            const a = enemies[i], b = enemies[j];
            if (a.proneTimer > 0 || b.proneTimer > 0) continue;
            const gap = a.x - b.x;
            if (Math.abs(gap) < 40) {
              const push = (40 - Math.abs(gap)) * 0.25;
              a.x += Math.sign(gap || 1) * push;
              b.x -= Math.sign(gap || 1) * push;
            }
          }
        }
      }

      // HUD primary auto-promotion: if the bar-tracked opponent has died but
      // any extra enemy is still alive, swap the pointer so the right-side
      // health/special/ult bars reflect a real threat instead of 0%.
      if (extraEnemies.length > 0 && opponent && opponent.hp <= 0) {
        const idx = extraEnemies.findIndex(e => e.hp > 0);
        if (idx >= 0) {
          const newPrimary = extraEnemies[idx];
          extraEnemies.splice(idx, 1);
          extraEnemies.push(opponent);
          opponent = newPrimary;
          opponentNameEl.textContent = opponent.name || 'OPP';
        }
      }
    }

    for (const pr of projectiles) pr.update();
    for (let i = projectiles.length - 1; i >= 0; i--) {
      if (projectiles[i].life <= 0) projectiles.splice(i, 1);
    }

    // Trigger hitstop when any fighter just registered a hit (flash hits 9 on
    // the frame after takeHit ran).
    let anyHit = player.hitFlash === 9 || (opponent && opponent.hitFlash === 9);
    if (!anyHit) for (const e of extraEnemies) if (e.hitFlash === 9) { anyHit = true; break; }
    if (anyHit) state.hitstop = 4;

    state.timerTick++;
    if (state.timerTick >= 60) {
      state.timerTick = 0;
      // Tower mode has no round timer — show infinity instead of counting down.
      if (chosenMode === 'tower') {
        timerEl.textContent = '∞';
      } else {
        state.timer--;
        timerEl.textContent = String(Math.max(0, state.timer)).padStart(2, '0');
      }
    }

    updateHealthBars();
    updateSpecialBars();
    updateUltBars();
    tickHackerChallenge();
    checkRoundEnd();
  }

  // Hitstop must only tick on sim frames so both peers see identical pause length
  if (canSim && state.hitstop > 0) state.hitstop--;

  for (const p of globalParticles) p.update();
  for (let i = globalParticles.length - 1; i >= 0; i--) {
    if (globalParticles[i].life <= 0) globalParticles.splice(i, 1);
  }
  // tick cast rings
  for (const r of castRings) r.t++;
  for (let i = castRings.length - 1; i >= 0; i--) {
    if (castRings[i].t >= castRings[i].life) castRings.splice(i, 1);
  }

  // ===== Render =====
  drawBackground();

  // Animated foreground silhouettes. Halved from 30 → 15 (spaced 2× wider) so
  // the look is preserved while per-frame arc/rect work is cut in half. Fast
  // mode skips them entirely.
  if (!SETTINGS.fastMode) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for (let i = 0; i < 15; i++) {
      const cx = (i * 66 + Math.sin(t / 600 + i) * 4) % W;
      ctx.beginPath();
      ctx.arc(cx, GROUND_Y - 6 + Math.sin(t / 300 + i) * 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(cx - 8, GROUND_Y - 4, 16, 14);
    }
  }

  // Per-character all-out background effects (sky darken etc.)
  drawAllOutBackdrop(ctx);

  if (player && opponent) {
    drawProneFighter(ctx, player);
    if (player.proneTimer <= 0) player.draw(ctx);
    for (const e of allEnemies()) {
      drawProneFighter(ctx, e);
      if (e.proneTimer <= 0) e.draw(ctx);
    }
  }

  // Per-character all-out foreground props (van, dozer, backboard, agents)
  drawAllOutProps(ctx);
  // Ultimate-state visual orbs (Hollow Purple charge)
  drawUltProps(ctx);

  for (const pr of projectiles) pr.draw(ctx);
  for (const p of globalParticles) p.draw(ctx);

  // Parry budget HUD — three diamonds above the player
  if (player) drawParryBudget(ctx, player, 'left');
  if (opponent) drawParryBudget(ctx, opponent, 'right');

  if (player && player.taunting > 0) drawFloatingText('GET REKT', player.x, player.y - 110, '#ffd34d');
  if (opponent && opponent.taunting > 0) drawFloatingText(opponent.tauntText || 'HA!', opponent.x, opponent.y - 110, '#fdb927');

  // Multi-enemy mini HUD: tiny floating HP bar + name above each enemy in
  // tower multi-enemy floors. The main HUD only shows the primary opponent,
  // so this is how the player tracks the rest.
  if (extraEnemies.length > 0 && player && opponent) {
    for (const e of allEnemies()) drawEnemyFloatingHpBar(ctx, e);
  }

  // Per-fighter damage bar drawn beneath the feet — always-on read of
  // each fighter's HP, separate from the main top HUD.
  if (player) drawUnderDamageBar(ctx, player);
  if (opponent) drawUnderDamageBar(ctx, opponent);
  for (const e of extraEnemies) drawUnderDamageBar(ctx, e);

  // Ultimate radial shockwave at cast point
  // Cast rings (drawn under ult radial)
  // Cast rings: outer stroke is the dominant visual; the inner thin ring is a
  // nice touch but costs another full arc+stroke per ring per frame. Skip the
  // inner ring in fast mode (cuts cast-ring render work in half).
  const fastCast = SETTINGS.fastMode;
  for (const r of castRings) {
    const ratio = r.t / r.life;
    const radius = ratio * r.maxR;
    ctx.save();
    ctx.globalAlpha = 1 - ratio;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = r.thick;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    if (!fastCast) {
      ctx.lineWidth = Math.max(1, r.thick * 0.4);
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius * 0.72, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (ultRadial && ultRadial.t > 0) {
    const r = (1 - ultRadial.t / 30) * 280;
    ctx.save();
    ctx.strokeStyle = ultRadial.color;
    ctx.lineWidth = 6;
    ctx.globalAlpha = ultRadial.t / 30;
    ctx.beginPath();
    ctx.arc(ultRadial.x, ultRadial.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ultRadial.x, ultRadial.y, r * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
    ultRadial.t--;
    if (ultRadial.t <= 0) ultRadial = null;
  }

  // HACKER SYSTEM HALT — ticking green clock, on screen ~0.5s after the ult.
  if (hackerClock > 0) {
    const k = hackerClock / 30;                // 1 → 0
    const cx = W / 2, cy = H / 2 - 30, R = 46;
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 1.6);    // hold then fade out
    // glow — shadowBlur is GPU-expensive; skip it in fast mode.
    if (!SETTINGS.fastMode) {
      ctx.shadowColor = '#39ff14';
      ctx.shadowBlur = 18;
    }
    // face
    ctx.fillStyle = 'rgba(4, 16, 8, 0.85)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    // rim
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    // tick marks
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r1 = i % 3 === 0 ? R - 12 : R - 7;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4));
      ctx.stroke();
    }
    // sweeping second hand — full rotation across the 0.5s window
    const sweep = (1 - k) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#aaffaa';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sweep) * (R - 12), cy + Math.sin(sweep) * (R - 12));
    ctx.stroke();
    // short hour hand (static-ish)
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - R * 0.42);
    ctx.stroke();
    // hub
    ctx.fillStyle = '#eaffea';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    hackerClock--;
  }

  // Ultimate screen flash
  if (screenFlash > 0) {
    ctx.fillStyle = screenFlashColor;
    ctx.globalAlpha = Math.min(1, screenFlash / 36) * 0.7;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    screenFlash--;
  }

  // Ultimate name banner
  if (ultBanner && ultBanner.t > 0) {
    const life = ultBanner.t / 90;
    const easeIn = Math.min(1, (1 - life) * 4);          // slide-in over first 22f
    const easeOut = life < 0.25 ? life * 4 : 1;          // fade-out last 22f
    const slide = ultBanner.side === 'left' ? -1 : 1;
    const bx = W / 2 + (1 - easeIn) * slide * W / 2;
    const by = H / 2 - 40;
    ctx.save();
    ctx.globalAlpha = easeOut;
    ctx.translate(bx, by);
    // dark band
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-W / 2, -34, W, 68);
    // outline bars
    ctx.fillStyle = ultBanner.color;
    ctx.fillRect(-W / 2, -34, W, 4);
    ctx.fillRect(-W / 2, 30, W, 4);
    // text
    ctx.font = 'bold 54px Impact';
    ctx.textAlign = 'center';
    ctx.fillStyle = ultBanner.color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.strokeText(ultBanner.name, 0, 14);
    ctx.fillText(ultBanner.name, 0, 14);
    ctx.restore();
    ultBanner.t--;
    if (ultBanner.t <= 0) ultBanner = null;
  }

  // QTE / Last-Stand overlays
  if (qte) drawQTE(ctx);
  if (lastStandCountdown) drawLastStandCountdown(ctx);
  // Sudden death banner — only while actually fighting; suppress after match end.
  if (state.suddenDeath && state.phase === 'fighting') drawSuddenDeath(ctx);
  // Sudden death pre-fight countdown overlay
  drawSuddenDeathCountdown(ctx);
  // Online stall indicator — surface only if the wait is noticeable
  if (net.isOnline && net.stallFrames > 30) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(W / 2 - 220, H / 2 - 38, 440, 76);
    ctx.font = 'bold 28px Impact';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd34d';
    ctx.fillText('WAITING FOR OPPONENT...', W / 2, H / 2 + 2);
    ctx.font = '14px Arial';
    ctx.fillStyle = '#d0c8e8';
    const secs = (net.stallFrames / 60).toFixed(1);
    ctx.fillText(secs + 's', W / 2, H / 2 + 24);
    ctx.restore();
  }

  requestAnimationFrame(loop);
}

function drawParryBudget(ctx, f, side) {
  if (!f) return;
  const x = f.x;
  const baseY = f.y - 145;
  ctx.save();
  for (let i = 0; i < 3; i++) {
    const cx = x - 16 + i * 16;
    const lit = i < f.parriesLeft;
    ctx.fillStyle = lit ? '#7df9ff' : '#22334a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, baseY - 6);
    ctx.lineTo(cx + 5, baseY);
    ctx.lineTo(cx, baseY + 6);
    ctx.lineTo(cx - 5, baseY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // Auto-regen progress bar when fully empty.
  if (f.parriesLeft <= 0 && f.parryRegen > 0) {
    const pct = 1 - (f.parryRegen / 360);
    const w = 44;
    const xL = x - w / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(xL, baseY + 9, w, 4);
    ctx.fillStyle = '#7df9ff';
    ctx.fillRect(xL, baseY + 9, w * pct, 4);
  }
  ctx.restore();
}

function drawSuddenDeath(ctx) {
  ctx.save();
  const pulse = (Math.sin(frameCount * 0.3) + 1) * 0.5;
  ctx.fillStyle = `rgba(255, 30, 30, ${0.05 + 0.05 * pulse})`;
  ctx.fillRect(0, 0, W, H);
  ctx.font = 'bold 36px Impact';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3a3a';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 5;
  ctx.strokeText('SUDDEN DEATH — FIRST HIT WINS', W / 2, 50);
  ctx.fillText('SUDDEN DEATH — FIRST HIT WINS', W / 2, 50);
  ctx.restore();
}

// ===== All-out background (sky darken, vignette, etc.) =====
function drawAllOutBackdrop(ctx) {
  const f = (player && player.allOutState) ? player : (opponent && opponent.allOutState ? opponent : null);
  if (!f) return;
  const s = f.allOutState;
  if (s.kind === 'stormCaller') {
    ctx.fillStyle = `rgba(10, 10, 30, ${0.7 * (s.sky || 0)})`;
    ctx.fillRect(0, 0, W, H);
  } else if (s.kind === 'shadowStorm') {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.55, s.t / 60)})`;
    ctx.fillRect(0, 0, W, H);
    // red vignette stripes
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(204, 34, 34, ${0.08 - i * 0.012})`;
      ctx.fillRect(0, i * 80, W, 30);
    }
  } else if (s.kind === 'crownSun' && s.t < 30) {
    ctx.fillStyle = `rgba(255, 248, 192, ${s.t / 30 * 0.9})`;
    ctx.fillRect(0, 0, W, H);
  } else if (s.kind === 'secretService' && s.t < 40) {
    ctx.fillStyle = `rgba(0, 0, 0, ${s.t / 40 * 0.6})`;
    ctx.fillRect(0, 0, W, H);
    // searchlight
    ctx.save();
    const sx = f.x + Math.sin(s.t * 0.3) * 100;
    const grad = ctx.createRadialGradient(sx, GROUND_Y - 40, 30, sx, GROUND_Y - 40, 300);
    grad.addColorStop(0, 'rgba(255, 255, 200, 0.5)');
    grad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  } else if (s.kind === 'cataclysm' && s.t < 30) {
    ctx.fillStyle = `rgba(40, 0, 0, ${s.t / 30 * 0.4})`;
    ctx.fillRect(0, 0, W, H);
  } else if (s.kind === 'flambeFrenzy') {
    ctx.fillStyle = `rgba(60, 20, 0, ${Math.min(0.35, s.t / 100)})`;
    ctx.fillRect(0, 0, W, H);
  } else if (s.kind === 'demolitionDay' && s.t < 30) {
    ctx.fillStyle = `rgba(40, 30, 10, ${s.t / 30 * 0.4})`;
    ctx.fillRect(0, 0, W, H);
  } else if (s.kind === 'billionaireBarrage') {
    ctx.fillStyle = `rgba(0, 40, 20, ${Math.min(0.35, s.t / 100)})`;
    ctx.fillRect(0, 0, W, H);
  } else if (s.kind === 'hollowNuke') {
    // Build-up: darken the sky and add a purple wash that intensifies into Phase 3
    const dim = Math.min(0.75, s.t / 90);
    ctx.fillStyle = `rgba(8, 0, 20, ${dim})`;
    ctx.fillRect(0, 0, W, H);
    // Slow purple aurora rays radiating from caster
    if (s.t < 110) {
      ctx.save();
      const rays = 10;
      const t = frameCount * 0.04;
      for (let i = 0; i < rays; i++) {
        const a = i / rays * Math.PI * 2 + t;
        ctx.strokeStyle = `rgba(208, 77, 255, ${0.10 + 0.05 * Math.sin(a + s.t * 0.05)})`;
        ctx.lineWidth = 60;
        ctx.beginPath();
        ctx.moveTo(f.x, f.y - 60);
        ctx.lineTo(f.x + Math.cos(a) * 900, f.y - 60 + Math.sin(a) * 900);
        ctx.stroke();
      }
      ctx.restore();
    }
    // Phase 3+ explosion white-wash overlay
    if (s.t >= 100 && s.t < 200) {
      const k = Math.max(0, 1 - (s.t - 100) / 100);
      ctx.fillStyle = `rgba(255, 255, 255, ${k * 0.3})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

// ===== All-out foreground props (van, dozer, agents, backboard) =====
// Draw a pulsing target-shadow on the ground at (x, GROUND_Y) — used as a "telegraph"
// when the caster has teleported off-screen and is about to crash back down.
function drawGroundTarget(ctx, x, color, intensity = 1) {
  const pulse = (Math.sin(frameCount * 0.4) + 1) * 0.5;
  ctx.save();
  // Outer faded ring
  ctx.globalAlpha = 0.25 * intensity;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 2, 60 + pulse * 8, 14 + pulse * 3, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Bright inner ring
  ctx.globalAlpha = 0.55 * intensity + pulse * 0.35;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x, GROUND_Y + 2, 38, 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Crosshair
  ctx.beginPath();
  ctx.moveTo(x - 18, GROUND_Y + 2); ctx.lineTo(x + 18, GROUND_Y + 2);
  ctx.moveTo(x, GROUND_Y - 4); ctx.lineTo(x, GROUND_Y + 8);
  ctx.stroke();
  ctx.restore();
}

function drawAllOutProps(ctx) {
  for (const f of [player, opponent]) {
    if (!f || !f.allOutState) continue;
    const s = f.allOutState;
    // === Shadow slash marks ===
    if (s.kind === 'shadowStorm' && s.slashes) {
      for (const sl of s.slashes) {
        const k = 1 - sl.life / sl.maxLife;
        if (k <= 0) continue;
        ctx.save();
        ctx.translate(sl.x, sl.y);
        ctx.rotate(sl.angle);
        const w = sl.big ? 140 : 70;
        const h = sl.big ? 10 : 5;
        // outer red glow
        ctx.fillStyle = `rgba(255, 60, 60, ${0.45 * k})`;
        ctx.fillRect(-w / 2 - 4, -h / 2 - 2, w + 8, h + 4);
        // bright white core
        ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * k})`;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }
    }
    // === Universal: if caster has flown off-canvas above the screen,
    //     drop a ground-target indicator at their projected landing x.
    if (f.y < -10) {
      drawGroundTarget(ctx, f.x, f.accent || '#ffd34d', 1);
      // also draw a faint silhouette of the caster at the canvas top edge as an "incoming" cue
      ctx.save();
      const tx = Math.max(40, Math.min(W - 40, f.x));
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = f.accent || '#ffd34d';
      ctx.beginPath();
      ctx.moveTo(tx, 4);
      ctx.lineTo(tx - 14, 30);
      ctx.lineTo(tx + 14, 30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    if (s.kind === 'crownSun') {
      if (s.t >= 50) {
        // Flying backboard + rim above opponent
        const yOff = Math.min(0, (s.t - 50) * 14 - 280);
        const bx = s.boardX || f.x;
        ctx.save();
        // pole
        ctx.fillStyle = '#aaa';
        ctx.fillRect(bx - 4, yOff + 40, 8, 120);
        // backboard
        ctx.fillStyle = '#fff';
        ctx.fillRect(bx - 40, yOff, 80, 56);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx - 40, yOff, 80, 56);
        ctx.strokeRect(bx - 16, yOff + 14, 32, 24);
        // rim
        ctx.fillStyle = '#ff5a2e';
        ctx.fillRect(bx - 18, yOff + 56, 36, 4);
        // net
        ctx.strokeStyle = '#fff';
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(bx - 18 + i * 7, yOff + 60);
          ctx.lineTo(bx - 14 + i * 7, yOff + 86);
          ctx.stroke();
        }
        // sun rays in background
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 16; i++) {
          const a = i / 16 * Math.PI * 2 + s.t * 0.04;
          ctx.strokeStyle = '#fdb927';
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.moveTo(bx, yOff + 28);
          ctx.lineTo(bx + Math.cos(a) * 600, yOff + 28 + Math.sin(a) * 600);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }
    } else if (s.kind === 'secretService') {
      if (s.t >= 40 && s.vanX !== undefined) {
        const vx = s.vanX;
        const dir = s.dir;
        ctx.save();
        ctx.translate(vx, GROUND_Y - 4);
        ctx.scale(dir, 1);
        // body
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(-80, -70, 160, 56);
        // window
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(-60, -64, 110, 22);
        // hood
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(40, -50, 28, 36);
        // wheels
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(-50, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(50, 0, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#666';
        ctx.beginPath(); ctx.arc(-50, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(50, 0, 5, 0, Math.PI * 2); ctx.fill();
        // flashing red/blue lights
        const lightOn = (Math.floor(frameCount / 4) % 2 === 0);
        ctx.fillStyle = lightOn ? '#c81e2a' : '#1e2a52';
        ctx.fillRect(-30, -78, 24, 8);
        ctx.fillStyle = lightOn ? '#1e2a52' : '#c81e2a';
        ctx.fillRect(6, -78, 24, 8);
        // "SS" emblem
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Impact';
        ctx.textAlign = 'center';
        ctx.fillText('SS', 0, -36);
        ctx.restore();
      }
      // Agents
      if (s.agents) {
        for (const a of s.agents) {
          ctx.save();
          ctx.translate(a.x, a.y);
          // body
          ctx.fillStyle = '#0a0a0a';
          ctx.fillRect(-8, -40, 16, 40);
          // head
          ctx.fillStyle = '#f3c08a';
          ctx.fillRect(-6, -52, 12, 12);
          // glasses
          ctx.fillStyle = '#000';
          ctx.fillRect(-5, -48, 10, 3);
          // earpiece coil
          ctx.strokeStyle = '#888';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(5, -46); ctx.lineTo(8, -42);
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (s.kind === 'demolitionDay') {
      if (s.dozerX !== undefined && s.t >= 20 && s.t < 130) {
        const dx = s.dozerX;
        const dir = s.dir;
        ctx.save();
        ctx.translate(dx, GROUND_Y - 4);
        ctx.scale(dir, 1);
        // tracks
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(-60, -10, 120, 14);
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = '#444';
          ctx.fillRect(-60 + i * 16, -8, 12, 10);
        }
        // body
        ctx.fillStyle = '#d97a1a';
        ctx.fillRect(-50, -52, 100, 44);
        // cabin
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(-10, -76, 36, 24);
        // blade (front scraper)
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath();
        ctx.moveTo(50, -50);
        ctx.lineTo(86, -56);
        ctx.lineTo(86, 0);
        ctx.lineTo(50, -8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#7a4a08';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    } else if (s.kind === 'flambeFrenzy') {
      // Big falling pan from sky at s.panX
      if (s.panX !== undefined && s.t >= 130 && s.t < 155) {
        const yy = -100 + (s.t - 130) * 12;
        ctx.save();
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(s.panX - 80, yy, 160, 28);
        ctx.fillRect(s.panX - 90, yy + 8, 20, 12);  // handle
        ctx.fillStyle = '#444';
        ctx.fillRect(s.panX - 76, yy + 6, 152, 8);
        ctx.restore();
      }
    } else if (s.kind === 'cataclysm') {
      // Lava cracks across ground
      if (s.t >= 70) {
        ctx.save();
        ctx.fillStyle = '#ff5a2e';
        for (let i = 0; i < 8; i++) {
          const cxx = f.x - 200 + i * 50 + Math.sin(s.t * 0.1 + i) * 8;
          ctx.fillRect(cxx, GROUND_Y - 2, 14, 6);
        }
        ctx.restore();
      }
    } else if (s.kind === 'hollowNuke') {
      // === Charge-pose aura around Gojo during phases 1 & 2 ===
      if (s.t >= 1 && s.t < 100) {
        const pulse = (Math.sin(frameCount * 0.3) + 1) * 0.5;
        ctx.save();
        ctx.globalAlpha = 0.35 + pulse * 0.35;
        ctx.fillStyle = '#d04dff';
        ctx.beginPath();
        ctx.ellipse(f.x, f.y - 50, 50 + pulse * 8, 80 + pulse * 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(f.x, f.y - 50, 24, 38, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // === Three orbiting orbs during Phase 2 (50..100) ===
      if (s.orbs && s.t >= 50 && s.t < 100) {
        const orbR = s.orbR || 22;
        for (const o of s.orbs) {
          ctx.save();
          ctx.translate(o.x, o.y);
          // outer wash
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath(); ctx.arc(0, 0, orbR * 1.8, 0, Math.PI * 2); ctx.fill();
          // colored aura
          ctx.fillStyle = o.color;
          ctx.globalAlpha = 0.85;
          ctx.beginPath(); ctx.arc(0, 0, orbR, 0, Math.PI * 2); ctx.fill();
          // bright core
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(-orbR * 0.3, -orbR * 0.3, orbR * 0.35, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
      }
      // === Mushroom cloud silhouette during phase 4 (140..230) ===
      if (s.t >= 140 && s.t < 230) {
        const k = Math.min(1, (s.t - 140) / 70);
        const cx = f.x + (f.facing) * 240;
        const cy = GROUND_Y - 40 - k * 160;
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#d04dff';
        ctx.beginPath(); ctx.arc(cx, cy, 80 + k * 70, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(cx - 22, cy, 44, GROUND_Y - cy);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.45;
        ctx.beginPath(); ctx.arc(cx, cy, 60 + k * 40, 0, Math.PI * 2); ctx.fill();
        // top puff
        ctx.fillStyle = '#d04dff';
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(cx - 20, cy - 30, 40 + k * 30, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 30, cy - 25, 36 + k * 28, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    } else if (s.kind === 'billionaireBarrage') {
      // Tiny rocket behind Bezos
      if (s.t < 160) {
        const rx = f.x + (f.facing === 1 ? -60 : 60);
        const ry = GROUND_Y - 60 - Math.min(120, s.t * 1.6);
        ctx.save();
        ctx.translate(rx, ry);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(-10, -50, 20, 50);
        ctx.fillStyle = '#0c8a5e';
        ctx.beginPath();
        ctx.moveTo(0, -64);
        ctx.lineTo(10, -50);
        ctx.lineTo(-10, -50);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff5a2e';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(0, 14 + (s.t % 6));
        ctx.lineTo(8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

// ===== Ultimate-state props (e.g. Hollow Purple convergence) =====
function drawUltProps(ctx) {
  for (const f of [player, opponent]) {
    if (!f || !f.ultimateState) continue;
    const s = f.ultimateState;
    if (s.kind === 'hollowPurple' && s.phase === 'charge' && s.blueX !== undefined) {
      // Blue orb
      ctx.save();
      ctx.translate(s.blueX, s.blueY);
      ctx.fillStyle = 'rgba(125, 249, 255, 0.4)';
      ctx.beginPath(); ctx.arc(0, 0, s.size * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7df9ff';
      ctx.beginPath(); ctx.arc(0, 0, s.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-s.size * 0.3, -s.size * 0.3, s.size * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      // Red orb
      ctx.save();
      ctx.translate(s.redX, s.redY);
      ctx.fillStyle = 'rgba(255, 60, 60, 0.4)';
      ctx.beginPath(); ctx.arc(0, 0, s.size * 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff2020';
      ctx.beginPath(); ctx.arc(0, 0, s.size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffaaaa';
      ctx.beginPath(); ctx.arc(-s.size * 0.3, -s.size * 0.3, s.size * 0.35, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
}

// ===== Prone fighter drawing =====
// Floating mini HP bar + name above each enemy. Only used in multi-enemy
// tower floors where the main HUD bar can't represent everyone.
function drawEnemyFloatingHpBar(ctx, f) {
  if (!f || f.proneTimer > 0) return;
  const pct = Math.max(0, Math.min(1, f.hp / f.maxHp));
  const barW = 56, barH = 4;
  const x = f.x - barW / 2;
  const y = f.y - 132;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = pct > 0.5 ? '#7df96f' : pct > 0.25 ? '#ffd34d' : '#ff3a3a';
  ctx.fillRect(x, y, Math.round(barW * pct), barH);
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.fillStyle = '#ffd34d';
  ctx.strokeText(f.name, f.x, y - 4);
  ctx.fillText(f.name, f.x, y - 4);
}

// Damage bar drawn just below the fighter's feet. Shows current HP %.
// Width pulses with damage taken so the "I'm in trouble" signal is glanceable.
function drawUnderDamageBar(ctx, f) {
  if (!f || f.hp <= 0) return;
  if (f.proneTimer > 0) return;
  const pct = Math.max(0, Math.min(1, f.hp / f.maxHp));
  const barW = 60, barH = 5;
  const x = Math.round(f.x - barW / 2);
  const y = Math.round(GROUND_Y + 6);
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(x - 1, y - 1, barW + 2, barH + 2);
  ctx.fillStyle = '#1a0a0a';
  ctx.fillRect(x, y, barW, barH);
  ctx.fillStyle = pct > 0.5 ? '#7df96f' : pct > 0.25 ? '#ffd34d' : '#ff3a3a';
  ctx.fillRect(x, y, Math.round(barW * pct), barH);
}

function drawProneFighter(ctx, f) {
  if (!f || f.proneTimer <= 0) return;
  ctx.save();
  ctx.translate(f.x, GROUND_Y - 4);
  ctx.scale(-f.facing || 1, 1);
  // face-down body (rotated)
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, 4, 50, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = f.outfit;
  ctx.fillRect(-44, -16, 88, 16);
  ctx.fillStyle = f.skin;
  ctx.fillRect(-58, -16, 14, 14);  // head laid flat
  // "X" eyes
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-56, -12); ctx.lineTo(-52, -8);
  ctx.moveTo(-56, -8); ctx.lineTo(-52, -12);
  ctx.stroke();
  // "K.O." text floating
  if (f.proneTimer > 30) {
    ctx.font = 'bold 22px Impact';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3a3a';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText('K.O.', 0, -40);
    ctx.fillText('K.O.', 0, -40);
  }
  ctx.restore();
}

function drawFloatingText(text, x, y, color) {
  ctx.save();
  ctx.font = 'bold 22px Impact';
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Opponent occasional taunt — offline only. In online mode the opponent is
// a human; this setInterval would fire on independent wall-clocks on each
// peer and diverge sim state.
setInterval(() => {
  if (net.isOnline) return;
  if (state.phase === 'fighting' && opponent && opponent.hp > 0 && opponent.taunting <= 0 && rand() < 0.2) {
    opponent.taunting = 40;
  }
}, 4500);

// ===== Boot =====
buildRoster();
showMenu();
requestAnimationFrame(loop);
