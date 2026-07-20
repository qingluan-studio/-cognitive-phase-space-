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
  parent?: string;
  children?: string[];
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ABACPolicy {
  id: string;
  name: string;
  subjectAttributes: Record<string, unknown>;
  resourceAttributes: Record<string, unknown>;
  action: string;
  environment: Record<string, unknown>;
  effect: 'allow' | 'deny';
  priority: number;
  enabled: boolean;
}

export interface ResourceNode {
  id: string;
  type: string;
  parentId?: string;
  children: string[];
  owner: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
  metadata: Record<string, unknown>;
}

export interface AccessRequest {
  id: number;
  subject: string;
  resource: string;
  action: string;
  context: Record<string, unknown>;
  requestedAt: number;
  decision: 'allow' | 'deny' | 'challenge' | 'pending';
  reason?: string;
  obligations: string[];
}

export interface AccessReview {
  id: string;
  subject: string;
  reviewer: string;
  scope: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedAt: number;
  reviewedAt?: number;
  expiresAt: number;
  comments?: string;
}

export interface BreakGlassEvent {
  id: string;
  user: string;
  resource: string;
  reason: string;
  approver: string;
  triggeredAt: number;
  expiresAt: number;
  revoked: boolean;
  auditNotified: boolean;
}

export interface PolicyVersion {
  versionId: string;
  policyId: string;
  content: string;
  createdAt: number;
  createdBy: string;
  active: boolean;
  changes: string[];
}

export interface SubjectAttributes {
  userId: string;
  roles: string[];
  department: string;
  clearance: 'public' | 'internal' | 'confidential' | 'restricted' | 'top_secret';
  location: string;
  deviceType: string;
  mfaVerified: boolean;
  attributes: Record<string, unknown>;
}

export interface JustInTimeRequest {
  id: string;
  subject: string;
  role: string;
  justification: string;
  duration: number;
  requestedAt: number;
  approved: boolean;
  approver?: string;
  activatedAt?: number;
  expiresAt?: number;
}

export interface ComplianceMapping {
  framework: 'GDPR' | 'HIPAA' | 'SOC2' | 'PCI-DSS' | 'ISO27001' | 'NIST';
  control: string;
  description: string;
  status: 'compliant' | 'partial' | 'non_compliant';
  evidence: string[];
}

export interface PermissionAnalysis {
  user: string;
  effectivePermissions: string[];
  directRoles: string[];
  inheritedRoles: string[];
  excessPermissions: string[];
  lastUsed: Record<string, number>;
  riskScore: number;
}

export class AccessControl {
  private _policies: AccessPolicy[] = [];
  private _roles: Map<string, RBACRole> = new Map();
  private _counter = 0;
  private _abacPolicies: ABACPolicy[] = [];
  private _resources: Map<string, ResourceNode> = new Map();
  private _accessRequests: AccessRequest[] = [];
  private _accessReviews: Map<string, AccessReview> = new Map();
  private _breakGlassEvents: Map<string, BreakGlassEvent> = new Map();
  private _policyVersions: Map<string, PolicyVersion[]> = new Map();
  private _jitRequests: Map<string, JustInTimeRequest> = new Map();
  private _complianceMappings: Map<string, ComplianceMapping> = new Map();
  private _subjectAttributes: Map<string, SubjectAttributes> = new Map();
  private _permissionCache: Map<string, { permissions: string[]; expiresAt: number }> = new Map();
  private _auditTrail: { id: number; timestamp: number; actor: string; action: string; resource: string; decision: string; metadata: Record<string, unknown> }[] = [];
  private _denyRules: Set<string> = new Set();
  private _allowRules: Set<string> = new Set();
  private _sessionAttributes: Map<string, Record<string, unknown>> = new Map();

