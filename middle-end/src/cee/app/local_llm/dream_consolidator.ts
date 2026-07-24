/**
 * 梦境巩固器 — TypeScript 端
 *
 * 模拟睡眠期知识巩固：记忆回放、随机融合、抽象爬梯、异常侦测。
 * 从评估结果中提取可复用的洞见，供 OuroborosLoop 更新吸引子。
 */

export interface DreamFact {
  id: string;
  topic: string;
  fact: string;
  confidence: number;
  timestamp: number;
}

export interface DreamInsight {
  id: string;
  dreamType: 'replay' | 'shuffle' | 'ladder' | 'anomaly' | 'water';
  content: string;
  sourceFacts: string[];
  confidence: number;
  verified: boolean;
  createdAt: string;
}

export interface DreamCycleResult {
  consolidated: number;
  blended: number;
  abstracted: number;
  anomalies: number;
  waterPatterns: number;
  emergentInsights: DreamInsight[];
}

function _genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function _now(): string {
  return new Date().toISOString();
}

export class DreamConsolidator {
  private _facts: DreamFact[] = [];
  private _insights: DreamInsight[] = [];
  private _dreamCount = 0;
  private _lastDream = _now();
  private _cycles: DreamCycleResult[] = [];

  get facts(): DreamFact[] {
    return [...this._facts];
  }

  get insights(): DreamInsight[] {
    return [...this._insights];
  }

  get dreamCount(): number {
    return this._dreamCount;
  }

  ingestFact(fact: Omit<DreamFact, 'id' | 'timestamp'>): DreamFact {
    const full: DreamFact = {
      ...fact,
      id: `fact-${_genId()}`,
      timestamp: Date.now(),
    };
    this._facts.push(full);
    if (this._facts.length > 200) this._facts = this._facts.slice(-100);
    return full;
  }

  ingestAssessment(
    iteration: number,
    quality: number,
    waterPassed: boolean,
    violations: string[],
  ): DreamCycleResult {
    this.ingestFact({
      topic: 'assessment',
      fact: `iteration ${iteration}: quality=${quality.toFixed(3)}, water=${waterPassed}`,
      confidence: quality,
    });
    if (!waterPassed && violations.length) {
      for (const v of violations.slice(0, 3)) {
        this.ingestFact({
          topic: 'water-logic',
          fact: `water violation: ${v}`,
          confidence: 0.5,
        });
      }
    }
    return this.dreamCycle();
  }

  dreamCycle(): DreamCycleResult {
    this._dreamCount++;
    const result: DreamCycleResult = {
      consolidated: 0,
      blended: 0,
      abstracted: 0,
      anomalies: 0,
      waterPatterns: 0,
      emergentInsights: [],
    };

    result.consolidated = this._consolidateFacts();
    result.blended = this._shuffleBlend();
    result.abstracted = this._ladderAbstraction();
    result.anomalies = this._detectAnomalies();
    result.waterPatterns = this._extractWaterPatterns();

    result.emergentInsights = this._insights
      .filter(i => !i.verified)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    this._cycles.push(result);
    if (this._cycles.length > 50) this._cycles = this._cycles.slice(-30);
    this._lastDream = _now();
    return result;
  }

  verifyInsight(insightId: string, verified = true): void {
    const insight = this._insights.find(i => i.id === insightId);
    if (!insight) return;
    insight.verified = verified;
    insight.confidence = verified
      ? Math.min(1.0, insight.confidence + 0.3)
      : Math.max(0.2, insight.confidence - 0.2);
  }

