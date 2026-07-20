import { DataPacket, PacketMeta } from '../shared/types';

export type StorageClassType = 'STANDARD' | 'STANDARD_IA' | 'GLACIER' | 'GLACIER_IR' | 'DEEP_ARCHIVE' | 'INTELLIGENT_TIERING';

export interface StorageBucket {
  name: string;
  region: string;
  size: number;
  storageClass: StorageClassType;
  versioningEnabled: boolean;
  encryptionEnabled: boolean;
  replicationEnabled: boolean;
  creationDate: number;
  tags: Record<string, string>;
}

export interface StorageObject {
  key: string;
  bucket: string;
  size: number;
  modified: number;
  etag: string;
  storageClass: StorageClassType;
  versionId?: string;
  contentType: string;
  contentEncoding?: string;
  metadata: Record<string, string>;
}

export interface LifecycleRule {
  id: string;
  prefix?: string;
  tags?: Record<string, string>;
  enabled: boolean;
  transition?: {
    days: number;
    storageClass: StorageClassType;
  }[];
  expiration?: {
    days: number;
  };
  noncurrentVersionExpiration?: {
    days: number;
  };
  abortIncompleteMultipartUpload?: {
    daysAfterInitiation: number;
  };
}

export interface CORSRule {
  id?: string;
  allowedOrigins: string[];
  allowedMethods: ('GET' | 'PUT' | 'POST' | 'DELETE' | 'HEAD')[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  maxAgeSeconds?: number;
}

export interface EncryptionConfig {
  enabled: boolean;
  sseAlgorithm: 'AES256' | 'KMS';
  kmsKeyId?: string;
}

export interface ReplicationRule {
  id: string;
  destinationBucket: string;
  destinationRegion: string;
  enabled: boolean;
  prefix?: string;
  tags?: Record<string, string>;
  deleteMarkerReplication?: boolean;
  status: 'ENABLED' | 'DISABLED';
}

export interface MultipartUpload {
  uploadId: string;
  bucket: string;
  key: string;
  parts: { partNumber: number; etag: string; size: number }[];
  initiated: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABORTED';
}

export interface StorageMetrics {
  totalSize: number;
  objectCount: number;
  bucketCount: number;
  classDistribution: Record<StorageClassType, number>;
  monthlyCost: number;
  dataTransferIn: number;
  dataTransferOut: number;
}

export interface SignedUrlOptions {
  operation: 'GET' | 'PUT' | 'DELETE';
  expiresInSeconds: number;
  contentType?: string;
  conditions?: { key: string; value: string }[];
}

export class CloudStorage {
  private _buckets: Map<string, StorageBucket> = new Map();
  private _objects: Map<string, StorageObject> = new Map();
  private _multipartUploads: Map<string, MultipartUpload> = new Map();
  private _lifecycleRules: Map<string, LifecycleRule[]> = new Map();
  private _corsRules: Map<string, CORSRule[]> = new Map();
  private _encryptionConfigs: Map<string, EncryptionConfig> = new Map();
  private _replicationRules: Map<string, ReplicationRule[]> = new Map();
  private _versionHistory: Map<string, StorageObject[]> = new Map();
  private _accessLogs: Map<string, { timestamp: number; action: string; user: string; result: string }[]> = new Map();
  private _counter = 0;

  createBucket(name: string, options: { 
    region?: string; 
    storageClass?: StorageClassType; 
    versioningEnabled?: boolean;
    tags?: Record<string, string>;
    encryptionEnabled?: boolean;
    replicationEnabled?: boolean;
  }): StorageBucket {
    const bucket: StorageBucket = {
      name,
      region: options.region || 'us-east-1',
      size: 0,
      storageClass: options.storageClass || 'STANDARD',
      versioningEnabled: options.versioningEnabled || false,
      encryptionEnabled: options.encryptionEnabled || false,
      replicationEnabled: options.replicationEnabled || false,
      creationDate: Date.now(),
      tags: options.tags || {},
    };
    this._buckets.set(name, bucket);
    this._lifecycleRules.set(name, []);
    this._corsRules.set(name, []);
    this._encryptionConfigs.set(name, {
      enabled: bucket.encryptionEnabled,
      sseAlgorithm: 'AES256',
    });
    this._replicationRules.set(name, []);
    this._accessLogs.set(name, []);
    this._logAccess(name, 'CREATE_BUCKET', 'system', 'success');
    return bucket;
  }

