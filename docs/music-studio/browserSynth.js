/**
 * 青鸾音乐合成引擎 - 浏览器版
 * 基于查表法（Wavetable）的纯前端实现
 */

const SAMPLE_RATE = 22050;
const DURATION = 42;
const TOTAL = SAMPLE_RATE * DURATION;
const BPM = 72;
const BEAT = 60 / BPM;
const SLOTS = 512;
const SLOT_DUR = DURATION / SLOTS;

function midiToFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

const NOISE = new Float32Array(65536);
for (let i = 0; i < 65536; i++) NOISE[i] = Math.random() * 2 - 1;
let nIdx = 0;
function noise() { return NOISE[(nIdx++) & 0xFFFF]; }

function mixIn(tL, tR, src, off, pan, gain) {
  const pl = Math.cos(pan * Math.PI / 2) * gain;
  const pr = Math.sin(pan * Math.PI / 2) * gain;
  const end = Math.min(TOTAL, off + src.length);
  for (let i = off, j = 0; i < end; i++, j++) { tL[i] += src[j] * pl; tR[i] += src[j] * pr; }
}
function mixMono(t, src, off, gain) {
  const end = Math.min(TOTAL, off + src.length);
  for (let i = off, j = 0; i < end; i++, j++) t[i] += src[j] * gain;
}

// 能量规划
const TARGET_ENERGY = new Float32Array(SLOTS);
function planEnergy() {
  for (let i = SLOTS - 80; i < SLOTS; i++) TARGET_ENERGY[i] = 0.4 * Math.pow(1 - (i - (SLOTS - 80)) / 80, 2);
  for (let i = 320; i < 432; i++) TARGET_ENERGY[i] = 0.3 + 0.7 * Math.sin((i - 320) / 112 * Math.PI);
  for (let i = 192; i < 320; i++) TARGET_ENERGY[i] = 0.1 + 0.5 * Math.pow((i - 192) / 128, 0.7);
  for (let i = 64; i < 192; i++) TARGET_ENERGY[i] = 0.08 + 0.12 * Math.sin((i - 64) / 128 * Math.PI * 2);
  for (let i = 0; i < 64; i++) TARGET_ENERGY[i] = 0.03 + 0.06 * (i / 64);
}
planEnergy();

function surpriseBudget(slot) {
  const r = slot / SLOTS;
  if (r < 0.125) return 0.92;
  if (r < 0.25) return 0.75;
  if (r < 0.375) return 0.45;
  if (r < 0.5) return 0.15;
  if (r < 0.625) return 0.35;
  return 0.88;
}

const SCALE = [0, 2, 4, 5, 7, 9, 11];
function inScale(midi) { return SCALE.includes(midi % 12); }
function consonance(p1, p2) {
  const diff = Math.abs(p1 - p2) % 12;
  return {0: 1.0, 3: 0.75, 4: 0.85, 5: 0.8, 7: 1.0, 8: 0.65, 9: 0.7}[diff] || -0.4;
}

const LYRIC_SLOTS = [
  { slot: 80, txt: '夜', tone: 4 },
  { slot: 88, txt: '色', tone: 4 },
  { slot: 96, txt: '轻', tone: 1 },
  { slot: 104, txt: '轻', tone: 1 },
  { slot: 112, txt: '落', tone: 4 },
  { slot: 120, txt: '梦', tone: 4 },
  { slot: 128, txt: '里', tone: 3 },
  { slot: 136, txt: '花', tone: 1 },
  { slot: 144, txt: '开', tone: 1 },
  { slot: 152, txt: '又', tone: 4 },
  { slot: 160, txt: '星', tone: 1 },
  { slot: 168, txt: '光', tone: 1 },
  { slot: 176, txt: '洒', tone: 3 },
  { slot: 184, txt: '满', tone: 3 },
  { slot: 200, txt: '天', tone: 1 },
  { slot: 208, txt: '涯', tone: 2 },
  { slot: 216, txt: '我', tone: 3 },
  { slot: 224, txt: '在', tone: 4 },
  { slot: 232, txt: '云', tone: 2 },
  { slot: 240, txt: '端', tone: 1 },
  { slot: 248, txt: '找', tone: 3 },
  { slot: 256, txt: '答', tone: 2 },
  { slot: 264, txt: '风', tone: 1 },
  { slot: 272, txt: '吹', tone: 1 },
  { slot: 280, txt: '过', tone: 4 },
  { slot: 288, txt: '的', tone: 0 },
  { slot: 296, txt: '沙', tone: 1 },
  { slot: 304, txt: '哑', tone: 3 },
  { slot: 320, txt: '是', tone: 4 },
  { slot: 328, txt: '谁', tone: 2 },
  { slot: 336, txt: '声', tone: 1 },
  { slot: 344, txt: '说', tone: 1 },
  { slot: 352, txt: '话', tone: 4 },
  { slot: 360, txt: '醒', tone: 3 },
  { slot: 368, txt: '时', tone: 2 },
  { slot: 376, txt: '分', tone: 1 },
  { slot: 384, txt: '泪', tone: 4 },
  { slot: 392, txt: '如', tone: 2 },
  { slot: 400, txt: '雨', tone: 3 },
  { slot: 408, txt: '下', tone: 4 },
  { slot: 424, txt: '境', tone: 4 },
  { slot: 432, txt: '中', tone: 1 },
  { slot: 440, txt: '家', tone: 1 },
];

