import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { averageRating, parseRating } from "../rating.js";

describe("parseRating", () => {
  it("reads whole-number ratings out of 5 (format used for new answers)", () => {
    assert.equal(parseRating("4"), 4);
    assert.equal(parseRating("1"), 1);
    assert.equal(parseRating(5), 5);
  });

  it("reads 'x/5' and 'x/10' ratings and converts them to a 5-point scale", () => {
    assert.equal(parseRating("4/5"), 4);
    assert.equal(parseRating("8/10"), 4);
    assert.equal(parseRating("3.5/5"), 3.5);
  });

  it("treats bare numbers above 5 as out of 10", () => {
    assert.equal(parseRating("7"), 3.5);
    assert.equal(parseRating("10"), 5);
  });

  it("clamps out-of-range values to 0-5", () => {
    assert.equal(parseRating("6/5"), 5);
    assert.equal(parseRating("-1"), 0);
  });

  it("returns null for unrated answers instead of crashing", () => {
    assert.equal(parseRating(null), null);
    assert.equal(parseRating(undefined), null);
    assert.equal(parseRating("N/A"), null);
    assert.equal(parseRating(""), null);
  });
});

describe("averageRating", () => {
  it("averages the rated answers", () => {
    assert.equal(averageRating([4, 2, 3]), 3);
  });

  it("skips unrated answers instead of counting them as zero", () => {
    assert.equal(averageRating([4, null, 2]), 3);
  });

  it("returns null when nothing is rated", () => {
    assert.equal(averageRating([]), null);
    assert.equal(averageRating([null, null]), null);
  });
});