  getBucket(name: string): StorageBucket | null {
    return this._buckets.get(name) || null;
  }

  deleteBucket(name: string): boolean {
    const bucket = this._buckets.get(name);
    if (!bucket) return false;
    const objects = this.listFiles(name);
    if (objects.length > 0) {
      throw new Error(`Bucket ${name} is not empty`);
    }
    this._buckets.delete(name);
    this._lifecycleRules.delete(name);
    this._corsRules.delete(name);
    this._encryptionConfigs.delete(name);
    this._replicationRules.delete(name);
    this._accessLogs.delete(name);
    this._logAccess(name, 'DELETE_BUCKET', 'system', 'success');
    return true;
  }

  uploadFile(bucketName: string, content: unknown, key: string, options?: {
    contentType?: string;
    contentEncoding?: string;
    metadata?: Record<string, string>;
    storageClass?: StorageClassType;
    tags?: Record<string, string>;
  }): StorageObject {
    const bucket = this._buckets.get(bucketName);
    if (!bucket) throw new Error(`Bucket ${bucketName} not found`);

    const contentSize = typeof content === 'string' ? content.length : JSON.stringify(content).length;
    const versionId = bucket.versioningEnabled ? `v${++this._counter}` : undefined;
    
    const obj: StorageObject = {
      key,
      bucket: bucketName,
      size: contentSize,
      modified: Date.now(),
      etag: this._generateETag(content),
      storageClass: options?.storageClass || bucket.storageClass,
      versionId,
      contentType: options?.contentType || 'application/octet-stream',
      contentEncoding: options?.contentEncoding,
      metadata: options?.metadata || {},
    };

    const fullKey = `${bucketName}/${key}`;
    
    if (bucket.versioningEnabled) {
      const history = this._versionHistory.get(fullKey) || [];
      history.unshift(obj);
      this._versionHistory.set(fullKey, history);
    }

    this._objects.set(fullKey, obj);
    bucket.size += contentSize;
    this._logAccess(bucketName, 'UPLOAD_OBJECT', 'system', 'success');
    return obj;
  }

  downloadFile(bucketName: string, key: string, options?: { versionId?: string }): StorageObject | null {
    const fullKey = `${bucketName}/${key}`;
    
    if (options?.versionId) {
      const history = this._versionHistory.get(fullKey);
      if (!history) return null;
      return history.find(v => v.versionId === options.versionId) || null;
    }

    return this._objects.get(fullKey) || null;
  }

  deleteFile(bucketName: string, key: string): boolean {
    const fullKey = `${bucketName}/${key}`;
    const obj = this._objects.get(fullKey);
    if (!obj) return false;

    const bucket = this._buckets.get(bucketName);
    if (bucket) {
      bucket.size -= obj.size;
    }

    if (bucket?.versioningEnabled) {
      const history = this._versionHistory.get(fullKey) || [];
      history.push({ ...obj, modified: Date.now() });
      this._versionHistory.set(fullKey, history);
    }

    this._objects.delete(fullKey);
    this._logAccess(bucketName, 'DELETE_OBJECT', 'system', 'success');
    return true;
  }