// 涌现引擎
function generateEmergentNotes() {
  const field = new Array(SLOTS).fill(null).map(() => ({ pitch: -1, energy: 0, src: -1 }));
  for (const ls of LYRIC_SLOTS) {
    const base = 60 + (ls.tone === 1 ? 2 : ls.tone === 2 ? 4 : ls.tone === 3 ? -1 : ls.tone === 4 ? -3 : 0);
    field[ls.slot] = { pitch: base, energy: 0.6, src: -2 };
  }
  for (let iter = 0; iter < 120; iter++) {
    const nf = field.map(x => ({ ...x }));
    for (let s = 0; s < SLOTS; s++) {
      if (field[s].src === -2) continue;
      let bestE = field[s].energy, bestP = field[s].pitch;
      const neighbors = [s - 1, s + 1].filter(x => x >= 0 && x < SLOTS && field[x].pitch >= 0);
      for (const n of neighbors) {
        const cand = field[n].energy * 0.7;
        if (cand > bestE) { bestE = cand; bestP = field[n].pitch; }
      }
      if (field[s].pitch >= 0 && bestP >= 0) {
        const interval = Math.abs(field[s].pitch - bestP) % 12;
        const con = [0, 3, 4, 5, 7, 8, 9].includes(interval) ? 1.2 : 0.6;
        bestE = field[s].energy * 0.5 + bestE * 0.5 * con;
      }
      nf[s].energy = Math.max(0, bestE - 0.008);
      if (nf[s].pitch < 0 && bestP >= 0 && Math.random() < 0.15) {
        nf[s].pitch = bestP + (Math.random() < 0.5 ? 0 : (Math.random() < 0.5 ? 7 : 4));
        nf[s].src = s;
      }
      if (nf[s].energy > TARGET_ENERGY[s] * 1.3 && Math.random() < 0.25) {
        nf[s].pitch = nf[s].pitch >= 0 ? nf[s].pitch + (Math.random() < 0.5 ? 7 : 4) : bestP;
        nf[s].energy *= 0.6;
      }
      if (!inScale(nf[s].pitch)) nf[s].pitch += Math.random() < 0.5 ? 1 : -1;
      nf[s].pitch = Math.max(48, Math.min(84, nf[s].pitch));
    }
    for (let s = 0; s < SLOTS; s++) field[s] = nf[s];
  }
  const emergentNotes = [];
  let current = null;
  for (let s = 0; s < SLOTS; s++) {
    if (field[s].pitch >= 0) {
      if (!current || current.pitch !== field[s].pitch) {
        if (current) emergentNotes.push(current);
        current = { startSlot: s, endSlot: s, pitch: field[s].pitch, energy: field[s].energy };
      } else {
        current.endSlot = s;
        current.energy = Math.max(current.energy, field[s].energy);
      }
    } else {
      if (current) { emergentNotes.push(current); current = null; }
    }
  }
  if (current) emergentNotes.push(current);
  return { field, emergentNotes };
}

// 意识状态
function consciousness(slot) {
  const r = slot / SLOTS;
  if (r < 0.125) return { section: 'intro', trend: 'flat', next: 'seed' };
  if (r < 0.25) return { section: 'verse', trend: 'rising', next: 'build' };
  if (r < 0.375) return { section: 'build', trend: 'rising', next: 'climax' };
  if (r < 0.5) return { section: 'climax', trend: 'peak', next: 'release' };
  if (r < 0.625) return { section: 'release', trend: 'falling', next: 'coda' };
  return { section: 'coda', trend: 'falling', next: 'silence' };
}

