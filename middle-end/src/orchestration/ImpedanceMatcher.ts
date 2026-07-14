export type ImpedanceProfile = {
  bandwidth: number;
  latency: number;
  packetSize: number;
  compressionRatio: number;
  protocol: 'http' | 'grpc' | 'websocket';
};

export type MatcherResult = {
  matched: boolean;
  sourceProfile: ImpedanceProfile;
  targetProfile: ImpedanceProfile;
  transformationRatio: number;
  adjustedLatency: number;
};

export class ImpedanceMatcher {
  private sourceProfile: ImpedanceProfile = {
    bandwidth: 100,
    latency: 50,
    packetSize: 1024,
    compressionRatio: 1,
    protocol: 'http',
  };

  private targetProfile: ImpedanceProfile = {
    bandwidth: 100,
    latency: 50,
    packetSize: 1024,
    compressionRatio: 1,
    protocol: 'http',
  };

  setSourceProfile(profile: Partial<ImpedanceProfile>): void {
    this.sourceProfile = { ...this.sourceProfile, ...profile };
  }

  setTargetProfile(profile: Partial<ImpedanceProfile>): void {
    this.targetProfile = { ...this.targetProfile, ...profile };
  }

  match(): MatcherResult {
    const bandwidthRatio = this.sourceProfile.bandwidth / this.targetProfile.bandwidth;
    const latencyRatio = this.sourceProfile.latency / this.targetProfile.latency;
    const packetRatio = this.sourceProfile.packetSize / this.targetProfile.packetSize;

    const transformationRatio = (bandwidthRatio + latencyRatio + packetRatio) / 3;
    const adjustedLatency = this.sourceProfile.latency * (1 + Math.abs(transformationRatio - 1));

    return {
      matched: Math.abs(transformationRatio - 1) < 0.2,
      sourceProfile: { ...this.sourceProfile },
      targetProfile: { ...this.targetProfile },
      transformationRatio,
      adjustedLatency,
    };
  }

  transform(data: unknown): unknown {
    const result = this.match();
    
    if (result.matched) return data;

    const serialized = JSON.stringify(data);
    const compressed = this.compress(serialized, result.transformationRatio);
    return JSON.parse(compressed);
  }

  private compress(data: string, ratio: number): string {
    if (ratio > 1) {
      return data.slice(0, Math.floor(data.length / ratio));
    }
    return data.repeat(Math.ceil(ratio));
  }

  adaptProtocol(): void {
    if (this.sourceProfile.protocol !== this.targetProfile.protocol) {
      this.sourceProfile.protocol = this.targetProfile.protocol;
    }
  }

  optimizeBandwidth(): number {
    const optimalBandwidth = Math.min(this.sourceProfile.bandwidth, this.targetProfile.bandwidth);
    this.sourceProfile.bandwidth = optimalBandwidth;
    return optimalBandwidth;
  }

  getMismatchScore(): number {
    const result = this.match();
    return Math.abs(result.transformationRatio - 1) * 100;
  }
}