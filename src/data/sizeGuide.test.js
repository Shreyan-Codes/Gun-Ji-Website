import test from "node:test";
import assert from "node:assert/strict";

import { SIZE_ROWS, T_SHIRT_SIZES } from "./sizeGuide.js";

test("size guide provides common S, M and L reference measurements", () => {
  assert.deepEqual(
    SIZE_ROWS.map(({ size }) => size),
    T_SHIRT_SIZES,
  );
  assert.deepEqual(SIZE_ROWS, [
    { size: "S", chestWidth: 46, length: 71 },
    { size: "M", chestWidth: 51, length: 74 },
    { size: "L", chestWidth: 56, length: 76 },
  ]);
});
