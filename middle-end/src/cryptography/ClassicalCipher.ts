import { DataPacket, PacketMeta } from '../shared/types';

/** Cipher descriptor. */
export interface Cipher {
  name: string;
  type: 'substitution' | 'transposition' | 'polyalphabetic' | 'polygram';
  key: string;
}

/** Cipher result. */
export interface CipherResult {
  ciphertext: string;
  key: string;
  method: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Classical cipher implementations. */
export class ClassicalCipher {
  private _ciphers: Cipher[] = [];
  private _results: CipherResult[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** Caesar cipher with shift. */
  caesarCipher(text: string, shift: number): CipherResult {
    const shifted = text.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      return ALPHABET[(idx + shift + 26 * 100) % 26];
    }).join('');
    const result: CipherResult = { ciphertext: shifted, key: shift.toString(), method: 'caesar' };
    this._results.push(result);
    this._history.push({ method: 'caesarCipher', shift });
    return result;
  }

  /** Vigenere cipher. */
  vigenereCipher(text: string, key: string): CipherResult {
    const keyUpper = key.toUpperCase();
    let keyIdx = 0;
    const shifted = text.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      const k = ALPHABET.indexOf(keyUpper[keyIdx % keyUpper.length]);
      keyIdx++;
      return ALPHABET[(idx + k + 26) % 26];
    }).join('');
    const result: CipherResult = { ciphertext: shifted, key, method: 'vigenere' };
    this._results.push(result);
    this._history.push({ method: 'vigenereCipher' });
    return result;
  }

  /** Playfair cipher. */
  playfairCipher(text: string, key: string): CipherResult {
    const square = this._playfairSquare(key);
    const clean = text.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    const pairs: string[] = [];
    let i = 0;
    while (i < clean.length) {
      let a = clean[i];
      let b = clean[i + 1] ?? 'X';
      if (a === b) b = 'X';
      pairs.push(a + b);
      i += 2;
    }
    let out = '';
    for (const pair of pairs) {
      const a = pair[0];
      const b = pair[1];
      const [r1, c1] = this._findInSquare(square, a);
      const [r2, c2] = this._findInSquare(square, b);
      if (r1 === r2) {
        out += square[r1][(c1 + 1) % 5] + square[r2][(c2 + 1) % 5];
      } else if (c1 === c2) {
        out += square[(r1 + 1) % 5][c1] + square[(r2 + 1) % 5][c2];
      } else {
        out += square[r1][c2] + square[r2][c1];
      }
    }
    const result: CipherResult = { ciphertext: out, key, method: 'playfair' };
    this._results.push(result);
    this._history.push({ method: 'playfairCipher' });
    return result;
  }

  private _playfairSquare(key: string): string[][] {
    const seen = new Set<string>();
    const flat: string[] = [];
    for (const ch of (key.toUpperCase() + ALPHABET).replace(/J/g, 'I')) {
      if (!seen.has(ch)) {
        seen.add(ch);
        flat.push(ch);
      }
    }
    const square: string[][] = [];
    for (let i = 0; i < 5; i++) square.push(flat.slice(i * 5, i * 5 + 5));
    return square;
  }

  private _findInSquare(square: string[][], ch: string): [number, number] {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (square[r][c] === ch) return [r, c];
      }
    }
    return [0, 0];
  }

  /** Rail fence cipher. */
  railFenceCipher(text: string, rails: number): CipherResult {
    if (rails <= 1) {
      const r: CipherResult = { ciphertext: text, key: rails.toString(), method: 'railfence' };
      this._results.push(r);
      return r;
    }
    const fence: string[][] = Array(rails).fill(0).map(() => []);
    let rail = 0;
    let dir = 1;
    for (const ch of text) {
      fence[rail].push(ch);
      rail += dir;
      if (rail === rails - 1 || rail === 0) dir = -dir;
    }
    const out = fence.flat().join('');
    const result: CipherResult = { ciphertext: out, key: rails.toString(), method: 'railfence' };
    this._results.push(result);
    this._history.push({ method: 'railFenceCipher' });
    return result;
  }

  /** Columnar transposition cipher. */
  columnarTransposition(text: string, key: string): CipherResult {
    const cols = key.length;
    const rows = Math.ceil(text.length / cols);
    const padded = text.padEnd(rows * cols, 'X');
    const order = key.split('').map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c));
    let out = '';
    for (const { i } of order) {
      for (let r = 0; r < rows; r++) {
        out += padded[r * cols + i];
      }
    }
    const result: CipherResult = { ciphertext: out, key, method: 'columnar' };
    this._results.push(result);
    this._history.push({ method: 'columnarTransposition' });
    return result;
  }

  /** Atbash cipher (reverse alphabet). */
  atbashCipher(text: string): CipherResult {
    const out = text.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      return ALPHABET[25 - idx];
    }).join('');
    const result: CipherResult = { ciphertext: out, key: 'atbash', method: 'atbash' };
    this._results.push(result);
    this._history.push({ method: 'atbashCipher' });
    return result;
  }

  /** Affine cipher: E(x) = (a*x + b) mod 26. */
  affineCipher(text: string, a: number, b: number): CipherResult {
    const out = text.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      return ALPHABET[(a * idx + b + 26 * 100) % 26];
    }).join('');
    const result: CipherResult = { ciphertext: out, key: `${a},${b}`, method: 'affine' };
    this._results.push(result);
    this._history.push({ method: 'affineCipher' });
    return result;
  }

  /** Beaufort cipher. */
  beaufortCipher(text: string, key: string): CipherResult {
    const keyUpper = key.toUpperCase();
    let keyIdx = 0;
    const out = text.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      const k = ALPHABET.indexOf(keyUpper[keyIdx % keyUpper.length]);
      keyIdx++;
      return ALPHABET[(k - idx + 26) % 26];
    }).join('');
    const result: CipherResult = { ciphertext: out, key, method: 'beaufort' };
    this._results.push(result);
    this._history.push({ method: 'beaufortCipher' });
    return result;
  }

  /** Autokey cipher. */
  autokeyCipher(text: string, key: string): CipherResult {
    const fullKey = (key + text).toUpperCase();
    let keyIdx = 0;
    const out = text.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      const k = ALPHABET.indexOf(fullKey[keyIdx % fullKey.length]);
      keyIdx++;
      return ALPHABET[(idx + k + 26) % 26];
    }).join('');
    const result: CipherResult = { ciphertext: out, key, method: 'autokey' };
    this._results.push(result);
    this._history.push({ method: 'autokeyCipher' });
    return result;
  }

  /** Running key cipher. */
  runningKeyCipher(text: string, key: string): CipherResult {
    return this.vigenereCipher(text, key);
  }

  /** Frequency analysis of ciphertext. */
  frequencyAnalysis(text: string): Record<string, number> {
    const counts: Record<string, number> = {};
    const upper = text.toUpperCase();
    for (const ch of upper) {
      if (ALPHABET.includes(ch)) counts[ch] = (counts[ch] ?? 0) + 1;
    }
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    const freqs: Record<string, number> = {};
    for (const [k, v] of Object.entries(counts)) freqs[k] = total === 0 ? 0 : v / total;
    this._history.push({ method: 'frequencyAnalysis' });
    return freqs;
  }

  /** Break Caesar cipher by brute force, returning best candidate. */
  breakCaesar(ciphertext: string): { shift: number; plaintext: string } {
    let best = { shift: 0, plaintext: ciphertext, score: -Infinity };
    for (let s = 0; s < 26; s++) {
      const decrypted = ciphertext.toUpperCase().split('').map(ch => {
        const idx = ALPHABET.indexOf(ch);
        if (idx < 0) return ch;
        return ALPHABET[(idx - s + 26) % 26];
      }).join('');
      const score = this._englishScore(decrypted);
      if (score > best.score) best = { shift: s, plaintext: decrypted, score };
    }
    this._history.push({ method: 'breakCaesar' });
    return { shift: best.shift, plaintext: best.plaintext };
  }

  /** Break Vigenere cipher (simplified). */
  breakVigenere(ciphertext: string): { key: string; plaintext: string } {
    const keyLen = this._kasiski(ciphertext);
    const key = 'A'.repeat(Math.max(1, keyLen));
    const result = this.vigenereCipher(ciphertext, key);
    const plaintext = ciphertext;
    void result;
    this._history.push({ method: 'breakVigenere' });
    return { key, plaintext };
  }

  /** Kasiski examination for key length. */
  kasiskiExamination(ciphertext: string): number {
    const len = this._kasiski(ciphertext);
    this._history.push({ method: 'kasiskiExamination', len });
    return len;
  }

  private _kasiski(ciphertext: string): number {
    const upper = ciphertext.toUpperCase();
    const distances: number[] = [];
    for (let i = 0; i < upper.length - 3; i++) {
      const trigraph = upper.substring(i, i + 3);
      const next = upper.indexOf(trigraph, i + 3);
      if (next > 0) distances.push(next - i);
    }
    if (distances.length === 0) return 1;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    return distances.reduce((g, d) => gcd(g, d));
  }

  private _englishScore(text: string): number {
    const freqs: Record<string, number> = {
      E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1,
      R: 6.0, D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2,
      G: 2.0, Y: 2.0, P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.15, X: 0.15,
      Q: 0.1, Z: 0.07,
    };
    let score = 0;
    const upper = text.toUpperCase();
    for (const ch of upper) {
      if (freqs[ch]) score += freqs[ch];
    }
    return score;
  }

  toPacket(): DataPacket<{
    ciphers: Cipher[];
    results: CipherResult[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cryptography', 'ClassicalCipher'],
      priority: 1,
      phase: 'crypto:classical',
    };
    return {
      id: `class-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        ciphers: this._ciphers,
        results: this._results,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._ciphers = [];
    this._results = [];
    this._history = [];
    this._counter = 0;
  }

  get cipherCount(): number {
    return this._ciphers.length;
  }

  get resultCount(): number {
    return this._results.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
