/**
 * Run with `npm run check:image-metadata`. Needs nothing running.
 *
 * A photograph taken on a phone at a nursery carries the GPS position of a
 * two-year-old, to within a few metres, in a field nobody will ever look at.
 * This is the code that takes it out, so these tests build files that really do
 * carry it and insist that the bytes are gone afterwards — not that a function
 * was called.
 *
 * The other half is refusing to believe the uploader. A file called photo.jpg,
 * sent as image/jpeg, containing `<script>`, is how an upload endpoint becomes
 * stored XSS on its own origin.
 */
import {
  safeFileName,
  sniffImageFormat,
  stripImageMetadata,
} from "../../src/backend/utils/image-metadata.util";

let pass = 0;
let fail = 0;
function check(label: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} ${detail}`);
  }
}

const bytes = (...values: number[]) => Uint8Array.from(values);
function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
function segment(marker: number, payload: Uint8Array): Uint8Array {
  const length = payload.length + 2;
  return concat(bytes(0xff, marker, (length >> 8) & 0xff, length & 0xff), payload);
}
const text = (s: string) => Uint8Array.from(Buffer.from(s, "latin1"));
const contains = (haystack: Uint8Array, needle: string) =>
  Buffer.from(haystack).includes(Buffer.from(needle, "latin1"));

// ---- A JPEG that really does carry a location -------------------------------
const gpsExif = concat(text("Exif\0\0"), text("MM\0*"), text("GPSLatitude 22.5726N 88.3639E"));
const jpegBody = concat(
  segment(0xdb, text("quantisation-tables-pretend")), // DQT — the picture
  bytes(0xff, 0xda), // SOS
  text("entropy-coded-scan-data"),
  bytes(0xff, 0xd9), // EOI
);
const jpegWithExif = concat(
  bytes(0xff, 0xd8),
  segment(0xe1, gpsExif), // APP1 — EXIF
  segment(0xe0, text("JFIF\0")), // APP0
  segment(0xed, text("Photoshop 3.0 IPTC caption")), // APP13
  segment(0xfe, text("Taken by Meera on the school trip")), // COM
  jpegBody,
);

console.log("\nA phone photograph, with the location in it");
check("the fixture really does carry the coordinates", contains(jpegWithExif, "GPSLatitude"));
check("it sniffs as a JPEG", sniffImageFormat(jpegWithExif) === "jpeg");

const strippedJpeg = stripImageMetadata(jpegWithExif, "jpeg");
check("the coordinates are gone", !contains(strippedJpeg, "GPSLatitude"));
check("so is the whole EXIF block", !contains(strippedJpeg, "Exif"));
check("and the IPTC caption", !contains(strippedJpeg, "Photoshop"));
check("and the comment naming the teacher", !contains(strippedJpeg, "Taken by Meera"));
check("the JFIF header goes too — it is metadata", !contains(strippedJpeg, "JFIF"));

check("the picture itself survives", contains(strippedJpeg, "entropy-coded-scan-data"));
check("so do the quantisation tables", contains(strippedJpeg, "quantisation-tables-pretend"));
check("it still starts as a JPEG", strippedJpeg[0] === 0xff && strippedJpeg[1] === 0xd8);
check("and still sniffs as one", sniffImageFormat(strippedJpeg) === "jpeg");
check("and it got smaller", strippedJpeg.length < jpegWithExif.length);

check(
  "stripping twice changes nothing the second time",
  Buffer.compare(
    Buffer.from(stripImageMetadata(strippedJpeg, "jpeg")),
    Buffer.from(strippedJpeg),
  ) === 0,
);

// ---- PNG --------------------------------------------------------------------
function pngChunk(type: string, payload: Uint8Array): Uint8Array {
  const length = payload.length;
  return concat(
    bytes((length >> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff),
    text(type),
    payload,
    bytes(0, 0, 0, 0), // CRC — not verified by the stripper
  );
}
const pngSignature = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const png = concat(
  pngSignature,
  pngChunk("IHDR", text("header-bytes")),
  pngChunk("eXIf", text("GPSLatitude 22.5726N")),
  pngChunk("tEXt", text("Author\0Meera")),
  pngChunk("IDAT", text("pixels-here")),
  pngChunk("IEND", new Uint8Array()),
);

console.log("\nA PNG with the same problem");
check("it sniffs as a PNG", sniffImageFormat(png) === "png");
const strippedPng = stripImageMetadata(png, "png");
check("the eXIf chunk is gone", !contains(strippedPng, "GPSLatitude"));
check("the text chunk naming a person is gone", !contains(strippedPng, "Meera"));
check("the header survives", contains(strippedPng, "header-bytes"));
check("the pixels survive", contains(strippedPng, "pixels-here"));
check("and it ends properly", contains(strippedPng, "IEND"));

// ---- WebP -------------------------------------------------------------------
function riffChunk(type: string, payload: Uint8Array): Uint8Array {
  const size = payload.length;
  const padded = size % 2 === 1 ? concat(payload, bytes(0)) : payload;
  return concat(
    text(type),
    bytes(size & 0xff, (size >> 8) & 0xff, (size >> 16) & 0xff, (size >> 24) & 0xff),
    padded,
  );
}
const webpChunks = concat(
  riffChunk("VP8 ", text("compressed-pixels")),
  riffChunk("EXIF", text("GPSLatitude 22.5726N")),
  riffChunk("XMP ", text("<x:xmpmeta>author</x:xmpmeta>")),
);
const webpSize = 4 + webpChunks.length;
const webp = concat(
  text("RIFF"),
  bytes(webpSize & 0xff, (webpSize >> 8) & 0xff, (webpSize >> 16) & 0xff, (webpSize >> 24) & 0xff),
  text("WEBP"),
  webpChunks,
);

console.log("\nAnd a WebP");
check("it sniffs as a WebP", sniffImageFormat(webp) === "webp");
const strippedWebp = stripImageMetadata(webp, "webp");
check("the EXIF chunk is gone", !contains(strippedWebp, "GPSLatitude"));
check("the XMP chunk is gone", !contains(strippedWebp, "xmpmeta"));
check("the pixels survive", contains(strippedWebp, "compressed-pixels"));
check(
  "the RIFF length is rewritten to match",
  Buffer.from(strippedWebp).readUInt32LE(4) === strippedWebp.length - 8,
);

// ---- What we refuse to believe ---------------------------------------------
console.log("\nWhat the uploader says is not evidence");
check("an HTML file is not a photo, whatever it is called", sniffImageFormat(text("<html><script>")) === null);
check("an SVG is not either — it is a document that can carry script", sniffImageFormat(text('<svg xmlns="http://www.w3.org/2000/svg">')) === null);
check("neither is a PDF", sniffImageFormat(text("%PDF-1.7 ...")) === null);
check("nor an empty file", sniffImageFormat(new Uint8Array()) === null);
check("nor eight bytes of nothing much", sniffImageFormat(bytes(1, 2, 3, 4, 5, 6, 7, 8)) === null);
check("a GIF is recognised", sniffImageFormat(concat(text("GIF89a"), bytes(1, 0, 1, 0, 0, 0))) === "gif");

console.log("\nFilenames are for display, never for paths");
check("a traversal attempt keeps only its last part", safeFileName("../../etc/passwd") === "passwd");
check("a windows path too", safeFileName("C:\\Users\\me\\photo.jpg") === "photo.jpg");
check("quotes and angle brackets do not survive", safeFileName('<img src=x onerror=1>.jpg').includes("<") === false);
check("an empty name still produces one", safeFileName("") === "photo");
check("a very long name is cut", safeFileName("a".repeat(400)).length <= 120);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
