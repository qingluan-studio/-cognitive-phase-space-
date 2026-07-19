import { DataPacket, PacketMeta } from '../shared/types';

/** Backtracking state descriptor. */
export interface BacktrackState {
  choices: unknown[];
  path: unknown[];
  constraint: string;
}

/** Backtracking problem descriptor. */
export interface BacktrackProblem {
  type: 'permutation' | 'combination' | 'partition' | 'search' | 'coloring';
  constraints: string[];
}

/** Backtracking algorithm suite. */
export class Backtracking {
  private _states: BacktrackState[] = [];
  private _problems: BacktrackProblem[] = [];
  private _solutions: unknown[][] = [];
  private _history: unknown[] = [];
  private _counter = 0;

  /** N-Queens problem: count solutions for an n x n board. */
  nQueens(n: number): number {
    const cols: number[] = [];
    let count = 0;
    const isSafe = (row: number, col: number): boolean => {
      for (let r = 0; r < row; r++) {
        if (cols[r] === col) return false;
        if (Math.abs(cols[r] - col) === row - r) return false;
      }
      return true;
    };
    const solve = (row: number): void => {
      if (row === n) {
        count++;
        return;
      }
      for (let c = 0; c < n; c++) {
        if (isSafe(row, c)) {
          cols[row] = c;
          solve(row + 1);
          cols[row] = -1;
        }
      }
    };
    solve(0);
    this._history.push({ method: 'nQueens', n, count });
    return count;
  }

