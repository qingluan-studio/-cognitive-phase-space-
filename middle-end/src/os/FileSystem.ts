import { DataPacket } from '../shared/types';

export interface File {
  readonly name: string;
  readonly size: number;
  readonly permissions: string;
  readonly created: number;
  readonly modified: number;
  readonly path: string;
}

export interface Directory {
  readonly name: string;
  readonly path: string;
  readonly files: File[];
  readonly directories: Directory[];
  readonly created: number;
}

export class FileSystem {
  private _files: Map<string, File> = new Map();
  private _directories: Map<string, Directory> = new Map();
  private _history: string[] = [];
  private _counter = 0;
  private _rootPath = '/';

  get fileCount(): number {
    return this._files.size;
  }

  get directoryCount(): number {
    return this._directories.size;
  }

  get history(): string[] {
    return [...this._history];
  }

  public createFile(path: string, content: string): { file: File; path: string; size: number } {
    const now = Date.now();
    const file: File = {
      name: path.split('/').pop() ?? 'file',
      size: content.length,
      permissions: 'rw-r--r--',
      created: now,
      modified: now,
      path,
    };
    this._files.set(path, file);
    this._recordHistory(`createFile(path=${path}, size=${content.length})`);
    return { file, path, size: content.length };
  }

  public readFile(path: string): { content: string; file: File | null; size: number } {
    const file = this._files.get(path) ?? null;
    const content = file ? 'file content here' : '';
    this._recordHistory(`readFile(path=${path}) -> ${file ? 'ok' : 'not found'}`);
    return { content, file, size: content.length };
  }

  public writeFile(path: string, data: string): { written: number; path: string; modified: number } {
    const file = this._files.get(path);
    const now = Date.now();
    if (file) {
      this._files.set(path, { ...file, size: data.length, modified: now });
    }
    this._recordHistory(`writeFile(path=${path}, size=${data.length})`);
    return { written: data.length, path, modified: now };
  }

  public deleteFile(path: string): { deleted: boolean; path: string; freed: number } {
    const file = this._files.get(path);
    const deleted = this._files.has(path);
    const freed = file?.size ?? 0;
    if (deleted) this._files.delete(path);
    this._recordHistory(`deleteFile(path=${path}) -> ${deleted}`);
    return { deleted, path, freed };
  }

  public renameFile(oldPath: string, newPath: string): { renamed: boolean; oldPath: string; newPath: string } {
    const file = this._files.get(oldPath);
    const renamed = !!file;
    if (file) {
      this._files.delete(oldPath);
      this._files.set(newPath, { ...file, path: newPath, name: newPath.split('/').pop() ?? 'file' });
    }
    this._recordHistory(`renameFile(${oldPath} -> ${newPath})`);
    return { renamed, oldPath, newPath };
  }

  public createDirectory(path: string): { path: string; created: boolean; name: string } {
    const now = Date.now();
    const dir: Directory = {
      name: path.split('/').pop() ?? 'dir',
      path,
      files: [],
      directories: [],
      created: now,
    };
    this._directories.set(path, dir);
    this._recordHistory(`createDirectory(path=${path})`);
    return { path, created: true, name: dir.name };
  }

  public listDirectory(path: string): { files: string[]; directories: string[]; path: string } {
    const dir = this._directories.get(path);
    const files = dir ? dir.files.map(f => f.name) : [];
    const directories = dir ? dir.directories.map(d => d.name) : [];
    this._recordHistory(`listDirectory(path=${path}) -> ${files.length + directories.length} entries`);
    return { files, directories, path };
  }

  public deleteDirectory(path: string, recursive: boolean): { deleted: boolean; path: string; removed: number } {
    const dir = this._directories.get(path);
    const deleted = !!dir;
    const removed = dir ? (recursive ? 10 : 1) : 0;
    if (deleted) this._directories.delete(path);
    this._recordHistory(`deleteDirectory(path=${path}, recursive=${recursive}) -> ${deleted}`);
    return { deleted, path, removed };
  }

  public filePermissions(path: string, mode: string): { path: string; mode: string; changed: boolean } {
    const file = this._files.get(path);
    const changed = !!file;
    if (file) {
      this._files.set(path, { ...file, permissions: mode });
    }
    this._recordHistory(`chmod(${path}, ${mode})`);
    return { path, mode, changed };
  }

  public fileOwnership(path: string, owner: string, group: string): { path: string; owner: string; group: string; changed: boolean } {
    const changed = this._files.has(path);
    this._recordHistory(`chown(${path}, ${owner}:${group})`);
    return { path, owner, group, changed };
  }

  public inode(system: string, number: number): { inode: number; system: string; links: number; blocks: number } {
    const links = 1 + Math.floor(Math.random() * 3);
    const blocks = 1 + Math.floor(Math.random() * 10);
    this._recordHistory(`inode(system=${system}, number=${number})`);
    return { inode: number, system, links, blocks };
  }

  public superblock(filesystem: string): { filesystem: string; blockSize: number; totalBlocks: number; freeBlocks: number } {
    const blockSize = 4096;
    const totalBlocks = 1000000;
    const freeBlocks = Math.floor(totalBlocks * 0.6);
    this._recordHistory(`superblock(fs=${filesystem})`);
    return { filesystem, blockSize, totalBlocks, freeBlocks };
  }

  public journaling(journal: string, operation: string): { journal: string; operation: string; committed: boolean } {
    const committed = Math.random() > 0.1;
    this._recordHistory(`journaling(journal=${journal}, op=${operation}) -> committed=${committed}`);
    return { journal, operation, committed };
  }

  public fsck(filesystem: string): { filesystem: string; errors: number; fixed: number; clean: boolean } {
    const errors = Math.floor(Math.random() * 5);
    const fixed = errors;
    const clean = errors === 0;
    this._recordHistory(`fsck(${filesystem}) -> errors=${errors}`);
    return { filesystem, errors, fixed, clean };
  }

  public symbolicLink(target: string, link: string): { link: string; target: string; created: boolean } {
    this._recordHistory(`symlink(${target} -> ${link})`);
    return { link, target, created: true };
  }

  public hardLink(target: string, link: string): { link: string; target: string; inode: number } {
    this._recordHistory(`hardlink(${target} -> ${link})`);
    return { link, target, inode: this._counter };
  }

  public mount(device: string, mountPoint: string): { device: string; mountPoint: string; mounted: boolean; fsType: string } {
    this._recordHistory(`mount(${device} -> ${mountPoint})`);
    return { device, mountPoint, mounted: true, fsType: 'ext4' };
  }

  public toPacket(): DataPacket<{
    files: number;
    directories: number;
    history: string[];
    rootPath: string;
  }> {
    return {
      id: `fs-${Date.now()}-${this._counter}`,
      payload: {
        files: this._files.size,
        directories: this._directories.size,
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
  }

  private _recordHistory(entry: string): void {
    this._counter++;
    this._history.push(`[${Date.now()}] ${entry}`);
    if (this._history.length > 200) this._history.shift();
  }
}