  getPendingInsights(topK = 3): DreamInsight[] {
    return this._insights
      .filter(i => !i.verified)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, topK);
  }

  stats(): Record<string, unknown> {
    return {
      dream_count: this._dreamCount,
      insights_total: this._insights.length,
      insights_unverified: this._insights.filter(i => !i.verified).length,
      last_dream: this._lastDream,
      recent_cycles: this._cycles.slice(-5),
    };
  }

  private _consolidateFacts(): number {
    // 提升高频事实的置信度，衰减长期未使用的事实
    const now = Date.now();
    for (const fact of this._facts) {
      const age = (now - fact.timestamp) / 1000;
      if (age < 60) {
        fact.confidence = Math.min(1.0, fact.confidence + 0.02);
      } else if (age > 300) {
        fact.confidence = Math.max(0.1, fact.confidence - 0.01);
      }
    }
    return Math.min(this._facts.length, 5);
  }

  private _shuffleBlend(): number {
    if (this._facts.length < 4) return 0;
    const byTopic = new Map<string, DreamFact[]>();
    for (const f of this._facts) {
      const list = byTopic.get(f.topic) ?? [];
      list.push(f);
      byTopic.set(f.topic, list);
    }
    const topics = Array.from(byTopic.keys());
    if (topics.length < 2) return 0;

    let blended = 0;
    for (let i = 0; i < Math.min(3, topics.length - 1); i++) {
      const [t1, t2] = this._sampleTopics(topics);
      const f1 = this._sample(byTopic.get(t1) ?? []);
      const f2 = this._sample(byTopic.get(t2) ?? []);
      if (!f1 || !f2 || f1.id === f2.id) continue;
      const score = (f1.confidence + f2.confidence) / 2;
      if (score > 0.55) {
        const insight: DreamInsight = {
          id: `dream-${this._dreamCount}-${blended + 1}`,
          dreamType: 'shuffle',
          content: `跨领域融合：${f1.topic}中的「${this._extractCore(f1.fact)}」与${f2.topic}中的「${this._extractCore(f2.fact)}」可能共享底层模式。`,
          sourceFacts: [f1.fact, f2.fact],
          confidence: score,
          verified: false,
          createdAt: _now(),
        };
        this._insights.push(insight);
        blended++;
      }
    }
    this._trimInsights();
    return blended;
  }

  private _ladderAbstraction(): number {
    const byTopic = new Map<string, DreamFact[]>();
    for (const f of this._facts) {
      const list = byTopic.get(f.topic) ?? [];
      list.push(f);
      byTopic.set(f.topic, list);
    }

    let abstracted = 0;
    for (const [topic, list] of byTopic) {
      if (list.length < 3) continue;
      const text = list.slice(-6).map(f => f.fact).join(' ');
      const keywords = this._extractKeywords(text);
      if (keywords.length >= 2) {
        const insight: DreamInsight = {
          id: `ladder-${this._dreamCount}-${abstracted + 1}`,
          dreamType: 'ladder',
          content: `在${topic}领域，${keywords[0]}与${keywords[1]}构成核心机制，共有的底层模式是${this._inferModality(topic, keywords)}。`,
          sourceFacts: list.slice(0, 4).map(f => f.fact),
          confidence: 0.55,
          verified: false,
          createdAt: _now(),
        };
        this._insights.push(insight);
        abstracted++;
      }
    }
    this._trimInsights();
    return abstracted;
  }

  private _detectAnomalies(): number {
    let anomalies = 0;
    for (let i = 0; i < this._facts.length && anomalies < 5; i++) {
      for (let j = i + 1; j < this._facts.length && anomalies < 5; j++) {
        const f1 = this._facts[i];
        const f2 = this._facts[j];
        if (f1.topic === f2.topic && this._areContradictory(f1.fact, f2.fact)) {
          const insight: DreamInsight = {
            id: `anomaly-${this._dreamCount}-${anomalies + 1}`,
            dreamType: 'anomaly',
            content: `潜在矛盾：[${f1.fact}] vs [${f2.fact}] — 需确认`,
            sourceFacts: [f1.fact, f2.fact],
            confidence: 0.35,
            verified: false,
            createdAt: _now(),
          };
          this._insights.push(insight);
          anomalies++;
        }
      }
    }
    this._trimInsights();
    return anomalies;
  }

  private _extractWaterPatterns(): number {
    const waterFacts = this._facts.filter(f => f.topic === 'water-logic');
    if (waterFacts.length < 2) return 0;
    const keywords = this._extractKeywords(waterFacts.map(f => f.fact).join(' '));
    const top = keywords.slice(0, 2).join('、') || '动量/能量异常';
    const insight: DreamInsight = {
      id: `water-${this._dreamCount}-1`,
      dreamType: 'water',
      content: `水逻辑反复违规模式：${top}。建议下一轮增强物理约束或在生成阶段降低相关自由度。`,
      sourceFacts: waterFacts.slice(-4).map(f => f.fact),
      confidence: 0.6,
      verified: false,
      createdAt: _now(),
    };
    this._insights.push(insight);
    this._trimInsights();
    return 1;
  }

  private _sample<T>(arr: T[]): T | undefined {
    if (!arr.length) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private _sampleTopics(topics: string[]): [string, string] {
    let a = this._sample(topics)!;
    let b = this._sample(topics)!;
    while (topics.length > 1 && a === b) {
      b = this._sample(topics)!;
    }
    return [a, b];
  }

  private _extractCore(fact: string): string {
    const match = fact.match(/[\u4e00-\u9fa5a-zA-Z]{2,16}/);
    return match ? match[0].trim() : '概念';
  }

  private _extractKeywords(text: string): string[] {
    const words = (text.match(/[\u4e00-\u9fa5a-zA-Z]{2,12}/g) ?? []);
    const freq = new Map<string, number>();
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    return Array.from(freq.entries())
      .filter(([, c]) => c >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([w]) => w);
  }

  private _inferModality(_topic: string, keywords: string[]): string {
    const patterns: Record<string, string> = {
      '优化': '基于目标函数的最小化原则',
      '学习': '从经验中归纳出可泛化的规则',
      '结构': '层级组织的模块化设计',
      '演化': '变异+选择的迭代过程',
      '计算': '符号转换与状态迁移',
      '信息': '不确定性的消除与传递',
      '网络': '节点间的连接与信号传播',
    };
    for (const kw of keywords) {
      for (const [key, value] of Object.entries(patterns)) {
        if (kw.includes(key)) return value;
      }
    }
    return '自组织涌现';
  }

  private _areContradictory(f1: string, f2: string): boolean {
    const pairs = [
      ['是', '不是'],
      ['可以', '不可以'],
      ['能', '不能'],
      ['属于', '不属于'],
      ['支持', '不支持'],
    ];
    for (const [pos, neg] of pairs) {
      if ((f1.includes(pos) && f2.includes(neg)) || (f1.includes(neg) && f2.includes(pos))) {
        return true;
      }
    }
    return false;
  }

  private _trimInsights(): void {
    if (this._insights.length > 200) {
      this._insights = this._insights.slice(-100);
    }
  }
}
