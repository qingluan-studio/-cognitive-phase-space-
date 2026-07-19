import { DataPacket, PacketMeta } from '../shared/types';

export interface FirewallRule {
  id: string;
  action: string;
  source: string;
  dest: string;
  port: number;
  protocol: string;
}

export interface FirewallPolicy {
  name: string;
  rules: FirewallRule[];
  defaultAction: string;
}

export class FirewallManager {
  private _rules: Map<string, FirewallRule> = new Map();
  private _policies: Map<string, FirewallPolicy> = new Map();
  private _counter = 0;

  addRule(rule: Omit<FirewallRule, 'id'>, position?: number): FirewallRule {
    const ruleId = `rule-${++this._counter}`;
    const newRule: FirewallRule = { id: ruleId, ...rule };
    this._rules.set(ruleId, newRule);
    return newRule;
  }

  removeRule(ruleId: string): boolean {
    return this._rules.delete(ruleId);
  }

  modifyRule(ruleId: string, changes: Partial<FirewallRule>): FirewallRule | null {
    const rule = this._rules.get(ruleId);
    if (!rule) return null;
    Object.assign(rule, changes);
    return rule;
  }

  ruleOrder(rules: FirewallRule[], method: string = 'priority'): FirewallRule[] {
    return [...rules].sort((a, b) => {
      if (method === 'port') return a.port - b.port;
      if (method === 'action') return a.action.localeCompare(b.action);
      return 0;
    });
  }

  statelessInspection(packet: Record<string, unknown>, rules: FirewallRule[]): { allowed: boolean; matchedRule?: string } {
    for (const rule of rules) {
      if (this._matchPacket(packet, rule)) {
        return { allowed: rule.action === 'allow', matchedRule: rule.id };
      }
    }
    return { allowed: false };
  }

  statefulInspection(packet: Record<string, unknown>, stateTable: Map<string, unknown>): { allowed: boolean; state: string } {
    const connKey = `${packet.sourceIp}-${packet.destIp}-${packet.port}`;
    const state = stateTable.get(connKey);
    if (state) return { allowed: true, state: String(state) };
    return { allowed: false, state: 'new' };
  }

  packetFiltering(packet: Record<string, unknown>, rules: FirewallRule[]): { allowed: boolean; rule?: string } {
    return this.statelessInspection(packet, rules);
  }

  deepPacketInspection(packet: Record<string, unknown>, signatures: string[]): { threat: boolean; matchedSignatures: string[] } {
    const matched: string[] = [];
    const payload = String(packet.payload || '');
    for (const sig of signatures) {
      if (payload.includes(sig)) matched.push(sig);
    }
    return { threat: matched.length > 0, matchedSignatures: matched };
  }

  applicationFirewall(app: string, rules: { pattern: string; action: string }[]): { app: string; rules: number; status: string } {
    return { app, rules: rules.length, status: 'active' };
  }

  webApplicationFirewall(request: Record<string, unknown>, rules: { type: string; pattern: string }[]): { blocked: boolean; reason: string } {
    const path = String(request.path || '');
    const body = String(request.body || '');
    for (const rule of rules) {
      if (path.includes(rule.pattern) || body.includes(rule.pattern)) {
        return { blocked: true, reason: rule.type };
      }
    }
    return { blocked: false, reason: 'none' };
  }

  nextGenFirewall(packet: Record<string, unknown>, features: string[]): { allowed: boolean; inspected: string[] } {
    const inspected: string[] = [];
    for (const f of features) {
      inspected.push(f);
    }
    return { allowed: true, inspected };
  }

  ruleOptimization(rules: FirewallRule[]): FirewallRule[] {
    const optimized: FirewallRule[] = [];
    const seen = new Set<string>();
    for (const rule of rules) {
      const key = `${rule.source}-${rule.dest}-${rule.port}-${rule.protocol}`;
      if (!seen.has(key)) {
        seen.add(key);
        optimized.push(rule);
      }
    }
    return optimized;
  }

  conflictDetection(rules: FirewallRule[]): { conflicts: { rule1: string; rule2: string; type: string }[] } {
    const conflicts: { rule1: string; rule2: string; type: string }[] = [];
    for (let i = 0; i < rules.length; i++) {
      for (let j = i + 1; j < rules.length; j++) {
        if (rules[i].source === rules[j].source && rules[i].dest === rules[j].dest
          && rules[i].port === rules[j].port && rules[i].protocol === rules[j].protocol
          && rules[i].action !== rules[j].action) {
          conflicts.push({ rule1: rules[i].id, rule2: rules[j].id, type: 'action_conflict' });
        }
      }
    }
    return { conflicts };
  }

  shadowRules(rules: FirewallRule[]): { shadowed: string[]; shadowing: string } {
    const shadowed: string[] = [];
    for (let i = 1; i < rules.length; i++) {
      if (rules[i].source === rules[0].source && rules[i].dest === rules[0].dest
        && rules[i].action === rules[0].action) {
        shadowed.push(rules[i].id);
      }
    }
    return { shadowed, shadowing: rules[0]?.id || '' };
  }

  private _matchPacket(packet: Record<string, unknown>, rule: FirewallRule): boolean {
    return (packet.sourceIp === rule.source || rule.source === '0.0.0.0/0')
      && (packet.destIp === rule.dest || rule.dest === '0.0.0.0/0')
      && (packet.port === rule.port)
      && (packet.protocol === rule.protocol);
  }

  toPacket(): DataPacket<{
    rules: Map<string, FirewallRule>;
    policies: Map<string, FirewallPolicy>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['network_security', 'FirewallManager'],
      priority: 1,
      phase: 'firewall_manager',
    };
    return {
      id: `firewall-${Date.now().toString(36)}`,
      payload: {
        rules: this._rules,
        policies: this._policies,
      },
      metadata,
    };
  }

  reset(): void {
    this._rules = new Map();
    this._policies = new Map();
    this._counter = 0;
  }

  get ruleCount(): number { return this._rules.size; }
  get policyCount(): number { return this._policies.size; }
}
