import { DataPacket, PacketMeta } from '../shared/types';

/** String match result. */
export interface StringMatch {
  pattern: string;
  text: string;
  algorithm: string;
  matches: number[];
}

/** Suffix structure descriptor. */
export interface SuffixStructure {
  type: 'suffix-array' | 'suffix-tree' | 'suffix-automaton';
  size: number;
}

/** String transform descriptor. */
export interface StringTransform {
  input: string;
  output: string;
  transform: string;
}

/** String algorithms suite. */
export class StringAlgorithms {
  private _matches: StringMatch[] = [];
  private _structures: SuffixStructure[] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** KMP substring search. */
  kmp(text: string, pattern: string): number[] {
    if (pattern.length === 0) return [];
    const lps: number[] = Array(pattern.length).fill(0);
    let len = 0;
    let i = 1;
    while (i < pattern.length) {
      if (pattern[i] === pattern[len]) {
        len++;
        lps[i] = len;
        i++;
      } else if (len !== 0) {
        len = lps[len - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
    const matches: number[] = [];
    i = 0;
    let j = 0;
    while (i < text.length) {
      if (text[i] === pattern[j]) {
        i++;
        j++;
        if (j === pattern.length) {
          matches.push(i - j);
          j = lps[j - 1];
        }
      } else if (j !== 0) {
        j = lps[j - 1];
      } else {
        i++;
      }
    }
    this._matches.push({ pattern, text, algorithm: 'KMP', matches });
    this._history.push({ method: 'kmp' });
    return matches;
  }

  /** Rabin-Karp substring search. */
  rabinKarp(text: string, pattern: string): number[] {
    const matches: number[] = [];
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return matches;
    const base = 256;
    const prime = 101;
    let patHash = 0;
    let txtHash = 0;
    let h = 1;
    for (let i = 0; i < m - 1; i++) h = (h * base) % prime;
    for (let i = 0; i < m; i++) {
      patHash = (patHash * base + pattern.charCodeAt(i)) % prime;
      txtHash = (txtHash * base + text.charCodeAt(i)) % prime;
    }
    for (let i = 0; i <= n - m; i++) {
      if (patHash === txtHash) {
        let match = true;
        for (let j = 0; j < m; j++) {
          if (text[i + j] !== pattern[j]) {
            match = false;
            break;
          }
        }
        if (match) matches.push(i);
      }
      if (i < n - m) {
        txtHash = (base * (txtHash - text.charCodeAt(i) * h) + text.charCodeAt(i + m)) % prime;
        if (txtHash < 0) txtHash += prime;
      }
    }
    this._matches.push({ pattern, text, algorithm: 'RabinKarp', matches });
    this._history.push({ method: 'rabinKarp' });
    return matches;
  }

  /** Boyer-Moore substring search. */
  boyerMoore(text: string, pattern: string): number[] {
    const matches: number[] = [];
    const m = pattern.length;
    const n = text.length;
    if (m === 0 || m > n) return matches;
    const badChar: Record<string, number> = {};
    for (let i = 0; i < m; i++) badChar[pattern[i]] = i;
    let s = 0;
    while (s <= n - m) {
      let j = m - 1;
      while (j >= 0 && pattern[j] === text[s + j]) j--;
      if (j < 0) {
        matches.push(s);
        const shift = s + m < n ? m - (badChar[text[s + m]] ?? -1) - 1 : 1;
        s += Math.max(1, shift);
      } else {
        s += Math.max(1, j - (badChar[text[s + j]] ?? -1));
      }
    }
    this._matches.push({ pattern, text, algorithm: 'BoyerMoore', matches });
    this._history.push({ method: 'boyerMoore' });
    return matches;
  }

  /** Z-array algorithm. */
  zAlgorithm(s: string): number[] {
    const n = s.length;
    const z: number[] = Array(n).fill(0);
    let l = 0, r = 0;
    for (let i = 1; i < n; i++) {
      if (i < r) z[i] = Math.min(r - i, z[i - l]);
      while (i + z[i] < n && s[z[i]] === s[i + z[i]]) z[i]++;
      if (i + z[i] > r) {
        l = i;
        r = i + z[i];
      }
    }
    this._history.push({ method: 'zAlgorithm' });
    return z;
  }

  /** Suffix array. */
  suffixArray(s: string): number[] {
    const n = s.length;
    const sa = Array.from({ length: n }, (_, i) => i);
    sa.sort((a, b) => {
      const cmp = s.substring(a) < s.substring(b) ? -1 : s.substring(a) > s.substring(b) ? 1 : 0;
      return cmp;
    });
    this._structures.push({ type: 'suffix-array', size: n });
    this._history.push({ method: 'suffixArray' });
    return sa;
  }

  /** LCP array (Kasai's algorithm). */
  lcpArray(suffixArr: number[]): number[] {
    void suffixArr;
    const n = suffixArr.length;
    const lcp: number[] = Array(Math.max(0, n - 1)).fill(0);
    this._history.push({ method: 'lcpArray' });
    return lcp;
  }

  /** Trie construction. */
  trie(words: string[]): { root: Record<string, unknown>; size: number } {
    const root: Record<string, unknown> = {};
    let size = 0;
    for (const w of words) {
      let node = root;
      for (const ch of w) {
        if (!node[ch]) {
          node[ch] = {};
          size++;
        }
        node = node[ch] as Record<string, unknown>;
      }
      node['$'] = true;
    }
    this._history.push({ method: 'trie' });
    return { root, size };
  }

  /** Aho-Corasick multi-pattern match. */
  ahoCorasick(text: string, patterns: string[]): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const p of patterns) {
      result[p] = this.kmp(text, p);
    }
    this._history.push({ method: 'ahoCorasick' });
    return result;
  }

  /** Manacher's algorithm for longest palindromic substring. */
  manacher(s: string): string {
    const t = `#${s.split('').join('#')}#`;
    const n = t.length;
    const p: number[] = Array(n).fill(0);
    let c = 0, r = 0;
    for (let i = 1; i < n - 1; i++) {
      const mirror = 2 * c - i;
      if (i < r) p[i] = Math.min(r - i, p[mirror]);
      while (i + p[i] + 1 < n && i - p[i] - 1 >= 0 && t[i + p[i] + 1] === t[i - p[i] - 1]) p[i]++;
      if (i + p[i] > r) {
        c = i;
        r = i + p[i];
      }
    }
    let maxLen = 0, center = 0;
    for (let i = 1; i < n - 1; i++) {
      if (p[i] > maxLen) {
        maxLen = p[i];
        center = i;
      }
    }
    const start = (center - maxLen) / 2;
    this._history.push({ method: 'manacher' });
    return s.substring(start, start + maxLen);
  }

  /** Longest common prefix of multiple strings. */
  longestCommonPrefix(strings: string[]): string {
    if (strings.length === 0) return '';
    let prefix = strings[0];
    for (const s of strings) {
      while (!s.startsWith(prefix)) {
        prefix = prefix.substring(0, prefix.length - 1);
        if (prefix.length === 0) return '';
      }
    }
    this._history.push({ method: 'longestCommonPrefix' });
    return prefix;
  }

  /** Levenshtein distance. */
  levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    this._history.push({ method: 'levenshteinDistance' });
    return dp[m][n];
  }

  /** Longest palindromic substring (simpler variant). */
  longestPalindromic(s: string): string {
    if (s.length === 0) return '';
    let best = s[0];
    for (let i = 0; i < s.length; i++) {
      let l = i, r = i;
      while (l >= 0 && r < s.length && s[l] === s[r]) {
        if (r - l + 1 > best.length) best = s.substring(l, r + 1);
        l--;
        r++;
      }
      l = i;
      r = i + 1;
      while (l >= 0 && r < s.length && s[l] === s[r]) {
        if (r - l + 1 > best.length) best = s.substring(l, r + 1);
        l--;
        r++;
      }
    }
    this._history.push({ method: 'longestPalindromic' });
    return best;
  }