  /** Solve a sudoku board in-place (returns solved copy if solvable). */
  sudokuSolve(board: number[][]): number[][] | null {
    const b = board.map(row => [...row]);
    const findEmpty = (): [number, number] | null => {
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (b[r][c] === 0) return [r, c];
        }
      }
      return null;
    };
    const valid = (r: number, c: number, n: number): boolean => {
      for (let i = 0; i < 9; i++) {
        if (b[r][i] === n || b[i][c] === n) return false;
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (b[br + i][bc + j] === n) return false;
        }
      }
      return true;
    };
    const solve = (): boolean => {
      const empty = findEmpty();
      if (!empty) return true;
      const [r, c] = empty;
      for (let n = 1; n <= 9; n++) {
        if (valid(r, c, n)) {
          b[r][c] = n;
          if (solve()) return true;
          b[r][c] = 0;
        }
      }
      return false;
    };
    if (solve()) {
      this._history.push({ method: 'sudokuSolve', solved: true });
      return b;
    }
    this._history.push({ method: 'sudokuSolve', solved: false });
    return null;
  }

  /** Permutations of an array. */
  permutations(arr: number[]): number[][] {
    const result: number[][] = [];
    const backtrack = (path: number[], remaining: number[]): void => {
      if (remaining.length === 0) {
        result.push([...path]);
        return;
      }
      for (let i = 0; i < remaining.length; i++) {
        path.push(remaining[i]);
        backtrack(path, [...remaining.slice(0, i), ...remaining.slice(i + 1)]);
        path.pop();
      }
    };
    backtrack([], arr);
    this._history.push({ method: 'permutations', n: arr.length });
    return result;
  }

  /** Combinations of size k from arr. */
  combinations(arr: number[], k: number): number[][] {
    const result: number[][] = [];
    const backtrack = (start: number, path: number[]): void => {
      if (path.length === k) {
        result.push([...path]);
        return;
      }
      for (let i = start; i < arr.length; i++) {
        path.push(arr[i]);
        backtrack(i + 1, path);
        path.pop();
      }
    };
    backtrack(0, []);
    this._history.push({ method: 'combinations', n: arr.length, k });
    return result;
  }

  /** All subsets (power set). */
  subsets(arr: number[]): number[][] {
    const result: number[][] = [];
    const backtrack = (start: number, path: number[]): void => {
      result.push([...path]);
      for (let i = start; i < arr.length; i++) {
        path.push(arr[i]);
        backtrack(i + 1, path);
        path.pop();
      }
    };
    backtrack(0, []);
    this._history.push({ method: 'subsets' });
    return result;
  }

  /** Word search in a 2D grid. */
  wordSearch(board: string[][], word: string): boolean {
    const m = board.length;
    if (m === 0) return false;
    const n = board[0].length;
    const visited: boolean[][] = Array.from({ length: m }, () => Array(n).fill(false));
    const dfs = (r: number, c: number, idx: number): boolean => {
      if (idx === word.length) return true;
      if (r < 0 || r >= m || c < 0 || c >= n) return false;
      if (visited[r][c] || board[r][c] !== word[idx]) return false;
      visited[r][c] = true;
      const found = dfs(r + 1, c, idx + 1) || dfs(r - 1, c, idx + 1)
        || dfs(r, c + 1, idx + 1) || dfs(r, c - 1, idx + 1);
      visited[r][c] = false;
      return found;
    };
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < n; c++) {
        if (dfs(r, c, 0)) {
          this._history.push({ method: 'wordSearch', found: true });
          return true;
        }
      }
    }
    this._history.push({ method: 'wordSearch', found: false });
    return false;
  }

  /** Generate well-formed parentheses. */
  generateParentheses(n: number): string[] {
    const result: string[] = [];
    const backtrack = (s: string, open: number, close: number): void => {
      if (s.length === 2 * n) {
        result.push(s);
        return;
      }
      if (open < n) backtrack(s + '(', open + 1, close);
      if (close < open) backtrack(s + ')', open, close + 1);
    };
    backtrack('', 0, 0);
    this._history.push({ method: 'generateParentheses', n });
    return result;
  }

  /** Partition string into palindromic substrings. */
  palindromePartition(s: string): string[][] {
    const result: string[][] = [];
    const isPalindrome = (sub: string): boolean => sub === sub.split('').reverse().join('');
    const backtrack = (start: number, path: string[]): void => {
      if (start === s.length) {
        result.push([...path]);
        return;
      }
      for (let end = start + 1; end <= s.length; end++) {
        const sub = s.substring(start, end);
        if (isPalindrome(sub)) {
          path.push(sub);
          backtrack(end, path);
          path.pop();
        }
      }
    };
    backtrack(0, []);
    this._history.push({ method: 'palindromePartition' });
    return result;
  }

  /** Combination sum (candidates can be reused). */
  combinationSum(candidates: number[], target: number): number[][] {
    const result: number[][] = [];
    const backtrack = (start: number, path: number[], remaining: number): void => {
      if (remaining === 0) {
        result.push([...path]);
        return;
      }
      for (let i = start; i < candidates.length; i++) {
        if (candidates[i] > remaining) continue;
        path.push(candidates[i]);
        backtrack(i, path, remaining - candidates[i]);
        path.pop();
      }
    };
    backtrack(0, [], target);
    this._history.push({ method: 'combinationSum' });
    return result;
  }

  /** Rat in a maze solver. */
  ratInMaze(maze: number[][]): string | null {
    const n = maze.length;
    if (n === 0) return null;
    const result: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    const solve = (r: number, c: number): boolean => {
      if (r === n - 1 && c === n - 1) {
        result[r][c] = 1;
        return true;
      }
      if (r < 0 || r >= n || c < 0 || c >= n || maze[r][c] === 0 || result[r][c] === 1) return false;
      result[r][c] = 1;
      if (solve(r + 1, c) || solve(r, c + 1)) return true;
      result[r][c] = 0;
      return false;
    };
    if (solve(0, 0)) {
      this._history.push({ method: 'ratInMaze', solved: true });
      return result.map(row => row.join('')).join('|');
    }
    this._history.push({ method: 'ratInMaze', solved: false });
    return null;
  }

  /** Graph coloring with m colors. */
  graphColoring(graph: number[][], colors: number): number[] | null {
    const n = graph.length;
    const result: number[] = Array(n).fill(0);
    const safe = (v: number, c: number): boolean => {
      for (let i = 0; i < n; i++) {
        if (graph[v][i] && result[i] === c) return false;
      }
      return true;
    };
    const solve = (v: number): boolean => {
      if (v === n) return true;
      for (let c = 1; c <= colors; c++) {
        if (safe(v, c)) {
          result[v] = c;
          if (solve(v + 1)) return true;
          result[v] = 0;
        }
      }
      return false;
    };
    if (solve(0)) {
      this._history.push({ method: 'graphColoring', solved: true });
      return result;
    }
    this._history.push({ method: 'graphColoring', solved: false });
    return null;
  }

  /** Subset sum backtracking decision. */
  subsetSumBT(arr: number[], target: number): number[] | null {
    const result: number[] = [];
    const backtrack = (idx: number, remaining: number): boolean => {
      if (remaining === 0) return true;
      if (idx >= arr.length || remaining < 0) return false;
      result.push(arr[idx]);
      if (backtrack(idx + 1, remaining - arr[idx])) return true;
      result.pop();
      return backtrack(idx + 1, remaining);
    };
    if (backtrack(0, target)) {
      this._history.push({ method: 'subsetSumBT', found: true });
      return result;
    }
    this._history.push({ method: 'subsetSumBT', found: false });
    return null;
  }

  /** Letter combinations of a phone number. */
  letterCombinations(digits: string): string[] {
    if (digits.length === 0) return [];
    const map: Record<string, string> = {
      '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
      '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz',
    };
    const result: string[] = [];
    const backtrack = (idx: number, current: string): void => {
      if (idx === digits.length) {
        result.push(current);
        return;
      }
      const letters = map[digits[idx]] ?? '';
      for (const l of letters) backtrack(idx + 1, current + l);
    };
    backtrack(0, '');
    this._history.push({ method: 'letterCombinations' });
    return result;
  }

  toPacket(): DataPacket<{
    states: BacktrackState[];
    problems: BacktrackProblem[];
    solutions: unknown[][];
    history: unknown[];
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cs_algorithms', 'Backtracking'],
      priority: 1,
      phase: 'cs:backtracking',
    };
    return {
      id: `bt-${(++this._counter).toString(36)}-${Date.now().toString(36)}`,
      payload: {
        states: this._states,
        problems: this._problems,
        solutions: this._solutions,
        history: this._history,
      },
      metadata,
    };
  }

  reset(): void {
    this._states = [];
    this._problems = [];
    this._solutions = [];
    this._history = [];
    this._counter = 0;
  }

  get stateCount(): number {
    return this._states.length;
  }

  get problemCount(): number {
    return this._problems.length;
  }

  get solutionCount(): number {
    return this._solutions.length;
  }

  get historyDepth(): number {
    return this._history.length;
  }
}
