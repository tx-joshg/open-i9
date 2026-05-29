import heicConvert from "heic-convert";

/**
 * Convert a HEIC/HEIF image to a JPEG Buffer.
 *
 * REGRESSION GUARD — read before changing the input handling:
 * heic-convert delegates to heic-decode, whose isHeic() check spreads the
 * first bytes with `String.fromCharCode(...buf.slice(8, 12))`. Spread
 * requires an ITERABLE. A raw `ArrayBuffer` is NOT iterable, so passing one
 * throws "Found non-callable @@iterator" (older V8) /
 * "Spread syntax requires ...iterable[Symbol.iterator] to be a function"
 * (newer V8) — which surfaces to staff-portal as an upload 500. That is the
 * bug that made PR #16's HEIC support never work on a real iPhone photo
 * (the route passed `await file.arrayBuffer()` straight through).
 *
 * We normalize any binary input to a Node `Buffer` (a Uint8Array, hence
 * iterable) so no caller can reintroduce that failure.
 */
export async function heicToJpeg(
  input: Buffer | Uint8Array | ArrayBuffer,
): Promise<Buffer> {
  const buffer = Buffer.isBuffer(input)
    ? input
    : input instanceof Uint8Array
      ? Buffer.from(input.buffer, input.byteOffset, input.byteLength)
      : Buffer.from(input);

  // NOTE: @types/heic-convert declares `buffer: ArrayBufferLike`, but the
  // library needs an ITERABLE (Buffer/Uint8Array) at runtime — see the doc
  // comment above. That incorrect type is exactly what lured the original
  // route into passing a raw ArrayBuffer. Pass the iterable Buffer and cast
  // past the bad d.ts.
  const jpeg = await heicConvert({
    buffer: buffer as unknown as ArrayBufferLike,
    format: "JPEG",
    quality: 0.92,
  });
  return Buffer.from(jpeg);
}