  listFiles(bucketName: string, options?: { 
    prefix?: string; 
    delimiter?: string; 
    maxKeys?: number;
    continuationToken?: string;
  }): StorageObject[] {
    const result: StorageObject[] = [];
    let count = 0;
    const maxKeys = options?.maxKeys || 1000;

    for (const [path, obj] of this._objects.entries()) {
      if (path.startsWith(`${bucketName}/`)) {
        const relativePath = path.substring(bucketName.length + 1);
        
        if (options?.prefix && !relativePath.startsWith(options.prefix)) {
          continue;
        }

        if (options?.delimiter) {
          const delimiterIndex = relativePath.indexOf(options.delimiter);
          if (delimiterIndex !== -1 && delimiterIndex < relativePath.length - 1) {
            const prefix = relativePath.substring(0, delimiterIndex + options.delimiter.length);
            if (!result.find(o => o.key === prefix)) {
              result.push({
                key: prefix,
                bucket: bucketName,
                size: 0,
                modified: Date.now(),
                etag: '',
                storageClass: 'STANDARD',
                contentType: 'application/x-directory',
                metadata: {},
              });
              count++;
            }
            continue;
          }
        }

        if (count < maxKeys) {
          result.push(obj);
          count++;
        }
      }
    }

    return result;
  }

  copyFile(srcBucket: string, srcKey: string, dstBucket: string, dstKey: string, options?: {
    storageClass?: StorageClassType;
    metadataDirective?: 'COPY' | 'REPLACE';
    metadata?: Record<string, string>;
  }): StorageObject {
    const src = this._objects.get(`${srcBucket}/${srcKey}`);
    if (!src) throw new Error(`Source object ${srcBucket}/${srcKey} not found`);

    const dstBucketObj = this._buckets.get(dstBucket);
    if (!dstBucketObj) throw new Error(`Destination bucket ${dstBucket} not found`);

    const newObj: StorageObject = {
      key: dstKey,
      bucket: dstBucket,
      size: src.size,
      modified: Date.now(),
      etag: this._generateETag({ copiedFrom: `${srcBucket}/${srcKey}` }),
      storageClass: options?.storageClass || dstBucketObj.storageClass,
      contentType: src.contentType,
      contentEncoding: src.contentEncoding,
      metadata: options?.metadataDirective === 'REPLACE' 
        ? options?.metadata || {} 
        : { ...src.metadata, ...options?.metadata },
    };

    this._objects.set(`${dstBucket}/${dstKey}`, newObj);
    dstBucketObj.size += src.size;
    this._logAccess(dstBucket, 'COPY_OBJECT', 'system', 'success');
    return newObj;
  }

  moveFile(srcBucket: string, srcKey: string, dstBucket: string, dstKey: string): StorageObject {
    const copied = this.copyFile(srcBucket, srcKey, dstBucket, dstKey);
    this.deleteFile(srcBucket, srcKey);
    return copied;
  }

