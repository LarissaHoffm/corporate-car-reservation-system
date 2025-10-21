import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

export class LocalStorage {
  private base = path.resolve(process.cwd(), 'uploads');

  async save(file: { buffer: Buffer; mime: string; originalName: string }) {
    await fs.mkdir(this.base, { recursive: true });
    const ext = path.extname(file.originalName) || '';
    const safe = file.originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const key = `${Date.now()}_${randomUUID()}_${safe}`;
    const finalName = ext ? key : `${key}${ext}`;
    const full = path.join(this.base, finalName);
    await fs.writeFile(full, file.buffer);
    return { storageKey: finalName, url: `/files/${finalName}`, mime: file.mime, size: file.buffer.length };
  }

  async read(storageKey: string) {
    const full = path.join(this.base, storageKey);
    return fs.readFile(full);
  }
}
