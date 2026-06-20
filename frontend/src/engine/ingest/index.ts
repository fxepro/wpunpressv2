// ingest(bytes, filename) → a flat FileEntry[] the recovery engine can consume,
// regardless of the original container format. Each new format is one `case`
// here — recover.ts never changes.

import { iterateWpress } from "../wpress";
import { gunzip, stripGzExtension } from "./gzip";
import { sniffFormat } from "./sniff";
import { fromTar } from "./tar";
import { UnsupportedFormatError, type ArchiveFormat, type FileEntry, type IngestResult } from "./types";

export { UnsupportedFormatError };
export type { FileEntry, IngestResult, ArchiveFormat } from "./types";
export { sniffFormat };

const MAX_NEST_DEPTH = 3;

/** Strip leading "./" or "/" and normalize separators to POSIX. */
function normalize(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.?\//, "");
}

function fromWpress(bytes: Uint8Array): FileEntry[] {
  const files: FileEntry[] = [];
  for (const e of iterateWpress(bytes)) {
    files.push({ path: normalize(e.path), data: e.data });
  }
  return files;
}

function ingestBytes(bytes: Uint8Array, filename: string, depth: number): IngestResult {
  if (depth > MAX_NEST_DEPTH) {
    throw new Error("Backup has too many nested compression layers.");
  }

  const format = sniffFormat(bytes, filename);
  switch (format) {
    case "wpress":
    case "unknown":
      // `.wpress` has no magic bytes; an unrecognized binary is almost always
      // one (it was the only format before multi-format ingest), so fall back
      // to it rather than rejecting headless callers that pass no filename.
      return { format: "wpress", siteCount: 1, files: fromWpress(bytes) };
    case "sql":
      // A bare dump has no media; hand it straight to the SQL parser.
      return { format, siteCount: 1, files: [{ path: "database.sql", data: bytes }] };
    case "gzip": {
      const inner = gunzip(bytes);
      return ingestBytes(inner, stripGzExtension(filename), depth + 1);
    }
    case "tar":
      return { format, siteCount: 1, files: fromTar(bytes) };
    default:
      // zip | wxr — recognized, adapter not built yet.
      throw new UnsupportedFormatError(format);
  }
}

export function ingest(bytes: Uint8Array, filename = ""): IngestResult {
  return ingestBytes(bytes, filename, 0);
}