  initiateMultipartUpload(bucket: string, key: string, options?: {
    contentType?: string;
    storageClass?: StorageClassType;
    metadata?: Record<string, string>;
  }): MultipartUpload {
    const uploadId = `mp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const upload: MultipartUpload = {
      uploadId,
      bucket,
      key,
      parts: [],
      initiated: Date.now(),
      status: 'IN_PROGRESS',
    };
    this._multipartUploads.set(uploadId, upload);
    this._logAccess(bucket, 'INITIATE_MULTIPART_UPLOAD', 'system', 'success');
    return upload;
  }

  uploadPart(uploadId: string, partNumber: number, content: unknown): { partNumber: number; etag: string; size: number } {
    const upload = this._multipartUploads.get(uploadId);
    if (!upload || upload.status !== 'IN_PROGRESS') {
      throw new Error('Invalid or completed upload');
    }

    const contentSize = typeof content === 'string' ? content.length : JSON.stringify(content).length;
    const etag = this._generateETag(content);

    const existingPartIndex = upload.parts.findIndex(p => p.partNumber === partNumber);
    if (existingPartIndex >= 0) {
      upload.parts[existingPartIndex] = { partNumber, etag, size: contentSize };
    } else {
      upload.parts.push({ partNumber, etag, size: contentSize });
    }

    upload.parts.sort((a, b) => a.partNumber - b.partNumber);
    return { partNumber, etag, size: contentSize };
  }

  completeMultipartUpload(uploadId: string): StorageObject {
    const upload = this._multipartUploads.get(uploadId);
    if (!upload || upload.status !== 'IN_PROGRESS') {
      throw new Error('Invalid or completed upload');
    }

    if (upload.parts.length === 0) {
      throw new Error('No parts uploaded');
    }

    upload.status = 'COMPLETED';

    const bucket = this._buckets.get(upload.bucket);
    if (!bucket) throw new Error(`Bucket ${upload.bucket} not found`);

    const totalSize = upload.parts.reduce((sum, p) => sum + p.size, 0);
    const combinedETag = `"${upload.parts.map(p => p.etag).join('-')}"`;

    const obj: StorageObject = {
      key: upload.key,
      bucket: upload.bucket,
      size: totalSize,
      modified: Date.now(),
      etag: combinedETag,
      storageClass: bucket.storageClass,
      contentType: 'application/octet-stream',
      metadata: {},
    };

    this._objects.set(`${upload.bucket}/${upload.key}`, obj);
    bucket.size += totalSize;
    this._logAccess(upload.bucket, 'COMPLETE_MULTIPART_UPLOAD', 'system', 'success');
    return obj;
  }

  abortMultipartUpload(uploadId: string): void {
    const upload = this._multipartUploads.get(uploadId);
    if (!upload) return;
    upload.status = 'ABORTED';
    this._logAccess(upload.bucket, 'ABORT_MULTIPART_UPLOAD', 'system', 'success');
  }

  listMultipartUploads(bucket: string): MultipartUpload[] {
    return Array.from(this._multipartUploads.values())
      .filter(u => u.bucket === bucket && u.status === 'IN_PROGRESS');
  }

  setLifecycleRules(bucket: string, rules: LifecycleRule[]): void {
    this._lifecycleRules.set(bucket, rules);
    this._logAccess(bucket, 'SET_LIFECYCLE_RULES', 'system', 'success');
  }

  getLifecycleRules(bucket: string): LifecycleRule[] {
    return this._lifecycleRules.get(bucket) || [];
  }

  applyLifecycleRules(): void {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (const [bucketName, rules] of this._lifecycleRules.entries()) {
      for (const rule of rules) {
        if (!rule.enabled) continue;

        const objects = this.listFiles(bucketName, { prefix: rule.prefix });

        for (const obj of objects) {
          const ageDays = (now - obj.modified) / dayMs;

          if (rule.transition) {
            for (const transition of rule.transition) {
              if (ageDays >= transition.days && obj.storageClass !== transition.storageClass) {
                this._transitionObject(bucketName, obj.key, transition.storageClass);
              }
            }
          }

          if (rule.expiration && ageDays >= rule.expiration.days) {
            this.deleteFile(bucketName, obj.key);
          }
        }
      }
    }
  }

  private _transitionObject(bucket: string, key: string, targetClass: StorageClassType): void {
    const fullKey = `${bucket}/${key}`;
    const obj = this._objects.get(fullKey);
    if (!obj) return;

    obj.storageClass = targetClass;
    obj.modified = Date.now();
    this._logAccess(bucket, 'TRANSITION_OBJECT', 'system', 'success');
  }

  setCorsRules(bucket: string, rules: CORSRule[]): void {
    this._corsRules.set(bucket, rules);
    this._logAccess(bucket, 'SET_CORS_RULES', 'system', 'success');
  }

  getCorsRules(bucket: string): CORSRule[] {
    return this._corsRules.get(bucket) || [];
  }

  validateCorsRequest(bucket: string, origin: string, method: string): boolean {
    const rules = this._corsRules.get(bucket);
    if (!rules || rules.length === 0) return false;

    return rules.some(rule => {
      const originMatch = rule.allowedOrigins.includes(origin) || 
        rule.allowedOrigins.includes('*') ||
        rule.allowedOrigins.some(o => o.includes('*') && origin.startsWith(o.replace('*', '')));
      const methodMatch = rule.allowedMethods.includes(method as any);
      return originMatch && methodMatch;
    });
  }

  setEncryptionConfig(bucket: string, config: EncryptionConfig): void {
    this._encryptionConfigs.set(bucket, config);
    const bucketObj = this._buckets.get(bucket);
    if (bucketObj) {
      bucketObj.encryptionEnabled = config.enabled;
    }
    this._logAccess(bucket, 'SET_ENCRYPTION_CONFIG', 'system', 'success');
  }

  getEncryptionConfig(bucket: string): EncryptionConfig {
    return this._encryptionConfigs.get(bucket) || { enabled: false, sseAlgorithm: 'AES256' };
  }

  configureReplication(bucket: string, rules: ReplicationRule[]): void {
    this._replicationRules.set(bucket, rules);
    const bucketObj = this._buckets.get(bucket);
    if (bucketObj) {
      bucketObj.replicationEnabled = rules.some(r => r.enabled);
    }
    this._logAccess(bucket, 'SET_REPLICATION_RULES', 'system', 'success');
  }

  getReplicationRules(bucket: string): ReplicationRule[] {
    return this._replicationRules.get(bucket) || [];
  }

  executeReplication(): void {
    for (const [sourceBucket, rules] of this._replicationRules.entries()) {
      for (const rule of rules) {
        if (!rule.enabled) continue;

        const objects = this.listFiles(sourceBucket, { prefix: rule.prefix });
        for (const obj of objects) {
          const dstKey = rule.prefix ? obj.key.replace(rule.prefix, '') : obj.key;
          try {
            this.copyFile(sourceBucket, obj.key, rule.destinationBucket, dstKey, {
              storageClass: obj.storageClass,
              metadataDirective: 'COPY',
            });
            this._logAccess(sourceBucket, 'REPLICATE_OBJECT', 'system', 'success');
          } catch {
            this._logAccess(sourceBucket, 'REPLICATE_OBJECT', 'system', 'failed');
          }
        }
      }
    }
  }

  signedUrl(bucket: string, key: string, options: SignedUrlOptions): { url: string; expiration: number } {
    const timestamp = Date.now();
    const expiration = timestamp + options.expiresInSeconds * 1000;
    
    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `accesskey/${new Date(timestamp).toISOString().split('T')[0]}/us-east-1/s3/aws4_request`,
      'X-Amz-Date': new Date(timestamp).toISOString().replace(/[:\-]|\.\d{3}/g, ''),
      'X-Amz-Expires': options.expiresInSeconds.toString(),
      'X-Amz-SignedHeaders': 'host',
      'X-Amz-Signature': 'generated-signature',
    });

    if (options.contentType) {
      queryParams.set('Content-Type', options.contentType);
    }

    const url = `https://${bucket}.s3.amazonaws.com/${encodeURIComponent(key)}?${queryParams.toString()}`;
    this._logAccess(bucket, 'GENERATE_SIGNED_URL', 'system', 'success');
    return { url, expiration };
  }