  get policyCount(): number { return this._policies.length; }
  get roleCount(): number { return this._roles.size; }
  get abacPolicyCount(): number { return this._abacPolicies.length; }
  get resourceCount(): number { return this._resources.size; }
  get accessRequestCount(): number { return this._accessRequests.length; }
  get pendingReviews(): number {
    let count = 0;
    for (const review of this._accessReviews.values()) {
      if (review.status === 'pending') count++;
    }
    return count;
  }
  get activeBreakGlassEvents(): number {
    let count = 0;
    for (const event of this._breakGlassEvents.values()) {
      if (!event.revoked && event.expiresAt > Date.now()) count++;
    }
    return count;
  }
  get activeJITRequests(): number {
    let count = 0;
    for (const req of this._jitRequests.values()) {
      if (req.approved && req.expiresAt && req.expiresAt > Date.now()) count++;
    }
    return count;
  }
  get auditTrailCount(): number { return this._auditTrail.length; }
  get cachedPermissionEntries(): number { return this._permissionCache.size; }
  get registeredSubjects(): number { return this._subjectAttributes.size; }

  dacCheck(user: string, resource: string, action: string, owner: string): boolean {
    if (user === owner) return true;
    const resourceNode = this._resources.get(resource);
    if (resourceNode && resourceNode.owner === user) return true;
    return false;
  }

  macCheck(user: string, resource: string, action: string, labels: Record<string, string>): boolean {
    const userLabel = labels[user];
    const resourceLabel = labels[resource];
    if (!userLabel || !resourceLabel) return false;
    const clearanceOrder = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
    const userClearance = clearanceOrder.indexOf(userLabel);
    const resourceClearance = clearanceOrder.indexOf(resourceLabel);
    if (action === 'write' && userClearance < resourceClearance) return false;
    if (action === 'read' && userClearance < resourceClearance) return false;
    return true;
  }

  rbacCheck(user: string, role: string, resource: string, action: string): boolean {
    const r = this._roles.get(role);
    if (!r) return false;
    if (!r.members.includes(user)) return false;
    const perm = `${action}:${resource}`;
    if (r.permissions.some(p => p === perm || p === `${action}:*` || p === '*:*')) return true;
    if (r.parent) {
      return this.rbacCheck(user, r.parent, resource, action);
    }
    return r.permissions.some(p => p === perm || p.startsWith(`${action}:`));
  }

  abacCheck(subject: Record<string, unknown>, resource: Record<string, unknown>, action: string, environment: Record<string, unknown>): boolean {
    for (const policy of this._abacPolicies) {
      if (!policy.enabled) continue;
      if (policy.action !== action && policy.action !== '*') continue;
      if (!this._attributesMatch(policy.subjectAttributes, subject)) continue;
      if (!this._attributesMatch(policy.resourceAttributes, resource)) continue;
      if (!this._attributesMatch(policy.environment, environment)) continue;
      return policy.effect === 'allow';
    }
    return true;
  }

