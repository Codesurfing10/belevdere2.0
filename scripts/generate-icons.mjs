// Generates the PWA icons as PNGs with no dependencies (Node zlib only).
// Brand: indigo-600 (#4f46e5) background with a white house mark. Run: node scripts/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x4f, 0x46, 0xe5];
const FG = [0xff, 0xff, 0xff];

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

/** inside(x,y) in unit coords [0,1] -> true if pixel is part of the house mark. */
function houseMark(x, y, scale) {
  // scale shrinks the mark toward the centre (maskable icons need a safe zone)
  const u = 0.5 + (x - 0.5) / scale;
  const v = 0.5 + (y - 0.5) / scale;
  // roof: triangle apex (0.5,0.2) base y=0.48 from 0.18..0.82
  const roof = v >= 0.2 && v <= 0.48 && Math.abs(u - 0.5) <= ((v - 0.2) / 0.28) * 0.32;
  // body
  const body = u >= 0.27 && u <= 0.73 && v >= 0.46 && v <= 0.8;
  // door cut-out
  const door = u >= 0.44 && u <= 0.56 && v >= 0.6 && v <= 0.8;
  return (roof || body) && !door;
}

function png(size, scale, rounded) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const r = size * 0.18;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4;
      let alpha = 255;
      if (rounded) {
        const cx = Math.min(Math.max(x + 0.5, r), size - r);
        const cy = Math.min(Math.max(y + 0.5, r), size - r);
        if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) > r) alpha = 0;
      }
      const c = houseMark((x + 0.5) / size, (y + 0.5) / size, scale) ? FG : BG;
      raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2]; raw[i + 3] = alpha;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
const out = [
  ['icon-192.png', 192, 1, true],
  ['icon-512.png', 512, 1, true],
  ['maskable-512.png', 512, 0.75, false],
  ['apple-touch-icon.png', 180, 0.9, false],
];
for (const [name, size, scale, rounded] of out) {
  writeFileSync(`public/icons/${name}`, png(size, scale, rounded));
  console.log(`wrote public/icons/${name}`);
}
