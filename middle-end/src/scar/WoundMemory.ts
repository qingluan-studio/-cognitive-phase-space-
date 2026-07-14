/**
 * 伤口记忆模块：永久记住每次受伤的场景细节，
 * 形成不可磨灭的创伤档案，用于未来识别类似威胁。
 */

export interface WoundScene {
  id: string;
  timestamp: number;
  source: string;
  context: Record<string, unknown>;
  severity: number;
  lessons: string[];
}

export interface RecallResult {
  woundId: string;
  similarity: number;
  matchedFields: string[];
}

export class WoundMemory {
  private _wounds: Map<string, WoundScene> = new Map();
  private _recallLog: RecallResult[] = [];
  private _similarityThreshold = 0.5;
  private _maxWounds = 200;

  record(scene: WoundScene): void {
    this._wounds.set(scene.id, scene);
    if (this._wounds.size > this._maxWounds) {
      const oldest = Array.from(this._wounds.values()).sort((a, b) => a.timestamp - b.timestamp)[0];
      if (oldest) this._wounds.delete(oldest.id);
    }
  }

  addLesson(woundId: string, lesson: string): boolean {
    const wound = this._wounds.get(woundId);
    if (!wound) return false;
    wound.lessons.push(lesson);
    return true;
  }

  private _computeSimilarity(scene: WoundScene, source: string, context: Record<string, unknown>): number {
    let score = 0;
    if (scene.source === source) score += 0.5;
    const contextKeys = Object.keys(context);
    const sceneContextKeys = Object.keys(scene.context);
    let matched = 0;
    for (const key of contextKeys) {
      if (scene.context[key] === context[key]) matched++;
    }
    const contextScore = contextKeys.length > 0 ? matched / contextKeys.length : 0;
    score += contextScore * 0.5;
    return score;
  }

  recall(source: string, context: Record<string, unknown>): RecallResult[] {
    const results: RecallResult[] = [];
    for (const wound of this._wounds.values()) {
      const similarity = this._computeSimilarity(wound, source, context);
      if (similarity >= this._similarityThreshold) {
        const matchedFields: string[] = [];
        if (wound.source === source) matchedFields.push('source');
        for (const key of Object.keys(context)) {
          if (wound.context[key] === context[key]) matchedFields.push(key);
        }
        const result: RecallResult = {
          woundId: wound.id,
          similarity,
          matchedFields,
        };
        results.push(result);
      }
    }
    results.sort((a, b) => b.similarity - a.similarity);
    this._recallLog.push(...results);
    if (this._recallLog.length > 200) this._recallLog = this._recallLog.slice(-200);
    return results;
  }

  getLessonsBySource(source: string): string[] {
    const lessons: string[] = [];
    for (const wound of this._wounds.values()) {
      if (wound.source === source) lessons.push(...wound.lessons);
    }
    return lessons;
  }

  findMostSevere(): WoundScene | null {
    let max = 0;
    let result: WoundScene | null = null;
    for (const wound of this._wounds.values()) {
      if (wound.severity > max) {
        max = wound.severity;
        result = wound;
      }
    }
    return result;
  }

  setSimilarityThreshold(value: number): void {
    this._similarityThreshold = Math.max(0, Math.min(1, value));
  }

  forgetWound(woundId: string): boolean {
    return this._wounds.delete(woundId);
  }

  getRecallLog(limit: number = 50): RecallResult[] {
    return this._recallLog.slice(-limit);
  }

  listAllWounds(): WoundScene[] {
    return Array.from(this._wounds.values());
  }

  get woundCount(): number {
    return this._wounds.size;
  }
}
