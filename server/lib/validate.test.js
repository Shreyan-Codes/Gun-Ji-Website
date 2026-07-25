import test from "node:test";
import assert from "node:assert/strict";
import { clean, T_SHIRT_SIZES } from "./validate.js";

const sizeSpec = { size: { enum: T_SHIRT_SIZES } };

test("only S, M and L are accepted as selected T-shirt sizes", () => {
  for (const size of T_SHIRT_SIZES) {
    assert.equal(clean(sizeSpec, { size }).ok, true);
  }
  assert.equal(clean(sizeSpec, { size: "XL" }).ok, false);
  assert.equal(clean(sizeSpec, { size: "XXL" }).ok, false);
});

test("an undecided optional size can stay blank", () => {
  const result = clean(sizeSpec, { size: "" });
  assert.equal(result.ok, true);
  assert.equal(result.value.size, "");
});
