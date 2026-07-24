/**
 * T3 — Project Geodesic: 测地线导航引擎
 *
 * 核心思想: 将代码生成/文本生成转化为高维流形上的测地线导航。
 */

function _genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  shuffle<T>(array: T[]): T[] {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function l2Norm(v: number[]): number {
  return Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, x, i) => sum + x * b[i], 0);
}

export interface CodeLandmark {
  position: number[];
  code_snippet: string;
  quality_score: number;
  description: string;
}

export interface GeodesicPath {
  landmarks: CodeLandmark[];
  total_distance: number;
  smoothness: number;
  novelty_score: number;
  label: string;
}

export class GeodesicNavigationEngine {
  n_paths: number;
  exploration_factor: number;

  constructor(n_paths = 3, exploration_factor = 0.3) {
    this.n_paths = n_paths;
    this.exploration_factor = exploration_factor;
  }

  private extract_landmarks(code: string): CodeLandmark[] {
    const landmarks = this.parseCodeLandmarks(code);
    if (landmarks.length) return landmarks;
    return this.fallback_landmarks(code);
  }

  private parseCodeLandmarks(code: string): CodeLandmark[] {
    const landmarks: CodeLandmark[] = [];
    const lines = code.split("\n");

    const patterns = [
      { regex: /function\s+(\w+)\s*\(/, type: "function" },
      { regex: /async\s+function\s+(\w+)\s*\(/, type: "async" },
      { regex: /class\s+(\w+)\b/, type: "class" },
      { regex: /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/, type: "arrow" },
      { regex: /(?:public|private|protected)?\s*(?:async\s*)?(\w+)\s*\([^)]*\)\s*[:{]/, type: "method" },
    ];

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      for (const { regex, type } of patterns) {
        const match = regex.exec(line);
        if (!match) continue;
        const name = match[1];
        const col = match.index;
        const pos = this.node_to_position(lineIdx, col, landmarks.length);
        const snippet = line.trim();
        landmarks.push({
          position: pos,
          code_snippet: snippet,
          quality_score: this.local_quality(type, line),
          description: `${type}:${name}`,
        });
      }
    }

    return landmarks;
  }

  private fallback_landmarks(code: string): CodeLandmark[] {
    const lines = code.split("\n").filter(l => l.trim());
    const n = lines.length;
    if (!n) return [];

    const nLandmarks = Math.min(5, n);
    const landmarks: CodeLandmark[] = [];
    for (let i = 0; i < nLandmarks; i++) {
      const idx = Math.round((i / (nLandmarks - 1)) * (n - 1));
      landmarks.push({
        position: [i / nLandmarks, 0.5, 0.0],
        code_snippet: lines[idx].trim(),
        quality_score: 0.5,
        description: `line-${idx + 1}`,
      });
    }
    return landmarks;
  }

  private node_to_position(line: number, col: number, existingCount: number): number[] {
    const base = existingCount;
    return [
      base / Math.max(base + 1, 1),
      Math.min(col / 80.0, 1.0),
      Math.random() * 0.2 - 0.1,
    ];
  }

  private local_quality(type: string, line: string): number {
    let score = 0.6;
    if (type === "function" || type === "async" || type === "arrow") {
      if (/\)\s*:\s*\w+/.test(line)) score += 0.1;
      if (line.split(",").length <= 5) score += 0.1;
      if (/\/\*\*|\/\//.test(line)) score += 0.1;
    } else if (type === "class") {
      if (/extends|implements/.test(line)) score += 0.15;
      if (/\/\*\*/.test(line)) score += 0.1;
    }
    return Math.min(1.0, score);
  }

  find_geodesic_paths(code: string): GeodesicPath[] {
    const landmarks = this.extract_landmarks(code);
    if (landmarks.length < 2) {
      return [{
        landmarks,
        total_distance: 0.0,
        smoothness: 1.0,
        novelty_score: 0.0,
        label: "trivial",
      }];
    }

    const paths: GeodesicPath[] = [];
    for (let p = 0; p < this.n_paths; p++) {
      let ordered: CodeLandmark[];
      let label: string;

      if (p === 0) {
        ordered = landmarks.slice().sort((a, b) => a.position[0] - b.position[0]);
        label = "natural-order";
      } else if (p === 1) {
        ordered = landmarks.slice().sort((a, b) => b.quality_score - a.quality_score);
        label = "quality-priority";
      } else if (p === 2) {
        ordered = landmarks.slice().sort((a, b) => b.position[1] - a.position[1]);
        label = "structural-alternative";
      } else {
        const rng = new SeededRandom(p);
        const indices = rng.shuffle(landmarks.map((_, i) => i));
        ordered = indices.map(i => landmarks[i]);
        label = `exploratory-${p}`;
      }

      const distance = this.geodesic_distance(ordered);
      const smoothness = this.path_smoothness(ordered);
      const novelty = this.compute_novelty(ordered, landmarks.filter(l => !ordered.includes(l)));

      paths.push({
        landmarks: ordered,
        total_distance: distance,
        smoothness,
        novelty_score: novelty,
        label,
      });
    }

    return paths;
  }

  private geodesic_distance(landmarks: CodeLandmark[]): number {
    if (landmarks.length < 2) return 0.0;
    let total = 0.0;
    for (let i = 0; i < landmarks.length - 1; i++) {
      const p1 = landmarks[i].position;
      const p2 = landmarks[i + 1].position;
      const diff = p2.map((v, j) => v - p1[j]);
      total += l2Norm(diff);
    }
    return total;
  }

  private path_smoothness(landmarks: CodeLandmark[]): number {
    if (landmarks.length < 3) return 1.0;
    const angles: number[] = [];
    for (let i = 1; i < landmarks.length - 1; i++) {
      const v1 = landmarks[i].position.map((v, j) => v - landmarks[i - 1].position[j]);
      const v2 = landmarks[i + 1].position.map((v, j) => v - landmarks[i].position[j]);
      const n1 = l2Norm(v1);
      const n2 = l2Norm(v2);
      if (n1 > 0 && n2 > 0) {
        const cosAngle = Math.max(-1, Math.min(1, dot(v1, v2) / (n1 * n2)));
        angles.push(Math.acos(cosAngle));
      }
    }
    if (!angles.length) return 1.0;
    const avgAngle = mean(angles);
    return Math.exp(-avgAngle / Math.PI);
  }

  private compute_novelty(ordered: CodeLandmark[], excluded: CodeLandmark[]): number {
    if (!excluded.length) return 0.0;
    const orderedQuality = mean(ordered.map(l => l.quality_score));
    const excludedQuality = mean(excluded.map(l => l.quality_score));
    const novelty = Math.abs(orderedQuality - excludedQuality);
    return Math.min(1.0, novelty / 0.3);
  }

  recommend_path(paths: GeodesicPath[], prefer_novelty = true): GeodesicPath {
    if (!paths.length) {
      throw new Error("No paths available");
    }

    let best = paths[0];
    let bestScore = -1.0;
    for (const path of paths) {
      const avgQuality = path.landmarks.length ? mean(path.landmarks.map(l => l.quality_score)) : 0.0;
      const score = (
        0.4 * avgQuality
        + 0.3 * path.smoothness
        + 0.3 * (prefer_novelty ? path.novelty_score : (1 - path.novelty_score))
      );
      if (score > bestScore) {
        bestScore = score;
        best = path;
      }
    }
    return best;
  }

  generate_implementation_template(path: GeodesicPath): string {
    if (!path.landmarks.length) return "# No implementation landmarks found";
    const lines: string[] = [
      `# Generated from geodesic path: ${path.label}`,
      `# Distance: ${path.total_distance.toFixed(2)}, Smoothness: ${path.smoothness.toFixed(2)}`,
      "",
    ];
    for (const lm of path.landmarks) {
      lines.push(`# [${lm.description}] quality=${lm.quality_score.toFixed(2)}`);
    }
    return lines.join("\n");
  }
}

export { _genId };