let listenerEnergy = 0;
function updateListener(energy) { listenerEnergy += (energy - listenerEnergy) * 0.05; }
function perceivedIntensity(absEnergy) { return absEnergy / (listenerEnergy + 0.15); }

const SILENCES = [
  { slot: 64, type: 'structural', dur: 3, reverbTail: 0.5 },
  { slot: 192, type: 'digestive', dur: 4, reverbTail: 0.8 },
  { slot: 320, type: 'expectant', dur: 6, reverbTail: 1.2 },
  { slot: 432, type: 'dramatic', dur: 5, reverbTail: 1.0 },
  { slot: 480, type: 'terminal', dur: 32, reverbTail: 2.0 },
];
function isSilence(slot) {
  for (const s of SILENCES) { if (slot >= s.slot && slot < s.slot + s.dur) return s; }
  return null;
}

function computeBody(slot, energy, section) {
  const arc = TARGET_ENERGY[slot] || 0;
  const isBreath = !!isSilence(slot);
  const body = {
    lungPressure: 0.25 + arc * 0.75,
    vocalTension: 0.35 + arc * 0.55,
    vocalMass: 0.5 + (1 - arc) * 0.35,
    glottalClosure: 0.55 + arc * 0.4,
    tongueFront: 0, tongueHigh: 0.2, lipRound: 0.1,
    velumPosition: 0.15, jawOpen: 0.5, larynxHeight: arc * 0.4 - 0.2,
  };
  if (section === 'intro') { body.lungPressure *= 0.5; body.vocalTension *= 0.6; }
  if (section === 'climax') { body.vocalTension *= 1.2; body.glottalClosure *= 1.1; }
  if (section === 'coda') { body.lungPressure *= 0.6; body.glottalClosure *= 0.7; }
  if (isBreath) { body.lungPressure *= 0.6; body.glottalClosure *= 0.5; }
  return body;
}

function bodyToAcoustics(body, baseFreq) {
  return {
    amplitude: body.lungPressure * 0.8 + 0.2,
    freq: baseFreq * (1 + (body.vocalTension - 0.5) * 0.06),
    brightness: body.vocalTension * 0.6 + body.vocalMass * 0.2,
    breathiness: (1 - body.glottalClosure) * body.lungPressure * 1.2,
    f1Shift: body.jawOpen * 0.18 + body.tongueHigh * 0.12 + body.larynxHeight * 0.06,
    f2Shift: body.tongueFront * 0.12 + body.lipRound * -0.18 + body.larynxHeight * 0.06,
    f3Shift: body.tongueHigh * 0.1 + body.larynxHeight * 0.05,
    damping: 0.5 + body.vocalMass * 0.4,
  };
}

// 人声波表合成
const VOWEL_TBL = {
  'a': [730, 1090, 2440, 3400], 'o': [570, 840, 2410, 3300],
  'e': [530, 1840, 2480, 3500], 'i': [390, 1990, 2550, 3600],
  'u': [300, 870, 2240, 3100], 'v': [470, 1100, 2200, 3200],
  'n': [280, 1420, 2200, 3000], 'l': [380, 1050, 2100, 2900]
};
const CHAR_VOWEL = {
  '夜':'e','色':'e','轻':'i','落':'o','梦':'e','里':'i','花':'a','开':'a','又':'o',
  '星':'i','光':'a','洒':'a','满':'a','天':'i','涯':'a','我':'o','在':'a','云':'e',
  '端':'a','找':'a','答':'a','风':'e','吹':'e','过':'o','的':'e','沙':'a','哑':'a',
  '是':'i','谁':'e','声':'e','说':'o','话':'a','醒':'i','时':'i','分':'e','泪':'e',
  '如':'u','雨':'u','下':'a','境':'i','中':'o','家':'a'
};

const TABLE_VOWELS = ['a','i','u','e','o'];
const TABLE_MIDI_MIN = 48;
const TABLE_MIDI_MAX = 84;
const WAVE_TABLES = new Map();

