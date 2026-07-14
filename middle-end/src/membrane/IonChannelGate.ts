export type ChannelState = 'closed' | 'open' | 'inactivated';

export interface ChannelRecord {
  id: string;
  state: ChannelState;
  conductance: number;
  activationEnergy: number;
  ionType: string;
}

export interface TransitionEvent {
  channelId: string;
  from: ChannelState;
  to: ChannelState;
  timestamp: number;
  voltage: number;
}

export class IonChannelGate {
  private _channels: Map<string, ChannelRecord> = new Map();
  private _events: TransitionEvent[] = [];
  private _state: Record<string, unknown> = {};
  private _markovMatrix: Map<ChannelState, Map<ChannelState, number>> = new Map();
  private _boltzmannTemperature: number = 310;
  private _stateEntropy: number = 0;
  private _openProbability: number = 0;

  constructor() {
    this._initMarkovMatrix();
  }

  private _initMarkovMatrix(): void {
    const states: ChannelState[] = ['closed', 'open', 'inactivated'];
    for (const s of states) {
      const map = new Map<ChannelState, number>();
      for (const t of states) {
        map.set(t, s === t ? 0.7 : 0.15);
      }
      this._markovMatrix.set(s, map);
    }
  }

  registerChannel(channel: ChannelRecord): void {
    this._channels.set(channel.id, channel);
    this._updateStateEntropy();
  }

  private _boltzmannProbability(energy: number): number {
    const kB = 8.617e-5;
    return Math.exp(-energy / (kB * this._boltzmannTemperature));
  }

  step(channelId: string, voltage: number): TransitionEvent | null {
    const channel = this._channels.get(channelId);
    if (!channel) return null;
    const transitions = this._markovMatrix.get(channel.state);
    if (!transitions) return null;
    const pOpen = this._boltzmannProbability(channel.activationEnergy - voltage * 0.1);
    const pInact = this._boltzmannProbability(voltage * 0.05);
    const roll = Math.random();
    let nextState = channel.state;
    if (channel.state === 'closed') {
      if (roll < pOpen) nextState = 'open';
      else if (roll < pOpen + pInact * 0.1) nextState = 'inactivated';
    } else if (channel.state === 'open') {
      if (roll < pInact) nextState = 'inactivated';
      else if (roll < pInact + 0.1) nextState = 'closed';
    } else {
      if (roll < 0.3) nextState = 'closed';
    }
    if (nextState === channel.state) return null;
    const event: TransitionEvent = {
      channelId,
      from: channel.state,
      to: nextState,
      timestamp: Date.now(),
      voltage,
    };
    channel.state = nextState;
    this._events.push(event);
    if (this._events.length > 200) this._events.shift();
    this._updateStateEntropy();
    this._updateOpenProbability();
    return event;
  }

  private _updateStateEntropy(): void {
    const counts: Record<string, number> = {};
    for (const c of this._channels.values()) {
      counts[c.state] = (counts[c.state] ?? 0) + 1;
    }
    const total = this._channels.size;
    if (total === 0) {
      this._stateEntropy = 0;
      return;
    }
    let entropy = 0;
    for (const count of Object.values(counts)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
    this._stateEntropy = entropy;
  }

  private _updateOpenProbability(): void {
    const open = Array.from(this._channels.values()).filter(c => c.state === 'open').length;
    this._openProbability = this._channels.size > 0 ? open / this._channels.size : 0;
  }

  getChannel(id: string): ChannelRecord | null {
    return this._channels.get(id) ?? null;
  }

  totalConductance(): number {
    return Array.from(this._channels.values()).filter(c => c.state === 'open').reduce((s, c) => s + c.conductance, 0);
  }

  averageConductance(): number {
    if (this._channels.size === 0) return 0;
    return Array.from(this._channels.values()).reduce((s, c) => s + c.conductance, 0) / this._channels.size;
  }

  listByState(state: ChannelState): ChannelRecord[] {
    return Array.from(this._channels.values()).filter(c => c.state === state);
  }

  setTemperature(temp: number): void {
    this._boltzmannTemperature = Math.max(1, temp);
  }

  get eventCount(): number {
    return this._events.length;
  }

  get stateEntropy(): number {
    return this._stateEntropy;
  }

  get openProbability(): number {
    return this._openProbability;
  }

  gateReport(): Record<string, unknown> {
    return {
      channelCount: this._channels.size,
      openCount: this.listByState('open').length,
      closedCount: this.listByState('closed').length,
      inactivatedCount: this.listByState('inactivated').length,
      totalConductance: this.totalConductance().toFixed(4),
      openProbability: this._openProbability.toFixed(4),
      stateEntropy: this._stateEntropy.toFixed(4),
      eventCount: this._events.length,
      temperature: this._boltzmannTemperature.toFixed(2),
      state: this._state,
    };
  }
}