  generatePresignedPost(bucket: string, key: string, options: {
    expiresInSeconds: number;
    conditions?: { key: string; value: string }[];
    fields?: Record<string, string>;
  }): { url: string; fields: Record<string, string> } {
    const fields: Record<string, string> = {
      'key': key,
      'AWSAccessKeyId': 'accesskey',
      'policy': 'base64-encoded-policy',
      'signature': 'generated-signature',
      ...options.fields,
    };

    return {
      url: `https://${bucket}.s3.amazonaws.com/`,
      fields,
    };
  }

  getObjectVersionHistory(bucket: string, key: string): StorageObject[] {
    return this._versionHistory.get(`${bucket}/${key}`) || [];
  }

  restoreObject(bucket: string, key: string, options?: {
    days?: number;
    tier?: 'STANDARD' | 'EXPEDITED' | 'BULK';
  }): { status: string; restoreExpiry?: number } {
    const obj = this._objects.get(`${bucket}/${key}`);
    if (!obj) throw new Error(`Object ${key} not found`);

    if (!['GLACIER', 'GLACIER_IR', 'DEEP_ARCHIVE'].includes(obj.storageClass)) {
      return { status: 'Already restored' };
    }

    const restoreDays = options?.days || 7;
    const restoreExpiry = Date.now() + restoreDays * 24 * 60 * 60 * 1000;

    this._logAccess(bucket, 'RESTORE_OBJECT', 'system', 'success');
    return { 
      status: options?.tier === 'EXPEDITED' ? 'Restoring (Expedited)' : 
              options?.tier === 'BULK' ? 'Restoring (Bulk)' : 'Restoring (Standard)',
      restoreExpiry,
    };
  }