function generateOnePeriod(midi, vowel) {
  const freq = midiToFreq(midi);
  const period = Math.max(1, Math.round(SAMPLE_RATE / freq));
  const formants = VOWEL_TBL[vowel] || VOWEL_TBL['a'];
  const wave = new Float32Array(period);
  const tRet = 0.3 * period;
  const ta = Math.max(1, 0.05 * period);
  const invTa = 1 / ta;
  const eInv = Math.exp(-tRet * invTa);
  const eInv2 = Math.exp(-period * invTa);
  const B = eInv / (1 - eInv2);
  const st = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
  const bw = [60, 80, 120, 200];
  for (let i = 0; i < period; i++) {
    let glottal = 0;
    if (i < tRet) {
      glottal = 0.5 * (1 - Math.cos(Math.PI * i / tRet));
    } else {
      const dp = i - tRet;
      glottal = B * Math.exp(-dp * invTa) - B * Math.exp(-(period - tRet) * invTa) * 0.01;
    }
    glottal *= 0.8;
    let sig = glottal;
    for (let f = 0; f < 4; f++) {
      const r = Math.exp(-Math.PI * bw[f] / SAMPLE_RATE);
      const w0 = 2 * Math.PI * formants[f] / SAMPLE_RATE;
      const c = -2 * r * Math.cos(w0);
      const b2 = r * r;
      const a0 = 1 - r;
      const s = st[f];
      const y = a0 * sig - c * s[2] - b2 * s[3];
      s[3] = s[2]; s[2] = y;
      sig = y;
    }
    wave[i] = sig;
  }
  return wave;
}

function initWaveTables() {
  for (const vowel of TABLE_VOWELS) {
    for (let midi = TABLE_MIDI_MIN; midi <= TABLE_MIDI_MAX; midi++) {
      WAVE_TABLES.set(`${vowel}_${midi}`, generateOnePeriod(midi, vowel));
    }
  }
}

function synthVoice3(midi, durSec, char, slot, noteEnergy) {
  const len = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(len);
  const vowel = CHAR_VOWEL[char] || 'a';
  const vKey = TABLE_VOWELS.includes(vowel) ? vowel : 'a';
  const tableMidi = Math.max(TABLE_MIDI_MIN, Math.min(TABLE_MIDI_MAX, Math.round(midi)));
  const waveTable = WAVE_TABLES.get(`${vKey}_${tableMidi}`) || WAVE_TABLES.get(`a_${tableMidi}`);
  const period = waveTable.length;
  const freq = midiToFreq(midi);
  const tableFreq = midiToFreq(tableMidi);
  const baseSpeed = freq / tableFreq;

  const state = consciousness(slot);
  const body = computeBody(slot, noteEnergy, state.section);
  const ac = bodyToAcoustics(body, freq);

  updateListener(noteEnergy);
  const perceived = perceivedIntensity(noteEnergy);
  const gainAdjust = Math.min(1.5, perceived);

  const sil = isSilence(slot);
  const isSilent = !!sil;

  const arc = TARGET_ENERGY[slot] || 0;
  const att = Math.floor((0.015 + (1 - arc) * 0.04 + (isSilent ? 0.05 : 0)) * SAMPLE_RATE);
  const dec = Math.floor(0.06 * SAMPLE_RATE);
  const sus = 0.3 + arc * 0.6;
  let rel = Math.floor((0.1 + (1 - arc) * 0.1 + (isSilent ? (sil ? sil.reverbTail : 0) : 0)) * SAMPLE_RATE);
  rel = Math.min(len, rel);

  const vibRate = 4.5 + body.vocalTension * 2.5;
  const vibDepth = 0.008 + body.vocalTension * 0.015;
  const pPhase = (slot * 0.7) % (Math.PI * 2);
  const breathiness = ac.breathiness * 0.3;

  let phase = 0;
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const vib = Math.sin(2 * Math.PI * vibRate * i / SAMPLE_RATE + pPhase) * vibDepth;
    const perturb = Math.sin(2 * Math.PI * (0.5 + ((slot * 137) % 1000) / 1000 * 1.5) * i / SAMPLE_RATE + pPhase) * 0.003;
    const speed = baseSpeed * (1 + vib + perturb);

    phase += speed;
    while (phase >= period) phase -= period;
    const idx = Math.floor(phase);
    const frac = phase - idx;
    const s0 = waveTable[idx % period];
    const s1 = waveTable[(idx + 1) % period];
    let sig = s0 + (s1 - s0) * frac;

    const nVal = noise();
    const noiseEnv = t < 0.12 ? t / 0.12 : (t < 0.65 ? 1 - (t - 0.12) / 0.53 * 0.6 : 0.4 + (t - 0.65) / 0.35 * 0.6);
    sig = sig * 0.9 + nVal * breathiness * noiseEnv * 0.5;

    let env;
    if (i < att) env = i / att;
    else if (i < att + dec) env = 1 - (1 - sus) * ((i - att) / dec);
    else if (i < len - rel) env = sus;
    else env = sus * ((len - i) / rel);

    if (isSilent) env *= 0.3;
    out[i] = sig * env * gainAdjust;
  }
  return out;
}

