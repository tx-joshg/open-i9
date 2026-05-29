import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { heicToJpeg } from "../heic";

// A real 48x48 HEIC produced by macOS `sips -s format heic` (≈1 KB).
// Tiny on purpose — just enough for the libheif decoder to exercise the
// real conversion path, not a synthetic stub.
const heic = readFileSync(join(__dirname, "sample.heic"));
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

test("heicToJpeg converts a real HEIC Buffer to a JPEG", async () => {
  const out = await heicToJpeg(heic);
  assert.ok(Buffer.isBuffer(out), "returns a Buffer");
  assert.ok(out.length > 0, "JPEG is non-empty");
  assert.ok(out.subarray(0, 3).equals(JPEG_MAGIC), "starts with JPEG magic bytes");
});

// Regression for the PR #16 HEIC bug: the upload route used to forward
// `await file.arrayBuffer()` (a raw ArrayBuffer) straight to heic-convert.
// heic-decode's isHeic() spreads the input, and an ArrayBuffer is not
// iterable, so it threw "Found non-callable @@iterator" and the upload
// 500'd. heicToJpeg must normalize ArrayBuffer input and still produce a
// JPEG.
test("heicToJpeg accepts a raw ArrayBuffer (PR #16 regression)", async () => {
  const ab = heic.buffer.slice(
    heic.byteOffset,
    heic.byteOffset + heic.byteLength,
  );
  assert.ok(ab instanceof ArrayBuffer, "test input really is an ArrayBuffer");

  const out = await heicToJpeg(ab);
  assert.ok(out.subarray(0, 3).equals(JPEG_MAGIC), "ArrayBuffer input still yields a JPEG");
});

// And a Uint8Array view, the third shape a Web File / undici body can hand
// us, must work too.
test("heicToJpeg accepts a Uint8Array view", async () => {
  const out = await heicToJpeg(new Uint8Array(heic));
  assert.ok(out.subarray(0, 3).equals(JPEG_MAGIC));
});
