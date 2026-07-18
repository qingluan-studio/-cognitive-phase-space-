import type { DataPacket, KnowledgeUnit } from '../shared/types';

export type GroupPhase = 'forming' | 'storming' | 'norming' | 'performing' | 'adjourning';

export type ConflictType = 'task' | 'relationship' | 'process' | 'values';

export interface GroupMember {
  id: string;
  name: string;
  role: string;
  status: number;
  satisfaction: number;
  commitment: number;
  influence: number;
  groupId: string;
}

export interface Group {
  id: string;
  name: string;
  phase: GroupPhase;
  size: number;
  cohesion: number;
  trust: number;
  conflictLevel: number;
  productivity: number;
  normStrength: number;
  createdAt: number;
}

export interface ConflictEvent {
  id: string;
  type: ConflictType;
  source: string;
  target: string;
  severity: number;
  resolution: number;
  timestamp: number;
  groupId: string;
}

export interface GroupDynamicsState {
  groupCount: number;
  totalMembers: number;
  avgCohesion: number;
  avgTrust: number;
  avgConflict: number;
  avgProductivity: number;
  phaseDistribution: Record<GroupPhase, number>;
  conflictDistribution: Record<ConflictType, number>;
}

export interface IGroupDynamics {
  createGroup(id: string, name: string): void;
  addMember(groupId: string, memberId: string, name: string, role: string): void;
  removeMember(groupId: string, memberId: string): void;
  createConflict(groupId: string, source: string, target: string, type: ConflictType, severity: number): ConflictEvent;
  resolveConflict(conflictId: string, resolutionAmount: number): void;
  update(deltaTime: number): void;
  getGroup(groupId: string): Group | undefined;
  getMember(memberId: string): GroupMember | undefined;
  getState(): GroupDynamicsState;
  processPacket(packet: DataPacket): DataPacket;
  reset(): void;
}

export class GroupDynamics implements IGroupDynamics {
  private _groups: Map<string, Group> = new Map();
  private _members: Map<string, GroupMember> = new Map();
  private _conflicts: ConflictEvent[] = [];
  private _groupMembers: Map<string, string[]> = new Map();
  private _history: GroupDynamicsState[] = [];
  private _maxHistory: number = 100;
  private _lastUpdate: number = Date.now();
  private _conflictDecayRate: number = 0.01;
  private _cohesionGrowthRate: number = 0.005;
  private _trustGrowthRate: number = 0.003;
  private _phaseTransitionThreshold: number = 0.6;
  private _socialLoafingFactor: number = 0.1;
  private _normFormationRate: number = 0.004;

  constructor() {
    this._initializeDefaultGroups();
  }

  get groupCount(): number { return this._groups.size; }
  get totalMembers(): number { return this._members.size; }
  get conflictCount(): number { return this._conflicts.length; }
  get conflictDecayRate(): number { return this._conflictDecayRate; }
  set conflictDecayRate(value: number) { this._conflictDecayRate = Math.max(0, Math.min(0.1, value)); }
  get cohesionGrowthRate(): number { return this._cohesionGrowthRate; }
  set cohesionGrowthRate(value: number) { this._cohesionGrowthRate = Math.max(0, Math.min(0.05, value)); }

  private _initializeDefaultGroups(): void {
    this.createGroup('team-alpha', 'Alpha团队');
    this.createGroup('team-beta', 'Beta团队');

    const alphaMembers = [
      { id: 'a1', name: '张伟', role: 'leader' },
      { id: 'a2', name: '李娜', role: 'coordinator' },
      { id: 'a3', name: '王强', role: 'implementer' },
      { id: 'a4', name: '刘芳', role: 'creative' },
      { id: 'a5', name: '陈明', role: 'analyst' },
    ];

    for (const m of alphaMembers) {
      this.addMember('team-alpha', m.id, m.name, m.role);
    }

    const betaMembers = [
      { id: 'b1', name: '杨磊', role: 'leader' },
      { id: 'b2', name: '赵静', role: 'implementer' },
      { id: 'b3', name: '黄鹏', role: 'implementer' },
    ];

    for (const m of betaMembers) {
      this.addMember('team-beta', m.id, m.name, m.role);
    }

    const alpha = this._groups.get('team-alpha');
    if (alpha) {
      alpha.phase = 'performing';
      alpha.cohesion = 0.7;
      alpha.trust = 0.65;
      alpha.productivity = 0.8;
      alpha.normStrength = 0.6;
    }

    const beta = this._groups.get('team-beta');
    if (beta) {
      beta.phase = 'storming';
      beta.cohesion = 0.35;
      beta.trust = 0.4;
      beta.productivity = 0.3;
      beta.normStrength = 0.2;
    }
  }