  private _attributesMatch(expected: Record<string, unknown>, actual: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(expected)) {
      const actualValue = actual[key];
      if (Array.isArray(value)) {
        if (!value.includes(actualValue)) return false;
      } else if (typeof value === 'string' && value.includes('*')) {
        const pattern = value.replace(/\*/g, '.*');
        if (!new RegExp(`^${pattern}$`).test(String(actualValue))) return false;
      } else if (typeof value === 'object' && value !== null && '$gt' in value) {
        if (typeof actualValue !== 'number' || actualValue <= (value.$gt as number)) return false;
      } else if (typeof value === 'object' && value !== null && '$lt' in value) {
        if (typeof actualValue !== 'number' || actualValue >= (value.$lt as number)) return false;
      } else if (actualValue !== value) {
        return false;
      }
    }
    return true;
  }

  roleAssignment(user: string, roles: string[]): { user: string; roles: string[]; status: string } {
    for (const role of roles) {
      const r = this._roles.get(role);
      if (r && !r.members.includes(user)) {
        r.members.push(user);
        r.updatedAt = Date.now();
      }
    }
    this._invalidatePermissionCache(user);
    return { user, roles, status: 'assigned' };
  }

  roleRevocation(user: string, roles: string[]): { user: string; roles: string[]; revoked: number } {
    let revoked = 0;
    for (const role of roles) {
      const r = this._roles.get(role);
      if (r) {
        const idx = r.members.indexOf(user);
        if (idx >= 0) {
          r.members.splice(idx, 1);
          r.updatedAt = Date.now();
          revoked++;
        }
      }
    }
    this._invalidatePermissionCache(user);
    return { user, roles, revoked };
  }

  permissionAssignment(role: string, permissions: string[]): { role: string; permissions: string[]; status: string } {
    const r = this._roles.get(role);
    if (!r) {
      const now = Date.now();
      this._roles.set(role, { name: role, permissions, members: [], createdAt: now, updatedAt: now });
    } else {
      for (const p of permissions) {
        if (!r.permissions.includes(p)) r.permissions.push(p);
      }
      r.updatedAt = Date.now();
    }
    return { role, permissions, status: 'granted' };
  }

  permissionRevocation(role: string, permissions: string[]): { role: string; revoked: number; remaining: number } {
    const r = this._roles.get(role);
    if (!r) return { role, revoked: 0, remaining: 0 };
    let revoked = 0;
    r.permissions = r.permissions.filter(p => {
      if (permissions.includes(p)) { revoked++; return false; }
      return true;
    });
    r.updatedAt = Date.now();
    return { role, revoked, remaining: r.permissions.length };
  }

  createRole(name: string, permissions: string[], parent?: string): RBACRole {
    const now = Date.now();
    const role: RBACRole = { name, permissions, members: [], parent, createdAt: now, updatedAt: now };
    this._roles.set(name, role);
    if (parent) {
      const parentRole = this._roles.get(parent);
      if (parentRole) {
        parentRole.children = parentRole.children ?? [];
        parentRole.children.push(name);
      }
    }
    return role;
  }

  deleteRole(name: string): { deleted: boolean; membersAffected: number } {
    const role = this._roles.get(name);
    if (!role) return { deleted: false, membersAffected: 0 };
    const affected = role.members.length;
    if (role.parent) {
      const parent = this._roles.get(role.parent);
      if (parent?.children) {
        parent.children = parent.children.filter(c => c !== name);
      }
    }
    this._roles.delete(name);
    return { deleted: true, membersAffected: affected };
  }

  leastPrivilege(user: string, role: string): { user: string; role: string; removed: number; status: string } {
    const r = this._roles.get(role);
    if (!r) return { user, role, removed: 0, status: 'role_not_found' };
    const before = r.permissions.length;
    r.permissions = r.permissions.slice(0, 3);
    r.updatedAt = Date.now();
    this._invalidatePermissionCache(user);
    return { user, role, removed: before - r.permissions.length, status: 'reduced' };
  }

  needToKnow(user: string, resource: string, action: string): boolean {
    const subjectAttrs = this._subjectAttributes.get(user);
    const resourceNode = this._resources.get(resource);
    if (!subjectAttrs || !resourceNode) return true;
    if (action === 'read' && resourceNode.sensitivity === 'top_secret') {
      return subjectAttrs.clearance === 'top_secret';
    }
    return true;
  }

  separationOfDuties(user: string, actions: string[]): { compliant: boolean; conflict: string | null } {
    if (actions.includes('approve') && actions.includes('request')) {
      return { compliant: false, conflict: 'approve_and_request' };
    }
    if (actions.includes('create') && actions.includes('audit')) {
      return { compliant: false, conflict: 'create_and_audit' };
    }
    if (actions.includes('deploy') && actions.includes('approve_deploy')) {
      return { compliant: false, conflict: 'deploy_and_approve' };
    }
    if (actions.includes('write') && actions.includes('delete') && actions.includes('restore')) {
      return { compliant: false, conflict: 'all_data_lifecycle' };
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

  registerSubject(subject: SubjectAttributes): SubjectAttributes {
    this._subjectAttributes.set(subject.userId, subject);
    return subject;
  }

  registerResource(resource: ResourceNode): ResourceNode {
    this._resources.set(resource.id, resource);
    if (resource.parentId) {
      const parent = this._resources.get(resource.parentId);
      if (parent && !parent.children.includes(resource.id)) {
        parent.children.push(resource.id);
      }
    }
    return resource;
  }

  effectivePermissions(user: string): string[] {
    const cached = this._permissionCache.get(user);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }
    const permissions = new Set<string>();
    for (const role of this._roles.values()) {
      if (role.members.includes(user)) {
        for (const p of role.permissions) permissions.add(p);
        let parent = role.parent;
        while (parent) {
          const parentRole = this._roles.get(parent);
          if (!parentRole) break;
          for (const p of parentRole.permissions) permissions.add(p);
          parent = parentRole.parent;
        }
      }
    }
    const arr = Array.from(permissions);
    this._permissionCache.set(user, { permissions: arr, expiresAt: Date.now() + 300000 });
    return arr;
  }

  private _invalidatePermissionCache(user?: string): void {
    if (user) {
      this._permissionCache.delete(user);
    } else {
      this._permissionCache.clear();
    }
  }

  addABACPolicy(policy: Omit<ABACPolicy, 'id'>): ABACPolicy {
    const id = `abac-${++this._counter}`;
    const full: ABACPolicy = { ...policy, id };
    this._abacPolicies.push(full);
    this._abacPolicies.sort((a, b) => b.priority - a.priority);
    return full;
  }

  listABACPolicies(filter?: { effect?: string; enabled?: boolean }): ABACPolicy[] {
    return this._abacPolicies.filter(p => {
      if (filter?.effect && p.effect !== filter.effect) return false;
      if (filter?.enabled !== undefined && p.enabled !== filter.enabled) return false;
      return true;
    });
  }

  disableABACPolicy(id: string): { disabled: boolean; id: string } {
    const policy = this._abacPolicies.find(p => p.id === id);
    if (!policy) return { disabled: false, id };
    policy.enabled = false;
    return { disabled: true, id };
  }

  createAccessRequest(subject: string, resource: string, action: string, context: Record<string, unknown> = {}): AccessRequest {
    const request: AccessRequest = {
      id: ++this._counter,
      subject,
      resource,
      action,
      context,
      requestedAt: Date.now(),
      decision: 'pending',
      obligations: [],
    };
    this._accessRequests.push(request);
    return request;
  }

  evaluateAccessRequest(requestId: number): AccessRequest {
    const request = this._accessRequests.find(r => r.id === requestId);
    if (!request) {
      throw new Error(`Access request ${requestId} not found`);
    }
    const subjectAttrs = this._subjectAttributes.get(request.subject);
    const resourceNode = this._resources.get(request.resource);
    let decision: 'allow' | 'deny' | 'challenge' = 'allow';
    const reasons: string[] = [];
    const obligations: string[] = [];
    if (subjectAttrs && resourceNode) {
      const clearanceOrder = ['public', 'internal', 'confidential', 'restricted', 'top_secret'];
      if (clearanceOrder.indexOf(subjectAttrs.clearance) < clearanceOrder.indexOf(resourceNode.sensitivity)) {
        decision = 'deny';
        reasons.push('insufficient_clearance');
      }
      if (!subjectAttrs.mfaVerified && resourceNode.sensitivity !== 'public') {
        decision = decision === 'deny' ? 'deny' : 'challenge';
        obligations.push('require_mfa');
        reasons.push('mfa_required');
      }
    }
    const abacResult = this.abacCheck(
      subjectAttrs ? { ...subjectAttrs } : { userId: request.subject },
      resourceNode ? { ...resourceNode } : { id: request.resource },
      request.action,
      request.context,
    );
    if (!abacResult && decision !== 'deny') {
      decision = 'deny';
      reasons.push('abac_deny');
    }
    const sodCheck = this.separationOfDuties(request.subject, [request.action]);
    if (!sodCheck.compliant) {
      decision = 'deny';
      reasons.push(`sod_conflict:${sodCheck.conflict}`);
    }
    request.decision = decision;
    request.reason = reasons.join(';');
    request.obligations = obligations;
    this._recordAudit(request.subject, request.action, request.resource, decision, { requestId, reasons });
    return request;
  }

  getAccessHistory(filter?: { subject?: string; resource?: string; since?: number }): AccessRequest[] {
    return this._accessRequests.filter(r => {
      if (filter?.subject && r.subject !== filter.subject) return false;
      if (filter?.resource && r.resource !== filter.resource) return false;
      if (filter?.since && r.requestedAt < filter.since) return false;
      return true;
    });
  }

  initiateAccessReview(subject: string, reviewer: string, scope: string, ttlDays: number = 30): AccessReview {
    const id = `review-${++this._counter}`;
    const now = Date.now();
    const review: AccessReview = {
      id,
      subject,
      reviewer,
      scope,
      status: 'pending',
      requestedAt: now,
      expiresAt: now + ttlDays * 86400000,
    };
    this._accessReviews.set(id, review);
    return review;
  }

  completeAccessReview(id: string, status: 'approved' | 'rejected', comments?: string): { id: string; updated: boolean } {
    const review = this._accessReviews.get(id);
    if (!review) return { id, updated: false };
    if (review.status !== 'pending') return { id, updated: false };
    review.status = status;
    review.reviewedAt = Date.now();
    review.comments = comments;
    if (status === 'rejected') {
      const perms = this.effectivePermissions(review.subject);
      if (perms.length > 0) {
        this._invalidatePermissionCache(review.subject);
      }
    }
    return { id, updated: true };
  }

  listAccessReviews(filter?: { status?: string; reviewer?: string }): AccessReview[] {
    return Array.from(this._accessReviews.values()).filter(r => {
      if (filter?.status && r.status !== filter.status) return false;
      if (filter?.reviewer && r.reviewer !== filter.reviewer) return false;
      return true;
    });
  }

  triggerBreakGlass(user: string, resource: string, reason: string, approver: string, durationMinutes: number = 60): BreakGlassEvent {
    const id = `bg-${++this._counter}`;
    const now = Date.now();
    const event: BreakGlassEvent = {
      id,
      user,
      resource,
      reason,
      approver,
      triggeredAt: now,
      expiresAt: now + durationMinutes * 60000,
      revoked: false,
      auditNotified: true,
    };
    this._breakGlassEvents.set(id, event);
    this._recordAudit(user, 'break_glass', resource, 'allow', { reason, approver, durationMinutes });
    return event;
  }

  revokeBreakGlass(id: string): { revoked: boolean; id: string } {
    const event = this._breakGlassEvents.get(id);
    if (!event) return { revoked: false, id };
    event.revoked = true;
    return { revoked: true, id };
  }

  listBreakGlassEvents(filter?: { user?: string; active?: boolean }): BreakGlassEvent[] {
    return Array.from(this._breakGlassEvents.values()).filter(e => {
      if (filter?.user && e.user !== filter.user) return false;
      if (filter?.active && (e.revoked || e.expiresAt < Date.now())) return false;
      return true;
    });
  }

  requestJITAccess(subject: string, role: string, justification: string, durationMinutes: number): JustInTimeRequest {
    const id = `jit-${++this._counter}`;
    const request: JustInTimeRequest = {
      id,
      subject,
      role,
      justification,
      duration: durationMinutes,
      requestedAt: Date.now(),
      approved: false,
    };
    this._jitRequests.set(id, request);
    return request;
  }

  approveJITRequest(id: string, approver: string): { approved: boolean; id: string; activatedAt?: number; expiresAt?: number } {
    const request = this._jitRequests.get(id);
    if (!request) return { approved: false, id };
    request.approved = true;
    request.approver = approver;
    request.activatedAt = Date.now();
    request.expiresAt = Date.now() + request.duration * 60000;
    const role = this._roles.get(request.role);
    if (role && !role.members.includes(request.subject)) {
      role.members.push(request.subject);
    }
    return { approved: true, id, activatedAt: request.activatedAt, expiresAt: request.expiresAt };
  }

  expireJITRequests(): { expired: number; remaining: number } {
    const now = Date.now();
    let expired = 0;
    for (const request of this._jitRequests.values()) {
      if (request.approved && request.expiresAt && request.expiresAt < now) {
        const role = this._roles.get(request.role);
        if (role) {
          const idx = role.members.indexOf(request.subject);
          if (idx >= 0) role.members.splice(idx, 1);
        }
        expired++;
      }
    }
    return { expired, remaining: this._jitRequests.size - expired };
  }

  listJITRequests(filter?: { subject?: string; approved?: boolean; active?: boolean }): JustInTimeRequest[] {
    const now = Date.now();
    return Array.from(this._jitRequests.values()).filter(r => {
      if (filter?.subject && r.subject !== filter.subject) return false;
      if (filter?.approved !== undefined && r.approved !== filter.approved) return false;
      if (filter?.active && (!r.approved || !r.expiresAt || r.expiresAt < now)) return false;
      return true;
    });
  }

  createPolicyVersion(policyId: string, content: string, createdBy: string, changes: string[]): PolicyVersion {
    const versionId = `v-${++this._counter}`;
    const now = Date.now();
    const versions = this._policyVersions.get(policyId) ?? [];
    versions.forEach(v => v.active = false);
    const version: PolicyVersion = {
      versionId,
      policyId,
      content,
      createdAt: now,
      createdBy,
      active: true,
      changes,
    };
    versions.push(version);
    this._policyVersions.set(policyId, versions);
    return version;
  }

  getPolicyHistory(policyId: string): PolicyVersion[] {
    return this._policyVersions.get(policyId) ?? [];
  }

  rollbackPolicy(policyId: string, versionId: string): { rolledBack: boolean; activeVersion: string } {
    const versions = this._policyVersions.get(policyId);
    if (!versions) return { rolledBack: false, activeVersion: '' };
    const target = versions.find(v => v.versionId === versionId);
    if (!target) return { rolledBack: false, activeVersion: '' };
    versions.forEach(v => v.active = v.versionId === versionId);
    return { rolledBack: true, activeVersion: versionId };
  }

  mapComplianceControl(framework: ComplianceMapping['framework'], control: string, mapping: Omit<ComplianceMapping, 'framework' | 'control'>): ComplianceMapping {
    const key = `${framework}:${control}`;
    const full: ComplianceMapping = { ...mapping, framework, control };
    this._complianceMappings.set(key, full);
    return full;
  }

  assessCompliance(framework?: ComplianceMapping['framework']): {
    framework?: string;
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    gaps: string[];
  } {
    const all = Array.from(this._complianceMappings.values()).filter(m => !framework || m.framework === framework);
    const compliant = all.filter(m => m.status === 'compliant').length;
    const partial = all.filter(m => m.status === 'partial').length;
    const nonCompliant = all.filter(m => m.status === 'non_compliant').length;
    const gaps = all.filter(m => m.status !== 'compliant').map(m => `${m.framework}:${m.control}`);
    return { framework, total: all.length, compliant, partial, nonCompliant, gaps };
  }

  analyzeUserPermissions(user: string): PermissionAnalysis {
    const subject = this._subjectAttributes.get(user);
    const directRoles: string[] = [];
    for (const role of this._roles.values()) {
      if (role.members.includes(user)) directRoles.push(role.name);
    }
    const inheritedRoles: string[] = [];
    for (const role of directRoles) {
      let parent = this._roles.get(role)?.parent;
      while (parent) {
        if (!inheritedRoles.includes(parent)) inheritedRoles.push(parent);
        parent = this._roles.get(parent)?.parent;
      }
    }
    const effective = this.effectivePermissions(user);
    const expected: string[] = [];
    if (subject) {
      if (subject.department === 'engineering') expected.push('read:code', 'write:code');
      if (subject.clearance === 'top_secret') expected.push('read:classified');
    }
    const excess = effective.filter(p => !expected.includes(p));
    const lastUsed: Record<string, number> = {};
    for (const perm of effective) {
      lastUsed[perm] = Date.now() - Math.floor(Math.random() * 30 * 86400000);
    }
    const riskScore = Math.min(100, excess.length * 10 + directRoles.length * 5);
    return {
      user,
      effectivePermissions: effective,
      directRoles,
      inheritedRoles,
      excessPermissions: excess,
      lastUsed,
      riskScore,
    };
  }

  resourceHierarchy(rootId: string): { root: ResourceNode; descendants: ResourceNode[]; depth: number } {
    const root = this._resources.get(rootId);
    if (!root) return { root: null as unknown as ResourceNode, descendants: [], depth: 0 };
    const descendants: ResourceNode[] = [];
    const visited = new Set<string>();
    const traverse = (id: string, depth: number): number => {
      const node = this._resources.get(id);
      if (!node || visited.has(id)) return depth;
      visited.add(id);
      if (id !== rootId) descendants.push(node);
      let maxDepth = depth;
      for (const childId of node.children) {
        maxDepth = Math.max(maxDepth, traverse(childId, depth + 1));
      }
      return maxDepth;
    };
    const depth = traverse(rootId, 0);
    return { root, descendants, depth };
  }

  inheritPermissions(parentId: string, childId: string): { inherited: string[]; source: string } {
    const parent = this._resources.get(parentId);
    if (!parent) return { inherited: [], source: parentId };
    const inherited = [`read:${parentId}`, `read:${childId}`];
    return { inherited, source: parentId };
  }

  defineDenyRule(ruleId: string, conditions: string): { ruleId: string; defined: boolean } {
    this._denyRules.add(ruleId);
    return { ruleId, defined: true };
  }

  defineAllowRule(ruleId: string, conditions: string): { ruleId: string; defined: boolean } {
    this._allowRules.add(ruleId);
    return { ruleId, defined: true };
  }

  setSessionAttributes(sessionId: string, attributes: Record<string, unknown>): { sessionId: string; attributes: Record<string, unknown> } {
    this._sessionAttributes.set(sessionId, attributes);
    return { sessionId, attributes };
  }

  getSessionAttributes(sessionId: string): Record<string, unknown> | null {
    return this._sessionAttributes.get(sessionId) ?? null;
  }

  private _recordAudit(actor: string, action: string, resource: string, decision: string, metadata: Record<string, unknown>): void {
    this._auditTrail.push({
      id: ++this._counter,
      timestamp: Date.now(),
      actor,
      action,
      resource,
      decision,
      metadata,
    });
    if (this._auditTrail.length > 1000) this._auditTrail.shift();
  }

  getAuditTrail(filter?: { actor?: string; action?: string; decision?: string; since?: number }): typeof this._auditTrail {
    return this._auditTrail.filter(entry => {
      if (filter?.actor && entry.actor !== filter.actor) return false;
      if (filter?.action && entry.action !== filter.action) return false;
      if (filter?.decision && entry.decision !== filter.decision) return false;
      if (filter?.since && entry.timestamp < filter.since) return false;
      return true;
    });
  }

  securityPosture(): {
    overallScore: number;
    rbacMaturity: number;
    abacCoverage: number;
    reviewCompleteness: number;
    jitAdoption: number;
    excessPermissions: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const rbacMaturity = this._roles.size > 0 ? Math.min(100, this._roles.size * 5) : 0;
    const abacCoverage = this._abacPolicies.length > 0 ? Math.min(100, this._abacPolicies.length * 10) : 0;
    const reviewCompleteness = this._accessReviews.size > 0 ? (this.pendingReviews / this._accessReviews.size) * 100 : 100;
    const jitAdoption = this._jitRequests.size > 0 ? Math.min(100, this._jitRequests.size * 5) : 0;
    let excess = 0;
    for (const subject of this._subjectAttributes.keys()) {
      excess += this.analyzeUserPermissions(subject).excessPermissions.length;
    }
    if (this._roles.size === 0) recommendations.push('implement_rbac');
    if (this._abacPolicies.length === 0) recommendations.push('adopt_abac');
    if (this.pendingReviews > 0) recommendations.push('complete_access_reviews');
    if (excess > 0) recommendations.push(`reduce_excess_permissions:${excess}`);
    if (this._jitRequests.size === 0) recommendations.push('adopt_jit_access');
    if (this._breakGlassEvents.size === 0) recommendations.push('define_break_glass_procedures');
    const overall = (rbacMaturity + abacCoverage + reviewCompleteness + jitAdoption) / 4;
    return {
      overallScore: Math.round(overall),
      rbacMaturity: Math.round(rbacMaturity),
      abacCoverage: Math.round(abacCoverage),
      reviewCompleteness: Math.round(reviewCompleteness),
      jitAdoption: Math.round(jitAdoption),
      excessPermissions: excess,
      recommendations,
    };
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
    this._abacPolicies = [];
    this._resources.clear();
    this._accessRequests = [];
    this._accessReviews.clear();
    this._breakGlassEvents.clear();
    this._policyVersions.clear();
    this._jitRequests.clear();
    this._complianceMappings.clear();
    this._subjectAttributes.clear();
    this._permissionCache.clear();
    this._auditTrail = [];
    this._denyRules.clear();
    this._allowRules.clear();
    this._sessionAttributes.clear();
  }
}
