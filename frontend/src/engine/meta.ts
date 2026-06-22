// Helpers for v2 generic recovery: PHP-unserialize (postmeta / option values),
// custom-field extraction, spam detection, and slug humanizing. Pure string code
// so it runs identically in Node, the browser and a Web Worker.

/** Minimal, tolerant PHP `serialize()` reader. Returns a JS value, or
 * `undefined` if the input isn't (valid) serialized data. Note: PHP string
 * lengths are byte counts; this uses char length, which is correct for ASCII
 * (the common case for plugin meta) and falls back to `undefined` on mismatch. */
export function unserializePhp(input: string): unknown {
  if (!input || (!/^[aOsibd]:/.test(input) && input !== "N;")) return undefined;
  const s = input;
  let i = 0;

  function parse(): unknown {
    const t = s[i];
    if (t === "N") {
      i += 2; // N;
      return null;
    }
    if (t === "b") {
      const v = s[i + 2] === "1";
      i = s.indexOf(";", i) + 1;
      return v;
    }
    if (t === "i") {
      const end = s.indexOf(";", i);
      const v = parseInt(s.slice(i + 2, end), 10);
      i = end + 1;
      return v;
    }
    if (t === "d") {
      const end = s.indexOf(";", i);
      const v = parseFloat(s.slice(i + 2, end));
      i = end + 1;
      return v;
    }
    if (t === "s") {
      const lenEnd = s.indexOf(":", i + 2);
      const len = parseInt(s.slice(i + 2, lenEnd), 10);
      const start = lenEnd + 2; // skip :"
      const str = s.slice(start, start + len);
      if (s[start + len] !== '"' || s[start + len + 1] !== ";") throw new Error("bad string");
      i = start + len + 2;
      return str;
    }
    if (t === "a") {
      const lenEnd = s.indexOf(":", i + 2);
      const count = parseInt(s.slice(i + 2, lenEnd), 10);
      i = lenEnd + 2; // skip :{
      const obj: Record<string, unknown> = {};
      const arr: unknown[] = [];
      let isList = true;
      for (let k = 0; k < count; k++) {
        const key = parse();
        const val = parse();
        obj[String(key)] = val;
        arr[k] = val;
        if (key !== k) isList = false;
      }
      i += 1; // skip }
      return isList ? arr : obj;
    }
    if (t === "O") {
      // Object: O:len:"Class":count:{ k;v;... } — treat props like an array.
      const lenEnd = s.indexOf(":", i + 2);
      const len = parseInt(s.slice(i + 2, lenEnd), 10);
      const nameEnd = lenEnd + 2 + len + 2; // :"name";
      const cntEnd = s.indexOf(":", nameEnd);
      const count = parseInt(s.slice(nameEnd, cntEnd), 10);
      i = cntEnd + 2; // skip :{
      const obj: Record<string, unknown> = {};
      for (let k = 0; k < count; k++) {
        const key = parse();
        obj[String(key)] = parse();
      }
      i += 1;
      return obj;
    }
    throw new Error("unparseable php");
  }

  try {
    return parse();
  } catch {
    return undefined;
  }
}

function isPlain(v: unknown): v is string | number | boolean {
  return typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/** Flatten any unserialized value to a short readable string. */
export function flattenValue(v: unknown): string {
  if (v == null) return "";
  if (isPlain(v)) return String(v);
  if (Array.isArray(v)) return v.map(flattenValue).filter(Boolean).join(", ");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("value" in o) return flattenValue(o.value);
    return Object.values(o).map(flattenValue).filter(Boolean).join(", ");
  }
  return String(v);
}

/** Turn a meta_key / post_type slug into a human label. */
export function humanize(slug: string): string {
  return slug
    .replace(/^_+/, "")
    .replace(/^(jobfeature|jobapp|simple_job_board|sfwd|tribe|wpcf|acf)[_-]/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export interface MetaField {
  key: string;
  label: string;
  value: string;
}

// Internal/analytics/builder meta keys we never surface as a "custom field".
// `jobapp_*` are Simple Job Board application-FORM field definitions (config),
// not the job's content — the real job data lives in `jobfeature_*`.
const META_HIDE =
  /^(_|avada_|burst_|rs_page|cmplz|wpcode|fusion|elementor|yoast|rank_math|aioseo|oembed|jobapp_|jetpack_|spu-|tie_|td_|vc_|et_)/i;

/** Pull display-worthy custom fields out of a post's postmeta map. */
export function extractFields(meta: Record<string, string>): MetaField[] {
  const out: MetaField[] = [];
  for (const [key, raw] of Object.entries(meta)) {
    if (!raw || META_HIDE.test(key)) continue;
    let label = humanize(key);
    let value: string;
    const un = unserializePhp(raw);
    if (un !== undefined) {
      if (un && typeof un === "object" && !Array.isArray(un) && "value" in (un as object)) {
        const o = un as Record<string, unknown>;
        value = flattenValue(o.value);
        if (o.label) label = String(o.label);
      } else {
        value = flattenValue(un);
      }
    } else {
      value = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    value = value.trim();
    if (!value || value.length > 600) continue;
    out.push({ key, label, value });
  }
  return out;
}

// Injected casino/gambling SEO-spam — common in compromised WP installs. Used to
// route spam posts to a separate bucket instead of the main Posts tab.
const SPAM_RE =
  /casino|pokies|poker|roulette|slots?\b|betting|gambl|wager|vegas|jackpot|blackjack|baccarat|sportsbook|bookmaker|bonus code|free chips|no deposit|\bbet\b/i;

export function isSpam(title: string, body = ""): boolean {
  return SPAM_RE.test(title) || SPAM_RE.test(body.slice(0, 400));
}
