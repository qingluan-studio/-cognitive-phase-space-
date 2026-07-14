/**
 * 时机抓取器：识别并劫持"关键时刻"(kairos)强行插入决策。
 * 监听外部信号流，当多维度信号同步尖峰时判定为 kairos，
 * 随即劫持决策窗口并强行注入预设行动。
 */

export interface KairosSignal {
  id: string;
  source: string;
  intensity: number;
  timestamp: number;
  tags: string[];
}

export interface CapturedMoment {
  id: string;
  signals: KairosSignal[];
  hijackedAction: Record<string, unknown>;
  capturedAt: number;
  executed: boolean;
}

export type KairosVerdict = 'dormant' | 'rising' | 'kairos' | 'missed';

export class KairosSnatcher {
  private _signals: KairosSignal[] = [];
  private _captured: CapturedMoment[] = [];
  private _registry: Map<string, (s: KairosSignal) => void> = new Map();
  private _verdict: KairosVerdict = 'dormant';
  private _threshold: number = 0.75;

  registerSignal(id: string, handler: (s: KairosSignal) => void): void {
    this._registry.set(id, handler);
  }

  /** 投递信号到抓取器进行评估。 */
  detectKairos(signal: KairosSignal): KairosVerdict {
    this._signals.push(signal);
    const handler = this._registry.get(signal.source);
    if (handler) handler(signal);
    this._verdict = this._evaluate();
    return this._verdict;
  }

  /** 在识别为 kairos 时劫持决策窗口。 */
  hijack(action: Record<string, unknown>): CapturedMoment | null {
    if (this._verdict !== 'kairos') return null;
    const recent = this._signals.slice(-5);
    const moment: CapturedMoment = {
      id: `kairos-${Date.now()}`,
      signals: recent,
      hijackedAction: action,
      capturedAt: Date.now(),
      executed: false,
    };
    this._captured.push(moment);
    return moment;
  }

  /** 执行被劫持的关键决策。 */
  execute(momentId: string): boolean {
    const moment = this._captured.find(m => m.id === momentId);
    if (!moment || moment.executed) return false;
    moment.executed = true;
    return true;
  }

  evaluate(): KairosVerdict {
    this._verdict = this._evaluate();
    return this._verdict;
  }

  get verdict(): KairosVerdict {
    return this._verdict;
  }

  getCapturedMoments(): CapturedMoment[] {
    return [...this._captured];
  }

  private _evaluate(): KairosVerdict {
    if (this._signals.length === 0) return 'dormant';
    const window = this._signals.slice(-5);
    const avg =
      window.reduce((sum, s) => sum + s.intensity, 0) / window.length;
    if (avg >= this._threshold) return 'kairos';
    if (avg >= this._threshold * 0.5) return 'rising';
    return 'dormant';
  }
}