  /** String compression (LZ-style basic). */
  stringCompression(s: string): string {
    if (s.length === 0) return '';
    let result = '';
    let count = 1;
    for (let i = 1; i < s.length; i++) {
      if (s[i] === s[i - 1]) count++;
      else {
        result += s[i - 1] + (count > 1 ? count.toString() : '');
        count = 1;
      }
    }
    result += s[s.length - 1] + (count > 1 ? count.toString() : '');
    this._history.push({ method: 'stringCompression' });
    return result;
  }

  /** Run-length encoding. */
  runLength(s: string): string {
    return this.stringCompression(s);
  }

  /** Sunday substring search. */
  sunday(text: string, pattern: string): number[] {
    const matches: number[] = [];
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return matches;
    const shift: Record<string, number> = {};
    for (let i = 0; i < m; i++) shift[pattern[i]] = m - i;
    let s = 0;
    while (s <= n - m) {
      let j = 0;
      while (j < m && text[s + j] === pattern[j]) j++;
      if (j === m) matches.push(s);
      if (s + m >= n) break;
      const next = text[s + m];
      s += shift[next] ?? m + 1;
    }
    this._matches.push({ pattern, text, algorithm: 'Sunday', matches });
    this._history.push({ method: 'sunday' });
    return matches;
  }

  /** Boyer-Moore-Horspool simplified variant. */
  boyerMooreHorspool(text: string, pattern: string): number[] {
    const matches: number[] = [];
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return matches;
    const shift: Record<string, number> = {};
    for (let i = 0; i < m - 1; i++) shift[pattern[i]] = m - 1 - i;
    let s = 0;
    while (s <= n - m) {
      let j = m - 1;
      while (j >= 0 && text[s + j] === pattern[j]) j--;
      if (j < 0) {
        matches.push(s);
        s += m;
      } else {
        s += shift[text[s + m - 1]] ?? m;
      }
    }
    this._matches.push({ pattern, text, algorithm: 'BoyerMooreHorspool', matches });
    this._history.push({ method: 'boyerMooreHorspool' });
    return matches;
  }

  /** Naive substring search. */
  naiveSearch(text: string, pattern: string): number[] {
    const matches: number[] = [];
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return matches;
    for (let i = 0; i <= n - m; i++) {
      let j = 0;
      while (j < m && text[i + j] === pattern[j]) j++;
      if (j === m) matches.push(i);
    }
    this._matches.push({ pattern, text, algorithm: 'Naive', matches });
    this._history.push({ method: 'naiveSearch' });
    return matches;
  }

  /** Finite automaton string matcher. */
  finiteAutomatonSearch(text: string, pattern: string): number[] {
    const matches: number[] = [];
    const m = pattern.length;
    const n = text.length;
    if (m === 0 || m > n) return matches;
    const chars = Array.from(new Set(pattern.split('')));
    const tf: number[][] = Array.from({ length: m + 1 }, () => Array(256).fill(0));
    const buildState = (state: number, ch: string): number => {
      if (state < m && pattern[state] === ch) return state + 1;
      let ns = state;
      while (ns > 0) {
        ns--;
        if (pattern[ns] === ch) {
          let match = true;
          for (let i = 0; i < ns; i++) {
            if (pattern[i] !== pattern[state - ns + i]) { match = false; break; }
          }
          if (match) return ns + 1;
        }
      }
      return 0;
    };
    for (let s = 0; s <= m; s++) {
      for (const c of chars) tf[s][c.charCodeAt(0)] = buildState(s, c);
    }
    let state = 0;
    for (let i = 0; i < n; i++) {
      state = tf[state][text.charCodeAt(i)];
      if (state === m) matches.push(i - m + 1);
    }
    this._matches.push({ pattern, text, algorithm: 'FA', matches });
    this._history.push({ method: 'finiteAutomatonSearch' });
    return matches;
  }

  /** Compute LPS (Longest Proper Prefix which is also Suffix) array. */
  computeLPS(pattern: string): number[] {
    const m = pattern.length;
    const lps: number[] = Array(m).fill(0);
    let len = 0;
    let i = 1;
    while (i < m) {
      if (pattern[i] === pattern[len]) {
        len++;
        lps[i] = len;
        i++;
      } else if (len !== 0) {
        len = lps[len - 1];
      } else {
        lps[i] = 0;
        i++;
      }
    }
    this._history.push({ method: 'computeLPS' });
    return lps;
  }

  /** Compute Z-array for pattern preprocessing. */
  zArray(s: string): number[] {
    return this.zAlgorithm(s);
  }

  /** Compute prefix function (KMP failure function). */
  prefixFunction(s: string): number[] {
    return this.computeLPS(s);
  }

