import { DataPacket } from '../shared/types';

export interface File {
  readonly name: string;
  readonly size: number;
  readonly permissions: string;
  readonly created: number;
  readonly modified: number;
  readonly accessed: number;
  readonly path: string;
  readonly inode: number;
  readonly owner: string;
  readonly group: string;
  readonly links: number;
}

export interface Directory {
  readonly name: string;
  readonly path: string;
  readonly files: File[];
  readonly directories: Directory[];
  readonly created: number;
  readonly modified: number;
  readonly inode: number;
  readonly owner: string;
  readonly permissions: string;
}

export interface Inode {
  readonly inode: number;
  readonly type: 'file' | 'directory' | 'symlink' | 'device';
  readonly permissions: string;
  readonly owner: number;
  readonly group: number;
  readonly size: number;
  readonly blocks: number[];
  readonly atime: number;
  readonly mtime: number;
  readonly ctime: number;
  readonly links: number;
}

export interface SuperBlock {
  readonly magic: number;
  readonly blockSize: number;
  readonly totalBlocks: number;
  readonly freeBlocks: number;
  readonly totalInodes: number;
  readonly freeInodes: number;
  readonly blockGroupCount: number;
  readonly inodeSize: number;
  readonly lastMountTime: number;
  readonly lastWriteTime: number;
  readonly mountedReadOnly: boolean;
}

export interface JournalEntry {
  readonly transactionId: number;
  readonly operation: 'write' | 'delete' | 'rename' | 'create';
  readonly path: string;
  readonly data: string;
  readonly timestamp: number;
  readonly committed: boolean;
}

export interface MountPoint {
  readonly device: string;
  readonly mountPoint: string;
  readonly fsType: string;
  readonly options: string[];
  readonly mountedAt: number;
  readonly readOnly: boolean;
}

export interface Quota {
  readonly userId: number;
  readonly blockLimit: number;
  readonly blockUsed: number;
  readonly inodeLimit: number;
  readonly inodeUsed: number;
}

export class FileSystem {
  private _files: Map<string, File> = new Map();
  private _directories: Map<string, Directory> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _rootPath = '/';
  private _inodes: Map<number, Inode> = new Map();
  private _nextInode = 1;
  private _superBlock: SuperBlock = this._createSuperBlock();
  private _journal: JournalEntry[] = [];
  private _mountPoints: Map<string, MountPoint> = new Map();
  private _quotas: Map<number, Quota> = new Map();
  private _blockBitmap: boolean[] = [];
  private _inodeBitmap: boolean[] = [];
  private _fileDescriptors: Map<number, { path: string; mode: 'r' | 'w' | 'rw'; offset: number }> = new Map();
  private _nextFD = 3;

  get fileCount(): number {
    return this._files.size;
  }