  getMetrics(bucket?: string): StorageMetrics {
    let filteredBuckets = Array.from(this._buckets.values());
    let filteredObjects = Array.from(this._objects.values());

    if (bucket) {
      filteredBuckets = filteredBuckets.filter(b => b.name === bucket);
      filteredObjects = filteredObjects.filter(o => o.bucket === bucket);
    }

    const classDistribution: Record<StorageClassType, number> = {
      STANDARD: 0,
      STANDARD_IA: 0,
      GLACIER: 0,
      GLACIER_IR: 0,
      DEEP_ARCHIVE: 0,
      INTELLIGENT_TIERING: 0,
    };

    for (const obj of filteredObjects) {
      classDistribution[obj.storageClass] += obj.size;
    }

    const classCosts: Record<StorageClassType, number> = {
      STANDARD: 0.023,
      STANDARD_IA: 0.004,
      GLACIER: 0.003,
      GLACIER_IR: 0.004,
      DEEP_ARCHIVE: 0.00099,
      INTELLIGENT_TIERING: 0.025,
    };

    let monthlyCost = 0;
    for (const [cls, size] of Object.entries(classDistribution)) {
      monthlyCost += (size / 1024 / 1024 / 1024) * classCosts[cls as StorageClassType];
    }

    monthlyCost += filteredBuckets.length * 0.005;

    return {
      totalSize: filteredObjects.reduce((sum, o) => sum + o.size, 0),
      objectCount: filteredObjects.length,
      bucketCount: filteredBuckets.length,
      classDistribution,
      monthlyCost: Math.round(monthlyCost * 100) / 100,
      dataTransferIn: 0,
      dataTransferOut: 0,
    };
  }

  recommendStorageClass(object: { size: number; accessFrequency: 'frequent' | 'infrequent' | 'rare' }): StorageClassType {
    if (object.size < 128 * 1024) {
      return 'INTELLIGENT_TIERING';
    }

    switch (object.accessFrequency) {
      case 'frequent':
        return 'STANDARD';
      case 'infrequent':
        return 'STANDARD_IA';
      case 'rare':
        return object.size < 100 * 1024 * 1024 ? 'GLACIER_IR' : 'DEEP_ARCHIVE';
      default:
        return 'INTELLIGENT_TIERING';
    }
  }

  optimizeStorageCost(): { savings: number; recommendations: string[] } {
    const recommendations: string[] = [];
    let potentialSavings = 0;

    for (const [bucketName, objects] of this._objects.entries()) {
      const obj = objects as StorageObject;
      const currentCost = this._getStorageCost(obj.storageClass, obj.size);
      const recommendedClass = this.recommendStorageClass({
        size: obj.size,
        accessFrequency: 'infrequent',
      });
      const recommendedCost = this._getStorageCost(recommendedClass, obj.size);

      if (recommendedCost < currentCost && obj.storageClass !== recommendedClass) {
        potentialSavings += currentCost - recommendedCost;
        recommendations.push(`Move ${bucketName} to ${recommendedClass} (saves $${(currentCost - recommendedCost).toFixed(2)}/month)`);
      }
    }

    return { 
      savings: Math.round(potentialSavings * 100) / 100, 
      recommendations 
    };
  }

  private _getStorageCost(storageClass: StorageClassType, sizeBytes: number): number {
    const classCosts: Record<StorageClassType, number> = {
      STANDARD: 0.023,
      STANDARD_IA: 0.004,
      GLACIER: 0.003,
      GLACIER_IR: 0.004,
      DEEP_ARCHIVE: 0.00099,
      INTELLIGENT_TIERING: 0.025,
    };
    return (sizeBytes / 1024 / 1024 / 1024) * classCosts[storageClass];
  }

  private _generateETag(content: unknown): string {
    const str = typeof content === 'string' ? content : JSON.stringify(content);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `\"${Math.abs(hash).toString(16)}\"`;
  }