  createGroup(id: string, name: string): void {
    if (this._groups.has(id)) return;

    const group: Group = {
      id,
      name,
      phase: 'forming',
      size: 0,
      cohesion: 0.1,
      trust: 0.2,
      conflictLevel: 0,
      productivity: 0.1,
      normStrength: 0.1,
      createdAt: Date.now(),
    };

    this._groups.set(id, group);
    this._groupMembers.set(id, []);
  }

  addMember(groupId: string, memberId: string, name: string, role: string): void {
    if (!this._groups.has(groupId)) return;
    if (this._members.has(memberId)) return;

    const member: GroupMember = {
      id: memberId,
      name,
      role,
      status: 0.3 + Math.random() * 0.4,
      satisfaction: 0.5,
      commitment: 0.4,
      influence: role === 'leader' ? 0.8 : 0.3 + Math.random() * 0.3,
      groupId,
    };

    this._members.set(memberId, member);
    const members = this._groupMembers.get(groupId) || [];
    members.push(memberId);
    this._groupMembers.set(groupId, members);

    const group = this._groups.get(groupId)!;
    group.size = members.length;

    if (role === 'leader') {
      member.status = 0.9;
      member.influence = 0.9;
    }
  }

  removeMember(groupId: string, memberId: string): void {
    this._members.delete(memberId);
    const members = this._groupMembers.get(groupId) || [];
    const idx = members.indexOf(memberId);
    if (idx >= 0) {
      members.splice(idx, 1);
      this._groupMembers.set(groupId, members);
    }

    const group = this._groups.get(groupId);
    if (group) {
      group.size = members.length;
    }
  }