// 乐器合成
function ksDream(freq, durSec, bright) {
  const len = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(len);
  const delay = Math.round(SAMPLE_RATE / freq);
  const buf = new Float32Array(delay);
  for (let i = 0; i < delay; i++) buf[i] = noise() * 0.5;
  let idx = 0;
  const damp = 0.5 + bright * 0.48;
  const disp = bright * 0.3;
  for (let i = 0; i < len; i++) {
    const j = (idx + 1) % delay;
    const avg = (buf[idx] + buf[j]) * 0.5;
    buf[idx] = avg * damp + (avg - buf[idx]) * disp;
    out[i] = buf[idx];
    idx = j;
  }
  return out;
}

function synthPad(freq, durSec) {
  const len = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(len);
  const harms = [1, 0.5, 0.3, 0.2, 0.12];
  for (let h = 0; h < harms.length; h++) {
    let ph = 0;
    for (let i = 0; i < len; i++) {
      const vib = Math.sin(2 * Math.PI * 5 * i / SAMPLE_RATE) * 0.008;
      ph += 2 * Math.PI * freq * (h + 1) * (1 + vib) / SAMPLE_RATE;
      const env = i < SAMPLE_RATE * 0.5 ? i / (SAMPLE_RATE * 0.5) : 1;
      const rel = len - i < SAMPLE_RATE * 0.5 ? (len - i) / (SAMPLE_RATE * 0.5) : 1;
      out[i] += Math.sin(ph) * harms[h] * env * rel * 0.15;
    }
  }
  return out;
}

function synthBass(freq, durSec) {
  const len = Math.floor(durSec * SAMPLE_RATE);
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    ph += 2 * Math.PI * freq / SAMPLE_RATE;
    const saw = (ph / Math.PI) % 2 - 1;
    const env = Math.exp(-i / (SAMPLE_RATE * durSec * 0.4));
    const att = i < SAMPLE_RATE * 0.02 ? i / (SAMPLE_RATE * 0.02) : 1;
    out[i] = saw * env * att * 0.4;
  }
  return out;
}

function kick(dur) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const out = new Float32Array(len);
  let ph = 0, f = 120;
  for (let i = 0; i < len; i++) { f *= 0.9995; ph += 2 * Math.PI * f / SAMPLE_RATE; out[i] = Math.sin(ph) * Math.exp(-i / (SAMPLE_RATE * 0.15)) * 0.9; }
  return out;
}
function snare(dur) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const out = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) { ph += 2 * Math.PI * 180 / SAMPLE_RATE; out[i] = (Math.sin(ph) * 0.4 + noise() * 0.7) * Math.exp(-i / (SAMPLE_RATE * 0.12)) * 0.7; }
  return out;
}
function hihat(dur) {
  const len = Math.floor(dur * SAMPLE_RATE);
  const out = new Float32Array(len);
  let mem = 0;
  for (let i = 0; i < len; i++) { const n = noise(); mem += (n - mem) * 0.2; out[i] = (n - mem) * Math.exp(-i / (SAMPLE_RATE * 0.03)) * 0.5; }
  return out;
}