  private _logAccess(bucket: string, action: string, user: string, result: string): void {
    const logs = this._accessLogs.get(bucket) || [];
    logs.push({ timestamp: Date.now(), action, user, result });
    if (logs.length > 1000) {
      logs.shift();
    }
    this._accessLogs.set(bucket, logs);
  }

  getAccessLogs(bucket: string, options?: { 
    startTime?: number; 
    endTime?: number;
    action?: string;
    user?: string;
  }): { timestamp: number; action: string; user: string; result: string }[] {
    let logs = this._accessLogs.get(bucket) || [];

    if (options?.startTime) {
      logs = logs.filter(l => l.timestamp >= options.startTime);
    }
    if (options?.endTime) {
      logs = logs.filter(l => l.timestamp <= options.endTime);
    }
    if (options?.action) {
      logs = logs.filter(l => l.action === options.action);
    }
    if (options?.user) {
      logs = logs.filter(l => l.user === options.user);
    }

    return logs;
  }

  enableAccessLogging(bucket: string, targetBucket: string, targetPrefix: string = ''): void {
    const target = this._buckets.get(targetBucket);
    if (!target) throw new Error(`Target bucket ${targetBucket} not found`);
    
    const bucketObj = this._buckets.get(bucket);
    if (bucketObj) {
      bucketObj.tags['logging-enabled'] = 'true';
      bucketObj.tags['logging-target'] = `${targetBucket}/${targetPrefix}`;
    }
    this._logAccess(bucket, 'ENABLE_ACCESS_LOGGING', 'system', 'success');
  }

  disableAccessLogging(bucket: string): void {
    const bucketObj = this._buckets.get(bucket);
    if (bucketObj) {
      delete bucketObj.tags['logging-enabled'];
      delete bucketObj.tags['logging-target'];
    }
    this._logAccess(bucket, 'DISABLE_ACCESS_LOGGING', 'system', 'success');
  }

  inventoryReport(bucket: string, options?: {
    frequency?: 'DAILY' | 'WEEKLY';
    format?: 'CSV' | 'ORC' | 'Parquet';
    includedObjectVersions?: 'ALL' | 'CURRENT';
    optionalFields?: ('Size' | 'LastModifiedDate' | 'StorageClass' | 'ETag' | 'IsMultipartUploaded')[];
  }): { reportId: string; status: string; scheduledAt: number } {
    const reportId = `inventory-${bucket}-${Date.now()}`;
    this._logAccess(bucket, 'GENERATE_INVENTORY_REPORT', 'system', 'success');
    return {
      reportId,
      status: 'SCHEDULED',
      scheduledAt: Date.now() + (options?.frequency === 'DAILY' ? 24 : 168) * 60 * 60 * 1000,
    };
  }

  metricsReport(bucket: string, options?: {
    period?: '5MIN' | '1H' | '1D';
    startTime?: number;
    endTime?: number;
  }): { reportId: string; data: StorageMetrics; generatedAt: number } {
    const reportId = `metrics-${bucket}-${Date.now()}`;
    return {
      reportId,
      data: this.getMetrics(bucket),
      generatedAt: Date.now(),
    };
  }

  toPacket(): DataPacket<{
    buckets: Map<string, StorageBucket>;
    objects: Map<string, StorageObject>;
    metrics: StorageMetrics;
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
        metrics: this.getMetrics(),
      },
      metadata,
    };
  }

  reset(): void {
    this._buckets = new Map();
    this._objects = new Map();
    this._multipartUploads = new Map();
    this._lifecycleRules = new Map();
    this._corsRules = new Map();
    this._encryptionConfigs = new Map();
    this._replicationRules = new Map();
    this._versionHistory = new Map();
    this._accessLogs = new Map();
    this._counter = 0;
  }

  get bucketCount(): number { return this._buckets.size; }
  get objectCount(): number { return this._objects.size; }
  get activeMultipartUploads(): number { 
    return Array.from(this._multipartUploads.values()).filter(u => u.status === 'IN_PROGRESS').length;
  }
  get totalStorageSize(): number { 
    return Array.from(this._buckets.values()).reduce((sum, b) => sum + b.size, 0);
  }
}