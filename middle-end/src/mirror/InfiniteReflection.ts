/**
 * 无限反射：两个模块互相反射，生成无穷深度。
 * 通过模块间的递归互反射产生无限的镜像深度，每一层都包含上一层的镜像。
 */

export interface ReflectionLayer {
  depth: number;
  observer: string;
  reflected: string;
  content: string;
}

export interface ReflectionChain {
  id: string;
  layers: ReflectionLayer[];
  maxDepth: number;
  terminated: boolean;
  createdAt: number;
}

export class InfiniteReflection {
  private _chains: ReflectionChain[] = [];
  private _maxDepth = 32;
  private _oscillationCount = 0;

  reflect(observer: string, target: string, initialContent: string): ReflectionChain {
    const layers: ReflectionLayer[] = [];
    let currentContent = initialContent;
    let currentObserver = observer;
    let currentReflected = target;
    let terminated = false;

    for (let depth = 0; depth < this._maxDepth; depth++) {
      layers.push({
        depth,
        observer: currentObserver,
        reflected: currentReflected,
        content: currentContent,
      });
      const next = this._reflectOnce(currentObserver, currentReflected, currentContent);
      if (next === currentContent) {
        this._oscillationCount++;
        terminated = true;
        break;
      }
      currentContent = next;
      [currentObserver, currentReflected] = [currentReflected, currentObserver];
    }

    const chain: ReflectionChain = {
      id: `chain-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      layers,
      maxDepth: this._maxDepth,
      terminated,
      createdAt: Date.now(),
    };
    this._chains.push(chain);
    if (this._chains.length > 50) this._chains.shift();
    return chain;
  }

  private _reflectOnce(observer: string, target: string, content: string): string {
    const prefix = `${observer} sees ${target} seeing:`;
    if (content.startsWith(prefix)) {
      return content;
    }
    return `${prefix} "${content}"`;
  }

  measureDepth(chainId: string): number {
    const chain = this._chains.find(c => c.id === chainId);
    return chain ? chain.layers.length : 0;
  }

  truncate(chainId: string, maxLayers: number): ReflectionChain | null {
    const chain = this._chains.find(c => c.id === chainId);
    if (!chain) return null;
    chain.layers = chain.layers.slice(0, maxLayers);
    chain.terminated = true;
    return chain;
  }

  setMaxDepth(depth: number): void {
    this._maxDepth = Math.max(1, depth);
  }

  getChains(): ReflectionChain[] {
    return [...this._chains];
  }

  get oscillationCount(): number {
    return this._oscillationCount;
  }

  get chainCount(): number {
    return this._chains.length;
  }
}