  get directoryCount(): number {
    return this._directories.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  get inodeCount(): number {
    return this._inodes.size;
  }

  get freeBlocks(): number {
    return this._superBlock.freeBlocks;
  }

  get mountedFileSystems(): number {
    return this._mountPoints.size;
  }

  public createFile(path: string, content: string, permissions: string = 'rw-r--r--'): { file: File; path: string; size: number; inode: number; created: boolean } {
    const now = Date.now();
    const inode = this._allocateInode('file');
    const file: File = {
      name: path.split('/').pop() ?? 'file',
      size: content.length,
      permissions,
      created: now,
      modified: now,
      accessed: now,
      path,
      inode,
      owner: 'root',
      group: 'root',
      links: 1,
    };
    this._files.set(path, file);
    this._updateInode(inode, { size: content.length, mtime: now });
    this._recordHistory(`createFile(path=${path}, size=${content.length}, inode=${inode})`);
    return { file, path, size: content.length, inode, created: true };
  }

  public readFile(path: string): { content: string; file: File | null; size: number; inode: number; read: boolean } {
    const file = this._files.get(path) ?? null;
    const content = file ? 'file content here' : '';
    if (file) {
      this._files.set(path, { ...file, accessed: Date.now() });
      this._updateInode(file.inode, { atime: Date.now() });
    }
    this._recordHistory(`readFile(path=${path}) -> ${file ? 'ok' : 'not found'}`);
    return { content, file, size: content.length, inode: file?.inode ?? -1, read: !!file };
  }

  public writeFile(path: string, data: string, append: boolean = false): { written: number; path: string; modified: number; inode: number; success: boolean } {
    const file = this._files.get(path);
    const now = Date.now();
    let written = data.length;
    
    if (file) {
      const newSize = append ? file.size + data.length : data.length;
      this._files.set(path, { ...file, size: newSize, modified: now, accessed: now });
      this._updateInode(file.inode, { size: newSize, mtime: now });
    } else {
      this.createFile(path, data);
    }
    
    this._recordHistory(`writeFile(path=${path}, size=${data.length}, append=${append})`);
    return { written, path, modified: now, inode: file?.inode ?? -1, success: true };
  }

  public deleteFile(path: string): { deleted: boolean; path: string; freed: number; inode: number; success: boolean } {
    const file = this._files.get(path);
    const deleted = this._files.has(path);
    const freed = file?.size ?? 0;
    const inode = file?.inode ?? -1;
    
    if (deleted) {
      this._files.delete(path);
      this._deallocateInode(inode);
      this._journalCommit('delete', path, '');
    }
    
    this._recordHistory(`deleteFile(path=${path}) -> ${deleted}`);
    return { deleted, path, freed, inode, success: deleted };
  }

  public renameFile(oldPath: string, newPath: string): { renamed: boolean; oldPath: string; newPath: string; inode: number; success: boolean } {
    const file = this._files.get(oldPath);
    const renamed = !!file;
    
    if (file) {
      this._files.delete(oldPath);
      this._files.set(newPath, { ...file, path: newPath, name: newPath.split('/').pop() ?? 'file', modified: Date.now() });
      this._updateInode(file.inode, { mtime: Date.now() });
      this._journalCommit('rename', oldPath, newPath);
    }
    
    this._recordHistory(`renameFile(${oldPath} -> ${newPath})`);
    return { renamed, oldPath, newPath, inode: file?.inode ?? -1, success: renamed };
  }

  public createDirectory(path: string, permissions: string = 'rwxr-xr-x'): { path: string; created: boolean; name: string; inode: number; success: boolean } {
    const now = Date.now();
    const inode = this._allocateInode('directory');
    const dir: Directory = {
      name: path.split('/').pop() ?? 'dir',
      path,
      files: [],
      directories: [],
      created: now,
      modified: now,
      inode,
      owner: 'root',
      permissions,
    };
    this._directories.set(path, dir);
    this._recordHistory(`createDirectory(path=${path}, inode=${inode})`);
    return { path, created: true, name: dir.name, inode, success: true };
  }

  public listDirectory(path: string): { files: string[]; directories: string[]; path: string; totalEntries: number; inode: number } {
    const dir = this._directories.get(path);
    const files = dir ? dir.files.map(f => f.name) : [];
    const directories = dir ? dir.directories.map(d => d.name) : [];
    this._recordHistory(`listDirectory(path=${path}) -> ${files.length + directories.length} entries`);
    return { files, directories, path, totalEntries: files.length + directories.length, inode: dir?.inode ?? -1 };
  }

  public deleteDirectory(path: string, recursive: boolean): { deleted: boolean; path: string; removed: number; inode: number; success: boolean } {
    const dir = this._directories.get(path);
    const deleted = !!dir;
    let removed = 0;
    
    if (deleted) {
      if (recursive) {
        const filesToDelete = dir.files.map(f => f.path);
        const dirsToDelete = dir.directories.map(d => d.path);
        filesToDelete.forEach(p => this.deleteFile(p));
        dirsToDelete.forEach(p => this.deleteDirectory(p, true));
        removed = filesToDelete.length + dirsToDelete.length;
      }
      this._directories.delete(path);
      this._deallocateInode(dir.inode);
    }
    
    this._recordHistory(`deleteDirectory(path=${path}, recursive=${recursive}) -> ${deleted}, removed=${removed}`);
    return { deleted, path, removed: recursive ? removed + 1 : 1, inode: dir?.inode ?? -1, success: deleted };
  }

  public filePermissions(path: string, mode: string): { path: string; mode: string; changed: boolean; inode: number; success: boolean } {
    const file = this._files.get(path);
    const changed = !!file;
    
    if (file) {
      this._files.set(path, { ...file, permissions: mode });
      this._updateInode(file.inode, { permissions: mode });
    }
    
    this._recordHistory(`chmod(${path}, ${mode})`);
    return { path, mode, changed, inode: file?.inode ?? -1, success: changed };
  }

  public fileOwnership(path: string, owner: string, group: string): { path: string; owner: string; group: string; changed: boolean; inode: number; success: boolean } {
    const file = this._files.get(path);
    const changed = !!file;
    
    if (file) {
      this._files.set(path, { ...file, owner, group });
      this._updateInode(file.inode, { owner: 0, group: 0 });
    }
    
    this._recordHistory(`chown(${path}, ${owner}:${group})`);
    return { path, owner, group, changed, inode: file?.inode ?? -1, success: changed };
  }

  public inodeInfo(inodeNumber: number): { inode: Inode | null; found: boolean; blocks: number; size: number } {
    const inode = this._inodes.get(inodeNumber) ?? null;
    this._recordHistory(`inodeInfo(number=${inodeNumber}) -> ${inode ? 'found' : 'not found'}`);
    return { inode, found: !!inode, blocks: inode?.blocks.length ?? 0, size: inode?.size ?? 0 };
  }

  public superblockInfo(filesystem: string): SuperBlock {
    this._recordHistory(`superblockInfo(fs=${filesystem})`);
    return { ...this._superBlock };
  }

  public journaling(journal: string, operation: string, path: string, data: string): { journal: string; operation: string; committed: boolean; transactionId: number } {
    const transactionId = this._counter;
    const entry: JournalEntry = {
      transactionId,
      operation: operation as JournalEntry['operation'],
      path,
      data,
      timestamp: Date.now(),
      committed: false,
    };
    this._journal.push(entry);
    
    if (Math.random() > 0.1) {
      entry.committed = true;
    }
    
    this._recordHistory(`journaling(journal=${journal}, op=${operation}, tx=${transactionId}) -> committed=${entry.committed}`);
    return { journal, operation, committed: entry.committed, transactionId };
  }

  public journalCommit(operation: string, path: string, data: string): { committed: boolean; transactionId: number; entries: number } {
    const entry: JournalEntry = {
      transactionId: this._counter,
      operation: operation as JournalEntry['operation'],
      path,
      data,
      timestamp: Date.now(),
      committed: true,
    };
    this._journal.push(entry);
    this._recordHistory(`journalCommit(op=${operation}, path=${path}, tx=${entry.transactionId})`);
    return { committed: true, transactionId: entry.transactionId, entries: this._journal.length };
  }

  public journalRecover(): { recovered: number; corrupted: number; success: boolean } {
    const corrupted = this._journal.filter(e => !e.committed).length;
    const recovered = this._journal.length - corrupted;
    this._journal = this._journal.filter(e => e.committed);
    this._recordHistory(`journalRecover() -> recovered=${recovered}, corrupted=${corrupted}`);
    return { recovered, corrupted, success: corrupted === 0 };
  }

  public fsck(filesystem: string, fix: boolean = false): { filesystem: string; errors: number; fixed: number; clean: boolean; repairedInodes: number; repairedBlocks: number } {
    const errors = Math.floor(Math.random() * 5);
    const fixed = fix ? errors : 0;
    const clean = errors === 0;
    const repairedInodes = fix ? Math.floor(errors * 0.4) : 0;
    const repairedBlocks = fix ? Math.floor(errors * 0.6) : 0;
    
    if (fix) {
      this._superBlock = { ...this._superBlock, lastMountTime: Date.now() };
    }
    
    this._recordHistory(`fsck(${filesystem}, fix=${fix}) -> errors=${errors}, fixed=${fixed}`);
    return { filesystem, errors, fixed, clean, repairedInodes, repairedBlocks };
  }

  public symbolicLink(target: string, link: string): { link: string; target: string; created: boolean; inode: number; success: boolean } {
    const inode = this._allocateInode('symlink');
    this._recordHistory(`symlink(${target} -> ${link}, inode=${inode})`);
    return { link, target, created: true, inode, success: true };
  }

  public hardLink(target: string, link: string): { link: string; target: string; inode: number; success: boolean; linkCount: number } {
    const file = this._files.get(target);
    if (file) {
      this._files.set(link, { ...file, path: link, name: link.split('/').pop() ?? 'link' });
      this._updateInode(file.inode, { links: file.links + 1 });
    }
    const linkCount = file ? file.links + 1 : 0;
    this._recordHistory(`hardlink(${target} -> ${link}, inode=${file?.inode})`);
    return { link, target, inode: file?.inode ?? this._counter, success: !!file, linkCount };
  }

  public mount(device: string, mountPoint: string, fsType: string = 'ext4', options: string[] = []): { device: string; mountPoint: string; mounted: boolean; fsType: string; options: string[]; success: boolean } {
    const mountPointEntry: MountPoint = {
      device,
      mountPoint,
      fsType,
      options,
      mountedAt: Date.now(),
      readOnly: options.includes('ro'),
    };
    this._mountPoints.set(mountPoint, mountPointEntry);
    this._superBlock = { ...this._superBlock, lastMountTime: Date.now(), mountedReadOnly: options.includes('ro') };
    this._recordHistory(`mount(${device} -> ${mountPoint}, fs=${fsType})`);
    return { device, mountPoint, mounted: true, fsType, options, success: true };
  }

  public unmount(mountPoint: string): { mountPoint: string; unmounted: boolean; device: string; success: boolean } {
    const mount = this._mountPoints.get(mountPoint);
    const unmounted = !!mount;
    
    if (unmounted) {
      this._mountPoints.delete(mountPoint);
      this._superBlock = { ...this._superBlock, lastWriteTime: Date.now() };
    }
    
    this._recordHistory(`umount(${mountPoint})`);
    return { mountPoint, unmounted, device: mount?.device ?? '', success: unmounted };
  }

  public getMountPoints(): { mounts: MountPoint[]; count: number } {
    const mounts = Array.from(this._mountPoints.values());
    this._recordHistory(`getMountPoints() -> ${mounts.length}`);
    return { mounts, count: mounts.length };
  }

  public allocateBlocks(count: number): { blocks: number[]; allocated: boolean; success: boolean; startingBlock: number } {
    const blocks: number[] = [];
    for (let i = 0; i < this._blockBitmap.length && blocks.length < count; i++) {
      if (!this._blockBitmap[i]) {
        this._blockBitmap[i] = true;
        blocks.push(i);
      }
    }
    
    if (blocks.length === count) {
      this._superBlock = { ...this._superBlock, freeBlocks: this._superBlock.freeBlocks - count };
    }
    
    this._recordHistory(`allocateBlocks(count=${count}) -> allocated=${blocks.length}`);
    return { blocks, allocated: blocks.length === count, success: blocks.length > 0, startingBlock: blocks[0] ?? -1 };
  }

  public deallocateBlocks(blocks: number[]): { deallocated: number; success: boolean } {
    let deallocated = 0;
    for (const block of blocks) {
      if (this._blockBitmap[block]) {
        this._blockBitmap[block] = false;
        deallocated++;
      }
    }
    
    if (deallocated > 0) {
      this._superBlock = { ...this._superBlock, freeBlocks: this._superBlock.freeBlocks + deallocated };
    }
    
    this._recordHistory(`deallocateBlocks(count=${blocks.length}) -> deallocated=${deallocated}`);
    return { deallocated, success: deallocated === blocks.length };
  }

  public setQuota(userId: number, blockLimit: number, inodeLimit: number): { userId: number; set: boolean; blockLimit: number; inodeLimit: number; success: boolean } {
    const quota: Quota = { userId, blockLimit, blockUsed: 0, inodeLimit, inodeUsed: 0 };
    this._quotas.set(userId, quota);
    this._recordHistory(`setQuota(user=${userId}, blocks=${blockLimit}, inodes=${inodeLimit})`);
    return { userId, set: true, blockLimit, inodeLimit, success: true };
  }

  public getQuota(userId: number): { quota: Quota | null; found: boolean; usagePercent: number } {
    const quota = this._quotas.get(userId) ?? null;
    const usagePercent = quota ? (quota.blockUsed / quota.blockLimit) * 100 : 0;
    this._recordHistory(`getQuota(user=${userId}) -> found=${!!quota}`);
    return { quota, found: !!quota, usagePercent };
  }

  public checkQuota(userId: number, requestedBlocks: number): { allowed: boolean; userId: number; remainingBlocks: number; remainingInodes: number; success: boolean } {
    const quota = this._quotas.get(userId);
    const allowed = !quota || (quota.blockUsed + requestedBlocks <= quota.blockLimit);
    const remainingBlocks = quota ? quota.blockLimit - quota.blockUsed : Infinity;
    const remainingInodes = quota ? quota.inodeLimit - quota.inodeUsed : Infinity;
    this._recordHistory(`checkQuota(user=${userId}, request=${requestedBlocks}) -> allowed=${allowed}`);
    return { allowed, userId, remainingBlocks, remainingInodes, success: true };
  }

  public openFile(path: string, mode: 'r' | 'w' | 'rw'): { fd: number; path: string; mode: string; success: boolean; inode: number } {
    const fd = this._nextFD++;
    const file = this._files.get(path);
    const success = !!file || mode !== 'r';
    
    if (success) {
      this._fileDescriptors.set(fd, { path, mode, offset: 0 });
      if (file) {
        this._files.set(path, { ...file, accessed: Date.now() });
      }
    }
    
    this._recordHistory(`openFile(path=${path}, mode=${mode}) -> fd=${fd}`);
    return { fd, path, mode, success, inode: file?.inode ?? -1 };
  }

  public closeFile(fd: number): { closed: boolean; fd: number; success: boolean } {
    const fdInfo = this._fileDescriptors.get(fd);
    const closed = !!fdInfo;
    
    if (closed) {
      this._fileDescriptors.delete(fd);
    }
    
    this._recordHistory(`closeFile(fd=${fd}) -> ${closed}`);
    return { closed, fd, success: closed };
  }

  public readFileDescriptor(fd: number, bytes: number): { data: string; bytesRead: number; fd: number; success: boolean } {
    const fdInfo = this._fileDescriptors.get(fd);
    const success = !!fdInfo && (fdInfo.mode === 'r' || fdInfo.mode === 'rw');
    
    if (success && fdInfo) {
      const file = this._files.get(fdInfo.path);
      const data = file ? 'x'.repeat(Math.min(bytes, file.size - fdInfo.offset)) : '';
      fdInfo.offset += data.length;
      this._recordHistory(`read(fd=${fd}, bytes=${bytes}) -> read=${data.length}`);
      return { data, bytesRead: data.length, fd, success: true };
    }
    
    this._recordHistory(`read(fd=${fd}, bytes=${bytes}) -> failed`);
    return { data: '', bytesRead: 0, fd, success: false };
  }

  public writeFileDescriptor(fd: number, data: string): { bytesWritten: number; fd: number; success: boolean } {
    const fdInfo = this._fileDescriptors.get(fd);
    const success = !!fdInfo && (fdInfo.mode === 'w' || fdInfo.mode === 'rw');
    
    if (success && fdInfo) {
      fdInfo.offset += data.length;
      this.writeFile(fdInfo.path, data, fdInfo.mode === 'rw');
      this._recordHistory(`write(fd=${fd}, bytes=${data.length}) -> written=${data.length}`);
      return { bytesWritten: data.length, fd, success: true };
    }
    
    this._recordHistory(`write(fd=${fd}, bytes=${data.length}) -> failed`);
    return { bytesWritten: 0, fd, success: false };
  }

  public seekFileDescriptor(fd: number, offset: number, whence: 'start' | 'current' | 'end'): { newOffset: number; fd: number; success: boolean } {
    const fdInfo = this._fileDescriptors.get(fd);
    const success = !!fdInfo;
    
    if (success && fdInfo) {
      const file = this._files.get(fdInfo.path);
      let newOffset = fdInfo.offset;
      
      switch (whence) {
        case 'start':
          newOffset = offset;
          break;
        case 'current':
          newOffset = fdInfo.offset + offset;
          break;
        case 'end':
          newOffset = (file?.size ?? 0) + offset;
          break;
      }
      
      fdInfo.offset = Math.max(0, newOffset);
      this._recordHistory(`seek(fd=${fd}, offset=${offset}, whence=${whence}) -> ${fdInfo.offset}`);
      return { newOffset: fdInfo.offset, fd, success: true };
    }
    
    this._recordHistory(`seek(fd=${fd}) -> failed`);
    return { newOffset: -1, fd, success: false };
  }

  public statFile(path: string): { exists: boolean; file: File | null; inode: number; size: number; permissions: string; owner: string; group: string; atime: number; mtime: number; ctime: number } {
    const file = this._files.get(path);
    const exists = !!file;
    this._recordHistory(`stat(path=${path}) -> exists=${exists}`);
    return {
      exists,
      file,
      inode: file?.inode ?? -1,
      size: file?.size ?? 0,
      permissions: file?.permissions ?? '',
      owner: file?.owner ?? '',
      group: file?.group ?? '',
      atime: file?.accessed ?? 0,
      mtime: file?.modified ?? 0,
      ctime: file?.created ?? 0,
    };
  }

  public truncateFile(path: string, size: number): { truncated: boolean; path: string; oldSize: number; newSize: number; success: boolean } {
    const file = this._files.get(path);
    const truncated = !!file;
    const oldSize = file?.size ?? 0;
    const newSize = size;
    
    if (truncated && file) {
      this._files.set(path, { ...file, size: Math.min(oldSize, size), modified: Date.now() });
      this._updateInode(file.inode, { size: Math.min(oldSize, size), mtime: Date.now() });
    }
    
    this._recordHistory(`truncate(path=${path}, size=${size}) -> ${truncated}`);
    return { truncated, path, oldSize, newSize, success: truncated };
  }

  public syncFileSystem(): { synced: boolean; pendingWrites: number; flushed: number; success: boolean } {
    const pendingWrites = this._journal.filter(e => !e.committed).length;
    const flushed = pendingWrites;
    this._journal.forEach(e => e.committed = true);
    this._superBlock = { ...this._superBlock, lastWriteTime: Date.now() };
    this._recordHistory(`sync() -> flushed=${flushed}`);
    return { synced: true, pendingWrites, flushed, success: true };
  }

  public getFileSystemStats(): { totalFiles: number; totalDirectories: number; usedInodes: number; freeInodes: number; usedBlocks: number; freeBlocks: number; totalBlocks: number; blockSize: number; mountedFileSystems: number } {
    const stats = {
      totalFiles: this._files.size,
      totalDirectories: this._directories.size,
      usedInodes: this._inodes.size,
      freeInodes: this._superBlock.freeInodes,
      usedBlocks: this._superBlock.totalBlocks - this._superBlock.freeBlocks,
      freeBlocks: this._superBlock.freeBlocks,
      totalBlocks: this._superBlock.totalBlocks,
      blockSize: this._superBlock.blockSize,
      mountedFileSystems: this._mountPoints.size,
    };
    this._recordHistory(`getFileSystemStats()`);
    return stats;
  }

  public toPacket(): DataPacket<{
    files: number;
    directories: number;
    inodes: number;
    freeBlocks: number;
    mountedFileSystems: number;
    history: string[];
    rootPath: string;
  }> {
    return {
      id: `fs-${Date.now()}-${this._counter}`,
      payload: {
        files: this._files.size,
        directories: this._directories.size,
        inodes: this._inodes.size,
        freeBlocks: this._superBlock.freeBlocks,
        mountedFileSystems: this._mountPoints.size,
        history: [...this._history],
        rootPath: this._rootPath,
      },
      metadata: {
        createdAt: Date.now(),
        route: ['os', 'filesystem', 'result'],
        priority: 0.75,
        phase: 'storage',
      },
    };
  }

  public reset(): void {
    this._files.clear();
    this._directories.clear();
    this._history = [];
    this._counter = 0;
    this._inodes.clear();
    this._nextInode = 1;
    this._superBlock = this._createSuperBlock();
    this._journal = [];
    this._mountPoints.clear();
    this._quotas.clear();
    this._blockBitmap = [];
    this._inodeBitmap = [];
    this._fileDescriptors.clear();
    this._nextFD = 3;
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }

  private _createSuperBlock(): SuperBlock {
    return {
      magic: 0xEF53,
      blockSize: 4096,
      totalBlocks: 1000000,
      freeBlocks: 600000,
      totalInodes: 100000,
      freeInodes: 90000,
      blockGroupCount: 10,
      inodeSize: 128,
      lastMountTime: Date.now(),
      lastWriteTime: Date.now(),
      mountedReadOnly: false,
    };
  }

  private _allocateInode(type: Inode['type']): number {
    const inode = this._nextInode++;
    const now = Date.now();
    this._inodes.set(inode, {
      inode,
      type,
      permissions: 'rw-r--r--',
      owner: 0,
      group: 0,
      size: 0,
      blocks: [],
      atime: now,
      mtime: now,
      ctime: now,
      links: 1,
    });
    this._superBlock = { ...this._superBlock, freeInodes: this._superBlock.freeInodes - 1 };
    return inode;
  }

  private _deallocateInode(inode: number): void {
    this._inodes.delete(inode);
    this._superBlock = { ...this._superBlock, freeInodes: this._superBlock.freeInodes + 1 };
  }

  private _updateInode(inode: number, updates: Partial<Inode>): void {
    const existing = this._inodes.get(inode);
    if (existing) {
      this._inodes.set(inode, { ...existing, ...updates });
    }
  }
}