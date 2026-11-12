import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { mergeSort } from "../src/domain/sorting.js";

describe("mergeSort", () => {
  test("sorts numbers ascending by default", () => {
    const items = [5, 1, 4, 2, 3];
    const sorted = mergeSort(items, (left, right) => left - right);

    assert.deepEqual(sorted, [1, 2, 3, 4, 5]);
  });

  test("handles empty and single-item arrays", () => {
    const empty = [];
    const single = [42];

    assert.deepEqual(mergeSort(empty, () => 0), []);
    assert.deepEqual(mergeSort(single, (left, right) => left - right), [42]);
    assert.notStrictEqual(mergeSort(empty, () => 0), empty);
  });

  test("does not change the original array", () => {
    const items = [5, 1, 4, 2, 3];
    mergeSort(items, (left, right) => left - right);

    assert.deepEqual(items, [5, 1, 4, 2, 3]);
  });

  test("is stable: equal keys keep their original order", () => {
    const items = [
      { key: 2, label: "first" },
      { key: 1, label: "middle" },
      { key: 2, label: "second" },
      { key: 2, label: "third" },
    ];

    assert.deepEqual(
      mergeSort(items, (left, right) => left.key - right.key).map((item) => item.label),
      ["middle", "first", "second", "third"],
    );
  });

  test("gives the same result as the built-in sort on random data", () => {
    const items = [37, -12, 0, 84, 5, -63, 21, 21, 99, -1, 8, 42];
    const expected = [...items].sort((left, right) => left - right);

    assert.deepEqual(mergeSort(items, (left, right) => left - right), expected);
  });
});
