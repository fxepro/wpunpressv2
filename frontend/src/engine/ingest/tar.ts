// Minimal ustar tar reader — enough for host .tar.gz WordPress backups.

import type { FileEntry } from "./types";

const decoder = new TextDecoder("utf-8");

function field(buf: Uint8Array, start: number, len: number): string {
  const sub = buf.subarray(start, start + len);
  let end = sub.indexOf(0);
  if (end === -1) end = sub.length;
  return decoder.decode(sub.subarray(0, end)).trim();
}

function parseSize(header: Uint8Array): number {
  const raw = field(header, 124, 12);
  const n = parseInt(raw, 8);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function parsePath(header: Uint8Array): string {
  let name = field(header, 0, 100);
  const prefix = field(header, 345, 155);
  if (prefix) name = `${prefix}/${name}`;
  return name.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function isZeroBlock(header: Uint8Array): boolean {
  for (let i = 0; i < header.length; i++) {
    if (header[i] !== 0) return false;
  }
  return true;
}

/** Extract regular files from a tar archive. */
export function fromTar(bytes: Uint8Array): FileEntry[] {
  const files: FileEntry[] = [];
  let offset = 0;

  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512);
    if (isZeroBlock(header)) break;

    const type = header[156];
    const path = parsePath(header);
    const size = parseSize(header);
    offset += 512;

    const data = bytes.subarray(offset, offset + size);
    offset += size;
    offset = Math.ceil(offset / 512) * 512;

    // '0' or '\0' = regular file; skip dirs, symlinks, etc.
    if ((type === 0x30 || type === 0) && path && size > 0) {
      files.push({ path, data });
    }
  }

  return files;
}
