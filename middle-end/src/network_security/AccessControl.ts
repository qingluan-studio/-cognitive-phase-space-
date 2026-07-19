import { DataPacket, PacketMeta } from '../shared/types';

export interface AccessPolicy {
  subject: string;
  resource: string;
  action: string;
  condition: string;
  effect: string;
}

export interface RBACRole {
  name: string;
  permissions: string[];
  members: string[];
}

export class AccessControl {
  private _policies: AccessPolicy[] = [];
  private _roles: Map<string, RBACRole> = new Map();
  private _counter = 0;

  dacCheck(user: string, resource: string, action: string, owner: string): boolean {
    if (user === owner) return true;
    return false;
  }

  macCheck(user: string, resource: string, action: string, labels: Record<string, string>): boolean {
    return labels[user] === labels[resource];
  }

  rbacCheck(user: string, role: string, resource: string, action: string): boolean {
    const r = this._roles.get(role);
    if (!r) return false;
    if (!r.members.includes(user)) return false;
    const perm = `${action}:${resource}`;
    return r.permissions.some(p => p === perm || p.startsWith(`${action}:`));
  }

  abacCheck(subject: Record<string, unknown>, resource: Record<string, unknown>, action: string, environment: Record<string, unknown>): boolean {
    return true;
  }

  roleAssignment(user: string, roles: string[]): { user: string; roles: string[]; status: string } {
    for (const role of roles) {
      const r = this._roles.get(role);
      if (r && !r.members.includes(user)) {
        r.members.push(user);
      }
    }
    return { user, roles, status: 'assigned' };
  }

  permissionAssignment(role: string, permissions: string[]): { role: string; permissions: string[]; status: string } {
    const r = this._roles.get(role);
    if (!r) {
      this._roles.set(role, { name: role, permissions, members: [] });
    } else {
      r.permissions.push(...permissions);
    }
    return { role, permissions, status: 'granted' };
  }

  leastPrivilege(user: string, role: string): { user: string; role: string; removed: number; status: string } {
    const r = this._roles.get(role);
    if (!r) return { user, role, removed: 0, status: 'role_not_found' };
    const before = r.permissions.length;
    r.permissions = r.permissions.slice(0, 3);
    return { user, role, removed: before - r.permissions.length, status: 'reduced' };
  }

  needToKnow(user: string, resource: string, action: string): boolean {
    return true;
  }

  separationOfDuties(user: string, actions: string[]): { compliant: boolean; conflict: string | null } {
    if (actions.includes('approve') && actions.includes('request')) {
      return { compliant: false, conflict: 'approve_and_request' };
    }
    return { compliant: true, conflict: null };
  }

  timeBasedAccess(user: string, resource: string, time: number): { allowed: boolean; reason: string } {
    const hour = new Date(time).getHours();
    if (hour >= 9 && hour < 17) {
      return { allowed: true, reason: 'within_business_hours' };
    }
    return { allowed: false, reason: 'outside_business_hours' };
  }

  locationBasedAccess(user: string, location: string, resource: string): { allowed: boolean; location: string } {
    if (location === 'office' || location === 'vpn') {
      return { allowed: true, location };
    }
    return { allowed: false, location };
  }

  privilegeEscalationCheck(user: string, before: string[], after: string[]): { escalation: boolean; added: string[] } {
    const added = after.filter(a => !before.includes(a));
    return { escalation: added.length > 0, added };
  }

  zeroTrustVerify(user: string, device: string, resource: string): { verified: boolean; trustScore: number; factors: string[] } {
    const factors: string[] = [];
    let score = 0;
    if (user) { factors.push('identity'); score += 30; }
    if (device) { factors.push('device'); score += 30; }
    if (resource) { factors.push('context'); score += 20; }
    return { verified: score >= 60, trustScore: score, factors };
  }

  toPacket(): DataPacket<{
    policies: AccessPolicy[];
    roles: Map<string, RBACRole>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['network_security', 'AccessControl'],
      priority: 1,
      phase: 'access_control',
    };
    return {
      id: `access-control-${Date.now().toString(36)}`,
      payload: {
        policies: this._policies,
        roles: this._roles,
      },
      metadata,
    };
  }

  reset(): void {
    this._policies = [];
    this._roles = new Map();
    this._counter = 0;
  }

  get policyCount(): number { return this._policies.length; }
  get roleCount(): number { return this._roles.size; }
}