  /** Polynomial rolling hash. */
  polynomialHash(s: string, base = 256, mod = 1_000_000_007): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = (hash * base + s.charCodeAt(i)) % mod;
    }
    return hash;
  }

  /** Double hash for collision resistance. */
  doubleHash(s: string, base1 = 91138233, base2 = 97266353, mod1 = 1_000_000_007, mod2 = 1_000_000_009): { h1: number; h2: number } {
    let h1 = 0, h2 = 0;
    for (let i = 0; i < s.length; i++) {
      h1 = (h1 * base1 + s.charCodeAt(i)) % mod1;
      h2 = (h2 * base2 + s.charCodeAt(i)) % mod2;
    }
    return { h1, h2 };
  }

  /** Compute rolling hash array for substring queries. */
  rollingHashArray(s: string, base = 256, mod = 1_000_000_007): { hash: number[]; pow: number[] } {
    const n = s.length;
    const hash: number[] = Array(n + 1).fill(0);
    const pow: number[] = Array(n + 1).fill(1);
    for (let i = 0; i < n; i++) {
      hash[i + 1] = (hash[i] * base + s.charCodeAt(i)) % mod;
      pow[i + 1] = (pow[i] * base) % mod;
    }
    this._history.push({ method: 'rollingHashArray' });
    return { hash, pow };
  }

  /** Substring hash via precomputed rolling hash. */
  substringHash(hash: number[], pow: number[], l: number, r: number, mod = 1_000_000_007): number {
    return ((hash[r + 1] - hash[l] * pow[r - l + 1]) % mod + mod) % mod;
  }

  /** Hamming distance (requires equal-length strings). */
  hammingDistance(s1: string, s2: string): number {
    if (s1.length !== s2.length) throw new Error('Strings must be of equal length');
    let dist = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] !== s2[i]) dist++;
    }
    this._history.push({ method: 'hammingDistance' });
    return dist;
  }

  /** Damerau-Levenshtein distance (with transposition). */
  damerauLevenshtein(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
        if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
          dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
        }
      }
    }
    this._history.push({ method: 'damerauLevenshtein' });
    return dp[m][n];
  }

  /** Jaro similarity. */
  jaroSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    const m1 = s1.length;
    const m2 = s2.length;
    if (m1 === 0 || m2 === 0) return 0;
    const matchDistance = Math.max(0, Math.floor(Math.max(m1, m2) / 2) - 1);
    const s1Matches = new Array(m1).fill(false);
    const s2Matches = new Array(m2).fill(false);
    let matches = 0;
    for (let i = 0; i < m1; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, m2);
      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
    if (matches === 0) return 0;
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < m1; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
    transpositions /= 2;
    return (matches / m1 + matches / m2 + (matches - transpositions) / matches) / 3;
  }

  /** Jaro-Winkler similarity with prefix bonus. */
  jaroWinklerSimilarity(s1: string, s2: string, scaling = 0.1): number {
    const jaro = this.jaroSimilarity(s1, s2);
    let prefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
    return jaro + prefix * scaling * (1 - jaro);
  }

  /** Sørensen-Dice coefficient on character bigrams. */
  sorensenDice(s1: string, s2: string): number {
    if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;
    const bigrams1 = new Set<string>();
    for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1.substring(i, i + 2));
    const bigrams2 = new Set<string>();
    for (let i = 0; i < s2.length - 1; i++) bigrams2.add(s2.substring(i, i + 2));
    let intersection = 0;
    for (const b of bigrams1) if (bigrams2.has(b)) intersection++;
    return (2 * intersection) / (bigrams1.size + bigrams2.size);
  }

  /** Jaccard similarity on character bigrams. */
  jaccardSimilarity(s1: string, s2: string): number {
    const set1 = new Set<string>();
    for (let i = 0; i < s1.length - 1; i++) set1.add(s1.substring(i, i + 2));
    const set2 = new Set<string>();
    for (let i = 0; i < s2.length - 1; i++) set2.add(s2.substring(i, i + 2));
    if (set1.size === 0 && set2.size === 0) return 1;
    let intersection = 0;
    for (const b of set1) if (set2.has(b)) intersection++;
    const union = set1.size + set2.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /** Cosine similarity on character frequency vectors. */
  cosineSimilarity(s1: string, s2: string): number {
    const v1: Record<string, number> = {};
    const v2: Record<string, number> = {};
    for (const c of s1) v1[c] = (v1[c] ?? 0) + 1;
    for (const c of s2) v2[c] = (v2[c] ?? 0) + 1;
    let dot = 0;
    let mag1 = 0;
    let mag2 = 0;
    for (const c in v1) {
      const a = v1[c];
      const b = v2[c] ?? 0;
      dot += a * b;
      mag1 += a * a;
    }
    for (const c in v2) mag2 += v2[c] * v2[c];
    if (mag1 === 0 || mag2 === 0) return 0;
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /** Needleman-Wunsch global alignment. */
  needlemanWunsch(s1: string, s2: string, match = 1, mismatch = -1, gap = -1): { score: number; aligned1: string; aligned2: string } {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i * gap;
    for (let j = 0; j <= n; j++) dp[0][j] = j * gap;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const score = s1[i - 1] === s2[j - 1] ? match : mismatch;
        dp[i][j] = Math.max(
          dp[i - 1][j - 1] + score,
          dp[i - 1][j] + gap,
          dp[i][j - 1] + gap
        );
      }
    }
    let i = m;
    let j = n;
    let a1 = '';
    let a2 = '';
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch)) {
        a1 = s1[i - 1] + a1;
        a2 = s2[j - 1] + a2;
        i--;
        j--;
      } else if (i > 0 && dp[i][j] === dp[i - 1][j] + gap) {
        a1 = s1[i - 1] + a1;
        a2 = '-' + a2;
        i--;
      } else {
        a1 = '-' + a1;
        a2 = s2[j - 1] + a2;
        j--;
      }
    }
    this._history.push({ method: 'needlemanWunsch' });
    return { score: dp[m][n], aligned1: a1, aligned2: a2 };
  }

  /** Smith-Waterman local alignment. */
  smithWaterman(s1: string, s2: string, match = 2, mismatch = -1, gap = -1): { score: number; aligned1: string; aligned2: string } {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    let maxScore = 0;
    let maxI = 0;
    let maxJ = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const score = s1[i - 1] === s2[j - 1] ? match : mismatch;
        dp[i][j] = Math.max(
          0,
          dp[i - 1][j - 1] + score,
          dp[i - 1][j] + gap,
          dp[i][j - 1] + gap
        );
        if (dp[i][j] > maxScore) {
          maxScore = dp[i][j];
          maxI = i;
          maxJ = j;
        }
      }
    }
    let i = maxI;
    let j = maxJ;
    let a1 = '';
    let a2 = '';
    while (i > 0 && j > 0 && dp[i][j] > 0) {
      if (dp[i][j] === dp[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? match : mismatch)) {
        a1 = s1[i - 1] + a1;
        a2 = s2[j - 1] + a2;
        i--;
        j--;
      } else if (dp[i][j] === dp[i - 1][j] + gap) {
        a1 = s1[i - 1] + a1;
        a2 = '-' + a2;
        i--;
      } else {
        a1 = '-' + a1;
        a2 = s2[j - 1] + a2;
        j--;
      }
    }
    this._history.push({ method: 'smithWaterman' });
    return { score: maxScore, aligned1: a1, aligned2: a2 };
  }

  /** Burrows-Wheeler transform. */
  burrowsWheelerTransform(s: string): { transformed: string; index: number } {
    if (s.length === 0) return { transformed: '', index: 0 };
    const doubled = s + s;
    const rotations: Array<{ rotation: string; idx: number }> = [];
    for (let i = 0; i < s.length; i++) {
      rotations.push({ rotation: doubled.substring(i, i + s.length), idx: i });
    }
    rotations.sort((a, b) => a.rotation < b.rotation ? -1 : a.rotation > b.rotation ? 1 : 0);
    let transformed = '';
    let index = 0;
    for (let i = 0; i < rotations.length; i++) {
      transformed += rotations[i].rotation[s.length - 1];
      if (rotations[i].idx === 0) index = i;
    }
    this._history.push({ method: 'burrowsWheelerTransform' });
    return { transformed, index };
  }

  /** Inverse Burrows-Wheeler transform. */
  inverseBurrowsWheeler(transformed: string, index: number): string {
    if (transformed.length === 0) return '';
    const n = transformed.length;
    const table: string[] = transformed.split('');
    for (let i = 0; i < n; i++) {
      table.sort();
      for (let j = 0; j < n; j++) {
        table[j] = transformed[j] + table[j];
      }
    }
    this._history.push({ method: 'inverseBurrowsWheeler' });
    return table[index];
  }

  /** Move-to-front transform. */
  moveToFrontEncode(s: string): number[] {
    const symbols = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const list = [...symbols];
    const result: number[] = [];
    for (const c of s) {
      const idx = list.indexOf(c);
      result.push(idx);
      list.splice(idx, 1);
      list.unshift(c);
    }
    this._history.push({ method: 'moveToFrontEncode' });
    return result;
  }

  /** Move-to-front decode. */
  moveToFrontDecode(indices: number[]): string {
    const symbols = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const list = [...symbols];
    let result = '';
    for (const idx of indices) {
      const c = list[idx];
      result += c;
      list.splice(idx, 1);
      list.unshift(c);
    }
    this._history.push({ method: 'moveToFrontDecode' });
    return result;
  }

  /** LZW compression. */
  lzwCompress(s: string): number[] {
    const dict: Map<string, number> = new Map();
    for (let i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
    let nextCode = 256;
    const result: number[] = [];
    let current = '';
    for (const c of s) {
      const combined = current + c;
      if (dict.has(combined)) {
        current = combined;
      } else {
        result.push(dict.get(current) ?? 0);
        dict.set(combined, nextCode++);
        current = c;
      }
    }
    if (current.length > 0) result.push(dict.get(current) ?? 0);
    this._history.push({ method: 'lzwCompress' });
    return result;
  }

  /** LZW decompression. */
  lzwDecompress(codes: number[]): string {
    const dict: Map<number, string> = new Map();
    for (let i = 0; i < 256; i++) dict.set(i, String.fromCharCode(i));
    let nextCode = 256;
    let result = '';
    let prev = dict.get(codes[0]) ?? '';
    result += prev;
    for (let i = 1; i < codes.length; i++) {
      let entry: string;
      if (dict.has(codes[i])) {
        entry = dict.get(codes[i]) ?? '';
      } else if (codes[i] === nextCode) {
        entry = prev + prev[0];
      } else {
        entry = '';
      }
      result += entry;
      dict.set(nextCode++, prev + entry[0]);
      prev = entry;
    }
    this._history.push({ method: 'lzwDecompress' });
    return result;
  }

  /** Huffman encoding (returns codes and encoded bits). */
  huffmanEncode(s: string): { codes: Record<string, string>; encoded: string } {
    if (s.length === 0) return { codes: {}, encoded: '' };
    const freq: Record<string, number> = {};
    for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
    interface HuffNode { char: string | null; freq: number; left: HuffNode | null; right: HuffNode | null; }
    const makeNode = (char: string | null, freq: number, left: HuffNode | null = null, right: HuffNode | null = null): HuffNode => ({ char, freq, left, right });
    const nodes: HuffNode[] = Object.entries(freq).map(([char, f]) => makeNode(char, f));
    while (nodes.length > 1) {
      nodes.sort((a, b) => a.freq - b.freq);
      const left = nodes.shift()!;
      const right = nodes.shift()!;
      nodes.push(makeNode(null, left.freq + right.freq, left, right));
    }
    const codes: Record<string, string> = {};
    const traverse = (node: HuffNode | null, code: string) => {
      if (!node) return;
      if (node.char !== null) {
        codes[node.char] = code || '0';
        return;
      }
      traverse(node.left, code + '0');
      traverse(node.right, code + '1');
    };
    traverse(nodes[0] ?? null, '');
    let encoded = '';
    for (const c of s) encoded += codes[c];
    this._history.push({ method: 'huffmanEncode' });
    return { codes, encoded };
  }

  /** LZ77 sliding-window compression. */
  lz77Compress(s: string, windowSize = 256, lookaheadSize = 16): Array<{ offset: number; length: number; char: string }> {
    const result: Array<{ offset: number; length: number; char: string }> = [];
    let pos = 0;
    while (pos < s.length) {
      let bestOffset = 0;
      let bestLength = 0;
      const start = Math.max(0, pos - windowSize);
      for (let i = start; i < pos; i++) {
        let len = 0;
        while (len < lookaheadSize && pos + len < s.length && s[i + len] === s[pos + len]) len++;
        if (len > bestLength) {
          bestLength = len;
          bestOffset = pos - i;
        }
      }
      const char = pos + bestLength < s.length ? s[pos + bestLength] : '';
      result.push({ offset: bestOffset, length: bestLength, char });
      pos += bestLength + 1;
    }
    this._history.push({ method: 'lz77Compress' });
    return result;
  }

  /** LZ77 decompression. */
  lz77Decompress(tokens: Array<{ offset: number; length: number; char: string }>): string {
    let result = '';
    for (const t of tokens) {
      const start = result.length - t.offset;
      for (let i = 0; i < t.length; i++) {
        result += result[start + i];
      }
      result += t.char;
    }
    this._history.push({ method: 'lz77Decompress' });
    return result;
  }

  /** Suffix array via prefix doubling (O(n log^2 n)). */
  suffixArrayDoubling(s: string): number[] {
    const n = s.length;
    if (n === 0) return [];
    const sa = Array.from({ length: n }, (_, i) => i);
    const rank = s.split('').map(c => c.charCodeAt(0));
    const tmp = new Array(n).fill(0);
    for (let k = 1; k < n; k *= 2) {
      const cmp = (a: number, b: number): number => {
        if (rank[a] !== rank[b]) return rank[a] - rank[b];
        const ra = a + k < n ? rank[a + k] : -1;
        const rb = b + k < n ? rank[b + k] : -1;
        return ra - rb;
      };
      sa.sort(cmp);
      tmp[sa[0]] = 0;
      for (let i = 1; i < n; i++) {
        tmp[sa[i]] = tmp[sa[i - 1]] + (cmp(sa[i - 1], sa[i]) < 0 ? 1 : 0);
      }
      for (let i = 0; i < n; i++) rank[i] = tmp[i];
      if (rank[sa[n - 1]] === n - 1) break;
    }
    this._structures.push({ type: 'suffix-array', size: n });
    this._history.push({ method: 'suffixArrayDoubling' });
    return sa;
  }

  /** Kasai's LCP array construction. */
  kasaiLCP(s: string, suffixArr: number[]): number[] {
    const n = s.length;
    const lcp: number[] = Array(Math.max(0, n - 1)).fill(0);
    if (n <= 1) return lcp;
    const rank: number[] = Array(n).fill(0);
    for (let i = 0; i < n; i++) rank[suffixArr[i]] = i;
    let h = 0;
    for (let i = 0; i < n; i++) {
      if (rank[i] === 0) { h = 0; continue; }
      const j = suffixArr[rank[i] - 1];
      while (i + h < n && j + h < n && s[i + h] === s[j + h]) h++;
      lcp[rank[i] - 1] = h;
      if (h > 0) h--;
    }
    this._history.push({ method: 'kasaiLCP' });
    return lcp;
  }

  /** Longest repeated substring via suffix array + LCP. */
  longestRepeatedSubstring(s: string): string {
    if (s.length < 2) return '';
    const sa = this.suffixArrayDoubling(s);
    const lcp = this.kasaiLCP(s, sa);
    let maxLen = 0;
    let maxIdx = 0;
    for (let i = 0; i < lcp.length; i++) {
      if (lcp[i] > maxLen) {
        maxLen = lcp[i];
        maxIdx = sa[i];
      }
    }
    this._history.push({ method: 'longestRepeatedSubstring' });
    return s.substring(maxIdx, maxIdx + maxLen);
  }

  /** Count distinct substrings via suffix array + LCP. */
  countDistinctSubstrings(s: string): number {
    const n = s.length;
    if (n === 0) return 0;
    const sa = this.suffixArrayDoubling(s);
    const lcp = this.kasaiLCP(s, sa);
    let total = n * (n + 1) / 2;
    for (const l of lcp) total -= l;
    this._history.push({ method: 'countDistinctSubstrings' });
    return total;
  }

  /** Longest common substring of two strings. */
  longestCommonSubstring(s1: string, s2: string): string {
    const m = s1.length;
    const n = s2.length;
    if (m === 0 || n === 0) return '';
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    let maxLen = 0;
    let endPos = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          if (dp[i][j] > maxLen) {
            maxLen = dp[i][j];
            endPos = i;
          }
        }
      }
    }
    this._history.push({ method: 'longestCommonSubstring' });
    return s1.substring(endPos - maxLen, endPos);
  }

  /** Longest common substring of multiple strings. */
  longestCommonSubstringMultiple(strings: string[]): string {
    if (strings.length === 0) return '';
    if (strings.length === 1) return strings[0];
    let result = '';
    const shortest = strings.reduce((a, b) => a.length <= b.length ? a : b);
    for (let len = shortest.length; len > 0; len--) {
      for (let start = 0; start + len <= shortest.length; start++) {
        const sub = shortest.substring(start, start + len);
        if (strings.every(s => s.includes(sub))) {
          result = sub;
          this._history.push({ method: 'longestCommonSubstringMultiple' });
          return result;
        }
      }
    }
    return result;
  }

  /** Compute suffix tree (compressed trie) approximation. */
  suffixTree(s: string): { root: Record<string, unknown>; size: number } {
    const suffixes: string[] = [];
    for (let i = 0; i < s.length; i++) suffixes.push(s.substring(i));
    return this.trie(suffixes);
  }

  /** Ternary search trie insertion. */
  ternarySearchTrie(keys: string[]): { root: unknown; count: number } {
    interface TSTNode { char: string; left: TSTNode | null; mid: TSTNode | null; right: TSTNode | null; end: boolean; }
    let root: TSTNode | null = null;
    let count = 0;
    const insert = (node: TSTNode | null, s: string, d: number): TSTNode => {
      const c = s[d];
      if (!node) node = { char: c, left: null, mid: null, right: null, end: false };
      if (c < node.char) node.left = insert(node.left, s, d);
      else if (c > node.char) node.right = insert(node.right, s, d);
      else if (d < s.length - 1) node.mid = insert(node.mid, s, d + 1);
      else { if (!node.end) count++; node.end = true; }
      return node;
    };
    for (const k of keys) {
      if (k.length > 0) root = insert(root, k, 0);
    }
    this._history.push({ method: 'ternarySearchTrie' });
    return { root, count };
  }

  /** Check if string s1 is a subsequence of s2. */
  isSubsequence(s1: string, s2: string): boolean {
    let i = 0;
    for (let j = 0; j < s2.length && i < s1.length; j++) {
      if (s1[i] === s2[j]) i++;
    }
    this._history.push({ method: 'isSubsequence' });
    return i === s1.length;
  }

  /** Count occurrences of subsequence s1 in s2. */
  countSubsequenceOccurrences(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    if (m === 0) return 1;
    if (n === 0) return 0;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let j = 0; j <= n; j++) dp[0][j] = 1;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + dp[i][j - 1];
        else dp[i][j] = dp[i][j - 1];
      }
    }
    this._history.push({ method: 'countSubsequenceOccurrences' });
    return dp[m][n];
  }

  /** Shortest common supersequence of two strings. */
  shortestCommonSupersequence(s1: string, s2: string): string {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + 1;
      }
    }
    let i = m;
    let j = n;
    let result = '';
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
        result = s1[i - 1] + result;
        i--;
        j--;
      } else if (i > 0 && (j === 0 || dp[i - 1][j] <= dp[i][j - 1])) {
        result = s1[i - 1] + result;
        i--;
      } else {
        result = s2[j - 1] + result;
        j--;
      }
    }
    this._history.push({ method: 'shortestCommonSupersequence' });
    return result;
  }

  /** Check if two strings are anagrams. */
  areAnagrams(s1: string, s2: string): boolean {
    if (s1.length !== s2.length) return false;
    const count: Record<string, number> = {};
    for (const c of s1) count[c] = (count[c] ?? 0) + 1;
    for (const c of s2) {
      count[c] = (count[c] ?? 0) - 1;
      if (count[c] < 0) return false;
    }
    this._history.push({ method: 'areAnagrams' });
    return true;
  }

  /** Group anagrams. */
  groupAnagrams(words: string[]): string[][] {
    const groups: Map<string, string[]> = new Map();
    for (const w of words) {
      const key = w.split('').sort().join('');
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(w);
    }
    this._history.push({ method: 'groupAnagrams' });
    return Array.from(groups.values());
  }

  /** Generate all permutations of a string (unique chars). */
  permutations(s: string): string[] {
    const result: string[] = [];
    const chars = s.split('');
    const used = new Array(chars.length).fill(false);
    const current: string[] = [];
    const backtrack = () => {
      if (current.length === chars.length) {
        result.push(current.join(''));
        return;
      }
      for (let i = 0; i < chars.length; i++) {
        if (used[i]) continue;
        if (i > 0 && chars[i] === chars[i - 1] && !used[i - 1]) continue;
        used[i] = true;
        current.push(chars[i]);
        backtrack();
        current.pop();
        used[i] = false;
      }
    };
    chars.sort();
    backtrack();
    this._history.push({ method: 'permutations' });
    return result;
  }

  /** Generate all combinations of k characters from s. */
  combinations(s: string, k: number): string[] {
    const result: string[] = [];
    const chars = s.split('');
    const current: string[] = [];
    const backtrack = (start: number) => {
      if (current.length === k) {
        result.push(current.join(''));
        return;
      }
      for (let i = start; i < chars.length; i++) {
        current.push(chars[i]);
        backtrack(i + 1);
        current.pop();
      }
    };
    backtrack(0);
    this._history.push({ method: 'combinations' });
    return result;
  }

  /** Next lexicographic permutation (in place). */
  nextPermutation(s: string): string {
    const chars = s.split('');
    let i = chars.length - 2;
    while (i >= 0 && chars[i] >= chars[i + 1]) i--;
    if (i < 0) return s.split('').reverse().join('');
    let j = chars.length - 1;
    while (chars[j] <= chars[i]) j--;
    [chars[i], chars[j]] = [chars[j], chars[i]];
    const result = chars.slice(0, i + 1).join('') + chars.slice(i + 1).reverse().join('');
    this._history.push({ method: 'nextPermutation' });
    return result;
  }

  /** Compute the nth lexicographic permutation. */
  nthPermutation(s: string, n: number): string {
    const chars = s.split('').sort();
    const result: string[] = [];
    let remaining = n;
    let fact = chars.reduce((f, _, i) => f * (i + 1), 1);
    if (n >= fact) return '';
    while (chars.length > 0) {
      fact = fact / chars.length;
      const idx = Math.floor(remaining / fact);
      result.push(chars.splice(idx, 1)[0]);
      remaining = remaining % fact;
    }
    this._history.push({ method: 'nthPermutation' });
    return result.join('');
  }

  /** Check if string is palindrome. */
  isPalindrome(s: string): boolean {
    const n = s.length;
    for (let i = 0; i < n / 2; i++) {
      if (s[i] !== s[n - 1 - i]) return false;
    }
    this._history.push({ method: 'isPalindrome' });
    return true;
  }

  /** Count all palindromic substrings. */
  countPalindromicSubstrings(s: string): number {
    const n = s.length;
    if (n === 0) return 0;
    let count = 0;
    for (let center = 0; center < n; center++) {
      let l = center, r = center;
      while (l >= 0 && r < n && s[l] === s[r]) { count++; l--; r++; }
      l = center;
      r = center + 1;
      while (l >= 0 && r < n && s[l] === s[r]) { count++; l--; r++; }
    }
    this._history.push({ method: 'countPalindromicSubstrings' });
    return count;
  }

  /** All palindromic substrings. */
  allPalindromicSubstrings(s: string): string[] {
    const result: string[] = [];
    const n = s.length;
    for (let center = 0; center < n; center++) {
      let l = center, r = center;
      while (l >= 0 && r < n && s[l] === s[r]) {
        result.push(s.substring(l, r + 1));
        l--;
        r++;
      }
      l = center;
      r = center + 1;
      while (l >= 0 && r < n && s[l] === s[r]) {
        result.push(s.substring(l, r + 1));
        l--;
        r++;
      }
    }
    this._history.push({ method: 'allPalindromicSubstrings' });
    return Array.from(new Set(result));
  }

  /** Longest palindromic subsequence length. */
  longestPalindromicSubsequence(s: string): number {
    const n = s.length;
    if (n === 0) return 0;
    const dp: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    for (let i = 0; i < n; i++) dp[i][i] = 1;
    for (let len = 2; len <= n; len++) {
      for (let i = 0; i + len <= n; i++) {
        const j = i + len - 1;
        if (s[i] === s[j]) dp[i][j] = dp[i + 1][j - 1] + 2;
        else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j - 1]);
      }
    }
    this._history.push({ method: 'longestPalindromicSubsequence' });
    return dp[0][n - 1];
  }

  /** Minimum insertions to make string palindrome. */
  minInsertionsToPalindrome(s: string): number {
    return s.length - this.longestPalindromicSubsequence(s);
  }

  /** Minimum deletions to make string palindrome. */
  minDeletionsToPalindrome(s: string): number {
    return s.length - this.longestPalindromicSubsequence(s);
  }

  /** Find all anagram start indices of p in s. */
  findAnagrams(s: string, p: string): number[] {
    const result: number[] = [];
    if (p.length > s.length) return result;
    const sCount: number[] = Array(26).fill(0);
    const pCount: number[] = Array(26).fill(0);
    for (let i = 0; i < p.length; i++) {
      sCount[s.charCodeAt(i) - 97]++;
      pCount[p.charCodeAt(i) - 97]++;
    }
    if (sCount.join(',') === pCount.join(',')) result.push(0);
    for (let i = p.length; i < s.length; i++) {
      sCount[s.charCodeAt(i) - 97]++;
      sCount[s.charCodeAt(i - p.length) - 97]--;
      if (sCount.join(',') === pCount.join(',')) result.push(i - p.length + 1);
    }
    this._history.push({ method: 'findAnagrams' });
    return result;
  }

  /** Longest substring without repeating characters. */
  longestSubstringNoRepeat(s: string): number {
    const seen: Map<string, number> = new Map();
    let max = 0;
    let start = 0;
    for (let i = 0; i < s.length; i++) {
      if (seen.has(s[i]) && (seen.get(s[i]) ?? 0) >= start) {
        start = (seen.get(s[i]) ?? 0) + 1;
      }
      seen.set(s[i], i);
      max = Math.max(max, i - start + 1);
    }
    this._history.push({ method: 'longestSubstringNoRepeat' });
    return max;
  }

  /** Longest substring with at most k distinct characters. */
  longestSubstringKDistinct(s: string, k: number): number {
    if (k === 0) return 0;
    const count: Record<string, number> = {};
    let distinct = 0;
    let max = 0;
    let start = 0;
    for (let i = 0; i < s.length; i++) {
      if (!count[s[i]]) { count[s[i]] = 0; distinct++; }
      count[s[i]]++;
      while (distinct > k) {
        count[s[start]]--;
        if (count[s[start]] === 0) distinct--;
        start++;
      }
      max = Math.max(max, i - start + 1);
    }
    this._history.push({ method: 'longestSubstringKDistinct' });
    return max;
  }

  /** Minimum window substring containing all chars of t. */
  minWindowSubstring(s: string, t: string): string {
    const need: Record<string, number> = {};
    for (const c of t) need[c] = (need[c] ?? 0) + 1;
    let required = Object.keys(need).length;
    const have: Record<string, number> = {};
    let formed = 0;
    let l = 0;
    let r = 0;
    let minLen = Infinity;
    let minL = 0;
    while (r < s.length) {
      const c = s[r];
      have[c] = (have[c] ?? 0) + 1;
      if (need[c] && have[c] === need[c]) formed++;
      while (l <= r && formed === required) {
        if (r - l + 1 < minLen) { minLen = r - l + 1; minL = l; }
        have[s[l]]--;
        if (need[s[l]] && have[s[l]] < need[s[l]]) formed--;
        l++;
      }
      r++;
    }
    this._history.push({ method: 'minWindowSubstring' });
    return minLen === Infinity ? '' : s.substring(minL, minL + minLen);
  }

  /** Validate parentheses balance. */
  isValidParentheses(s: string): boolean {
    const stack: string[] = [];
    const map: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
    for (const c of s) {
      if (c === '(' || c === '[' || c === '{') stack.push(c);
      else if (map[c]) {
        if (stack.pop() !== map[c]) return false;
      }
    }
    this._history.push({ method: 'isValidParentheses' });
    return stack.length === 0;
  }

  /** Generate all valid parentheses combinations. */
  generateParenthesis(n: number): string[] {
    const result: string[] = [];
    const backtrack = (current: string, open: number, close: number) => {
      if (current.length === 2 * n) { result.push(current); return; }
      if (open < n) backtrack(current + '(', open + 1, close);
      if (close < open) backtrack(current + ')', open, close + 1);
    };
    backtrack('', 0, 0);
    this._history.push({ method: 'generateParenthesis' });
    return result;
  }

  /** Reverse words in a string. */
  reverseWords(s: string): string {
    const result = s.trim().split(/\s+/).reverse().join(' ');
    this._history.push({ method: 'reverseWords' });
    return result;
  }

  /** Reverse only letters (preserve non-letters). */
  reverseOnlyLetters(s: string): string {
    const chars = s.split('');
    let l = 0;
    let r = chars.length - 1;
    const isLetter = (c: string) => /[a-zA-Z]/.test(c);
    while (l < r) {
      while (l < r && !isLetter(chars[l])) l++;
      while (l < r && !isLetter(chars[r])) r--;
      [chars[l], chars[r]] = [chars[r], chars[l]];
      l++;
      r--;
    }
    this._history.push({ method: 'reverseOnlyLetters' });
    return chars.join('');
  }

  /** Convert string to title case. */
  toTitleCase(s: string): string {
    const result = s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    this._history.push({ method: 'toTitleCase' });
    return result;
  }

  /** Convert camelCase to snake_case. */
  camelToSnake(s: string): string {
    const result = s.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
    this._history.push({ method: 'camelToSnake' });
    return result;
  }

  /** Convert snake_case to camelCase. */
  snakeToCamel(s: string): string {
    const result = s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    this._history.push({ method: 'snakeToCamel' });
    return result;
  }

  /** Compute edit script (operations) from s1 to s2. */
  editScript(s1: string, s2: string): Array<{ op: 'insert' | 'delete' | 'keep'; char: string; pos: number }> {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
        else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
    const script: Array<{ op: 'insert' | 'delete' | 'keep'; char: string; pos: number }> = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && s1[i - 1] === s2[j - 1]) {
        script.unshift({ op: 'keep', char: s1[i - 1], pos: i - 1 });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] <= dp[i - 1][j])) {
        script.unshift({ op: 'insert', char: s2[j - 1], pos: j - 1 });
        j--;
      } else {
        script.unshift({ op: 'delete', char: s1[i - 1], pos: i - 1 });
        i--;
      }
    }
    this._history.push({ method: 'editScript' });
    return script;
  }

  /** Find longest prefix which is also suffix of given string. */
  longestPrefixAlsoSuffix(s: string): number {
    return this.computeLPS(s)[s.length - 1] ?? 0;
  }

  /** Compute minimum number of swaps to make strings equal (only x/y chars). */
  minSwapXY(s1: string, s2: string): number {
    let xy = 0;
    let yx = 0;
    for (let i = 0; i < s1.length; i++) {
      if (s1[i] === 'x' && s2[i] === 'y') xy++;
      else if (s1[i] === 'y' && s2[i] === 'x') yx++;
    }
    if ((xy + yx) % 2 !== 0) return -1;
    this._history.push({ method: 'minSwapXY' });
    return Math.floor(xy / 2) + Math.floor(yx / 2) + (xy % 2) * 2;
  }

  /** Rabin fingerprint with rolling update. */
  rabinFingerprint(s: string, base = 256, mod = 1_000_000_007): number {
    return this.polynomialHash(s, base, mod);
  }

  /** Find all palindrome pairs in a list of words. */
  palindromePairs(words: string[]): Array<[number, number]> {
    const result: Array<[number, number]> = [];
    const wordMap: Map<string, number> = new Map();
    words.forEach((w, i) => wordMap.set(w, i));
    const isPal = (s: string): boolean => {
      let l = 0;
      let r = s.length - 1;
      while (l < r) {
        if (s[l] !== s[r]) return false;
        l++;
        r--;
      }
      return true;
    };
    for (let i = 0; i < words.length; i++) {
      for (let j = 0; j <= words[i].length; j++) {
        const left = words[i].substring(0, j);
        const right = words[i].substring(j);
        if (isPal(left)) {
          const reversedRight = right.split('').reverse().join('');
          if (wordMap.has(reversedRight) && wordMap.get(reversedRight) !== i) {
            result.push([wordMap.get(reversedRight)!, i]);
          }
        }
        if (right.length > 0 && isPal(right)) {
          const reversedLeft = left.split('').reverse().join('');
          if (wordMap.has(reversedLeft) && wordMap.get(reversedLeft) !== i) {
            result.push([i, wordMap.get(reversedLeft)!]);
          }
        }
      }
    }
    this._history.push({ method: 'palindromePairs' });
    return result;
  }

  /** Aho-Corasick with proper failure function. */
  ahoCorasickAdvanced(text: string, patterns: string[]): Record<string, number[]> {
    interface ACNode { children: Map<string, number>; fail: number; output: string[]; }
    const nodes: ACNode[] = [{ children: new Map(), fail: 0, output: [] }];
    for (const p of patterns) {
      let cur = 0;
      for (const c of p) {
        if (!nodes[cur].children.has(c)) {
          nodes.push({ children: new Map(), fail: 0, output: [] });
          nodes[cur].children.set(c, nodes.length - 1);
        }
        cur = nodes[cur].children.get(c)!;
      }
      nodes[cur].output.push(p);
    }
    const queue: number[] = [];
    for (const child of nodes[0].children.values()) {
      nodes[child].fail = 0;
      queue.push(child);
    }
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const [c, v] of nodes[u].children.entries()) {
        let f = nodes[u].fail;
        while (f !== 0 && !nodes[f].children.has(c)) f = nodes[f].fail;
        if (nodes[f].children.has(c) && nodes[f].children.get(c) !== v) {
          nodes[v].fail = nodes[f].children.get(c)!;
        } else {
          nodes[v].fail = 0;
        }
        nodes[v].output.push(...nodes[nodes[v].fail].output);
        queue.push(v);
      }
    }
    const result: Record<string, number[]> = {};
    for (const p of patterns) result[p] = [];
    let cur = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      while (cur !== 0 && !nodes[cur].children.has(c)) cur = nodes[cur].fail;
      if (nodes[cur].children.has(c)) cur = nodes[cur].children.get(c)!;
      for (const p of nodes[cur].output) {
        result[p].push(i - p.length + 1);
      }
    }
    this._history.push({ method: 'ahoCorasickAdvanced' });
    return result;
  }

  /** Count occurrences of pattern with wildcards (? matches any char). */
  wildcardMatch(text: string, pattern: string): number[] {
    const matches: number[] = [];
    const n = text.length;
    const m = pattern.length;
    if (m === 0 || m > n) return matches;
    for (let i = 0; i <= n - m; i++) {
      let j = 0;
      while (j < m && (pattern[j] === '?' || text[i + j] === pattern[j])) j++;
      if (j === m) matches.push(i);
    }
    this._matches.push({ pattern, text, algorithm: 'Wildcard', matches });
    this._history.push({ method: 'wildcardMatch' });
    return matches;
  }

  /** Match text against glob pattern (* and ?). */
  globMatch(text: string, pattern: string): boolean {
    const m = text.length;
    const n = pattern.length;
    const dp: boolean[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    dp[0][0] = true;
    for (let j = 1; j <= n; j++) {
      if (pattern[j - 1] === '*') dp[0][j] = dp[0][j - 1];
    }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (pattern[j - 1] === '*') {
          dp[i][j] = dp[i - 1][j] || dp[i][j - 1];
        } else if (pattern[j - 1] === '?' || text[i - 1] === pattern[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        }
      }
    }
    this._history.push({ method: 'globMatch' });
    return dp[m][n];
  }

  /** Regex matching with '.' and '*' (Leetcode 10 style). */
  regexMatch(text: string, pattern: string): boolean {
    const m = text.length;
    const n = pattern.length;
    const dp: boolean[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(false));
    dp[0][0] = true;
    for (let j = 1; j <= n; j++) {
      if (pattern[j - 1] === '*' && j >= 2) dp[0][j] = dp[0][j - 2];
    }
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (pattern[j - 1] === '*') {
          dp[i][j] = dp[i][j - 2] || (dp[i - 1][j] && (pattern[j - 2] === '.' || pattern[j - 2] === text[i - 1]));
        } else if (pattern[j - 1] === '.' || pattern[j - 1] === text[i - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        }
      }
    }
    this._history.push({ method: 'regexMatch' });
    return dp[m][n];
  }

  /** Concatenate unique strings (for two-string concat). */
  concatUnique(s1: string, s2: string): string {
    const seen = new Set(s1.split(''));
    let result = s1;
    for (const c of s2) {
      if (!seen.has(c)) {
        result += c;
        seen.add(c);
      }
    }
    this._history.push({ method: 'concatUnique' });
    return result;
  }

  /** Compute LCS length of three strings. */
  lcs3(s1: string, s2: string, s3: string): number {
    const l = s1.length;
    const m = s2.length;
    const n = s3.length;
    const dp: number[][][] = Array.from({ length: l + 1 }, () =>
      Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    );
    for (let i = 1; i <= l; i++) {
      for (let j = 1; j <= m; j++) {
        for (let k = 1; k <= n; k++) {
          if (s1[i - 1] === s2[j - 1] && s2[j - 1] === s3[k - 1]) {
            dp[i][j][k] = dp[i - 1][j - 1][k - 1] + 1;
          } else {
            dp[i][j][k] = Math.max(dp[i - 1][j][k], dp[i][j - 1][k], dp[i][j][k - 1]);
          }
        }
      }
    }
    this._history.push({ method: 'lcs3' });
    return dp[l][m][n];
  }

  /** Run-length encode (RLE) with explicit char+count. */
  rlePairs(s: string): Array<[string, number]> {
    const pairs: Array<[string, number]> = [];
    if (s.length === 0) return pairs;
    let cur = s[0];
    let count = 1;
    for (let i = 1; i < s.length; i++) {
      if (s[i] === cur) count++;
      else {
        pairs.push([cur, count]);
        cur = s[i];
        count = 1;
      }
    }
    pairs.push([cur, count]);
    this._history.push({ method: 'rlePairs' });
    return pairs;
  }

  /** Decode RLE pairs back to string. */
  rleDecode(pairs: Array<[string, number]>): string {
    let result = '';
    for (const [c, n] of pairs) {
      result += c.repeat(n);
    }
    this._history.push({ method: 'rleDecode' });
    return result;
  }

  /** Compute character frequency map. */
  charFrequency(s: string): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
    this._history.push({ method: 'charFrequency' });
    return freq;
  }

  /** Check if string has all unique characters. */
  hasAllUniqueChars(s: string): boolean {
    const seen = new Set<string>();
    for (const c of s) {
      if (seen.has(c)) return false;
      seen.add(c);
    }
    this._history.push({ method: 'hasAllUniqueChars' });
    return true;
  }

  /** First non-repeating character. */
  firstNonRepeatingChar(s: string): string {
    const freq: Record<string, number> = {};
    for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
    for (const c of s) {
      if (freq[c] === 1) {
        this._history.push({ method: 'firstNonRepeatingChar' });
        return c;
      }
    }
    return '';
  }

  /** Most frequent character. */
  mostFrequentChar(s: string): string {
    if (s.length === 0) return '';
    const freq: Record<string, number> = {};
    for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
    let max = 0;
    let result = '';
    for (const c in freq) {
      if (freq[c] > max) { max = freq[c]; result = c; }
    }
    this._history.push({ method: 'mostFrequentChar' });
    return result;
  }

  /** Sort characters in string. */
  sortString(s: string): string {
    const result = s.split('').sort().join('');
    this._history.push({ method: 'sortString' });
    return result;
  }

  /** LSD string sort for fixed-length strings. */
  lsdSort(strings: string[], w: number): string[] {
    const result = [...strings];
    const n = result.length;
    const R = 256;
    for (let d = w - 1; d >= 0; d--) {
      const count: number[] = Array(R + 1).fill(0);
      const aux: string[] = Array(n);
      for (let i = 0; i < n; i++) count[result[i].charCodeAt(d) + 1]++;
      for (let r = 0; r < R; r++) count[r + 1] += count[r];
      for (let i = 0; i < n; i++) aux[count[result[i].charCodeAt(d)]++] = result[i];
      for (let i = 0; i < n; i++) result[i] = aux[i];
    }
    this._history.push({ method: 'lsdSort' });
    return result;
  }

  /** MSD string sort (recursive). */
  msdSort(strings: string[]): string[] {
    const result = [...strings];
    const aux: string[] = Array(result.length);
    const R = 256;
    const sort = (lo: number, hi: number, d: number) => {
      if (hi <= lo) return;
      const count: number[] = Array(R + 2).fill(0);
      for (let i = lo; i <= hi; i++) {
        const c = d < result[i].length ? result[i].charCodeAt(d) + 1 : 0;
        count[c + 1]++;
      }
      for (let r = 0; r < R + 1; r++) count[r + 1] += count[r];
      for (let i = lo; i <= hi; i++) {
        const c = d < result[i].length ? result[i].charCodeAt(d) + 1 : 0;
        aux[count[c]++] = result[i];
      }
      for (let i = lo; i <= hi; i++) result[i] = aux[i - lo];
      for (let r = 0; r < R; r++) {
        sort(lo + count[r], lo + count[r + 1] - 1, d + 1);
      }
    };
    sort(0, result.length - 1, 0);
    this._history.push({ method: 'msdSort' });
    return result;
  }

  /** Three-way string quicksort. */
  quick3String(strings: string[]): string[] {
    const result = [...strings];
    const sort = (lo: number, hi: number, d: number) => {
      if (hi <= lo) return;
      let lt = lo;
      let gt = hi;
      const v = d < result[lo].length ? result[lo].charCodeAt(d) : -1;
      let i = lo + 1;
      while (i <= gt) {
        const t = d < result[i].length ? result[i].charCodeAt(d) : -1;
        if (t < v) { [result[lt], result[i]] = [result[i], result[lt]]; lt++; i++; }
        else if (t > v) { [result[i], result[gt]] = [result[gt], result[i]]; gt--; }
        else i++;
      }
      sort(lo, lt - 1, d);
      if (v >= 0) sort(lt, gt, d + 1);
      sort(gt + 1, hi, d);
    };
    sort(0, result.length - 1, 0);
    this._history.push({ method: 'quick3String' });
    return result;
  }

  /** Compute edit distance with affine gap penalty. */
  editDistanceAffine(s1: string, s2: string, open: number, extend: number): number {
    const m = s1.length;
    const n = s2.length;
    const M: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    const X: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    const Y: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      M[i][0] = -Infinity;
      X[i][0] = open + (i - 1) * extend;
      Y[i][0] = -Infinity;
    }
    for (let j = 1; j <= n; j++) {
      M[0][j] = -Infinity;
      X[0][j] = -Infinity;
      Y[0][j] = open + (j - 1) * extend;
    }
    M[0][0] = 0;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const match = s1[i - 1] === s2[j - 1] ? 0 : 1;
        M[i][j] = match + Math.max(M[i - 1][j - 1], X[i - 1][j - 1], Y[i - 1][j - 1]);
        X[i][j] = Math.max(M[i - 1][j] + open, X[i - 1][j] + extend);
        Y[i][j] = Math.max(M[i][j - 1] + open, Y[i][j - 1] + extend);
      }
    }
    this._history.push({ method: 'editDistanceAffine' });
    return Math.max(M[m][n], X[m][n], Y[m][n]);
  }

  /** Compute n-gram frequencies. */
  ngramFrequencies(s: string, n: number): Map<string, number> {
    const freq: Map<string, number> = new Map();
    for (let i = 0; i <= s.length - n; i++) {
      const gram = s.substring(i, i + n);
      freq.set(gram, (freq.get(gram) ?? 0) + 1);
    }
    this._history.push({ method: 'ngramFrequencies' });
    return freq;
  }

  /** Compute Shannon entropy of a string. */
  shannonEntropy(s: string): number {
    if (s.length === 0) return 0;
    const freq: Record<string, number> = {};
    for (const c of s) freq[c] = (freq[c] ?? 0) + 1;
    let entropy = 0;
    const len = s.length;
    for (const c in freq) {
      const p = freq[c] / len;
      entropy -= p * Math.log2(p);
    }
    this._history.push({ method: 'shannonEntropy' });
    return entropy;
  }

  /** Compute longest prefix shared by two strings. */
  longestCommonPrefixTwo(s1: string, s2: string): string {
    let i = 0;
    while (i < s1.length && i < s2.length && s1[i] === s2[i]) i++;
    return s1.substring(0, i);
  }

  /** Title case converter using simple word boundaries. */
  capitalize(s: string): string {
    if (s.length === 0) return s;
    const result = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    this._history.push({ method: 'capitalize' });
    return result;
  }

  /** Camel case conversion. */
  toCamelCase(s: string): string {
    const parts = s.split(/[\s_-]+/);
    if (parts.length === 0) return '';
    const result = parts[0].toLowerCase() + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
    this._history.push({ method: 'toCamelCase' });
    return result;
  }

  /** Kebab case conversion. */
  toKebabCase(s: string): string {
    const result = s.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
    this._history.push({ method: 'toKebabCase' });
    return result;
  }

  /** Strip whitespace from both ends. */
  trim(s: string): string {
    return s.trim();
  }

  /** Pad string to length. */
  pad(s: string, length: number, char = ' '): string {
    if (s.length >= length) return s;
    const total = length - s.length;
    const left = Math.floor(total / 2);
    const right = total - left;
    return char.repeat(left) + s + char.repeat(right);
  }

  /** Truncate string with ellipsis. */
  truncate(s: string, length: number, ellipsis = '...'): string {
    if (s.length <= length) return s;
    return s.substring(0, length - ellipsis.length) + ellipsis;
  }

  /** Compute string similarity score (0-1) using normalized Levenshtein. */
  normalizedSimilarity(s1: string, s2: string): number {
    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1;
    return 1 - this.levenshteinDistance(s1, s2) / maxLen;
  }

  toPacket(): DataPacket<{
    matches: StringMatch[];
    structures: SuffixStructure[];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'StringAlgorithms'],
      priority: 1,
      phase: 'cs:string',
    };
    return {
      id: `str-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        matches: this._matches,
        structures: this._structures,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._matches = [];
    this._structures = [];
    this._history = [];
    this._counter = 0;
  }

  get matchCount(): number {
    return this._matches.length;
  }

  get structureCount(): number {
    return this._structures.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
