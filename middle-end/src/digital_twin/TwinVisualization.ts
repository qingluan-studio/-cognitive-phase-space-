import { DataPacket } from '../shared/types';

export interface TwinVisualization {
  twin: string;
  view: string;
  layers: string[];
  widgets: Widget[];
}

export interface TwinDashboard {
  id: string;
  name: string;
  layout: string;
  widgets: Widget[];
}

interface Widget {
  id: string;
  type: string;
  title: string;
  dataSource: string;
  position: { x: number; y: number; w: number; h: number };
}

interface DataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

interface Alarm {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

export class TwinVisualization {
  private _visualizations: Map<string, TwinVisualization> = new Map();
  private _dashboards: Map<string, TwinDashboard> = new Map();
  private _alarms: Map<string, Alarm[]> = new Map();
  private _historicalData: Map<string, DataPoint[]> = new Map();
  private _counter = 0;
  private _stats = {
    totalViews: 0,
    activeDashboards: 0,
    dataPoints: 0,
    refreshRate: 1000,
  };

  visualizatiOn3D(twin: string, model: string, camera: { position: [number, number, number]; target: [number, number, number] }): { view: string; model: string; quality: number; fps: number } {
    this._stats.totalViews++;
    return {
      view: `3d-view-${twin}`,
      model,
      quality: Math.random() * 0.3 + 0.7,
      fps: Math.floor(Math.random() * 30 + 30),
    };
  }

  dashboardTwin(twin: string, metrics: string[], layout: string): TwinDashboard {
    const widgets: Widget[] = metrics.map((m, i) => ({
      id: `widget-${Date.now()}-${this._counter++}`,
      type: i % 3 === 0 ? 'gauge' : i % 3 === 1 ? 'chart' : 'value',
      title: m,
      dataSource: m,
      position: { x: (i % 3) * 4, y: Math.floor(i / 3) * 3, w: 4, h: 3 },
    }));
    const dashboard: TwinDashboard = {
      id: `dashboard-${twin}`,
      name: `${twin} Dashboard`,
      layout,
      widgets,
    };
    this._dashboards.set(dashboard.id, dashboard);
    this._stats.activeDashboards = this._dashboards.size;
    return dashboard;
  }

  realtimeData(twin: string, sensors: string[], refreshRate: number): { data: Record<string, number>; timestamp: number; refreshRate: number } {
    const data: Record<string, number> = {};
    for (const sensor of sensors) {
      data[sensor] = Math.random() * 100;
      this._addHistoricalData(sensor, data[sensor]);
    }
    this._stats.refreshRate = refreshRate;
    return { data, timestamp: Date.now(), refreshRate };
  }

  historicalData(twin: string, timeRange: { start: number; end: number }, resolution: number): { data: Record<string, DataPoint[]>; resolution: number; points: number } {
    const result: Record<string, DataPoint[]> = {};
    const pointCount = Math.floor((timeRange.end - timeRange.start) / resolution);
    const metrics = ['temperature', 'pressure', 'vibration', 'efficiency'];
    for (const metric of metrics) {
      const points: DataPoint[] = [];
      let value = 50;
      for (let i = 0; i < Math.min(pointCount, 1000); i++) {
        value += (Math.random() - 0.5) * 5;
        value = Math.max(0, Math.min(100, value));
        points.push({
          timestamp: timeRange.start + i * resolution,
          value,
          label: metric,
        });
      }
      result[metric] = points;
      this._stats.dataPoints += points.length;
    }
    return { data: result, resolution, points: pointCount };
  }

  alarmOverlay(twin: string, alerts: Alarm[], severity: string): { visible: boolean; alarms: Alarm[]; count: number; criticalCount: number } {
    this._alarms.set(twin, alerts);
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    return {
      visible: true,
      alarms: alerts,
      count: alerts.length,
      criticalCount,
    };
  }

