import type { CapturedAudioChunk } from "./VideoSubtitleCapture";

export function encodeFloat32ToBase64(samples: Float32Array): string {
  const bytes = new Uint8Array(
    samples.buffer,
    samples.byteOffset,
    samples.byteLength,
  );
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const next = bytes.subarray(
      offset,
      Math.min(bytes.length, offset + chunkSize),
    );
    binary += String.fromCharCode(...next);
  }
  return btoa(binary);
}

export function concatFloat32(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, part) => sum + part.length, 0);
  const output = new Float32Array(total);
  let offset = 0;
  for (const part of chunks) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function popBatchChunk(
  queue: CapturedAudioChunk[],
  maxWallDurationSec = 0.4,
): CapturedAudioChunk | null {
  const first = queue.shift();
  if (!first) {
    return null;
  }

  const maxSamples =
    Math.max(1, Math.floor(first.sampleRateHz * maxWallDurationSec)) *
    Math.max(1, first.channelCount);
  const parts: Float32Array[] = [first.samples];
  let totalSamples = first.samples.length;
  let endSec = first.endSec;

  while (queue.length > 0) {
    const next = queue[0];
    if (
      next.sampleRateHz !== first.sampleRateHz ||
      next.channelCount !== first.channelCount
    ) {
      break;
    }
    if (totalSamples + next.samples.length > maxSamples) {
      break;
    }
    queue.shift();
    parts.push(next.samples);
    totalSamples += next.samples.length;
    endSec = next.endSec;
  }

  return {
    sampleRateHz: first.sampleRateHz,
    channelCount: first.channelCount,
    startSec: first.startSec,
    endSec,
    samples: parts.length === 1 ? first.samples : concatFloat32(parts),
  };
}
