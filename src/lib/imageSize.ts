import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* Pixel dimensions of an image served from /public, read at build time so a
   screenshot's width/height can be stated on its <img> without hand-typing
   them. Supports the two formats the site's shots use. Returns undefined
   for anything it cannot read; the <img> then simply omits the attributes. */
export function imageSize(publicPath: string): { width: number; height: number } | undefined {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', publicPath));
    // PNG: IHDR width/height at bytes 16–23.
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // WebP: RIFF....WEBP, then a VP8 / VP8L / VP8X chunk.
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buf.toString('ascii', 12, 16);
      if (chunk === 'VP8X') {
        return {
          width: 1 + buf.readUIntLE(24, 3),
          height: 1 + buf.readUIntLE(27, 3),
        };
      }
      if (chunk === 'VP8L') {
        const b = buf.readUInt32LE(21);
        return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff) };
      }
      if (chunk === 'VP8 ') {
        return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
      }
    }
  } catch {
    /* fall through */
  }
  return undefined;
}
