import { DataPacket, PacketMeta } from '../shared/types';

export interface StorageBucket {
  name: string;
  region: string;
  size: number;
  class: string;
}

export interface StorageObject {
  key: string;
  size: number;
  modified: number;
  etag: string;
}

export class CloudStorage {
  private _buckets: Map<string, StorageBucket> = new Map();
  private _objects: Map<string, StorageObject> = new Map();
  private _counter = 0;

  createBucket(name: string, options: { region: string; class: string }): StorageBucket {
    const bucket: StorageBucket = {
      name,
      region: options.region || 'us-east-1',
      size: 0,
      class: options.class || 'standard',
    };
    this._buckets.set(name, bucket);
    return bucket;
  }

  uploadFile(bucket: string, file: unknown, key: string): StorageObject {
    const obj: StorageObject = {
      key,
      size: 1024,
      modified: Date.now(),
      etag: `etag-${++this._counter}`,
    };
    this._objects.set(`${bucket}/${key}`, obj);
    return obj;
  }

  downloadFile(bucket: string, key: string): unknown | null {
    const obj = this._objects.get(`${bucket}/${key}`);
    return obj ? { ...obj, content: 'file_content' } : null;
  }

  deleteFile(bucket: string, key: string): boolean {
    return this._objects.delete(`${bucket}/${key}`);
  }

  listFiles(bucket: string, prefix: string = ''): StorageObject[] {
    const result: StorageObject[] = [];
    for (const [path, obj] of this._objects.entries()) {
      if (path.startsWith(`${bucket}/${prefix}`)) {
        result.push(obj);
      }
    }
    return result;
  }

  copyFile(srcBucket: string, srcKey: string, dstBucket: string, dstKey: string): StorageObject {
    const src = this._objects.get(`${srcBucket}/${srcKey}`);
    const obj: StorageObject = {
      key: dstKey,
      size: src?.size || 1024,
      modified: Date.now(),
      etag: `etag-${++this._counter}`,
    };
    this._objects.set(`${dstBucket}/${dstKey}`, obj);
    return obj;
  }

  lifecyclePolicy(bucket: string, rules: Record<string, unknown>[]): { bucket: string; rules: Record<string, unknown>[] } {
    return { bucket, rules };
  }

  storageClass(bucket: string, storageClass: string): { bucket: string; class: string } {
    return { bucket, class: storageClass };
  }

  bucketPolicy(bucket: string, policy: Record<string, unknown>): { bucket: string; policy: Record<string, unknown> } {
    return { bucket, policy };
  }

  corsConfiguration(bucket: string, rules: Record<string, unknown>[]): { bucket: string; cors: Record<string, unknown>[] } {
    return { bucket, cors: rules };
  }

  versioning(bucket: string, enable: boolean): { bucket: string; versioning: boolean; status: string } {
    return { bucket, versioning: enable, status: enable ? 'Enabled' : 'Suspended' };
  }

  encryption(bucket: string, key: string): { bucket: string; encryption: string; key: string } {
    return { bucket, encryption: 'SSE-KMS', key };
  }

  replication(source: string, destination: string): { source: string; destination: string; status: string } {
    return { source, destination, status: 'Enabled' };
  }

  dataTransfer(method: string, size: number): { method: string; size: number; time: number; cost: number } {
    const speed = method === 's3transfer' ? 100 : 10;
    return { method, size, time: size / speed, cost: size * 0.01 };
  }

  signedUrl(bucket: string, key: string, expiration: number): { url: string; expiration: number } {
    return {
      url: `https://${bucket}.s3.amazonaws.com/${key}?signature=xxx&expires=${Date.now() + expiration}`,
      expiration,
    };
  }

  toPacket(): DataPacket<{
    buckets: Map<string, StorageBucket>;
    objects: Map<string, StorageObject>;
  }> {
    const metadata: PacketMeta = {
      createdAt: Date.now(),
      route: ['cloud_computing', 'CloudStorage'],
      priority: 1,
      phase: 'cloud_storage',
    };
    return {
      id: `cloud-storage-${Date.now().toString(36)}`,
      payload: {
        buckets: this._buckets,
        objects: this._objects,
      },
      metadata,
    };
  }

  reset(): void {
    this._buckets = new Map();
    this._objects = new Map();
    this._counter = 0;
  }

  get bucketCount(): number { return this._buckets.size; }
  get objectCount(): number { return this._objects.size; }
}
