/**
 * 拟像先行：符号先于现实并决定现实。
 * 拟像不再追随现实，而是先于现实存在并塑造现实，让现实按照符号模板被生产。
 */

export interface SymbolTemplate {
  id: string;
  symbol: string;
  manifests: string[];
  precedesReality: boolean;
}

export interface RealityManifestation {
  id: string;
  templateId: string;
  realizedForm: string;
  fidelity: number;
  materializedAt: number;
}

export class PrecessionOfSimulacra {
  private _templates: Map<string, SymbolTemplate> = new Map();
  private _manifestations: RealityManifestation[] = [];
  private _priorityQueue: string[] = [];
  private _maxQueue = 50;

  registerTemplate(template: SymbolTemplate): void {
    template.precedesReality = true;
    this._templates.set(template.id, template);
    this._priorityQueue.push(template.id);
    if (this._priorityQueue.length > this._maxQueue) this._priorityQueue.shift();
  }

  materialize(templateId: string): RealityManifestation | null {
    const template = this._templates.get(templateId);
    if (!template) return null;
    const form = template.manifests[Math.floor(Math.random() * template.manifests.length)] || template.symbol;
    const manifestation: RealityManifestation = {
      id: `man-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      templateId,
      realizedForm: form,
      fidelity: 0.5 + Math.random() * 0.5,
      materializedAt: Date.now(),
    };
    this._manifestations.push(manifestation);
    if (this._manifestations.length > 100) this._manifestations.shift();
    return manifestation;
  }

  processQueue(): RealityManifestation[] {
    const results: RealityManifestation[] = [];
    const batch = this._priorityQueue.splice(0, 5);
    for (const id of batch) {
      const m = this.materialize(id);
      if (m) results.push(m);
    }
    return results;
  }

  precedenceScore(templateId: string): number {
    const template = this._templates.get(templateId);
    if (!template) return 0;
    const realized = this._manifestations.filter(m => m.templateId === templateId).length;
    return template.manifests.length * 0.3 + realized * 0.7;
  }

  getTemplate(id: string): SymbolTemplate | null {
    return this._templates.get(id) ?? null;
  }

  getManifestations(limit: number = 50): RealityManifestation[] {
    return this._manifestations.slice(-limit);
  }

  get queueLength(): number {
    return this._priorityQueue.length;
  }

  get templateCount(): number {
    return this._templates.size;
  }
}
