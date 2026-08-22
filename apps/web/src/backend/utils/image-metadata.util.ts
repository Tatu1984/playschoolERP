/**
 * Taking the metadata out of an uploaded photograph, and refusing to believe
 * what the uploader said it was.
 *
 * A phone writes EXIF into every picture it takes: the GPS position, to a few
 * metres, and the time. A photograph of a two-year-old at nursery therefore
 * carries where that child is, every weekday, in a field no parent will ever
 * think to look at. Stripping it is not a nicety.
 *
 * Two deliberate choices:
 *
 *  * The type is read from the file's own first bytes, never from the
 *    `Content-Type` the browser sent or the extension on the name. Both are
 *    attacker-controlled, and "this .jpg is actually HTML" is how an upload
 *    endpoint becomes stored XSS.
 *  * The metadata is removed by rewriting the container — dropping JPEG APPn
 *    and COM segments, PNG text and time chunks, WebP EXIF/XMP chunks — rather
 *    than by re-encoding through an image library. It touches no pixel, adds no
 *    native dependency, and cannot fail on a platform where a binary did not
 *    install. What it does not do is normalise a malformed file; that is what
 *    the sniffing above is for.
 */

export type ImageFormat = "jpeg" | "png" | "webp" | "gif";

/** What a photograph is allowed to be. Anything else is refused, loudly. */
export const ALLOWED_IMAGE_TYPES: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * The format this file actually is, from its magic bytes, or null.
 *
 * Note what is missing: SVG. An SVG is a document that can carry script, and
 * serving one from our own origin is serving script from our own origin. The
 * marketing gallery accepts them because it is marketing; the children's feed
 * does not.
 */
export function sniffImageFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => bytes[i] === b)) return "png";

  if (
    ascii(bytes, 0, 4) === "RIFF" &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    return "webp";
  }

  if (ascii(bytes, 0, 3) === "GIF") return "gif";

  return null;
}

/** Remove everything that is not the picture. Unknown formats pass through. */
export function stripImageMetadata(bytes: Uint8Array, format: ImageFormat): Uint8Array {
  switch (format) {
    case "jpeg":
      return stripJpeg(bytes);
    case "png":
      return stripPng(bytes);
    case "webp":
      return stripWebp(bytes);
    case "gif":
      // GIF has no EXIF. Comment extensions exist and carry no location.
      return bytes;
  }
}

// ---------------------------------------------------------------- JPEG -----

/**
 * JPEG is a sequence of marker segments. EXIF lives in APP1, XMP in another
 * APP1, IPTC and Photoshop data in APP13, and thumbnails ride along inside
 * them — an EXIF thumbnail is a second, smaller copy of the photograph that
 * some editors forget to update, which is its own disclosure.
 *
 * So every APPn (0xE0–0xEF) and COM (0xFE) segment goes. What is kept is the
 * quantisation tables, Huffman tables, frame headers and the scan: the picture.
 */
function stripJpeg(bytes: Uint8Array): Uint8Array {
  const out: number[] = [0xff, 0xd8]; // SOI
  let i = 2;

  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      // Not where a marker should be. Rather than guess, keep the rest as-is:
      // a file we cannot parse is one we must not silently mangle.
      return concat(out, bytes.subarray(i));
    }

    const marker = bytes[i + 1];

    // Start of scan: everything after it is entropy-coded image data.
    if (marker === 0xda) return concat(out, bytes.subarray(i));
    // End of image.
    if (marker === 0xd9) return concat(out, bytes.subarray(i));
    // Standalone markers carry no length.
    if (marker >= 0xd0 && marker <= 0xd7) {
      out.push(0xff, marker);
      i += 2;
      continue;
    }

    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    if (length < 2 || i + 2 + length > bytes.length) {
      return concat(out, bytes.subarray(i));
    }

    const isMetadata = (marker >= 0xe0 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) {
      for (let j = i; j < i + 2 + length; j++) out.push(bytes[j]);
    }
    i += 2 + length;
  }

  return Uint8Array.from(out);
}

// ----------------------------------------------------------------- PNG -----

/** Chunks that are metadata rather than picture. */
const PNG_DROP = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME", "iCCP"]);

function stripPng(bytes: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < 8; i++) out.push(bytes[i]); // signature

  let i = 8;
  while (i + 8 <= bytes.length) {
    const length = readUint32(bytes, i);
    const type = ascii(bytes, i + 4, 4);
    const total = 12 + length; // length + type + data + crc
    if (length > bytes.length || i + total > bytes.length) break;

    if (!PNG_DROP.has(type)) {
      for (let j = i; j < i + total; j++) out.push(bytes[j]);
    }
    i += total;
    if (type === "IEND") break;
  }

  return Uint8Array.from(out);
}

// ---------------------------------------------------------------- WebP -----

/** RIFF chunks that are metadata. */
const WEBP_DROP = new Set(["EXIF", "XMP "]);

function stripWebp(bytes: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < 12; i++) out.push(bytes[i]); // RIFF + size + WEBP

  let i = 12;
  while (i + 8 <= bytes.length) {
    const type = ascii(bytes, i, 4);
    const size = readUint32LE(bytes, i + 4);
    // Chunks are padded to an even length.
    const total = 8 + size + (size % 2);
    if (i + total > bytes.length) break;

    if (!WEBP_DROP.has(type)) {
      for (let j = i; j < i + total; j++) out.push(bytes[j]);
    }
    i += total;
  }

  const result = Uint8Array.from(out);
  // The RIFF header carries the file length, which just changed.
  writeUint32LE(result, 4, result.length - 8);
  return result;
}

// ------------------------------------------------------------- helpers -----

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  let s = "";
  for (let i = offset; i < offset + length && i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return s;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] +
    (bytes[offset + 1] << 8) +
    (bytes[offset + 2] << 16) +
    ((bytes[offset + 3] << 24) >>> 0)
  );
}

function writeUint32LE(bytes: Uint8Array, offset: number, value: number): void {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >> 8) & 0xff;
  bytes[offset + 2] = (value >> 16) & 0xff;
  bytes[offset + 3] = (value >> 24) & 0xff;
}

function concat(head: number[], tail: Uint8Array): Uint8Array {
  const out = new Uint8Array(head.length + tail.length);
  out.set(Uint8Array.from(head), 0);
  out.set(tail, head.length);
  return out;
}

/**
 * A filename safe to keep for display. Never used as a storage key — the key is
 * generated — so this is about not echoing `../../etc/passwd` back onto a
 * screen, not about path traversal.
 */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "photo";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "photo";
}