// WAV 导出（浏览器版）
function writeWavToBlob(l, r) {
  const bits = 16, bytes = bits / 8;
  const dataSize = l.length * 2 * bytes;
  const header = 44;
  const buf = new ArrayBuffer(header + dataSize);
  const view = new DataView(buf);
  const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, header + dataSize - 8, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2 * bytes, true);
  view.setUint16(32, 2 * bytes, true);
  view.setUint16(34, bits, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < l.length; i++) {
    const sl = Math.max(-1, Math.min(1, l[i]));
    const sr = Math.max(-1, Math.min(1, r[i]));
    const vl = sl < 0 ? sl * 32768 : sl * 32767;
    const vr = sr < 0 ? sr * 32768 : sr * 32767;
    const off = header + i * 4;
    view.setInt16(off, Math.round(vl), true);
    view.setInt16(off + 2, Math.round(vr), true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

// 主渲染函数
function renderMusic(onProgress) {
  initWaveTables();
  if (onProgress) onProgress('波表预计算完成，开始涌现引擎...');

  const { field, emergentNotes } = generateEmergentNotes();
  if (onProgress) onProgress(`涌现完成：${emergentNotes.length} 个音符`);

  const mL = new Float32Array(TOTAL);
  const mR = new Float32Array(TOTAL);
  const pad = new Float32Array(TOTAL);
  const bass = new Float32Array(TOTAL);
  const drum = new Float32Array(TOTAL);

  // 人声
  if (onProgress) onProgress('[1/4] 涌现人声...');
  let lyricIdx = 0;
  for (const note of emergentNotes) {
    const slot = note.startSlot;
    const dur = (note.endSlot - note.startSlot + 1) * SLOT_DUR;
    const off = Math.floor(slot * SLOT_DUR * SAMPLE_RATE);
    let char = '';
    while (lyricIdx < LYRIC_SLOTS.length && LYRIC_SLOTS[lyricIdx].slot < slot) lyricIdx++;
    if (lyricIdx < LYRIC_SLOTS.length && Math.abs(LYRIC_SLOTS[lyricIdx].slot - slot) < 8) {
      char = LYRIC_SLOTS[lyricIdx].txt;
    }
    const vox = synthVoice3(note.pitch, dur, char, slot, note.energy);
    const pan = 0.4 + Math.sin(slot * 0.05) * 0.25;
    mixIn(mL, mR, vox, off, pan, 0.9);
  }

  // 竖琴
  if (onProgress) onProgress('[2/4] 涌现竖琴...');
  for (const note of emergentNotes) {
    if (note.startSlot < 64 || (note.startSlot > 192 && note.startSlot < 224)) {
      const dur = (note.endSlot - note.startSlot + 1) * SLOT_DUR;
      const off = Math.floor(note.startSlot * SLOT_DUR * SAMPLE_RATE);
      const ks = ksDream(midiToFreq(note.pitch), dur, 0.3 + note.energy * 0.5);
      mixIn(mL, mR, ks, off, 0.3 + Math.random() * 0.4, 0.3 * note.energy);
    }
  }

  // 和弦铺底
  if (onProgress) onProgress('[3/4] 和弦铺底...');
  for (let c = 0; c < 6; c++) {
    const slot = c * 85;
    if (field[slot].pitch >= 0) {
      const root = field[slot].pitch;
      const notes = [root, root + 4, root + 7].filter(p => p <= 84);
      const off = Math.floor(slot * SLOT_DUR * SAMPLE_RATE);
      const dur = 7 * SLOT_DUR;
      for (const n of notes) {
        mixIn(mL, mR, synthPad(midiToFreq(n), dur), off, Math.random() * 0.6, 0.15);
      }
    }
  }

  // 贝斯与鼓组
  if (onProgress) onProgress('[4/4] 贝斯与鼓组...');
  for (let c = 0; c < 6; c++) {
    const slot = c * 85;
    if (field[slot].pitch >= 0) {
      mixMono(bass, synthBass(midiToFreq(field[slot].pitch - 12), 7 * SLOT_DUR), Math.floor(slot * SLOT_DUR * SAMPLE_RATE), 0.5);
    }
  }
  for (let slot = 256; slot < 432; slot += 8) {
    const off = Math.floor(slot * SLOT_DUR * SAMPLE_RATE);
    mixMono(drum, kick(SLOT_DUR * 4), off, 0.7);
    if (slot % 16 === 0) mixMono(drum, snare(SLOT_DUR * 2), off + Math.floor(SLOT_DUR * 2 * SAMPLE_RATE), 0.5);
  }

  // 混音
  if (onProgress) onProgress('混音中...');
  for (let i = 0; i < TOTAL; i++) {
    mL[i] += pad[i] * 0.5 + bass[i] * 0.6 + drum[i] * 0.7;
    mR[i] += pad[i] * 0.5 + bass[i] * 0.6 + drum[i] * 0.7;
  }

  // 低频调制
  const lowBus = new Float32Array(TOTAL);
  for (let i = 0; i < TOTAL; i++) lowBus[i] = Math.abs(bass[i]) + Math.abs(drum[i]) * 0.5;
  let sm = 0;
  for (let i = 0; i < TOTAL; i++) { sm += (lowBus[i] - sm) * 0.001; lowBus[i] = sm; }
  for (let i = 0; i < TOTAL; i++) { const mod = 1 + lowBus[i] * 0.03; mL[i] *= mod; mR[i] *= mod; }

  // 串音
  for (let i = 0; i < TOTAL; i++) { mL[i] += mR[i] * 0.012; mR[i] += mL[i] * 0.012; }

  // 施罗德混响
  if (onProgress) onProgress('施罗德混响...');
  const decay = 0.85, mixAmt = 0.35;
  const combLens = [1557, 1617, 1491, 1422];
  const apLens = [225, 341, 441];
  const combsL = combLens.map(n => ({ b: new Float64Array(n), i: 0 }));
  const combsR = combLens.map(n => ({ b: new Float64Array(n), i: 0 }));
  const aps = apLens.map(n => ({ b: new Float64Array(n), i: 0 }));
  const oL = new Float32Array(TOTAL), oR = new Float32Array(TOTAL);
  for (let i = 0; i < TOTAL; i++) {
    const slot = Math.floor(i / SAMPLE_RATE / SLOT_DUR);
    const sil = isSilence(slot);
    const localDecay = sil ? decay * (1 + sil.reverbTail * 0.3) : decay;
    const localMix = sil ? mixAmt * (1 + sil.reverbTail * 0.2) : mixAmt;
    let sL = 0, sR = 0;
    for (let c = 0; c < 4; c++) {
      const cl = combsL[c], cr = combsR[c];
      const rl = cl.b[cl.i], rr = cr.b[cr.i];
      cl.b[cl.i] = mL[i] + rl * localDecay;
      cr.b[cr.i] = mR[i] + rr * localDecay;
      cl.i = (cl.i + 1) % cl.b.length;
      cr.i = (cr.i + 1) % cr.b.length;
      sL += rl; sR += rr;
    }
    sL *= 0.25; sR *= 0.25;
    let aL = sL, aR = sR;
    for (let a = 0; a < 3; a++) {
      const al = aps[a];
      const v = al.b[al.i];
      al.b[al.i] = aL + v * 0.5;
      aL = v - aL * 0.5;
      al.b[al.i] = aR + v * 0.5;
      aR = v - aR * 0.5;
      al.i = (al.i + 1) % al.b.length;
    }
    oL[i] = mL[i] + aL * localMix;
    oR[i] = mR[i] + aR * localMix;
  }
  mL.set(oL); mR.set(oR);

  // 母带
  if (onProgress) onProgress('母带处理...');
  function getArc(sec) {
    const slot = Math.floor((sec / DURATION) * SLOTS);
    return TARGET_ENERGY[Math.max(0, Math.min(SLOTS - 1, slot))] || 0;
  }
  for (let i = 0; i < TOTAL; i++) {
    const arc = getArc(i / SAMPLE_RATE);
    const bright = 0.85 + arc * 0.3;
    mL[i] *= bright;
    mR[i] *= bright;
  }
  let peak = 0;
  for (let i = 0; i < TOTAL; i++) {
    const mx = Math.max(Math.abs(mL[i]), Math.abs(mR[i]));
    if (mx > 0.95) { const g = 0.95 / mx; mL[i] *= g; mR[i] *= g; }
    peak = Math.max(peak, Math.abs(mL[i]), Math.abs(mR[i]));
  }
  const norm = 0.98 / peak;
  for (let i = 0; i < TOTAL; i++) { mL[i] *= norm; mR[i] *= norm; }

  if (onProgress) onProgress('完成！');
  return { mL, mR, blob: writeWavToBlob(mL, mR), noteCount: emergentNotes.length };
}

// Web Audio API 播放
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playBuffer(mL, mR) {
  const ctx = getAudioContext();
  const buf = ctx.createBuffer(2, mL.length, SAMPLE_RATE);
  buf.copyToChannel(mL, 0);
  buf.copyToChannel(mR, 1);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
  return src;
}

// 暴露全局接口
window.QingLuanSynth = {
  render: renderMusic,
  play: playBuffer,
  SAMPLE_RATE,
  DURATION
};
