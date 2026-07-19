import { DataPacket } from '../shared/types';

export interface IoTPlatformInfo {
  readonly name: string;
  readonly devices: number;
  readonly applications: number;
  readonly rules: number;
}

export interface RuleEngine {
  readonly rules: string[];
  readonly triggers: string[];
  readonly actions: string[];
  readonly enabled: boolean;
}

export class IoTPlatform {
  private _platform: IoTPlatformInfo | null = null;
  private _rules: string[] = [];
  private _history: string[] = [];
  private _counter = 0;

  get platformName(): string {
    return this._platform?.name ?? 'none';
  }

  get ruleCount(): number {
    return this._rules.length;
  }

  get history(): string[] {
    return [...this._history];
  }

  public deviceManagement(platform: string, devices: string[]): { platform: string; devices: number; managed: number; groups: number } {
    this._platform = { name: platform, devices: devices.length, applications: 3, rules: this._rules.length };
    const groups = Math.ceil(devices.length / 10);
    this._recordHistory(`deviceManagement(platform=${platform}, devices=${devices.length})`);
    return { platform, devices: devices.length, managed: devices.length, groups };
  }

  public dataIngestion(platform: string, sources: string[]): { platform: string; sources: number; ingested: number; throughput: number } {
    const ingested = sources.length * 100;
    const throughput = 1000;
    this._recordHistory(`dataIngestion(platform=${platform}, sources=${sources.length}) -> ${ingested} points`);
    return { platform, sources: sources.length, ingested, throughput };
  }

  public ruleEngine(rules: string[], data: string, triggers: string[]): { triggered: number; actions: number; rules: number } {
    this._rules = rules;
    const triggered = Math.floor(rules.length * 0.3);
    this._recordHistory(`ruleEngine(rules=${rules.length}, triggers=${triggers.length}) -> triggered=${triggered}`);
    return { triggered, actions: triggered, rules: rules.length };
  }

  public alarmEngine(events: string[], alarmRules: string[]): { alarms: number; critical: number; warnings: number } {
    const alarms = Math.floor(events.length * 0.2);
    const critical = Math.floor(alarms * 0.3);
    const warnings = alarms - critical;
    this._recordHistory(`alarmEngine(events=${events.length}, rules=${alarmRules.length}) -> alarms=${alarms}`);
    return { alarms, critical, warnings };
  }

  public dashboard(platform: string, widgets: string[]): { platform: string; widgets: number; layout: string; refreshed: number } {
    const refreshed = Date.now();
    this._recordHistory(`dashboard(platform=${platform}, widgets=${widgets.length})`);
    return { platform, widgets: widgets.length, layout: 'grid', refreshed };
  }

  public visualization(data: string[], type: string): { chart: string; type: string; dataPoints: number; interactive: boolean } {
    this._recordHistory(`visualization(type=${type}, data=${data.length})`);
    return { chart: type, type, dataPoints: data.length, interactive: true };
  }

  public notification(platform: string, channel: string, message: string): { platform: string; channel: string; sent: boolean; recipients: number } {
    const recipients = 5;
    this._recordHistory(`notification(platform=${platform}, channel=${channel})`);
    return { platform, channel, sent: true, recipients };
  }

  public integration(platform: string, external: string, method: string): { platform: string; external: string; method: string; connected: boolean } {
    this._recordHistory(`integration(platform=${platform}, external=${external}, method=${method})`);
    return { platform, external, method, connected: true };
  }

  public digitalTwin(device: string, virtualModel: string): { device: string; virtualModel: string; sync: boolean; properties: number } {
    const sync = Math.random() > 0.05;
    const properties = 10;
    this._recordHistory(`digitalTwin(device=${device}, model=${virtualModel}) -> sync=${sync}`);
    return { device, virtualModel, sync, properties };
  }

  public assetManagement(platform: string, assets: string[]): { platform: string; assets: number; categories: number; value: number } {
    const categories = 5;
    const value = assets.length * 1000;
    this._recordHistory(`assetManagement(platform=${platform}, assets=${assets.length})`);
    return { platform, assets: assets.length, categories, value };
  }

  public fleetManagement(fleet: string, devices: string[]): { fleet: string; devices: number; online: number; utilization: number } {
    const online = Math.floor(devices.length * 0.85);
    const utilization = 0.6 + Math.random() * 0.3;
    this._recordHistory(`fleetManagement(fleet=${fleet}, devices=${devices.length}) -> online=${online}`);
    return { fleet, devices: devices.length, online, utilization };
  }

  public predictiveMaintenance(device: string, data: string, model: string): { device: string; failureRisk: number; daysToFailure: number; maintenance: boolean } {
    const failureRisk = Math.random();
    const daysToFailure = Math.floor(failureRisk * 90);
    const maintenance = failureRisk > 0.7;
    this._recordHistory(`predictiveMaintenance(device=${device}, model=${model}) -> risk=${(failureRisk * 100).toFixed(1)}%`);
    return { device, failureRisk, daysToFailure, maintenance };
  }

  public remoteDiagnostics(device: string, data: string): { device: string; diagnosis: string; issues: number; severity: string } {
    const issues = Math.floor(Math.random() * 3);
    const severity = issues === 0 ? 'healthy' : issues === 1 ? 'warning' : 'critical';
    this._recordHistory(`remoteDiagnostics(device=${device}) -> severity=${severity}`);
    return { device, diagnosis: severity, issues, severity };
  }

  public toPacket(): DataPacket<{
    platform: string;
    rules: number;
    history: string[];
  }> {
    return {
      id: `iot-platform-${Date.now()}-${this._counter}`,
      payload: {
        platform: this._platform?.name ?? 'none',
        rules: this._rules.length,
        history: [...this._history],
      },
      metadata: {
        createdAt: Date.now(),
        route: ['iot', 'platform', 'result'],
        priority: 0.75,
        phase: 'orchestration',
      },
    };
  }

  public reset(): void {
    this._platform = null;
    this._rules = [];
    this._history = [];
    this._counter = 0;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
