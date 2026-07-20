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

  /** ROT13 cipher. */
  rot13(text: string): CipherResult {
    return this.caesarCipher(text, 13);
  }

  /** ROT5 cipher (digits only). */
  rot5(text: string): CipherResult {
    const out = text.split('').map(ch => {
      if (ch >= '0' && ch <= '9') return ((parseInt(ch, 10) + 5) % 10).toString();
      return ch;
    }).join('');
    const result: CipherResult = { ciphertext: out, key: '5', method: 'rot5' };
    this._results.push(result);
    this._history.push({ method: 'rot5' });
    return result;
  }

  /** ROT47 cipher (printable ASCII). */
  rot47(text: string): CipherResult {
    const out = text.split('').map(ch => {
      const c = ch.charCodeAt(0);
      if (c >= 33 && c <= 126) return String.fromCharCode(33 + ((c - 33 + 47) % 94));
      return ch;
    }).join('');
    const result: CipherResult = { ciphertext: out, key: '47', method: 'rot47' };
    this._results.push(result);
    this._history.push({ method: 'rot47' });
    return result;
  }

  /** XOR cipher (single-byte key). */
  xorCipher(text: string, key: number): CipherResult {
    const out = text.split('').map(ch => String.fromCharCode(ch.charCodeAt(0) ^ key)).join('');
    const result: CipherResult = { ciphertext: out, key: key.toString(), method: 'xor' };
    this._results.push(result);
    this._history.push({ method: 'xorCipher' });
    return result;
  }

  /** Vernam cipher (one-time pad). */
  vernamCipher(text: string, key: string): CipherResult {
    const keyBytes = new TextEncoder().encode(key);
    const textBytes = new TextEncoder().encode(text);
    const out = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      out[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    const result: CipherResult = { ciphertext: new TextDecoder().decode(out), key, method: 'vernam' };
    this._results.push(result);
    this._history.push({ method: 'vernamCipher' });
    return result;
  }

  /** Baconian cipher (5-bit binary encoding). */
  baconianCipher(text: string): CipherResult {
    const out = text.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return '';
      const code = idx.toString(2).padStart(5, '0');
      return code.split('').map(b => b === '0' ? 'A' : 'B').join('');
    }).join('');
    const result: CipherResult = { ciphertext: out, key: 'bacon', method: 'baconian' };
    this._results.push(result);
    this._history.push({ method: 'baconianCipher' });
    return result;
  }

  /** Polybius square cipher. */
  polybiusSquare(text: string, key = 'ABCDEFGHIKLMNOPQRSTUVWXYZ'): CipherResult {
    const square: Record<string, string> = {};
    let idx = 0;
    for (const ch of key.toUpperCase().replace(/J/g, 'I')) {
      if (!square[ch]) {
        const row = Math.floor(idx / 5) + 1;
        const col = (idx % 5) + 1;
        square[ch] = `${row}${col}`;
        idx++;
      }
    }
    const out = text.toUpperCase().split('').map(ch => {
      const c = ch === 'J' ? 'I' : ch;
      return square[c] ?? ch;
    }).join('');
    const result: CipherResult = { ciphertext: out, key, method: 'polybius' };
    this._results.push(result);
    this._history.push({ method: 'polybiusSquare' });
    return result;
  }

  /** Bifid cipher. */
  bifidCipher(text: string, key: string): CipherResult {
    const square = this._polybiusSquareMatrix(key);
    const cleanText = text.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    const rows: number[] = [];
    const cols: number[] = [];
    for (const ch of cleanText) {
      const [r, c] = this._findInMatrix(square, ch);
      rows.push(r);
      cols.push(c);
    }
    const combined = [...rows, ...cols];
    let out = '';
    for (let i = 0; i < combined.length; i += 2) {
      out += square[combined[i]][combined[i + 1]];
    }
    const result: CipherResult = { ciphertext: out, key, method: 'bifid' };
    this._results.push(result);
    this._history.push({ method: 'bifidCipher' });
    return result;
  }

  private _polybiusSquareMatrix(key: string): string[][] {
    const seen = new Set<string>();
    const flat: string[] = [];
    for (const ch of (key.toUpperCase() + ALPHABET).replace(/J/g, 'I')) {
      if (!seen.has(ch)) {
        seen.add(ch);
        flat.push(ch);
      }
    }
    const matrix: string[][] = [];
    for (let i = 0; i < 5; i++) matrix.push(flat.slice(i * 5, i * 5 + 5));
    return matrix;
  }

  private _findInMatrix(matrix: string[][], ch: string): [number, number] {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (matrix[r][c] === ch) return [r, c];
      }
    }
    return [0, 0];
  }

  /** Trifid cipher. */
  trifidCipher(text: string, key: string): CipherResult {
    const clean = text.toUpperCase().replace(/[^A-Z.]/g, '').replace(/J/g, 'I');
    void key;
    const out = clean.split('').map((ch, i) => {
      const idx = (ALPHABET.replace(/J/g, 'I') + '.').indexOf(ch);
      const layer = Math.floor(idx / 9);
      const row = Math.floor((idx % 9) / 3);
      const col = idx % 3;
      return `${layer}${row}${col}${(i % 3)}`;
    }).join('');
    const result: CipherResult = { ciphertext: out, key, method: 'trifid' };
    this._results.push(result);
    this._history.push({ method: 'trifidCipher' });
    return result;
  }

  /** Four-square cipher. */
  fourSquareCipher(text: string, key1: string, key2: string): CipherResult {
    const plain = this._polybiusSquareMatrix('');
    const sq1 = this._polybiusSquareMatrix(key1);
    const sq2 = this._polybiusSquareMatrix(key2);
    const clean = text.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '');
    let out = '';
    for (let i = 0; i < clean.length - 1; i += 2) {
      const [r1, c1] = this._findInMatrix(plain, clean[i]);
      const [r2, c2] = this._findInMatrix(plain, clean[i + 1]);
      out += sq1[r1][c2] + sq2[r2][c1];
    }
    const result: CipherResult = { ciphertext: out, key: `${key1},${key2}`, method: 'foursquare' };
    this._results.push(result);
    this._history.push({ method: 'fourSquareCipher' });
    return result;
  }

  /** Hill cipher (2x2 matrix). */
  hillCipher(text: string, keyMatrix: number[][]): CipherResult {
    const clean = text.toUpperCase().replace(/[^A-Z]/g, '');
    const padded = clean.length % 2 === 0 ? clean : clean + 'X';
    let out = '';
    for (let i = 0; i < padded.length; i += 2) {
      const v1 = ALPHABET.indexOf(padded[i]);
      const v2 = ALPHABET.indexOf(padded[i + 1]);
      const c1 = (keyMatrix[0][0] * v1 + keyMatrix[0][1] * v2) % 26;
      const c2 = (keyMatrix[1][0] * v1 + keyMatrix[1][1] * v2) % 26;
      out += ALPHABET[c1] + ALPHABET[c2];
    }
    const result: CipherResult = { ciphertext: out, key: JSON.stringify(keyMatrix), method: 'hill' };
    this._results.push(result);
    this._history.push({ method: 'hillCipher' });
    return result;
  }

  /** ADFGVX cipher (WWI German cipher). */
  adfgvxCipher(text: string, key: string, fractionKey: string): CipherResult {
    const cols = ['A', 'D', 'F', 'G', 'V', 'X'];
    const square: string[][] = [];
    const seen = new Set<string>();
    const flat: string[] = [];
    for (const ch of (fractionKey.toUpperCase() + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')) {
      if (!seen.has(ch)) {
        seen.add(ch);
        flat.push(ch);
      }
    }
    for (let i = 0; i < 6; i++) square.push(flat.slice(i * 6, i * 6 + 6));
    let fractionated = '';
    for (const ch of text.toUpperCase()) {
      const [r, c] = this._findInMatrix6x6(square, ch);
      fractionated += cols[r] + cols[c];
    }
    const result: CipherResult = { ciphertext: fractionated, key: `${key},${fractionKey}`, method: 'adfgvx' };
    this._results.push(result);
    this._history.push({ method: 'adfgvxCipher' });
    return result;
  }

  private _findInMatrix6x6(matrix: string[][], ch: string): [number, number] {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) {
        if (matrix[r][c] === ch) return [r, c];
      }
    }
    return [0, 0];
  }

  /** ADFGX cipher (WWI German cipher, letters only). */
  adfgxCipher(text: string, key: string, fractionKey: string): CipherResult {
    const cols = ['A', 'D', 'F', 'G', 'X'];
    void key;
    const square = this._polybiusSquareMatrix(fractionKey);
    let out = '';
    for (const ch of text.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')) {
      const [r, c] = this._findInMatrix(square, ch);
      out += cols[r] + cols[c];
    }
    const result: CipherResult = { ciphertext: out, key: `${key},${fractionKey}`, method: 'adfgx' };
    this._results.push(result);
    this._history.push({ method: 'adfgxCipher' });
    return result;
  }

  /** Route cipher (spiral transposition). */
  routeCipher(text: string, rows: number, cols: number): CipherResult {
    const padded = text.padEnd(rows * cols, 'X');
    const grid: string[][] = [];
    for (let r = 0; r < rows; r++) grid.push(padded.substring(r * cols, r * cols + cols).split(''));
    const out: string[] = [];
    let top = 0;
    let bottom = rows - 1;
    let left = 0;
    let right = cols - 1;
    while (top <= bottom && left <= right) {
      for (let i = top; i <= bottom; i++) out.push(grid[i][left]);
      left++;
      for (let i = left; i <= right; i++) out.push(grid[bottom][i]);
      bottom--;
      if (left <= right) {
        for (let i = bottom; i >= top; i--) out.push(grid[i][right]);
        right--;
      }
      if (top <= bottom) {
        for (let i = right; i >= left; i--) out.push(grid[top][i]);
        top++;
      }
    }
    const result: CipherResult = { ciphertext: out.join(''), key: `${rows}x${cols}`, method: 'route' };
    this._results.push(result);
    this._history.push({ method: 'routeCipher' });
    return result;
  }

  /** Skip cipher. */
  skipCipher(text: string, skip: number): CipherResult {
    const out: string[] = [];
    const len = text.length;
    const visited = new Array(len).fill(false);
    let pos = 0;
    for (let i = 0; i < len; i++) {
      while (visited[pos]) pos = (pos + 1) % len;
      out.push(text[pos]);
      visited[pos] = true;
      pos = (pos + skip) % len;
    }
    const result: CipherResult = { ciphertext: out.join(''), key: skip.toString(), method: 'skip' };
    this._results.push(result);
    this._history.push({ method: 'skipCipher' });
    return result;
  }

  /** Chaocipher. */
  chaocipher(plaintext: string, leftAlpha: string, rightAlpha: string): CipherResult {
    let left = leftAlpha.toUpperCase().split('');
    let right = rightAlpha.toUpperCase().split('');
    const out = plaintext.toUpperCase().split('').map(ch => {
      const idx = right.indexOf(ch);
      if (idx < 0) return ch;
      const cipher = left[idx];
      left = this._chaocipherPermute(left, idx);
      right = this._chaocipherPermute(right, idx);
      return cipher;
    }).join('');
    const result: CipherResult = { ciphertext: out, key: `${leftAlpha}|${rightAlpha}`, method: 'chaocipher' };
    this._results.push(result);
    this._history.push({ method: 'chaocipher' });
    return result;
  }

  private _chaocipherPermute(alpha: string[], idx: number): string[] {
    const result = [...alpha];
    const head = result.splice(0, idx);
    result.push(...head);
    const second = result.splice(1, 1)[0];
    result.splice(2, 0, second);
    const lastChars = result.splice(14);
    const temp = lastChars.shift();
    if (temp) result.splice(13, 0, temp);
    result.push(...lastChars);
    return result;
  }

  /** Jefferson wheel cipher (simplified). */
  jeffersonCipher(text: string, wheels: string[], offset: number): CipherResult {
    const out = text.toUpperCase().split('').map((ch, i) => {
      const wheel = wheels[i % wheels.length].toUpperCase();
      const idx = wheel.indexOf(ch);
      if (idx < 0) return ch;
      return wheel[(idx + offset) % wheel.length];
    }).join('');
    const result: CipherResult = { ciphertext: out, key: `${wheels.length}wheels@${offset}`, method: 'jefferson' };
    this._results.push(result);
    this._history.push({ method: 'jeffersonCipher' });
    return result;
  }

  /** Enigma-like simplified rotor cipher. */
  simpleEnigma(text: string, rotors: string[], reflector: string): CipherResult {
    const positions = rotors.map(() => 0);
    const out = text.toUpperCase().split('').map(ch => {
      let signal = ch;
      for (let r = 0; r < rotors.length; r++) {
        const idx = (signal.charCodeAt(0) - 65 + positions[r]) % 26;
        signal = rotors[r][idx];
      }
      const refIdx = reflector.indexOf(signal);
      signal = refIdx >= 0 ? String.fromCharCode(65 + (refIdx + 13) % 26) : signal;
      for (let r = rotors.length - 1; r >= 0; r--) {
        const idx = (signal.charCodeAt(0) - 65 - positions[r] + 26) % 26;
        signal = rotors[r][idx];
      }
      positions[0] = (positions[0] + 1) % 26;
      for (let r = 0; r < rotors.length - 1; r++) {
        if (positions[r] === 0) positions[r + 1] = (positions[r + 1] + 1) % 26;
      }
      return signal;
    }).join('');
    const result: CipherResult = { ciphertext: out, key: `${rotors.join('|')}|${reflector}`, method: 'enigma' };
    this._results.push(result);
    this._history.push({ method: 'simpleEnigma' });
    return result;
  }

  /** Caesar decrypt. */
  caesarDecrypt(ciphertext: string, shift: number): CipherResult {
    return this.caesarCipher(ciphertext, 26 - (shift % 26));
  }

  /** Vigenere decrypt. */
  vigenereDecrypt(ciphertext: string, key: string): CipherResult {
    const keyUpper = key.toUpperCase();
    let keyIdx = 0;
    const out = ciphertext.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      const k = ALPHABET.indexOf(keyUpper[keyIdx % keyUpper.length]);
      keyIdx++;
      return ALPHABET[(idx - k + 26) % 26];
    }).join('');
    const result: CipherResult = { ciphertext: out, key, method: 'vigenere-decrypt' };
    this._results.push(result);
    this._history.push({ method: 'vigenereDecrypt' });
    return result;
  }

  /** Affine decrypt. */
  affineDecrypt(ciphertext: string, a: number, b: number): CipherResult {
    const aInv = this._modInverse26(a);
    const out = ciphertext.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      return ALPHABET[(aInv * (idx - b) + 26 * 100) % 26];
    }).join('');
    const result: CipherResult = { ciphertext: out, key: `${a},${b}`, method: 'affine-decrypt' };
    this._results.push(result);
    this._history.push({ method: 'affineDecrypt' });
    return result;
  }

  private _modInverse26(a: number): number {
    a = ((a % 26) + 26) % 26;
    for (let i = 1; i < 26; i++) {
      if ((a * i) % 26 === 1) return i;
    }
    return 1;
  }

  /** Playfair decrypt. */
  playfairDecrypt(ciphertext: string, key: string): CipherResult {
    const square = this._playfairSquare(key);
    const clean = ciphertext.toUpperCase().replace(/[^A-Z]/g, '');
    let out = '';
    for (let i = 0; i < clean.length; i += 2) {
      const a = clean[i];
      const b = clean[i + 1] ?? 'X';
      const [r1, c1] = this._findInSquare(square, a);
      const [r2, c2] = this._findInSquare(square, b);
      if (r1 === r2) {
        out += square[r1][(c1 - 1 + 5) % 5] + square[r2][(c2 - 1 + 5) % 5];
      } else if (c1 === c2) {
        out += square[(r1 - 1 + 5) % 5][c1] + square[(r2 - 1 + 5) % 5][c2];
      } else {
        out += square[r1][c2] + square[r2][c1];
      }
    }
    const result: CipherResult = { ciphertext: out, key, method: 'playfair-decrypt' };
    this._results.push(result);
    this._history.push({ method: 'playfairDecrypt' });
    return result;
  }

  /** Rail fence decrypt. */
  railFenceDecrypt(ciphertext: string, rails: number): CipherResult {
    if (rails <= 1) {
      const r: CipherResult = { ciphertext, key: '1', method: 'railfence-decrypt' };
      this._results.push(r);
      return r;
    }
    const len = ciphertext.length;
    const fence: number[][] = Array(rails).fill(0).map(() => []);
    let rail = 0;
    let dir = 1;
    for (let i = 0; i < len; i++) {
      fence[rail].push(i);
      rail += dir;
      if (rail === rails - 1 || rail === 0) dir = -dir;
    }
    const order = fence.flat();
    const chars = new Array(len);
    for (let i = 0; i < len; i++) chars[order[i]] = ciphertext[i];
    const result: CipherResult = { ciphertext: chars.join(''), key: rails.toString(), method: 'railfence-decrypt' };
    this._results.push(result);
    this._history.push({ method: 'railFenceDecrypt' });
    return result;
  }

  /** Columnar transposition decrypt. */
  columnarDecrypt(ciphertext: string, key: string): CipherResult {
    const cols = key.length;
    const rows = Math.ceil(ciphertext.length / cols);
    const order = key.split('').map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c));
    const chars: string[] = new Array(ciphertext.length);
    let idx = 0;
    for (const { i } of order) {
      for (let r = 0; r < rows; r++) {
        if (idx < ciphertext.length) chars[r * cols + i] = ciphertext[idx++];
      }
    }
    const result: CipherResult = { ciphertext: chars.join(''), key, method: 'columnar-decrypt' };
    this._results.push(result);
    this._history.push({ method: 'columnarDecrypt' });
    return result;
  }

  /** Beaufort decrypt. */
  beaufortDecrypt(ciphertext: string, key: string): CipherResult {
    return this.beaufortCipher(ciphertext, key);
  }

  /** Autokey decrypt. */
  autokeyDecrypt(ciphertext: string, key: string): CipherResult {
    const keyUpper = key.toUpperCase();
    const out: string[] = [];
    let fullKey = keyUpper;
    for (let i = 0; i < ciphertext.length; i++) {
      const idx = ALPHABET.indexOf(ciphertext[i].toUpperCase());
      if (idx < 0) {
        out.push(ciphertext[i]);
        continue;
      }
      const k = ALPHABET.indexOf(fullKey[i]);
      const p = ALPHABET[(idx - k + 26) % 26];
      out.push(p);
      fullKey += p;
    }
    const result: CipherResult = { ciphertext: out.join(''), key, method: 'autokey-decrypt' };
    this._results.push(result);
    this._history.push({ method: 'autokeyDecrypt' });
    return result;
  }

  /** Hill decrypt (2x2 matrix inverse). */
  hillDecrypt(ciphertext: string, keyMatrix: number[][]): CipherResult {
    const det = (keyMatrix[0][0] * keyMatrix[1][1] - keyMatrix[0][1] * keyMatrix[1][0]) % 26;
    const detInv = this._modInverse26(det);
    const invMatrix = [
      [(detInv * keyMatrix[1][1]) % 26, (detInv * -keyMatrix[0][1]) % 26],
      [(detInv * -keyMatrix[1][0]) % 26, (detInv * keyMatrix[0][0]) % 26],
    ];
    const clean = ciphertext.toUpperCase().replace(/[^A-Z]/g, '');
    let out = '';
    for (let i = 0; i < clean.length; i += 2) {
      const v1 = ALPHABET.indexOf(clean[i]);
      const v2 = ALPHABET.indexOf(clean[i + 1] ?? 'X');
      const c1 = ((invMatrix[0][0] * v1 + invMatrix[0][1] * v2) % 26 + 26 * 100) % 26;
      const c2 = ((invMatrix[1][0] * v1 + invMatrix[1][1] * v2) % 26 + 26 * 100) % 26;
      out += ALPHABET[c1] + ALPHABET[c2];
    }
    const result: CipherResult = { ciphertext: out, key: JSON.stringify(keyMatrix), method: 'hill-decrypt' };
    this._results.push(result);
    this._history.push({ method: 'hillDecrypt' });
    return result;
  }

  /** Index of coincidence. */
  indexOfCoincidence(text: string): number {
    const counts: Record<string, number> = {};
    const upper = text.toUpperCase();
    let n = 0;
    for (const ch of upper) {
      if (ALPHABET.includes(ch)) {
        counts[ch] = (counts[ch] ?? 0) + 1;
        n++;
      }
    }
    if (n <= 1) return 0;
    let sum = 0;
    for (const k in counts) sum += counts[k] * (counts[k] - 1);
    return sum / (n * (n - 1));
  }

  /** Chi-squared test against English frequencies. */
  chiSquared(text: string): number {
    const freqs: Record<string, number> = {
      E: 12.7, T: 9.1, A: 8.2, O: 7.5, I: 7.0, N: 6.7, S: 6.3, H: 6.1,
      R: 6.0, D: 4.3, L: 4.0, C: 2.8, U: 2.8, M: 2.4, W: 2.4, F: 2.2,
      G: 2.0, Y: 2.0, P: 1.9, B: 1.5, V: 1.0, K: 0.8, J: 0.15, X: 0.15,
      Q: 0.1, Z: 0.07,
    };
    const counts: Record<string, number> = {};
    const upper = text.toUpperCase();
    let n = 0;
    for (const ch of upper) {
      if (ALPHABET.includes(ch)) {
        counts[ch] = (counts[ch] ?? 0) + 1;
        n++;
      }
    }
    let chi = 0;
    for (const k in freqs) {
      const expected = (freqs[k] / 100) * n;
      const observed = counts[k] ?? 0;
      if (expected > 0) chi += Math.pow(observed - expected, 2) / expected;
    }
    return chi;
  }

  /** Bigram frequency analysis. */
  bigramFrequency(text: string): Record<string, number> {
    const freqs: Record<string, number> = {};
    const upper = text.toUpperCase();
    let total = 0;
    for (let i = 0; i < upper.length - 1; i++) {
      const bg = upper.substring(i, i + 2);
      if (ALPHABET.includes(bg[0]) && ALPHABET.includes(bg[1])) {
        freqs[bg] = (freqs[bg] ?? 0) + 1;
        total++;
      }
    }
    for (const k in freqs) freqs[k] /= total;
    return freqs;
  }

  /** Trigram frequency analysis. */
  trigramFrequency(text: string): Record<string, number> {
    const freqs: Record<string, number> = {};
    const upper = text.toUpperCase();
    let total = 0;
    for (let i = 0; i < upper.length - 2; i++) {
      const tg = upper.substring(i, i + 3);
      if (tg.split('').every(c => ALPHABET.includes(c))) {
        freqs[tg] = (freqs[tg] ?? 0) + 1;
        total++;
      }
    }
    for (const k in freqs) freqs[k] /= total;
    return freqs;
  }

  /** Monoalphabetic substitution solver (hill-climbing). */
  solveMonoalphabetic(ciphertext: string, iterations = 1000): { key: string; plaintext: string; score: number } {
    let bestKey = ALPHABET;
    let bestScore = -Infinity;
    let bestText = ciphertext;
    for (let iter = 0; iter < iterations; iter++) {
      const newKey = this._mutateKey(bestKey);
      const decrypted = this._applySubstitution(ciphertext, newKey);
      const score = this._englishScore(decrypted);
      if (score > bestScore) {
        bestScore = score;
        bestKey = newKey;
        bestText = decrypted;
      }
    }
    this._history.push({ method: 'solveMonoalphabetic' });
    return { key: bestKey, plaintext: bestText, score: bestScore };
  }

  private _mutateKey(key: string): string {
    const chars = key.split('');
    const i = Math.floor(Math.random() * 26);
    const j = Math.floor(Math.random() * 26);
    [chars[i], chars[j]] = [chars[j], chars[i]];
    return chars.join('');
  }

  private _applySubstitution(text: string, key: string): string {
    return text.toUpperCase().split('').map(ch => {
      const idx = ALPHABET.indexOf(ch);
      if (idx < 0) return ch;
      return key[idx];
    }).join('');
  }

  /** Generate a random substitution alphabet. */
  randomAlphabet(): string {
    return ALPHABET.split('').sort(() => Math.random() - 0.5).join('');
  }

  /** Morse code encoder. */
  morseEncode(text: string): string {
    const morse: Record<string, string> = {
      A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....',
      I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.',
      Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-',
      Y: '-.--', Z: '--..', '0': '-----', '1': '.----', '2': '..---', '3': '...--',
      '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
      '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--',
      '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
      ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-',
      '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
    };
    const out = text.toUpperCase().split('').map(ch => morse[ch] ?? ch).join(' ');
    this._history.push({ method: 'morseEncode' });
    return out;
  }

  /** Morse code decoder. */
  morseDecode(morse: string): string {
    const map: Record<string, string> = {
      '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F', '--.': 'G',
      '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L', '--': 'M', '-.': 'N',
      '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R', '...': 'S', '-': 'T', '..-': 'U',
      '...-': 'V', '.--': 'W', '-..-': 'X', '-.--': 'Y', '--..': 'Z', '-----': '0',
      '.----': '1', '..---': '2', '...--': '3', '....-': '4', '.....': '5', '-....': '6',
      '--...': '7', '---..': '8', '----.': '9', '.-.-.-': '.', '--..--': ',', '..--..': '?',
      '.----.': "'", '-.-.--': '!', '-..-.': '/', '-.--.': '(', '-.--.-': ')', '.-...': '&',
      '---...': ':', '-.-.-.': ';', '-...-': '=', '.-.-.': '+', '-....-': '-', '..--.-': '_',
      '.-..-.': '"', '...-..-': '$', '.--.-.': '@',
    };
    const out = morse.split(' ').map(code => map[code] ?? ' ').join('');
    this._history.push({ method: 'morseDecode' });
    return out;
  }

  /** Baudot code encoder (5-bit ITA2). */
  baudotEncode(text: string): string {
    const baudot: Record<string, string> = {
      A: '00011', B: '11001', C: '01110', D: '01001', E: '00001', F: '01101',
      G: '11010', H: '10100', I: '00110', J: '01011', K: '01111', L: '10010',
      M: '11100', N: '01100', O: '11000', P: '10110', Q: '10111', R: '01010',
      S: '00101', T: '10000', U: '00111', V: '11110', W: '10011', X: '11101',
      Y: '10101', Z: '10001',
    };
    const out = text.toUpperCase().split('').map(ch => baudot[ch] ?? '').filter(s => s).join(' ');
    this._history.push({ method: 'baudotEncode' });
    return out;
  }

  /** Tap code (Polybius variant used by POWs). */
  tapCode(text: string): string {
    const square = 'ABCDEFGHIKLMNOPQRSTUVWXYZ';
    const out: string[] = [];
    for (const ch of text.toUpperCase().replace(/J/g, 'I').replace(/[^A-Z]/g, '')) {
      const idx = square.indexOf(ch);
      if (idx >= 0) {
        const row = Math.floor(idx / 5) + 1;
        const col = (idx % 5) + 1;
        out.push(`${'.'.repeat(row)},${'.'.repeat(col)}`);
      }
    }
    this._history.push({ method: 'tapCode' });
    return out.join(' ');
  }

  /** NATO phonetic alphabet encoding. */
  natoPhonetic(text: string): string[] {
    const nato: Record<string, string> = {
      A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo', F: 'Foxtrot',
      G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliet', K: 'Kilo', L: 'Lima',
      M: 'Mike', N: 'November', O: 'Oscar', P: 'Papa', Q: 'Quebec', R: 'Romeo',
      S: 'Sierra', T: 'Tango', U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray',
      Y: 'Yankee', Z: 'Zulu', '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three',
      '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight', '9': 'Nine',
    };
    this._history.push({ method: 'natoPhonetic' });
    return text.toUpperCase().split('').map(ch => nato[ch] ?? ch);
  }

  /** Vigenere key length estimation via Friedman test. */
  friedmanTest(ciphertext: string): number {
    const ic = this.indexOfCoincidence(ciphertext);
    const n = ciphertext.replace(/[^A-Z]/gi, '').length;
    if (n <= 1) return 1;
    const kp = 0.0667;
    const kr = 0.0385;
    const denom = (kp - kr) * n + kr - ic * n;
    if (Math.abs(denom) < 1e-9) return 1;
    return Math.max(1, Math.round((kp - kr) * n / denom));
  }

  /** Find repeated substrings (Kasiski method). */
  findRepeatedSubstrings(text: string, minLength = 3): Array<{ substring: string; positions: number[]; distances: number[] }> {
    const upper = text.toUpperCase();
    const seen: Map<string, number[]> = new Map();
    for (let i = 0; i < upper.length - minLength; i++) {
      for (let len = minLength; len <= Math.min(8, upper.length - i); len++) {
        const sub = upper.substring(i, i + len);
        if (!seen.has(sub)) seen.set(sub, []);
        seen.get(sub)!.push(i);
      }
    }
    const result: Array<{ substring: string; positions: number[]; distances: number[] }> = [];
    for (const [sub, positions] of seen.entries()) {
      if (positions.length >= 2) {
        const distances: number[] = [];
        for (let i = 1; i < positions.length; i++) distances.push(positions[i] - positions[0]);
        result.push({ substring: sub, positions, distances });
      }
    }
    return result;
  }

  /** Compute GCD of a list of numbers. */
  gcdOfList(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    return numbers.reduce((g, n) => gcd(g, n));
  }

  /** Caesar brute force all shifts. */
  caesarBruteForce(ciphertext: string): Array<{ shift: number; plaintext: string; score: number }> {
    const results: Array<{ shift: number; plaintext: string; score: number }> = [];
    for (let s = 0; s < 26; s++) {
      const decrypted = ciphertext.toUpperCase().split('').map(ch => {
        const idx = ALPHABET.indexOf(ch);
        if (idx < 0) return ch;
        return ALPHABET[(idx - s + 26) % 26];
      }).join('');
      results.push({ shift: s, plaintext: decrypted, score: this._englishScore(decrypted) });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  /** Affine cipher brute force (all valid a, b). */
  affineBruteForce(ciphertext: string): Array<{ a: number; b: number; plaintext: string; score: number }> {
    const validA = [1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
    const results: Array<{ a: number; b: number; plaintext: string; score: number }> = [];
    for (const a of validA) {
      for (let b = 0; b < 26; b++) {
        const decrypted = this.affineDecrypt(ciphertext, a, b).ciphertext;
        results.push({ a, b, plaintext: decrypted, score: this._englishScore(decrypted) });
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }

  /** Convert text to ADFGVX coordinates. */
  textToAdfgvxCoords(text: string): string {
    const cols = 'ADFGVX';
    const out: string[] = [];
    for (let i = 0; i < text.length; i += 2) {
      const r = parseInt(text[i], 10);
      const c = parseInt(text[i + 1], 10);
      if (r >= 0 && r < 6 && c >= 0 && c < 6) out.push(cols[r] + cols[c]);
    }
    return out.join('');
  }

  /** Encode using a running-key cipher variant. */
  runningKeyDecrypt(ciphertext: string, key: string): CipherResult {
    return this.vigenereDecrypt(ciphertext, key);
  }

  /** Compute entropy of a text. */
  textEntropy(text: string): number {
    const counts: Record<string, number> = {};
    for (const ch of text.toUpperCase()) {
      if (ALPHABET.includes(ch)) counts[ch] = (counts[ch] ?? 0) + 1;
    }
    const total = Object.values(counts).reduce((s, n) => s + n, 0);
    if (total === 0) return 0;
    let entropy = 0;
    for (const k in counts) {
      const p = counts[k] / total;
      entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  /** Detect cipher type by analyzing ciphertext. */
  detectCipherType(ciphertext: string): { type: string; confidence: number } {
    const ic = this.indexOfCoincidence(ciphertext);
    const upper = ciphertext.toUpperCase();
    const onlyLetters = upper.replace(/[^A-Z]/g, '');
    if (onlyLetters.length === 0) return { type: 'unknown', confidence: 0 };
    if (Math.abs(ic - 0.0667) < 0.005) return { type: 'monoalphabetic', confidence: 0.85 };
    if (Math.abs(ic - 0.0385) < 0.005) return { type: 'polyalphabetic', confidence: 0.75 };
    if (/^[01\s]+$/.test(ciphertext)) return { type: 'binary', confidence: 0.9 };
    if (/^[A-F0-9]+$/i.test(ciphertext)) return { type: 'hexadecimal', confidence: 0.7 };
    if (/^[\.\-\s]+$/.test(ciphertext)) return { type: 'morse', confidence: 0.95 };
    return { type: 'unknown', confidence: 0.3 };
  }

  /** Generate a Vigenere tableau. */
  vigenereTableau(): string[][] {
    const tableau: string[][] = [];
    for (let i = 0; i < 26; i++) {
      const row: string[] = [];
      for (let j = 0; j < 26; j++) {
        row.push(ALPHABET[(i + j) % 26]);
      }
      tableau.push(row);
    }
    return tableau;
  }

  /** Book cipher encoding. */
  bookCipher(plaintext: string, book: string): CipherResult {
    const words = book.toLowerCase().split(/\s+/);
    const out: number[] = [];
    for (const ch of plaintext.toLowerCase()) {
      let found = 0;
      for (let i = 0; i < words.length; i++) {
        if (words[i].startsWith(ch)) {
          found = i + 1;
          break;
        }
      }
      out.push(found);
    }
    const result: CipherResult = { ciphertext: out.join(','), key: 'book', method: 'book' };
    this._results.push(result);
    this._history.push({ method: 'bookCipher' });
    return result;
  }

  /** Compute ciphertext character count. */
  characterCount(text: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const ch of text.toUpperCase()) {
      if (ALPHABET.includes(ch)) counts[ch] = (counts[ch] ?? 0) + 1;
    }
    return counts;
  }

  /** Get cipher history entries. */
  getHistory(): unknown[] {
    return [...this._history];
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
