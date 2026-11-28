// Generates the fake camera clip for the scanner: an EAN-13 label on a neutral
// table surface, as a Y4M file (raw I420), which Chromium plays through
// --use-file-for-fake-video-capture. No image library needed.
//
//   node scripts/demo-video/camera-clip.mjs <barcode> <out.y4m>
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ean13Modules, isGuardModule } from './ean13.mjs';

// Square 720x720: the scanner library asks for at least 640x640.
const WIDTH = 720;
const HEIGHT = 720;
const FPS = 15;
const FRAME_COUNT = 30;
const MODULE_PX = 4;

// 5x7 bitmap digits for the human-readable line under the bars.
const DIGIT_FONT = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};
const FONT_SCALE = 4;

// Luma in full range 0..255; converted to video range when the frame is written.
const BLACK = 18;
const WHITE = 250;

const drawScene = (code) => {
  // Oversampled by 2 so bar and label edges get a soft, camera-like edge
  // after downscaling.
  const scale = 2;
  const width = WIDTH * scale;
  const height = HEIGHT * scale;
  const luma = new Float32Array(width * height);

  // Table surface: soft vertical gradient with a vignette.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - width / 2) / (width / 2);
      const dy = (y - height / 2) / (height / 2);
      const vignette = 1 - 0.18 * (dx * dx + dy * dy);
      luma[y * width + x] = (150 + 25 * (1 - y / height)) * vignette;
    }
  }

  const modules = ean13Modules(code);
  const px = MODULE_PX * scale;
  const barsWidth = modules.length * px;
  const labelWidth = barsWidth + 2 * 14 * px;
  const barHeight = 190 * scale;
  const guardExtra = 14 * scale;
  const digitHeight = 7 * FONT_SCALE * scale;
  const labelHeight = barHeight + guardExtra + digitHeight + 2 * 26 * scale;
  const labelX = Math.round((width - labelWidth) / 2);
  const labelY = Math.round((height - labelHeight) / 2);
  const radius = 18 * scale;

  const insideRoundedRect = (x, y) => {
    const cx = Math.min(Math.max(x, labelX + radius), labelX + labelWidth - radius);
    const cy = Math.min(Math.max(y, labelY + radius), labelY + labelHeight - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
  };

  // Label shadow, then the white label.
  for (let y = labelY; y < labelY + labelHeight + 10 * scale; y += 1) {
    for (let x = labelX + 6 * scale; x < labelX + labelWidth + 8 * scale; x += 1) {
      if (y < height && x < width && insideRoundedRect(x - 6 * scale, y - 8 * scale)) {
        luma[y * width + x] *= 0.82;
      }
    }
  }
  for (let y = labelY; y < labelY + labelHeight; y += 1) {
    for (let x = labelX; x < labelX + labelWidth; x += 1) {
      if (insideRoundedRect(x, y)) {
        luma[y * width + x] = WHITE;
      }
    }
  }

  const barsX = labelX + 14 * px;
  const barsY = labelY + 26 * scale;
  const fillRect = (x0, y0, w, h, value) => {
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        luma[y * width + x] = value;
      }
    }
  };

  Array.from(modules).forEach((bit, index) => {
    if (bit === '1') {
      fillRect(barsX + index * px, barsY, px, barHeight + (isGuardModule(index) ? guardExtra : 0), BLACK);
    }
  });

  const drawDigit = (digit, x0, y0) => {
    DIGIT_FONT[digit].forEach((row, rowIndex) => {
      Array.from(row).forEach((bit, colIndex) => {
        if (bit === '1') {
          fillRect(
            x0 + colIndex * FONT_SCALE * scale,
            y0 + rowIndex * FONT_SCALE * scale,
            FONT_SCALE * scale,
            FONT_SCALE * scale,
            BLACK
          );
        }
      });
    });
  };

  const digitsY = barsY + barHeight + 4 * scale;
  const digitAdvance = 7 * px;
  const digitOffset = Math.round((digitAdvance - 5 * FONT_SCALE * scale) / 2);
  drawDigit(code[0], barsX - 9 * px, digitsY);
  for (let index = 0; index < 6; index += 1) {
    drawDigit(code[1 + index], barsX + 3 * px + index * digitAdvance + digitOffset, digitsY);
    drawDigit(code[7 + index], barsX + 50 * px + index * digitAdvance + digitOffset, digitsY);
  }

  // Downscale 2x2 -> 1 (box filter).
  const out = new Float32Array(WIDTH * HEIGHT);
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      const i = (2 * y) * width + 2 * x;
      out[y * WIDTH + x] = (luma[i] + luma[i + 1] + luma[i + width] + luma[i + width + 1]) / 4;
    }
  }
  return out;
};

// Frame n shows the scene shifted by a small, slow hand-held sway.
const buildFrame = (scene, frameIndex) => {
  const phase = (2 * Math.PI * frameIndex) / FRAME_COUNT;
  const shiftX = Math.round(3 * Math.sin(phase));
  const shiftY = Math.round(2 * Math.sin(2 * phase));
  const ySize = WIDTH * HEIGHT;
  const frame = Buffer.alloc(ySize * 3 / 2);

  for (let y = 0; y < HEIGHT; y += 1) {
    const sourceY = Math.min(HEIGHT - 1, Math.max(0, y - shiftY));
    for (let x = 0; x < WIDTH; x += 1) {
      const sourceX = Math.min(WIDTH - 1, Math.max(0, x - shiftX));
      const value = scene[sourceY * WIDTH + sourceX];
      // Full range -> video range (16..235).
      frame[y * WIDTH + x] = Math.round(16 + (value * 219) / 255);
    }
  }

  // Neutral chroma with a faint warm tint.
  frame.fill(124, ySize, ySize + ySize / 4);
  frame.fill(131, ySize + ySize / 4);
  return frame;
};

export const writeCameraClip = (code, outPath) => {
  const scene = drawScene(code);
  const header = Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F${FPS}:1 Ip A1:1 C420jpeg\n`, 'ascii');
  const chunks = [header];

  for (let index = 0; index < FRAME_COUNT; index += 1) {
    chunks.push(Buffer.from('FRAME\n', 'ascii'), buildFrame(scene, index));
  }

  writeFileSync(outPath, Buffer.concat(chunks));
  return outPath;
};

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const [code, outPath] = process.argv.slice(2);

  if (!code || !outPath) {
    console.error('Usage: node scripts/demo-video/camera-clip.mjs <ean13> <out.y4m>');
    process.exit(1);
  }

  writeCameraClip(code, outPath);
  console.log(`Camera clip written: ${outPath}`);
}
