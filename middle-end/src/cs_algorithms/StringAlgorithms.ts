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
