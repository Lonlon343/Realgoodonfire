// Encodes the captured screencast frames into the landing page video:
// constant 30 fps (frame timestamps honoured through the concat demuxer),
// H.264 yuv420p, no audio, faststart, and a short crossfade back to the first
// frame so the loop restarts without a jump. Also writes the poster image.
import { execFile } from 'node:child_process';
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const require = createRequire(import.meta.url);

const FPS = 30;
const OUTPUT_WIDTH = 720;
const LAST_FRAME_HOLD = 0.4;
const LOOP_FADE = 0.5;
const LOOP_TAIL = 0.6;
const MAX_BYTES = 3 * 1000 * 1000;
const CRF_STEPS = [23, 25, 27, 29, 31];

export const ffmpegPath = () => {
  const binary = require('ffmpeg-static');

  if (!binary || !existsSync(binary)) {
    throw new Error('ffmpeg-static binary missing. Run: node node_modules/ffmpeg-static/install.js');
  }

  return binary;
};

const ffmpeg = async (args) => {
  try {
    return await run(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
      maxBuffer: 64 * 1024 * 1024,
      timeout: 10 * 60 * 1000,
    });
  } catch (error) {
    throw new Error(`ffmpeg failed: ${error.stderr || error.message}`);
  }
};

// Reads duration, resolution and frame rate from ffmpeg's input summary.
export const probeVideo = async (file) => {
  let stderr = '';

  try {
    await run(ffmpegPath(), ['-hide_banner', '-i', file], { timeout: 60_000 });
  } catch (error) {
    // ffmpeg exits non-zero without an output file; the summary is on stderr.
    stderr = error.stderr || '';
  }

  const duration = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
  const stream = stderr.match(/Video: (\w+)[^\n]*?, (\d+)x(\d+)[^\n]*?, ([\d.]+) fps/);

  if (!duration || !stream) {
    throw new Error(`Could not read video facts of ${file}`);
  }

  return {
    durationSeconds: Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]),
    codec: stream[1],
    width: Number(stream[2]),
    height: Number(stream[3]),
    fps: Number(stream[4]),
    bytes: statSync(file).size,
  };
};

const scaleFilter = `scale=${OUTPUT_WIDTH}:-2:flags=lanczos+accurate_rnd+full_chroma_int:in_range=full:out_range=tv:out_color_matrix=bt709,setsar=1,format=yuv420p`;

export const encodeVideo = async ({ frames, workDir, videoPath, posterPath }) => {
  const concatFile = path.join(workDir, 'frames.ffconcat');
  const lines = ['ffconcat version 1.0'];
  let totalSeconds = 0;

  frames.forEach((frame, index) => {
    const next = frames[index + 1];
    const duration = next ? Math.max(0.001, next.timestamp - frame.timestamp) : LAST_FRAME_HOLD;
    totalSeconds += duration;
    lines.push(`file '${frame.file}'`, `duration ${duration.toFixed(6)}`);
  });
  // The concat demuxer ignores the duration of the last entry unless it repeats.
  lines.push(`file '${frames[frames.length - 1].file}'`);
  writeFileSync(concatFile, `${lines.join('\n')}\n`);

  const firstFrame = frames[0].file;
  const fadeOffset = Math.max(0, totalSeconds - LOOP_FADE).toFixed(3);
  const filter = [
    `[0:v]fps=${FPS},${scaleFilter}[main]`,
    `[1:v]fps=${FPS},${scaleFilter},trim=duration=${LOOP_TAIL}[first]`,
    `[main][first]xfade=transition=fade:duration=${LOOP_FADE}:offset=${fadeOffset}[out]`,
  ].join(';');

  let facts = null;

  for (const crf of CRF_STEPS) {
    await ffmpeg([
      '-f', 'concat', '-safe', '0', '-i', concatFile,
      '-loop', '1', '-t', String(LOOP_TAIL + 0.2), '-i', firstFrame,
      '-filter_complex', filter,
      '-map', '[out]',
      '-an',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-tune', 'animation',
      '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-r', String(FPS),
      '-movflags', '+faststart',
      videoPath,
    ]);
    facts = { ...(await probeVideo(videoPath)), crf };

    if (facts.bytes <= MAX_BYTES) {
      break;
    }
  }

  await ffmpeg([
    '-i', firstFrame,
    '-vf', `scale=${OUTPUT_WIDTH}:-2:flags=lanczos`,
    '-q:v', '3',
    posterPath,
  ]);

  return { ...facts, posterBytes: statSync(posterPath).size };
};