  createConflict(groupId: string, source: string, target: string, type: ConflictType, severity: number): ConflictEvent {
    const conflict: ConflictEvent = {
      id: `conflict-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      source,
      target,
      severity,
      resolution: 0,
      timestamp: Date.now(),
      groupId,
    };

    this._conflicts.push(conflict);

    const group = this._groups.get(groupId);
    if (group) {
      group.conflictLevel = Math.min(1, group.conflictLevel + severity * 0.1);
      group.cohesion = Math.max(0, group.cohesion - severity * 0.05);
      group.trust = Math.max(0, group.trust - severity * 0.03);
    }

    const sourceMember = this._members.get(source);
    const targetMember = this._members.get(target);
    if (sourceMember) sourceMember.satisfaction = Math.max(0, sourceMember.satisfaction - severity * 0.1);
    if (targetMember) targetMember.satisfaction = Math.max(0, targetMember.satisfaction - severity * 0.15);

    return conflict;
  }

  resolveConflict(conflictId: string, resolutionAmount: number): void {
    const conflict = this._conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    conflict.resolution = Math.min(1, conflict.resolution + resolutionAmount);
    const effectiveSeverity = conflict.severity * (1 - conflict.resolution);

    const group = this._groups.get(conflict.groupId);
    if (group) {
      group.conflictLevel = Math.max(0, group.conflictLevel - resolutionAmount * conflict.severity * 0.08);
      group.trust = Math.min(1, group.trust + resolutionAmount * 0.02);
      group.normStrength = Math.min(1, group.normStrength + resolutionAmount * 0.01);
    }
  }

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;

    for (const group of this._groups.values()) {
      this._updateGroupDynamics(group, dt);
    }

    this._decayConflicts(dt);
    this._updateMemberStates(dt);

    this._lastUpdate = Date.now();
    this._recordState();
  }

  private _updateGroupDynamics(group: Group, dt: number): void {
    const members = this._groupMembers.get(group.id) || [];

    if (members.length < 2) {
      group.phase = 'forming';
      return;
    }

    const conflictEffect = group.conflictLevel * 0.5;
    const sizeEffect = members.length > 10 ? -this._socialLoafingFactor : 0;

    if (group.conflictLevel < this._phaseTransitionThreshold) {
      group.cohesion = Math.min(1, group.cohesion + this._cohesionGrowthRate * dt * (1 - conflictEffect));
      group.trust = Math.min(1, group.trust + this._trustGrowthRate * dt * (1 - conflictEffect * 0.5));
      group.normStrength = Math.min(1, group.normStrength + this._normFormationRate * dt);
    }

    const avgCommitment = this._computeAvgMemberMetric(group.id, 'commitment');
    group.productivity = (group.cohesion * 0.3 + group.trust * 0.3 + group.normStrength * 0.2 + avgCommitment * 0.2) * (1 + sizeEffect);
    group.productivity = Math.max(0, Math.min(1, group.productivity));

    this._updateGroupPhase(group);
  }

  private _computeAvgMemberMetric(groupId: string, metric: keyof GroupMember): number {
    const memberIds = this._groupMembers.get(groupId) || [];
    if (memberIds.length === 0) return 0;

    let sum = 0;
    for (const id of memberIds) {
      const member = this._members.get(id);
      if (member) {
        sum += member[metric] as number;
      }
    }
    return sum / memberIds.length;
  }

  private _updateGroupPhase(group: Group): void {
    const metrics = {
      forming: group.size < 3 || group.cohesion < 0.2,
      storming: group.conflictLevel > 0.5 || (group.cohesion < 0.4 && group.size >= 3),
      norming: group.normStrength > 0.5 && group.conflictLevel < 0.4 && group.cohesion >= 0.4,
      performing: group.cohesion > 0.6 && group.trust > 0.5 && group.productivity > 0.6,
      adjourning: group.size <= 1,
    };

    if (metrics.adjourning) {
      group.phase = 'adjourning';
    } else if (metrics.performing && group.phase === 'performing') {
      return;
    } else if (metrics.performing && group.phase === 'norming') {
      group.phase = 'performing';
    } else if (metrics.norming && group.phase === 'storming') {
      group.phase = 'norming';
    } else if (metrics.storming && group.phase === 'forming') {
      group.phase = 'storming';
    } else if (metrics.storming && group.cohesion > 0.3) {
      group.phase = 'storming';
    }
  }

  private _decayConflicts(dt: number): void {
    for (const conflict of this._conflicts) {
      if (conflict.resolution < 1) {
        conflict.resolution = Math.min(1, conflict.resolution + this._conflictDecayRate * dt * 0.1);
      }
    }

    for (const group of this._groups.values()) {
      group.conflictLevel *= (1 - this._conflictDecayRate * dt);
      group.conflictLevel = Math.max(0, group.conflictLevel);
    }
  }

  private _updateMemberStates(dt: number): void {
    for (const member of this._members.values()) {
      const group = this._groups.get(member.groupId);
      if (!group) continue;

      const groupEffect = (group.cohesion + group.trust) / 2;
      const conflictEffect = group.conflictLevel;

      member.satisfaction += (groupEffect * 0.5 - conflictEffect * 0.3) * dt * 0.01;
      member.satisfaction = Math.max(0, Math.min(1, member.satisfaction));

      member.commitment += (group.cohesion * 0.4 + member.satisfaction * 0.3) * dt * 0.005;
      member.commitment = Math.max(0, Math.min(1, member.commitment));
    }
  }

  getGroup(groupId: string): Group | undefined {
    const group = this._groups.get(groupId);
    return group ? { ...group } : undefined;
  }

  getMember(memberId: string): GroupMember | undefined {
    const member = this._members.get(memberId);
    return member ? { ...member } : undefined;
  }

  getGroupMembers(groupId: string): GroupMember[] {
    const memberIds = this._groupMembers.get(groupId) || [];
    return memberIds
      .map(id => this._members.get(id))
      .filter((m): m is GroupMember => m !== undefined)
      .map(m => ({ ...m }));
  }

  getActiveConflicts(groupId: string): ConflictEvent[] {
    return this._conflicts
      .filter(c => c.groupId === groupId && c.resolution < 1)
      .map(c => ({ ...c }));
  }

  getState(): GroupDynamicsState {
    const phaseDistribution: Record<GroupPhase, number> = {
      forming: 0,
      storming: 0,
      norming: 0,
      performing: 0,
      adjourning: 0,
    };

    const conflictDistribution: Record<ConflictType, number> = {
      task: 0,
      relationship: 0,
      process: 0,
      values: 0,
    };

    let totalCohesion = 0;
    let totalTrust = 0;
    let totalConflict = 0;
    let totalProductivity = 0;

    for (const group of this._groups.values()) {
      phaseDistribution[group.phase]++;
      totalCohesion += group.cohesion;
      totalTrust += group.trust;
      totalConflict += group.conflictLevel;
      totalProductivity += group.productivity;
    }

    for (const conflict of this._conflicts) {
      if (conflict.resolution < 1) {
        conflictDistribution[conflict.type]++;
      }
    }

    const count = Math.max(1, this._groups.size);

    return {
      groupCount: this._groups.size,
      totalMembers: this._members.size,
      avgCohesion: totalCohesion / count,
      avgTrust: totalTrust / count,
      avgConflict: totalConflict / count,
      avgProductivity: totalProductivity / count,
      phaseDistribution,
      conflictDistribution,
    };
  }

  private _recordState(): void {
    this._history.push(this.getState());
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  getHistory(): GroupDynamicsState[] {
    return this._history.map(s => ({
      ...s,
      phaseDistribution: { ...s.phaseDistribution },
      conflictDistribution: { ...s.conflictDistribution },
    }));
  }

  getAllGroups(): Group[] {
    return Array.from(this._groups.values()).map(g => ({ ...g }));
  }

  getAllMembers(): GroupMember[] {
    return Array.from(this._members.values()).map(m => ({ ...m }));
  }

  simulate(groupId: string, steps: number, deltaTime: number = 100): Group[] {
    const results: Group[] = [];
    for (let i = 0; i < steps; i++) {
      if (Math.random() < 0.1) {
        const members = this._groupMembers.get(groupId) || [];
        if (members.length >= 2) {
          const a = members[Math.floor(Math.random() * members.length)];
          const b = members[Math.floor(Math.random() * members.length)];
          if (a !== b) {
            const types: ConflictType[] = ['task', 'relationship', 'process', 'values'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.createConflict(groupId, a, b, type, 0.3 + Math.random() * 0.4);
          }
        }
      }

      this.update(deltaTime);
      const group = this.getGroup(groupId);
      if (group) results.push(group);
    }
    return results;
  }

  processPacket(packet: DataPacket): DataPacket {
    const state = this.getState();
    return {
      ...packet,
      payload: {
        ...packet.payload as object,
        groupDynamics: {
          groupCount: state.groupCount,
          totalMembers: state.totalMembers,
          avgCohesion: state.avgCohesion,
          avgProductivity: state.avgProductivity,
          avgConflict: state.avgConflict,
          phaseDistribution: state.phaseDistribution,
        },
      },
      metadata: {
        ...packet.metadata,
        route: [...packet.metadata.route, 'group-dynamics'],
        residue: state,
      },
    };
  }

  reset(): void {
    this._groups.clear();
    this._members.clear();
    this._conflicts = [];
    this._groupMembers.clear();
    this._history = [];
    this._lastUpdate = Date.now();
    this._initializeDefaultGroups();
  }
}
