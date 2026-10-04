const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure directory exists
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Function to generate a simple valid PNG with a dumbbell / lightning icon design
function createWorkoutPng(width, height, isMaskable = false) {
  // Simple PNG chunk generator
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // 8 bits per channel
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10); // Deflate
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // No interlace

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw pixel data: width * height * 4 RGBA + 1 filter byte per scanline
  const rowStride = width * 4 + 1;
  const rawData = Buffer.alloc(rowStride * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.45;

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowStride;
    rawData[rowStart] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const px = rowStart + 1 + x * 4;

      // Distance from center
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: Dark sleek background #09090b or rounded square
      let r = 9, g = 9, b = 11, a = 255;

      // Dumbbell icon rendering logic
      // Bar in center: x between -cx*0.5 and +cx*0.5, y between -cy*0.08 and +cy*0.08
      const isBar = Math.abs(dy) <= height * 0.04 && Math.abs(dx) <= width * 0.35;
      // Left weight plate: dx between -width*0.35 and -width*0.25, dy between -height*0.25 and height*0.25
      const isLeftPlate1 = dx >= -width * 0.35 && dx <= -width * 0.28 && Math.abs(dy) <= height * 0.26;
      const isLeftPlate2 = dx >= -width * 0.26 && dx <= -width * 0.20 && Math.abs(dy) <= height * 0.20;
      // Right weight plate: dx between width*0.25 and width*0.35
      const isRightPlate1 = dx >= width * 0.28 && dx <= width * 0.35 && Math.abs(dy) <= height * 0.26;
      const isRightPlate2 = dx >= width * 0.20 && dx <= width * 0.26 && Math.abs(dy) <= height * 0.20;

      // Accent emerald color: #10b981 (16, 185, 129)
      if (isBar || isLeftPlate1 || isLeftPlate2 || isRightPlate1 || isRightPlate2) {
        // Bright emerald green
        r = 16;
        g = 185;
        b = 129;
        a = 255;
      } else if (dist < radius) {
        // Subtle dark gradient in background
        const grad = Math.max(0, 1 - dist / radius);
        r = Math.min(255, Math.floor(16 + grad * 12));
        g = Math.min(255, Math.floor(24 + grad * 20));
        b = Math.min(255, Math.floor(30 + grad * 30));
        a = 255;
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
      rawData[px + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createWorkoutPng(192, 192));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createWorkoutPng(512, 512));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-512x512.png'), createWorkoutPng(512, 512, true));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createWorkoutPng(180, 180));

console.log('PWA icons successfully generated in public/icons/');