  heatmapOverlay(twin: string, data: Record<string, number>, colormap: string): { heatmap: string; maxValue: number; minValue: number; average: number } {
    const values = Object.values(data);
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const average = values.reduce((s, v) => s + v, 0) / values.length;
    return {
      heatmap: `heatmap-${twin}-${colormap}`,
      maxValue,
      minValue,
      average,
    };
  }

  flowAnimation(twin: string, fluid: string, path: [number, number, number][]): { animation: string; particles: number; speed: number } {
    return {
      animation: `flow-${twin}-${fluid}`,
      particles: Math.floor(Math.random() * 1000 + 500),
      speed: Math.random() * 5 + 1,
    };
  }

  explodedView(twin: string, parts: string[], direction: [number, number, number]): { view: string; parts: string[]; separation: number } {
    return {
      view: `exploded-${twin}`,
      parts,
      separation: Math.random() * 0.5 + 0.1,
    };
  }

  crossSection(twin: string, plane: [number, number, number], normal: [number, number, number]): { view: string; slice: string; plane: [number, number, number] } {
    return {
      view: `cross-section-${twin}`,
      slice: `slice-${Date.now()}`,
      plane: [...plane] as [number, number, number],
    };
  }

  timeLapse(twin: string, start: number, end: number, speed: number): { frames: number; duration: number; speed: number; currentFrame: number } {
    const duration = (end - start) / 1000;
    const frames = Math.floor(duration * 30);
    return {
      frames,
      duration,
      speed,
      currentFrame: 0,
    };
  }

  comparisonView(twinA: string, twinB: string, splitType: 'horizontal' | 'vertical' | 'overlay'): { view: string; twinA: string; twinB: string; splitType: string; diffMetric: number } {
    return {
      view: `compare-${twinA}-${twinB}`,
      twinA,
      twinB,
      splitType,
      diffMetric: Math.random() * 20,
    };
  }

  arTwinOverlay(twin: string, camera: string, registration: { position: [number, number, number]; rotation: [number, number, number, number] }): { overlaid: boolean; registrationError: number; visibility: number } {
    return {
      overlaid: true,
      registrationError: Math.random() * 0.05,
      visibility: Math.random() * 0.2 + 0.8,
    };
  }

  vrTwinImmersion(twin: string, vrDevice: string): { immersed: boolean; quality: number; comfort: number; presence: number } {
    return {
      immersed: true,
      quality: Math.random() * 0.3 + 0.7,
      comfort: Math.random() * 0.3 + 0.7,
      presence: Math.random() * 0.4 + 0.6,
    };
  }

  private _addHistoricalData(sensor: string, value: number): void {
    const existing = this._historicalData.get(sensor) || [];
    existing.push({ timestamp: Date.now(), value, label: sensor });
    if (existing.length > 10000) existing.splice(0, existing.length - 10000);
    this._historicalData.set(sensor, existing);
  }

  get visualizationCount(): number {
    return this._visualizations.size;
  }

  get dashboardCount(): number {
    return this._dashboards.size;
  }

  get stats(): { totalViews: number; activeDashboards: number; dataPoints: number; refreshRate: number } {
    return { ...this._stats };
  }

  public toPacket(): DataPacket<{
    visualizations: number;
    dashboards: number;
    alarms: number;
    historicalSensors: number;
    stats: { totalViews: number; activeDashboards: number; dataPoints: number; refreshRate: number };
  }> {
    return {
      id: `dt-viz-${Date.now()}-${this._counter}`,
      payload: {
        visualizations: this._visualizations.size,
        dashboards: this._dashboards.size,
        alarms: this._alarms.size,
        historicalSensors: this._historicalData.size,
        stats: { ...this._stats },
      },
      metadata: {
        createdAt: Date.now(),
        route: ['digital_twin', 'visualization', 'result'],
        priority: 0.7,
        phase: 'visualization',
      },
    };
  }

  public reset(): void {
    this._visualizations.clear();
    this._dashboards.clear();
    this._alarms.clear();
    this._historicalData.clear();
    this._counter = 0;
    this._stats = {
      totalViews: 0,
      activeDashboards: 0,
      dataPoints: 0,
      refreshRate: 1000,
    };
  }
}
