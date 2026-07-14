/**
 * 拉康之镜：通过镜像认识虚假的自我，进入象征界。
 * 模拟拉康的镜像理论，通过镜像构建的"自我"是虚幻的整体，最终引导主体进入象征秩序。
 */

export type OrderRealm = 'real' | 'imaginary' | 'symbolic';

export interface MirrorImage {
  id: string;
  perceivedSelf: Record<string, unknown>;
  isWhole: boolean;
  isIllusory: boolean;
  capturedAt: number;
}

export interface SymbolicEntry {
  imageId: string;
  realm: OrderRealm;
  signifier: string;
  meaningAssigned: string;
  enteredAt: number;
}

export class LacanMirror {
  private _images: MirrorImage[] = [];
  private _symbolicEntries: SymbolicEntry[] = [];
  private _currentRealm: OrderRealm = 'real';
  private _signifierChain: string[] = [];

  gaze(perceived: Record<string, unknown>): MirrorImage {
    const isWhole = perceived.whole === true || perceived.complete === true;
    const isIllusory = isWhole;
    const image: MirrorImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      perceivedSelf: { ...perceived },
      isWhole,
      isIllusory,
      capturedAt: Date.now(),
    };
    this._images.push(image);
    if (this._images.length > 100) this._images.shift();

    if (this._currentRealm === 'real' && isIllusory) {
      this._currentRealm = 'imaginary';
    }
    return image;
  }

  enterSymbolic(imageId: string, signifier: string, meaning: string): SymbolicEntry | null {
    const image = this._images.find(i => i.id === imageId);
    if (!image) return null;
    this._currentRealm = 'symbolic';
    this._signifierChain.push(signifier);

    const entry: SymbolicEntry = {
      imageId,
      realm: 'symbolic',
      signifier,
      meaningAssigned: meaning,
      enteredAt: Date.now(),
    };
    this._symbolicEntries.push(entry);
    if (this._symbolicEntries.length > 100) this._symbolicEntries.shift();
    return entry;
  }

  traverseSignifier(meaning: string): string[] {
    const chain: string[] = [];
    let current = meaning;
    for (const signifier of this._signifierChain) {
      chain.push(`${signifier} -> ${current}`);
      current = signifier;
    }
    return chain;
  }

  revealIllusion(imageId: string): boolean {
    const image = this._images.find(i => i.id === imageId);
    if (!image) return false;
    image.isIllusory = true;
    return true;
  }

  getImages(): MirrorImage[] {
    return [...this._images];
  }

  getSymbolicEntries(): SymbolicEntry[] {
    return [...this._symbolicEntries];
  }

  get currentRealm(): OrderRealm {
    return this._currentRealm;
  }

  get signifierChainLength(): number {
    return this._signifierChain.length;
  }
}
