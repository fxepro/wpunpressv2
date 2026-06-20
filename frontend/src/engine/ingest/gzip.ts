import { gunzipSync } from "fflate";

/** Decompress a single gzip member (e.g. .sql.gz, .tar.gz). */
export function gunzip(bytes: Uint8Array): Uint8Array {
  return gunzipSync(bytes);
}

/** Strip one .gz / .tgz layer from a filename hint for re-sniffing. */
export function stripGzExtension(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".tar.gz")) return `${filename.slice(0, -7)}.tar`;
  if (lower.endsWith(".tgz")) return `${filename.slice(0, -4)}.tar`;
  if (lower.endsWith(".sql.gz")) return `${filename.slice(0, -7)}.sql`;
  if (lower.endsWith(".gz")) return filename.slice(0, -3);
  return filename;
}
